CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access users can view settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (public.has_full_access(auth.uid()));

CREATE POLICY "Full access users can insert settings"
ON public.app_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_full_access(auth.uid()));

CREATE POLICY "Full access users can update settings"
ON public.app_settings FOR UPDATE
TO authenticated
USING (public.has_full_access(auth.uid()))
WITH CHECK (public.has_full_access(auth.uid()));

CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (key, value) VALUES ('b2b_meta_ad_account_id', 'act_1066517286536273')
ON CONFLICT (key) DO NOTHING;