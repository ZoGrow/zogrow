DROP INDEX IF EXISTS public.sms_outreach_monday_item_idx;
ALTER TABLE public.sms_outreach_metrics
  ADD CONSTRAINT sms_outreach_monday_item_unique UNIQUE (monday_item_id);