UPDATE public.metrics
SET appointments_booked = COALESCE(live_transfers, 0) + COALESCE(self_booked, 0) + COALESCE(sales_team_booked, 0)
WHERE appointments_booked IS DISTINCT FROM COALESCE(live_transfers, 0) + COALESCE(self_booked, 0) + COALESCE(sales_team_booked, 0);

CREATE OR REPLACE FUNCTION public.sync_total_booked_appointments()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.appointments_booked := COALESCE(NEW.live_transfers, 0) + COALESCE(NEW.self_booked, 0) + COALESCE(NEW.sales_team_booked, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_total_booked_appointments_on_metrics ON public.metrics;

CREATE TRIGGER sync_total_booked_appointments_on_metrics
BEFORE INSERT OR UPDATE OF live_transfers, self_booked, sales_team_booked, appointments_booked
ON public.metrics
FOR EACH ROW
EXECUTE FUNCTION public.sync_total_booked_appointments();