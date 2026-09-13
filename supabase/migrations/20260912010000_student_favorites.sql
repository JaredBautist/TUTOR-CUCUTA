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
