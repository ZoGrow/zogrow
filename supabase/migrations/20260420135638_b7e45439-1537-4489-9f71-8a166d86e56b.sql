UPDATE public.metrics
SET dials_made = 0,
    pickups = 0,
    self_booked = 0,
    sales_team_booked = 0,
    appointments_booked = 0,
    appointments_showed = 0,
    live_transfers = 0,
    deals_closed = 0,
    revenue = 0,
    contracts_signed = 0,
    setter = NULL
WHERE campaign_id IS NOT NULL;