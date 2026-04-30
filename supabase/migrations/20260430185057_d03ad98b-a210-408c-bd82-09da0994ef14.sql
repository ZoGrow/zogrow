ALTER TABLE public.sms_outreach_metrics
  ADD COLUMN IF NOT EXISTS sdr_name TEXT,
  ADD COLUMN IF NOT EXISTS intros_rescheduled INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intro_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS power_dials INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monday_item_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Drop old unique-on-date constraint so multiple SDRs per day can exist
ALTER TABLE public.sms_outreach_metrics DROP CONSTRAINT IF EXISTS sms_outreach_metrics_date_key;

-- Unique per Monday item so re-syncs upsert cleanly
CREATE UNIQUE INDEX IF NOT EXISTS sms_outreach_monday_item_idx
  ON public.sms_outreach_metrics(monday_item_id)
  WHERE monday_item_id IS NOT NULL;

-- Helpful index for date filtering
CREATE INDEX IF NOT EXISTS sms_outreach_date_idx ON public.sms_outreach_metrics(date);