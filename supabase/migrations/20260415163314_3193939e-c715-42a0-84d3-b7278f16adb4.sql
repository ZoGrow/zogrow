
CREATE TABLE public.dial_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  caller_phone TEXT,
  caller_name TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  call_status TEXT,
  call_direction TEXT DEFAULT 'outbound',
  dialed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dial_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on dial_logs"
  ON public.dial_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "CEO and admins can manage dial_logs"
  ON public.dial_logs FOR ALL TO authenticated
  USING (has_full_access(auth.uid()))
  WITH CHECK (has_full_access(auth.uid()));

CREATE POLICY "ISA users can view dial_logs"
  ON public.dial_logs FOR SELECT TO authenticated
  USING (can_manage_clients(auth.uid()));

CREATE INDEX idx_dial_logs_client_date ON public.dial_logs (client_id, dialed_at);
CREATE INDEX idx_dial_logs_caller ON public.dial_logs (caller_phone);
