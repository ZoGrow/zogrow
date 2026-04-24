
CREATE TABLE public.b2b_lead_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id text NOT NULL,
  booking_type text NOT NULL CHECK (booking_type IN ('intro', 'demo')),
  first_booked_at timestamp with time zone NOT NULL DEFAULT now(),
  latest_booked_at timestamp with time zone NOT NULL DEFAULT now(),
  booking_count integer NOT NULL DEFAULT 1,
  UNIQUE (contact_id, booking_type)
);

ALTER TABLE public.b2b_lead_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on b2b_lead_bookings"
ON public.b2b_lead_bookings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "CEO and admins can view b2b lead bookings"
ON public.b2b_lead_bookings FOR SELECT
TO authenticated
USING (has_full_access(auth.uid()));
