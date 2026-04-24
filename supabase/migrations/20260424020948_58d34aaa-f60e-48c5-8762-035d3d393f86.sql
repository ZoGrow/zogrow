-- 1. Add client_id to global tables (nullable for soft rollout)
ALTER TABLE public.b2b_ads_metrics ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.sales_metrics  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.b2b_lead_bookings ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

-- 2. Idempotency keys on webhook log tables
ALTER TABLE public.lead_logs ADD COLUMN IF NOT EXISTS external_event_id TEXT;
ALTER TABLE public.dial_logs ADD COLUMN IF NOT EXISTS external_event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS lead_logs_external_event_id_uidx
  ON public.lead_logs(external_event_id) WHERE external_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS dial_logs_external_event_id_uidx
  ON public.dial_logs(external_event_id) WHERE external_event_id IS NOT NULL;

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS metrics_client_date_idx           ON public.metrics(client_id, date DESC);
CREATE INDEX IF NOT EXISTS metrics_date_idx                  ON public.metrics(date DESC);
CREATE INDEX IF NOT EXISTS b2b_ads_metrics_date_idx          ON public.b2b_ads_metrics(date DESC);
CREATE INDEX IF NOT EXISTS b2b_ads_metrics_client_date_idx   ON public.b2b_ads_metrics(client_id, date DESC);
CREATE INDEX IF NOT EXISTS sales_metrics_date_idx            ON public.sales_metrics(date DESC);
CREATE INDEX IF NOT EXISTS sales_metrics_client_date_idx     ON public.sales_metrics(client_id, date DESC);
CREATE INDEX IF NOT EXISTS lead_logs_client_received_idx     ON public.lead_logs(client_id, received_at DESC);
CREATE INDEX IF NOT EXISTS dial_logs_client_dialed_idx       ON public.dial_logs(client_id, dialed_at DESC);
CREATE INDEX IF NOT EXISTS campaigns_client_idx              ON public.campaigns(client_id);

-- 4. Audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id UUID,
  table_name TEXT NOT NULL,
  row_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data JSONB,
  new_data JSONB
);

CREATE INDEX IF NOT EXISTS audit_log_table_time_idx ON public.audit_log(table_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_time_idx ON public.audit_log(actor_id, occurred_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access users can view audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_full_access(auth.uid()));

-- No INSERT/UPDATE/DELETE policies — only the SECURITY DEFINER trigger below can write.

-- 5. Audit trigger function
CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_id TEXT;
  v_old JSONB;
  v_new JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_row_id := COALESCE(v_old->>'id', v_old->>'key');
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_row_id := COALESCE(v_new->>'id', v_new->>'key');
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_row_id := COALESCE(v_new->>'id', v_new->>'key');
  END IF;

  INSERT INTO public.audit_log(actor_id, table_name, row_id, action, old_data, new_data)
  VALUES (auth.uid(), TG_TABLE_NAME, v_row_id, TG_OP, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. Attach audit triggers to important tables
DROP TRIGGER IF EXISTS audit_clients         ON public.clients;
DROP TRIGGER IF EXISTS audit_metrics         ON public.metrics;
DROP TRIGGER IF EXISTS audit_b2b_ads_metrics ON public.b2b_ads_metrics;
DROP TRIGGER IF EXISTS audit_sales_metrics   ON public.sales_metrics;
DROP TRIGGER IF EXISTS audit_app_settings    ON public.app_settings;
DROP TRIGGER IF EXISTS audit_user_roles      ON public.user_roles;

CREATE TRIGGER audit_clients         AFTER INSERT OR UPDATE OR DELETE ON public.clients         FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_metrics         AFTER INSERT OR UPDATE OR DELETE ON public.metrics         FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_b2b_ads_metrics AFTER INSERT OR UPDATE OR DELETE ON public.b2b_ads_metrics FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_sales_metrics   AFTER INSERT OR UPDATE OR DELETE ON public.sales_metrics   FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_app_settings    AFTER INSERT OR UPDATE OR DELETE ON public.app_settings    FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_user_roles      AFTER INSERT OR UPDATE OR DELETE ON public.user_roles      FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();