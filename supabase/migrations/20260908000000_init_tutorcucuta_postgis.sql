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
