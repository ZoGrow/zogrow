-- Add qualified_showed field to track qualified shown appointments
ALTER TABLE public.b2b_ads_metrics 
ADD COLUMN qualified_showed INTEGER DEFAULT 0;