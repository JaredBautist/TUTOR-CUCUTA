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
