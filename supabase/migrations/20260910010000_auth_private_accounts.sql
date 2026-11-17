-- Private persistent accounts. No records are seeded, deleted, claimed by email,
-- or copied from browser drafts / legacy public geometry.
-- Existing tables are retained; browser permissions are narrowed deliberately.
-- Rollback needs reviewed grants/policies and preserved account/photo data, not a
-- blind DROP. DDL takes normal catalog/table locks; no legacy rows are rewritten.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.is_valid_account_profile(p_role text, p_profile jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  allowed text[];
  field record;
  kind text;
  limit_length integer;
  numeric_value numeric;
BEGIN
  IF p_role NOT IN ('student','tutor') OR jsonb_typeof(p_profile) IS DISTINCT FROM 'object'
     OR octet_length(p_profile::text) > 65536 THEN RETURN false; END IF;
  allowed := CASE p_role WHEN 'student' THEN ARRAY[
    'name','age','grade','school','sector','address','phone','guardianName','guardianPhone',
    'guardianRelation','guardianAuthorized','academicGoal','difficultiesOrTopics',
    'learningStyles','preferredModality','preferredSchedule','bioNote']
  ELSE ARRAY['name','title','institution','experienceYears','ratePerHour','coverageRadiusKm','bio','subjects','specialties'] END;
  IF (SELECT count(*) FROM jsonb_object_keys(p_profile)) <> cardinality(allowed)
     OR NOT (p_profile ?& allowed) THEN RETURN false; END IF;
  FOR field IN SELECT key,value FROM jsonb_each(p_profile) LOOP
    kind := jsonb_typeof(field.value);
    IF field.key IN ('learningStyles','subjects','specialties') THEN
      IF kind <> 'array' OR jsonb_array_length(field.value) > 30 THEN RETURN false; END IF;
      IF EXISTS(SELECT 1 FROM jsonb_array_elements(field.value) item
                WHERE jsonb_typeof(item) <> 'string' OR length(item #>> '{}') > 200) THEN RETURN false; END IF;
    ELSIF field.key = 'guardianAuthorized' THEN
      IF kind <> 'boolean' THEN RETURN false; END IF;
    ELSIF field.key IN ('age','experienceYears','ratePerHour','coverageRadiusKm') THEN
      IF kind = 'null' AND field.key <> 'coverageRadiusKm' THEN CONTINUE; END IF;
      IF kind <> 'number' THEN RETURN false; END IF;
      numeric_value := (field.value #>> '{}')::numeric;
      IF field.key = 'age' AND (numeric_value < 1 OR numeric_value > 119 OR numeric_value <> trunc(numeric_value)) THEN RETURN false; END IF;
      IF field.key = 'experienceYears' AND (numeric_value < 0 OR numeric_value > 80 OR numeric_value <> trunc(numeric_value)) THEN RETURN false; END IF;
      IF field.key = 'ratePerHour' AND (numeric_value < 10000 OR numeric_value > 1000000) THEN RETURN false; END IF;
      IF field.key = 'coverageRadiusKm' AND (numeric_value < 1 OR numeric_value > 15) THEN RETURN false; END IF;
    ELSE
      limit_length := CASE field.key
        WHEN 'grade' THEN 120 WHEN 'guardianRelation' THEN 120
        WHEN 'phone' THEN 40 WHEN 'guardianPhone' THEN 40 WHEN 'address' THEN 300
        WHEN 'academicGoal' THEN 2000 WHEN 'difficultiesOrTopics' THEN 4000
        WHEN 'preferredSchedule' THEN 500 WHEN 'bioNote' THEN 4000 WHEN 'bio' THEN 4000
        WHEN 'preferredModality' THEN 20 ELSE 200 END;
      IF kind <> 'string' OR length(field.value #>> '{}') > limit_length THEN RETURN false; END IF;
      IF field.key = 'preferredModality' AND (field.value #>> '{}') NOT IN ('presencial','virtual','hibrida') THEN RETURN false; END IF;
    END IF;
  END LOOP;
  RETURN true;
END;
$$;

CREATE TABLE IF NOT EXISTS public.user_accounts (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK(role IN ('student','tutor')),
  profile jsonb NOT NULL,
  avatar_path text,
  avatar_url text,
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT account_profile_valid CHECK(public.is_valid_account_profile(role,profile)),
  CONSTRAINT account_avatar_owned CHECK(avatar_path IS NULL OR
    (avatar_path LIKE id::text || '/%' AND avatar_path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$')),
  CONSTRAINT account_avatar_https CHECK(avatar_url IS NULL OR
    (length(avatar_url) <= 2048 AND avatar_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$')),
  CONSTRAINT account_avatar_single_reference CHECK(avatar_path IS NULL OR avatar_url IS NULL)
);
COMMENT ON TABLE public.user_accounts IS 'Private account drafts linked only to auth.users. Not a public tutor listing. Role is immutable to browser clients.';

CREATE OR REPLACE FUNCTION public.touch_user_account_version()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS user_account_version ON public.user_accounts;
CREATE TRIGGER user_account_version BEFORE UPDATE ON public.user_accounts
FOR EACH ROW EXECUTE FUNCTION public.touch_user_account_version();

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_accounts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.user_accounts TO authenticated;
GRANT INSERT(id,role,profile,avatar_path,avatar_url) ON public.user_accounts TO authenticated;
GRANT UPDATE(profile,avatar_path,avatar_url) ON public.user_accounts TO authenticated;
GRANT ALL ON public.user_accounts TO service_role;
DROP POLICY IF EXISTS account_read_own ON public.user_accounts;
CREATE POLICY account_read_own ON public.user_accounts FOR SELECT TO authenticated USING(id = (SELECT auth.uid()));
DROP POLICY IF EXISTS account_create_own ON public.user_accounts;
CREATE POLICY account_create_own ON public.user_accounts FOR INSERT TO authenticated WITH CHECK(id = (SELECT auth.uid()));
DROP POLICY IF EXISTS account_update_own ON public.user_accounts;
CREATE POLICY account_update_own ON public.user_accounts FOR UPDATE TO authenticated USING(id = (SELECT auth.uid())) WITH CHECK(id = (SELECT auth.uid()));
REVOKE ALL ON FUNCTION public.touch_user_account_version() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.is_valid_account_profile(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_valid_account_profile(text,jsonb) TO authenticated,service_role;

-- Close legacy prototype access before handling authenticated profiles.
-- Preserve the explicit public tutor display columns used by the catalog adapter.
REVOKE ALL ON public.profiles,public.students,public.student_requests,public.saved_tutors,public.tutors FROM PUBLIC,anon,authenticated;
GRANT SELECT(id,full_name,avatar_url) ON public.profiles TO anon,authenticated;
GRANT SELECT(id,title,institution,experience_years,rate_per_hour,verified,sector,next_available,
  modalities,subjects,levels,specialties,bio,methodology_steps) ON public.tutors TO anon,authenticated;
DROP POLICY IF EXISTS "Perfiles públicos visibles" ON public.profiles;
DROP POLICY IF EXISTS profiles_public_tutor_identity ON public.profiles;
CREATE POLICY profiles_public_tutor_identity ON public.profiles FOR SELECT TO anon,authenticated
USING(EXISTS(SELECT 1 FROM public.tutors WHERE tutors.id = profiles.id));
DROP POLICY IF EXISTS "Estudiantes visibles para propósitos académicos" ON public.students;
DROP POLICY IF EXISTS "Solicitudes visibles para participantes" ON public.student_requests;
DROP POLICY IF EXISTS "Insertar solicitudes" ON public.student_requests;
DROP POLICY IF EXISTS "Actualizar estado de solicitudes" ON public.student_requests;
REVOKE ALL ON FUNCTION public.search_tutors_nearby(double precision,double precision,double precision,text,numeric) FROM PUBLIC,anon,authenticated;

-- Private photos: the public catalog does not receive these paths or signed URLs.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('profile-avatars','profile-avatars',false,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=5242880,allowed_mime_types=EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS account_avatar_read ON storage.objects;
CREATE POLICY account_avatar_read ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='profile-avatars' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS account_avatar_insert ON storage.objects;
CREATE POLICY account_avatar_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='profile-avatars' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
  AND EXISTS(SELECT 1 FROM public.user_accounts WHERE id=(SELECT auth.uid())));
DROP POLICY IF EXISTS account_avatar_delete ON storage.objects;
CREATE POLICY account_avatar_delete ON storage.objects FOR DELETE TO authenticated
USING(bucket_id='profile-avatars' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
-- No browser object UPDATE: immutable unique filenames avoid overwriting another tab's photo.
NOTIFY pgrst, 'reload schema';
COMMIT;
