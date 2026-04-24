-- Add qualified_leads column to b2b_ads_metrics table
ALTER TABLE public.b2b_ads_metrics 
ADD COLUMN qualified_leads integer DEFAULT 0;