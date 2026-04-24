-- Add cash_collected column to b2b_ads_metrics table
ALTER TABLE public.b2b_ads_metrics 
ADD COLUMN cash_collected numeric DEFAULT 0;