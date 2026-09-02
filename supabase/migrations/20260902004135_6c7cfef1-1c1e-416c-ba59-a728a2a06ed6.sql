ALTER TABLE public.dial_logs
  ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disposition text,
  ADD COLUMN IF NOT EXISTS agent_name text,
  ADD COLUMN IF NOT EXISTS campaign_name text,
  ADD COLUMN IF NOT EXISTS dialer_source text;

CREATE INDEX IF NOT EXISTS dial_logs_client_dialed_at_idx ON public.dial_logs (client_id, dialed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS dial_logs_external_event_id_uidx ON public.dial_logs (external_event_id) WHERE external_event_id IS NOT NULL;