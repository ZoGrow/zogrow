CREATE TABLE public.client_integrations (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  ghl_api_key text,
  ghl_location_id text,
  ghl_pipeline_name text,
  ghl_pipeline_id text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_integrations TO authenticated;
GRANT ALL ON public.client_integrations TO service_role;

ALTER TABLE public.client_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access roles can view client integrations"
ON public.client_integrations FOR SELECT TO authenticated
USING (public.has_full_access(auth.uid()));

CREATE POLICY "Full access roles can insert client integrations"
ON public.client_integrations FOR INSERT TO authenticated
WITH CHECK (public.has_full_access(auth.uid()));

CREATE POLICY "Full access roles can update client integrations"
ON public.client_integrations FOR UPDATE TO authenticated
USING (public.has_full_access(auth.uid()))
WITH CHECK (public.has_full_access(auth.uid()));

CREATE POLICY "Full access roles can delete client integrations"
ON public.client_integrations FOR DELETE TO authenticated
USING (public.has_full_access(auth.uid()));

CREATE TRIGGER update_client_integrations_updated_at
BEFORE UPDATE ON public.client_integrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_client_integrations
AFTER INSERT OR UPDATE OR DELETE ON public.client_integrations
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();