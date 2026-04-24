ALTER TABLE public.metrics ADD COLUMN self_booked integer DEFAULT 0;
ALTER TABLE public.metrics ADD COLUMN sales_team_booked integer DEFAULT 0;