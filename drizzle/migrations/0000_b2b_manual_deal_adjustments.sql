ALTER TABLE public.b2b_ads_metrics ADD COLUMN manual_deals_closed integer NOT NULL DEFAULT 0;
ALTER TABLE public.b2b_ads_metrics ADD COLUMN manual_revenue numeric NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.b2b_ads_metrics.manual_deals_closed IS 'Manual deal adjustments added on top of GHL-synced deals_closed; preserved across syncs';
COMMENT ON COLUMN public.b2b_ads_metrics.manual_revenue IS 'Manual revenue adjustments added on top of GHL-synced revenue; preserved across syncs';