ALTER TABLE public.b2b_ads_metrics ADD COLUMN IF NOT EXISTS survey_fillouts integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.b2b_survey_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id text,
  email text,
  full_name text,
  phone text,
  source text,
  payload jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS b2b_survey_submissions_contact_idx
  ON public.b2b_survey_submissions (contact_id) WHERE contact_id IS NOT NULL;

GRANT SELECT ON public.b2b_survey_submissions TO authenticated;
GRANT ALL ON public.b2b_survey_submissions TO service_role;

ALTER TABLE public.b2b_survey_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view survey submissions"
  ON public.b2b_survey_submissions FOR SELECT TO authenticated USING (true);