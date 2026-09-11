-- An unevaluated request has no compatibility score. Existing records are preserved.
ALTER TABLE public.student_requests ALTER COLUMN match_score DROP DEFAULT;
