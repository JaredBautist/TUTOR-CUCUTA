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
