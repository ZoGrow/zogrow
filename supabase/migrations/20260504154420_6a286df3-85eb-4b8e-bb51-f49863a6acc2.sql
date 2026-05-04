CREATE TABLE public.slack_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  channel_id text,
  client_id uuid,
  event_type text,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.slack_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access can view slack_event_log"
  ON public.slack_event_log FOR SELECT
  TO authenticated
  USING (has_full_access(auth.uid()));

CREATE POLICY "Service role manages slack_event_log"
  ON public.slack_event_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_slack_event_log_processed_at ON public.slack_event_log(processed_at DESC);