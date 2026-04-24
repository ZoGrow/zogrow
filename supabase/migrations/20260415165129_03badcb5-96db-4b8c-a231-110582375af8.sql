
CREATE TABLE public.lead_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  source TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on lead_logs"
  ON public.lead_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "CEO and admins can manage lead_logs"
  ON public.lead_logs FOR ALL TO authenticated
  USING (has_full_access(auth.uid()))
  WITH CHECK (has_full_access(auth.uid()));

CREATE POLICY "ISA users can view lead_logs"
  ON public.lead_logs FOR SELECT TO authenticated
  USING (can_manage_clients(auth.uid()));

CREATE INDEX idx_lead_logs_client_date ON public.lead_logs (client_id, received_at);
CREATE INDEX idx_lead_logs_contact ON public.lead_logs (contact_id);
CREATE INDEX idx_lead_logs_contact_phone ON public.lead_logs (contact_phone);
