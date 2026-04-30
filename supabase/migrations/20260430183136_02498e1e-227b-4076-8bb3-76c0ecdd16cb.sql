CREATE TABLE public.sms_outreach_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  messages_sent INTEGER DEFAULT 0,
  responses INTEGER DEFAULT 0,
  positive_responses INTEGER DEFAULT 0,
  sdr_calls_booked INTEGER DEFAULT 0,
  sdr_calls_showed INTEGER DEFAULT 0,
  demos_booked INTEGER DEFAULT 0,
  demos_showed INTEGER DEFAULT 0,
  deals_closed INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_outreach_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CEO and admins can view sms outreach metrics"
ON public.sms_outreach_metrics FOR SELECT
USING (has_full_access(auth.uid()));

CREATE POLICY "CEO and admins can insert sms outreach metrics"
ON public.sms_outreach_metrics FOR INSERT
WITH CHECK (has_full_access(auth.uid()));

CREATE POLICY "CEO and admins can update sms outreach metrics"
ON public.sms_outreach_metrics FOR UPDATE
USING (has_full_access(auth.uid()));

CREATE POLICY "CEO and admins can delete sms outreach metrics"
ON public.sms_outreach_metrics FOR DELETE
USING (has_full_access(auth.uid()));

CREATE TRIGGER update_sms_outreach_metrics_updated_at
BEFORE UPDATE ON public.sms_outreach_metrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();