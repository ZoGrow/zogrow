
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS ghl_location_id TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_ghl_location ON public.clients(ghl_location_id) WHERE ghl_location_id IS NOT NULL;

ALTER TABLE public.deal_pipeline
  ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT,
  ADD COLUMN IF NOT EXISTS ghl_opportunity_id TEXT;

CREATE INDEX IF NOT EXISTS idx_deal_pipeline_ghl_opp ON public.deal_pipeline(client_id, ghl_opportunity_id) WHERE ghl_opportunity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_ghl_contact ON public.deal_pipeline(client_id, ghl_contact_id) WHERE ghl_contact_id IS NOT NULL;
