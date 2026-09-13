-- Additive marketplace v1. No legacy data is deleted, imported or automatically published.
BEGIN;
CREATE TABLE IF NOT EXISTS public.tutor_offers (
 tutor_id uuid PRIMARY KEY REFERENCES public.user_accounts(id),
 listing jsonb NOT NULL CHECK(jsonb_typeof(listing)='object'),
 published boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tutor_offer_contacts (
 tutor_id uuid PRIMARY KEY REFERENCES public.tutor_offers(tutor_id),
 phone text NOT NULL CHECK(phone ~ '^\+?[1-9][0-9]{7,14}$')
);
CREATE TABLE IF NOT EXISTS public.tutor_offer_locations (
 tutor_id uuid PRIMARY KEY REFERENCES public.tutor_offers(tutor_id),
 latitude numeric(5,2) NOT NULL CHECK(latitude BETWEEN 7.5 AND 8.6),
 longitude numeric(6,2) NOT NULL CHECK(longitude BETWEEN -73 AND -72),
 precision text NOT NULL DEFAULT 'approximate' CHECK(precision='approximate'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tutoring_requests (
 id uuid PRIMARY KEY,
 student_id uuid NOT NULL REFERENCES public.user_accounts(id),
 tutor_id uuid NOT NULL REFERENCES public.tutor_offers(tutor_id),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','cancelled')),
 starts_at timestamptz NOT NULL,
 duration_hours numeric NOT NULL CHECK(duration_hours BETWEEN 0.5 AND 3 AND mod(duration_hours,0.5)=0),
 payload jsonb NOT NULL,
 student_contact text NOT NULL,
 tutor_contact text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(student_id<>tutor_id)
);
CREATE INDEX IF NOT EXISTS tutoring_requests_student_created ON public.tutoring_requests(student_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS tutoring_requests_tutor_created ON public.tutoring_requests(tutor_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS tutoring_requests_accepted_time ON public.tutoring_requests(tutor_id,starts_at) WHERE status='accepted';
CREATE TABLE IF NOT EXISTS public.tutor_documents (
 id uuid PRIMARY KEY,
 tutor_id uuid NOT NULL REFERENCES public.user_accounts(id),
 path text UNIQUE NOT NULL,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 200),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=1000),
 file_type text NOT NULL CHECK(file_type IN ('pdf','jpg','png')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(path=tutor_id::text || '/' || id::text || '.' || file_type)
);
CREATE INDEX IF NOT EXISTS tutor_documents_owner ON public.tutor_documents(tutor_id);
ALTER TABLE public.tutor_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_offer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_offer_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutoring_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tutor_offers,public.tutor_offer_contacts,public.tutor_offer_locations,public.tutoring_requests,public.tutor_documents FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.tutor_offers,public.tutor_offer_contacts,public.tutor_offer_locations,public.tutoring_requests,public.tutor_documents TO service_role;
GRANT SELECT ON public.tutor_offers,public.tutor_offer_locations,public.tutor_documents TO authenticated;

CREATE OR REPLACE FUNCTION public.marketplace_role_v1() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT role FROM public.user_accounts WHERE id=auth.uid()
$$;
DROP POLICY IF EXISTS offers_read ON public.tutor_offers;
CREATE POLICY offers_read ON public.tutor_offers FOR SELECT TO authenticated
 USING(tutor_id=(SELECT auth.uid()) OR (published AND (SELECT public.marketplace_role_v1())='student'));
DROP POLICY IF EXISTS offer_locations_read ON public.tutor_offer_locations;
CREATE POLICY offer_locations_read ON public.tutor_offer_locations FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.tutor_offers o WHERE o.tutor_id=tutor_offer_locations.tutor_id AND o.published));
DROP POLICY IF EXISTS documents_read ON public.tutor_documents;
CREATE POLICY documents_read ON public.tutor_documents FOR SELECT TO authenticated
 USING(tutor_id=(SELECT auth.uid()) OR ((SELECT public.marketplace_role_v1())='student' AND EXISTS(SELECT 1 FROM public.tutor_offers o WHERE o.tutor_id=tutor_documents.tutor_id AND o.published)));

CREATE OR REPLACE FUNCTION public.own_tutor_offer_v1() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('levels',o.listing->'levels','modalities',o.listing->'modalities',
 'availability',o.listing->'availability','sector',o.listing->>'sector','phone',c.phone,
 'position',CASE WHEN l.tutor_id IS NULL THEN NULL ELSE jsonb_build_object('latitude',l.latitude,'longitude',l.longitude) END,
 'published',o.published,'version',o.version)
 FROM public.tutor_offers o JOIN public.tutor_offer_contacts c USING(tutor_id)
 LEFT JOIN public.tutor_offer_locations l USING(tutor_id) WHERE o.tutor_id=auth.uid()
$$;
CREATE OR REPLACE FUNCTION public.publish_tutor_offer_v1(p_offer jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p jsonb; a public.user_accounts; slot jsonb; prev_slot jsonb; listing jsonb; current_version integer;
BEGIN
 SELECT * INTO a FROM public.user_accounts WHERE id=auth.uid() AND role='tutor' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='TUTOR_REQUIRED'; END IF;
 p:=a.profile;
 SELECT version INTO current_version FROM public.tutor_offers WHERE tutor_id=a.id;
 IF coalesce(current_version,0)<>coalesce((p_offer->>'version')::int,-1) THEN RAISE EXCEPTION 'OFFER_CONFLICT'; END IF;
 IF coalesce(length(btrim(p->>'name')),0)=0 OR coalesce((p->>'ratePerHour')::numeric,0)<=0 OR coalesce(jsonb_array_length(p->'subjects'),0)=0 THEN RAISE EXCEPTION 'COMPLETE_PROFILE'; END IF;
 IF jsonb_typeof(p_offer->'levels') IS DISTINCT FROM 'array' OR jsonb_typeof(p_offer->'modalities') IS DISTINCT FROM 'array' OR jsonb_typeof(p_offer->'availability') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'INVALID_OFFER'; END IF;
 IF jsonb_array_length(p_offer->'levels') NOT BETWEEN 1 AND 5 OR jsonb_array_length(p_offer->'modalities') NOT BETWEEN 1 AND 2 OR jsonb_array_length(p_offer->'availability') NOT BETWEEN 1 AND 21
 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_offer->'levels') x WHERE x IS NULL OR x NOT IN ('Básica primaria','Básica secundaria','Grado 11 - Media','Universidad','Educación de adultos'))
 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_offer->'modalities') x WHERE x IS NULL OR x NOT IN ('presencial','virtual'))
 OR coalesce(p_offer->>'phone','') !~ '^\+?[1-9][0-9]{7,14}$' OR length(coalesce(p_offer->>'sector',''))>200 THEN RAISE EXCEPTION 'INVALID_OFFER'; END IF;
 FOR slot IN SELECT value FROM jsonb_array_elements(p_offer->'availability') ORDER BY (value->>'day')::int,value->>'start' LOOP
  IF coalesce((slot->>'day')::int,0) NOT BETWEEN 1 AND 7 OR coalesce(slot->>'start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR coalesce(slot->>'end','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR slot->>'start'>=slot->>'end' THEN RAISE EXCEPTION 'INVALID_SCHEDULE'; END IF;
  IF prev_slot->>'day'=slot->>'day' AND prev_slot->>'end'>slot->>'start' THEN RAISE EXCEPTION 'INVALID_SCHEDULE'; END IF;
  prev_slot:=slot;
 END LOOP;
 IF p_offer->'modalities' ? 'presencial' AND (coalesce(length(btrim(p_offer->>'sector')),0)=0 OR coalesce((p_offer#>>'{position,latitude}')::numeric,0) NOT BETWEEN 7.5 AND 8.6 OR coalesce((p_offer#>>'{position,longitude}')::numeric,0) NOT BETWEEN -73 AND -72) THEN RAISE EXCEPTION 'INVALID_ZONE'; END IF;
 listing:=jsonb_build_object('id',a.id,'name',p->>'name','title',p->>'title','institution',p->>'institution','experienceYears',(p->>'experienceYears')::int,
 'ratePerHour',(p->>'ratePerHour')::numeric,'coverageRadiusKm',(p->>'coverageRadiusKm')::numeric,
 'subjects',p->'subjects','specialties',p->'specialties','bio',p->>'bio','levels',p_offer->'levels','modalities',p_offer->'modalities','availability',p_offer->'availability',
 'sector',coalesce(p_offer->>'sector',''),'avatarPath',a.avatar_path,'avatar',coalesce(a.avatar_url,''),'verified',false,'nextAvailable','','methodologySteps','[]'::jsonb,'matchReasons','[]'::jsonb);
 INSERT INTO public.tutor_offers(tutor_id,listing,published) VALUES(a.id,listing,true)
 ON CONFLICT(tutor_id) DO UPDATE SET listing=excluded.listing,published=true,version=tutor_offers.version+1,updated_at=now();
 INSERT INTO public.tutor_offer_contacts VALUES(a.id,p_offer->>'phone') ON CONFLICT(tutor_id) DO UPDATE SET phone=excluded.phone;
 IF p_offer->'modalities' ? 'presencial' THEN
  INSERT INTO public.tutor_offer_locations(tutor_id,latitude,longitude) VALUES(a.id,round((p_offer#>>'{position,latitude}')::numeric,2),round((p_offer#>>'{position,longitude}')::numeric,2))
  ON CONFLICT(tutor_id) DO UPDATE SET latitude=excluded.latitude,longitude=excluded.longitude,updated_at=now();
 ELSE DELETE FROM public.tutor_offer_locations WHERE tutor_id=a.id; END IF;
 RETURN public.own_tutor_offer_v1();
END $$;
CREATE OR REPLACE FUNCTION public.withdraw_tutor_offer_v1() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.user_accounts WHERE id=auth.uid() FOR UPDATE;
 UPDATE public.tutor_offers SET published=false,version=version+1,updated_at=now() WHERE tutor_id=auth.uid();
 DELETE FROM public.tutor_offer_locations WHERE tutor_id=auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.create_tutoring_request_v1(p_request jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE student public.user_accounts; offer public.tutor_offers; p jsonb; request_id uuid; start_time timestamptz; hours numeric; contact text; tutor_phone text; local_start timestamp; existing public.tutoring_requests;
BEGIN
 SELECT * INTO student FROM public.user_accounts WHERE id=auth.uid() AND role='student' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='STUDENT_REQUIRED'; END IF;
 request_id:=(p_request->>'id')::uuid;
 SELECT * INTO existing FROM public.tutoring_requests WHERE id=request_id;
 IF FOUND THEN
  IF existing.student_id<>student.id THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='REQUEST_FORBIDDEN'; END IF;
  IF existing.tutor_id<>(p_request->>'tutorId')::uuid OR existing.starts_at<>(p_request->>'startsAt')::timestamptz OR existing.duration_hours<>(p_request->>'durationHours')::numeric OR existing.payload->>'subject' IS DISTINCT FROM p_request->>'subject' OR existing.payload->>'modality' IS DISTINCT FROM p_request->>'modality' OR existing.payload->>'studentNote' IS DISTINCT FROM coalesce(p_request->>'note','') THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  RETURN request_id;
 END IF;
 p:=student.profile;
 IF coalesce(length(btrim(p->>'name')),0)=0 OR coalesce((p->>'age')::int,0)<1 THEN RAISE EXCEPTION 'COMPLETE_STUDENT_PROFILE'; END IF;
 IF (p->>'age')::int<18 THEN
  IF coalesce((p->>'guardianAuthorized')::boolean,false)=false OR coalesce(length(btrim(p->>'guardianName')),0)=0 OR coalesce(p->>'guardianPhone','') !~ '^\+?[1-9][0-9]{7,14}$' THEN RAISE EXCEPTION 'GUARDIAN_REQUIRED'; END IF;
  contact:=p->>'guardianPhone';
 ELSE contact:=p->>'phone'; END IF;
 IF coalesce(contact,'') !~ '^\+?[1-9][0-9]{7,14}$' THEN RAISE EXCEPTION 'CONTACT_REQUIRED'; END IF;
 SELECT * INTO offer FROM public.tutor_offers WHERE tutor_id=(p_request->>'tutorId')::uuid AND published FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'OFFER_UNAVAILABLE'; END IF;
 start_time:=(p_request->>'startsAt')::timestamptz; hours:=(p_request->>'durationHours')::numeric;
 IF start_time IS NULL OR start_time<=now() OR start_time>now()+interval '180 days' OR hours IS NULL OR hours NOT BETWEEN 0.5 AND 3 OR mod(hours,0.5)<>0 OR length(coalesce(p_request->>'note',''))>2000 THEN RAISE EXCEPTION 'INVALID_REQUEST'; END IF;
 IF NOT coalesce(offer.listing->'subjects' ? (p_request->>'subject'),false) OR NOT coalesce(offer.listing->'modalities' ? (p_request->>'modality'),false) THEN RAISE EXCEPTION 'OFFER_MISMATCH'; END IF;
 local_start:=start_time AT TIME ZONE 'America/Bogota';
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(offer.listing->'availability') s WHERE (s->>'day')::int=extract(isodow FROM local_start)::int AND (s->>'start')::time<=local_start::time AND (s->>'end')::time>= (local_start+hours*interval '1 hour')::time AND (local_start+hours*interval '1 hour')::date=local_start::date) THEN RAISE EXCEPTION 'SCHEDULE_UNAVAILABLE'; END IF;
 IF (SELECT count(*) FROM public.tutoring_requests WHERE student_id=student.id AND status='pending')>=20 THEN RAISE EXCEPTION 'REQUEST_LIMIT'; END IF;
 IF EXISTS(SELECT 1 FROM public.tutoring_requests WHERE student_id=student.id AND tutor_id=offer.tutor_id AND starts_at=start_time AND status IN ('pending','accepted')) THEN RAISE EXCEPTION 'DUPLICATE_REQUEST'; END IF;
 SELECT phone INTO tutor_phone FROM public.tutor_offer_contacts WHERE tutor_id=offer.tutor_id;
 INSERT INTO public.tutoring_requests(id,student_id,tutor_id,starts_at,duration_hours,student_contact,tutor_contact,payload)
 VALUES(request_id,student.id,offer.tutor_id,start_time,hours,contact,tutor_phone,
 jsonb_build_object('studentName',p->>'name','age',(p->>'age')::int,'grade',p->>'grade','sector',p->>'sector','guardianLinked',(p->>'age')::int<18,'guardianName',CASE WHEN (p->>'age')::int<18 THEN p->>'guardianName' ELSE NULL END,
 'subject',p_request->>'subject','modality',p_request->>'modality','studentNote',coalesce(p_request->>'note',''),'focalTopic','','goal',p->>'academicGoal','learningStyles',p->'learningStyles',
 'ratePerHour',offer.listing->'ratePerHour','totalEstimated',(offer.listing->>'ratePerHour')::numeric*hours,'targetTutorName',offer.listing->>'name','matchCriteriaChecklist','[]'::jsonb,'avatarInitials',''));
 RETURN request_id;
END $$;
CREATE OR REPLACE FUNCTION public.list_tutoring_requests_v1(p_offset integer DEFAULT 0) RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT r.payload || jsonb_build_object('id',r.id,'studentId',r.student_id,'targetTutorId',r.tutor_id,'status',r.status,'startsAt',r.starts_at,'scheduledTime',to_char(r.starts_at AT TIME ZONE 'America/Bogota','YYYY-MM-DD HH24:MI'),'durationHours',r.duration_hours,'createdAt',r.created_at)
 || CASE WHEN r.status='accepted' THEN jsonb_build_object('tutorPhone',r.tutor_contact,'studentPhone',r.student_contact,'guardianPhone',CASE WHEN (r.payload->>'guardianLinked')::boolean THEN r.student_contact ELSE NULL END) ELSE '{}'::jsonb END
 FROM public.tutoring_requests r WHERE auth.uid() IN (r.student_id,r.tutor_id)
 ORDER BY r.created_at DESC,r.id LIMIT 200 OFFSET greatest(p_offset,0)
$$;
CREATE OR REPLACE FUNCTION public.transition_tutoring_request_v1(p_id uuid,p_status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.tutoring_requests;
BEGIN
 SELECT * INTO r FROM public.tutoring_requests WHERE id=p_id;
 IF NOT FOUND OR auth.uid() IS NULL OR auth.uid() NOT IN (r.student_id,r.tutor_id) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='REQUEST_FORBIDDEN'; END IF;
 -- Serialize acceptance for this tutor before locking a request; all transitions use this order.
 PERFORM pg_advisory_xact_lock(hashtextextended(r.tutor_id::text,0));
 SELECT * INTO r FROM public.tutoring_requests WHERE id=p_id FOR UPDATE;
 IF (p_status IN ('accepted','rejected') AND auth.uid()<>r.tutor_id) OR (p_status='cancelled' AND auth.uid()<>r.student_id) OR p_status IS NULL OR p_status NOT IN ('accepted','rejected','cancelled') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='REQUEST_FORBIDDEN'; END IF;
 IF r.status=p_status THEN RETURN; END IF;
 IF NOT (r.status='pending' OR (r.status='accepted' AND p_status='cancelled')) THEN RAISE EXCEPTION 'REQUEST_CONFLICT'; END IF;
 IF p_status='accepted' AND (r.starts_at<=now() OR EXISTS(SELECT 1 FROM public.tutoring_requests x WHERE x.tutor_id=r.tutor_id AND x.id<>r.id AND x.status='accepted' AND tstzrange(x.starts_at,x.starts_at+x.duration_hours*interval '1 hour','[)') && tstzrange(r.starts_at,r.starts_at+r.duration_hours*interval '1 hour','[)'))) THEN RAISE EXCEPTION 'SCHEDULE_CONFLICT'; END IF;
 UPDATE public.tutoring_requests SET status=p_status,updated_at=now() WHERE id=p_id;
END $$;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('tutor-documents','tutor-documents',false,5242880,ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
DROP POLICY IF EXISTS tutor_document_upload ON storage.objects;
CREATE POLICY tutor_document_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='tutor-documents' AND (SELECT public.marketplace_role_v1())='tutor' AND name ~ ('^' || (SELECT auth.uid())::text || '/[0-9a-f-]{36}\.(pdf|jpg|png)$'));
DROP POLICY IF EXISTS tutor_document_read ON storage.objects;
CREATE POLICY tutor_document_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='tutor-documents' AND ((storage.foldername(name))[1]=(SELECT auth.uid())::text OR EXISTS(SELECT 1 FROM public.tutor_documents d WHERE d.path=name)));
DROP POLICY IF EXISTS tutor_document_delete ON storage.objects;
CREATE POLICY tutor_document_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='tutor-documents' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS published_offer_avatar ON storage.objects;
CREATE POLICY published_offer_avatar ON storage.objects FOR SELECT TO authenticated USING(bucket_id='profile-avatars' AND (SELECT public.marketplace_role_v1())='student' AND EXISTS(SELECT 1 FROM public.tutor_offers o WHERE o.published AND o.listing->>'avatarPath'=name));
DROP POLICY IF EXISTS preserve_published_offer_avatar ON storage.objects;
CREATE POLICY preserve_published_offer_avatar ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING(bucket_id<>'profile-avatars' OR NOT EXISTS(SELECT 1 FROM public.tutor_offers o WHERE o.published AND o.listing->>'avatarPath'=name));
CREATE OR REPLACE FUNCTION public.register_tutor_document_v1(p_id uuid,p_title text,p_description text,p_type text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid:=auth.uid(); object_path text;
BEGIN
 PERFORM 1 FROM public.user_accounts WHERE id=owner_id AND role='tutor' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='TUTOR_REQUIRED'; END IF;
 object_path:=owner_id::text || '/' || p_id::text || '.' || p_type;
 IF EXISTS(SELECT 1 FROM public.tutor_documents WHERE id=p_id AND tutor_id=owner_id) THEN RETURN; END IF;
 IF (SELECT count(*) FROM public.tutor_documents WHERE tutor_id=owner_id)>=10 THEN RAISE EXCEPTION 'DOCUMENT_LIMIT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='tutor-documents' AND name=object_path) THEN RAISE EXCEPTION 'DOCUMENT_MISSING'; END IF;
 INSERT INTO public.tutor_documents VALUES(p_id,owner_id,object_path,btrim(p_title),coalesce(p_description,''),p_type,now());
END $$;
CREATE OR REPLACE FUNCTION public.remove_tutor_document_v1(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN DELETE FROM public.tutor_documents WHERE id=p_id AND tutor_id=auth.uid(); END $$;

REVOKE ALL ON FUNCTION public.marketplace_role_v1(),public.own_tutor_offer_v1(),public.publish_tutor_offer_v1(jsonb),public.withdraw_tutor_offer_v1(),public.create_tutoring_request_v1(jsonb),public.list_tutoring_requests_v1(integer),public.transition_tutoring_request_v1(uuid,text),public.register_tutor_document_v1(uuid,text,text,text),public.remove_tutor_document_v1(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.marketplace_role_v1(),public.own_tutor_offer_v1(),public.publish_tutor_offer_v1(jsonb),public.withdraw_tutor_offer_v1(),public.create_tutoring_request_v1(jsonb),public.list_tutoring_requests_v1(integer),public.transition_tutoring_request_v1(uuid,text),public.register_tutor_document_v1(uuid,text,text,text),public.remove_tutor_document_v1(uuid) TO authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
  IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='tutor_offer_locations') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.tutor_offer_locations; END IF;
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
