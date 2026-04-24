ALTER TABLE public.b2b_ads_metrics
  ADD COLUMN intro_call_booked integer DEFAULT 0,
  ADD COLUMN intro_call_showed integer DEFAULT 0,
  ADD COLUMN demo_booked integer DEFAULT 0,
  ADD COLUMN demo_showed integer DEFAULT 0;