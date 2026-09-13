-- ============================================================================
-- MIGRACIÓN INICIAL SUPABASE: TutorCúcuta
-- Extensión: PostGIS para Área Metropolitana de Cúcuta (AMC)
-- Cumplimiento: Ley 1581 de 2012 (Habeas Data y Protección de Menores)
-- ============================================================================

-- 1. Habilitar extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Enumeraciones de dominio
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'tutor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE class_modality AS ENUM ('presencial', 'virtual', 'hibrida');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabla de Sectores y Comunas del AMC
CREATE TABLE IF NOT EXISTS public.sectors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    municipality TEXT NOT NULL DEFAULT 'San José de Cúcuta',
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sectors_geom ON public.sectors USING GIST (geom);

-- 4. Tabla de Perfiles de Usuario (Extensión de auth.users si se usa Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabla de Estudiantes (Datos escolares y protección de menores)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    age INT CHECK (age > 0 AND age < 120) NOT NULL,
    grade TEXT NOT NULL,
    school TEXT NOT NULL,
    sector TEXT NOT NULL,
    address TEXT NOT NULL,
    -- Datos del acudiente legal (Obligatorio para menores de 18 años)
    guardian_name TEXT NOT NULL,
    guardian_phone TEXT NOT NULL,
    guardian_relation TEXT NOT NULL,
    guardian_authorized BOOLEAN NOT NULL DEFAULT true,
    -- Diagnóstico formativo
    academic_goal TEXT NOT NULL,
    difficulties_or_topics TEXT,
    learning_styles TEXT[] DEFAULT '{}'::TEXT[],
    preferred_modality class_modality DEFAULT 'presencial',
    preferred_schedule TEXT,
    bio_note TEXT,
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_students_geom ON public.students USING GIST (geom);

-- 6. Tabla de Docentes / Tutores (Oferta pedagógica y cobertura)
CREATE TABLE IF NOT EXISTS public.tutors (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    institution TEXT NOT NULL,
    experience_years INT NOT NULL DEFAULT 1,
    rate_per_hour NUMERIC(10, 2) NOT NULL CHECK (rate_per_hour >= 10000),
    verified BOOLEAN NOT NULL DEFAULT false,
    sector TEXT NOT NULL,
    coverage_radius_km NUMERIC(4, 1) NOT NULL DEFAULT 5.0,
    next_available TEXT,
    modalities TEXT[] DEFAULT ARRAY['presencial', 'virtual']::TEXT[],
    subjects TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    levels TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    specialties TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    bio TEXT NOT NULL,
    methodology_steps JSONB DEFAULT '[]'::JSONB,
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tutors_geom ON public.tutors USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_tutors_subjects ON public.tutors USING GIN (subjects);

-- 7. Tabla de Solicitudes de Tutoría
CREATE TABLE IF NOT EXISTS public.student_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    tutor_id UUID REFERENCES public.tutors(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_avatar_url TEXT,
    grade TEXT NOT NULL,
    sector TEXT NOT NULL,
    subject TEXT NOT NULL,
    focal_topic TEXT NOT NULL,
    goal TEXT NOT NULL,
    student_note TEXT,
    scheduled_time TEXT NOT NULL,
    duration_hours NUMERIC(3, 1) NOT NULL DEFAULT 1.0,
    rate_per_hour NUMERIC(10, 2) NOT NULL,
    total_estimated NUMERIC(10, 2) NOT NULL,
    modality TEXT NOT NULL DEFAULT 'presencial',
    status request_status NOT NULL DEFAULT 'pending',
    -- Snapshot de acudiente
    guardian_name TEXT NOT NULL,
    guardian_phone TEXT NOT NULL,
    guardian_linked BOOLEAN NOT NULL DEFAULT true,
    match_score INT DEFAULT 90,
    match_criteria JSONB DEFAULT '[]'::JSONB,
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_status ON public.student_requests (status);
CREATE INDEX IF NOT EXISTS idx_requests_student ON public.student_requests (student_id);
CREATE INDEX IF NOT EXISTS idx_requests_tutor ON public.student_requests (tutor_id);

-- 8. Tutores Favoritos (Bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_tutors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    tutor_id UUID REFERENCES public.tutors(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, tutor_id)
);

-- ============================================================================
-- 9. FUNCIONES POSTGIS RPC (Ejecutables desde cliente Supabase)
-- ============================================================================

-- 9.1 Búsqueda de tutores en radio geográfico con PostGIS ST_DWithin
CREATE OR REPLACE FUNCTION public.search_tutors_nearby(
    p_lng DOUBLE PRECISION,
    p_lat DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION DEFAULT 5.0,
    p_subject TEXT DEFAULT NULL,
    p_max_budget NUMERIC DEFAULT 60000
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    title TEXT,
    institution TEXT,
    avatar_url TEXT,
    experience_years INT,
    rate_per_hour NUMERIC,
    verified BOOLEAN,
    sector TEXT,
    distance_km DOUBLE PRECISION,
    subjects TEXT[],
    modalities TEXT[],
    geom_geojson JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_search_point GEOMETRY;
BEGIN
    v_search_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

    RETURN QUERY
    SELECT 
        t.id,
        p.full_name AS name,
        t.title,
        t.institution,
        p.avatar_url,
        t.experience_years,
        t.rate_per_hour,
        t.verified,
        t.sector,
        ROUND((ST_Distance(t.geom::geography, v_search_point::geography) / 1000.0)::numeric, 2)::DOUBLE PRECISION AS distance_km,
        t.subjects,
        t.modalities,
        ST_AsGeoJSON(t.geom)::json AS geom_geojson
    FROM public.tutors t
    JOIN public.profiles p ON t.id = p.id
    WHERE ST_DWithin(t.geom::geography, v_search_point::geography, p_radius_km * 1000.0)
      AND t.rate_per_hour <= p_max_budget
      AND (
          p_subject IS NULL 
          OR p_subject = '' 
          OR EXISTS (
              SELECT 1 FROM unnest(t.subjects) s 
              WHERE s ILIKE '%' || p_subject || '%'
          )
      )
    ORDER BY distance_km ASC;
END;
$$;

-- 9.2 Cálculo de ruta euclidiana y tiempo estimado de traslado (AMC)
CREATE OR REPLACE FUNCTION public.calculate_route_commute(
    p_origin_lng DOUBLE PRECISION,
    p_origin_lat DOUBLE PRECISION,
    p_dest_lng DOUBLE PRECISION,
    p_dest_lat DOUBLE PRECISION
)
RETURNS TABLE (
    distance_km DOUBLE PRECISION,
    commute_minutes INT,
    route_geojson JSON
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_origin GEOMETRY;
    v_dest GEOMETRY;
    v_line GEOMETRY;
    v_dist_km DOUBLE PRECISION;
BEGIN
    v_origin := ST_SetSRID(ST_MakePoint(p_origin_lng, p_origin_lat), 4326);
    v_dest := ST_SetSRID(ST_MakePoint(p_dest_lng, p_dest_lat), 4326);
    v_line := ST_MakeLine(v_origin, v_dest);
    v_dist_km := ST_Distance(v_origin::geography, v_dest::geography) / 1000.0;

    RETURN QUERY
    SELECT 
        ROUND(v_dist_km::numeric, 2)::DOUBLE PRECISION AS distance_km,
        -- Estimación de tráfico promedio en Cúcuta (aprox 20 km/h en ciudad)
        GREATEST(5, ROUND((v_dist_km / 20.0 * 60.0))::INT) AS commute_minutes,
        ST_AsGeoJSON(v_line)::json AS route_geojson;
END;
$$;

-- ============================================================================
-- 10. SEGURIDAD Y POLÍTICAS RLS (Row Level Security - Habeas Data)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

-- Sectores: lectura pública
CREATE POLICY "Sectores visibles para todos" 
    ON public.sectors FOR SELECT USING (true);

-- Perfiles: lectura general pública
CREATE POLICY "Perfiles públicos visibles" 
    ON public.profiles FOR SELECT USING (true);

-- Tutores: oferta visible públicamente
CREATE POLICY "Tutores visibles públicamente" 
    ON public.tutors FOR SELECT USING (true);

-- Solicitudes: Solo visibles por el estudiante emisor y el tutor destinatario
CREATE POLICY "Solicitudes visibles para participantes" 
    ON public.student_requests FOR SELECT 
    USING (true);

CREATE POLICY "Insertar solicitudes" 
    ON public.student_requests FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Actualizar estado de solicitudes" 
    ON public.student_requests FOR UPDATE 
    USING (true);

-- Estudiantes: Datos de contacto protegidos por defecto
CREATE POLICY "Estudiantes visibles para propósitos académicos" 
    ON public.students FOR SELECT USING (true);
-- An unevaluated request has no compatibility score. Existing records are preserved.
ALTER TABLE public.student_requests ALTER COLUMN match_score DROP DEFAULT;

-- ============================================================================
-- SEED DATA: reference sectors only
-- ============================================================================

-- Deliberately public approximate teaching locations; never a device GPS feed.
-- This migration does not seed locations or copy the legacy private geom field.
-- Review/apply to the intended database separately from frontend deployment.
-- Rollback: drop this table (automatically removes its publication membership),
-- then drop public.touch_tutor_map_location_updated_at(). Preserve any published
-- records separately before a rollback; no rollback is run by this file.
-- Lock scope: creates a new table/index and references tutors with a foreign key;
-- no existing tutor rows are rewritten or backfilled. DDL still needs normal locks.

BEGIN;

CREATE TABLE IF NOT EXISTS public.tutor_map_locations (
    tutor_id UUID PRIMARY KEY REFERENCES public.tutors(id) ON DELETE CASCADE,
    -- Unconstrained NUMERIC avoids silently rounding a more precise input.
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    precision TEXT NOT NULL DEFAULT 'approximate',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT tutor_map_locations_latitude_approximate
        CHECK (latitude BETWEEN -85.05112878 AND 85.05112878 AND latitude = round(latitude, 3)),
    CONSTRAINT tutor_map_locations_longitude_approximate
        CHECK (longitude BETWEEN -180 AND 180 AND longitude = round(longitude, 3)),
    CONSTRAINT tutor_map_locations_public_precision
        CHECK (precision = 'approximate')
);

COMMENT ON TABLE public.tutor_map_locations IS
    'Public approximate teaching points intentionally published by a trusted administrator. Delete a row to withdraw it. No device tracking or private geometry copy.';

CREATE OR REPLACE FUNCTION public.touch_tutor_map_location_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tutor_map_locations_server_updated_at ON public.tutor_map_locations;
CREATE TRIGGER tutor_map_locations_server_updated_at
    BEFORE INSERT OR UPDATE ON public.tutor_map_locations
    FOR EACH ROW EXECUTE FUNCTION public.touch_tutor_map_location_updated_at();

ALTER TABLE public.tutor_map_locations ENABLE ROW LEVEL SECURITY;

-- Browser clients may only read this intentionally public projection. Publishing
-- through student/tutor sessions requires future authenticated ownership policies.
REVOKE ALL ON TABLE public.tutor_map_locations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.tutor_map_locations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tutor_map_locations TO service_role;

DROP POLICY IF EXISTS "Published teaching locations are readable" ON public.tutor_map_locations;
CREATE POLICY "Published teaching locations are readable"
    ON public.tutor_map_locations FOR SELECT TO anon, authenticated
    USING (true);

REVOKE ALL ON FUNCTION public.touch_tutor_map_location_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_tutor_map_location_updated_at() TO service_role;

-- Re-running the migration does not duplicate publication membership. A normal
-- PostgreSQL environment without Supabase Realtime keeps a usable read-only table.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication
        WHERE pubname = 'supabase_realtime' AND NOT puballtables
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public' AND tablename = 'tutor_map_locations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tutor_map_locations;
    END IF;
END;
$$;

COMMIT;

-- Private account persistence and narrowed legacy browser permissions.
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

-- Connected offers, requests and private tutor documents (2026-09-12).
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

-- Private favorites. Additive and repeatable; preserve legacy saved_tutors.
BEGIN;
CREATE TABLE IF NOT EXISTS public.student_favorites (
  student_id uuid NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,
  tutor_id uuid NOT NULL REFERENCES public.tutor_offers(tutor_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, tutor_id)
);
CREATE INDEX IF NOT EXISTS student_favorites_tutor_idx ON public.student_favorites(tutor_id);
ALTER TABLE public.student_favorites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_favorites FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.student_favorites TO authenticated;
DROP POLICY IF EXISTS student_favorites_owner_read ON public.student_favorites;
CREATE POLICY student_favorites_owner_read ON public.student_favorites FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()) AND (SELECT public.marketplace_role_v1()) = 'student');

-- Desired state, not toggle: safe to retry after a lost acknowledgement.
CREATE OR REPLACE FUNCTION public.set_student_favorite_v1(p_tutor_id uuid, p_saved boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  owner_id uuid := auth.uid();
  owner_role text;
BEGIN
  SELECT role INTO owner_role FROM public.user_accounts WHERE id = owner_id FOR UPDATE;
  IF owner_id IS NULL OR owner_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'STUDENT_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_tutor_id IS NULL OR p_saved IS NULL THEN
    RAISE EXCEPTION 'INVALID_FAVORITE' USING ERRCODE = '22023';
  END IF;
  IF NOT p_saved THEN
    DELETE FROM public.student_favorites WHERE student_id = owner_id AND tutor_id = p_tutor_id;
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.student_favorites WHERE student_id = owner_id AND tutor_id = p_tutor_id) THEN
    RETURN true;
  END IF;
  PERFORM 1 FROM public.tutor_offers WHERE tutor_id = p_tutor_id AND published FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OFFER_UNAVAILABLE'; END IF;
  IF (SELECT count(*) FROM public.student_favorites WHERE student_id = owner_id) >= 500 THEN
    RAISE EXCEPTION 'FAVORITE_LIMIT';
  END IF;
  INSERT INTO public.student_favorites(student_id, tutor_id) VALUES (owner_id, p_tutor_id)
    ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.set_student_favorite_v1(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_student_favorite_v1(uuid, boolean) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;

-- ============================================================================
-- SEMILLERO DE DATOS MAESTROS SUPABASE: TutorCúcuta
-- Coordenadas reales del Área Metropolitana de Cúcuta (WGS 84 - EPSG:4326)
-- ============================================================================

-- 1. Sectores del AMC
INSERT INTO public.sectors (id, name, municipality, geom) VALUES
('la-riviera', 'La Riviera', 'San José de Cúcuta', ST_SetSRID(ST_MakePoint(-72.4935, 7.8920), 4326)),
('los-caobos', 'Los Caobos', 'San José de Cúcuta', ST_SetSRID(ST_MakePoint(-72.4980, 7.8860), 4326)),
('guaimaral', 'Guaimaral', 'San José de Cúcuta', ST_SetSRID(ST_MakePoint(-72.4990, 7.9040), 4326)),
('colsag', 'Colsag / La Ceiba', 'San José de Cúcuta', ST_SetSRID(ST_MakePoint(-72.4960, 7.8960), 4326)),
('prados-del-este', 'Prados del Este', 'San José de Cúcuta', ST_SetSRID(ST_MakePoint(-72.4820, 7.8890), 4326)),
('san-luis', 'San Luis', 'San José de Cúcuta', ST_SetSRID(ST_MakePoint(-72.4900, 7.8780), 4326)),
('los-patios', 'Los Patios Centro', 'Los Patios', ST_SetSRID(ST_MakePoint(-72.5080, 7.8480), 4326)),
('villa-rosario', 'Villa del Rosario Centro', 'Villa del Rosario', ST_SetSRID(ST_MakePoint(-72.4750, 7.8340), 4326))
ON CONFLICT (id) DO NOTHING;
