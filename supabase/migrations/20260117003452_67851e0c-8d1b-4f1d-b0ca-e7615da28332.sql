-- Create B2B Ads Metrics table with same structure as client metrics
CREATE TABLE public.b2b_ads_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ad_spend NUMERIC DEFAULT 0,
  leads INTEGER DEFAULT 0,
  dials_made INTEGER DEFAULT 0,
  pickups INTEGER DEFAULT 0,
  appointments_booked INTEGER DEFAULT 0,
  appointments_showed INTEGER DEFAULT 0,
  contracts_signed INTEGER DEFAULT 0,
  deals_closed INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.b2b_ads_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - only CEO and admins can manage B2B ads metrics
CREATE POLICY "CEO and admins can view b2b ads metrics"
ON public.b2b_ads_metrics
FOR SELECT
USING (has_full_access(auth.uid()));

CREATE POLICY "CEO and admins can insert b2b ads metrics"
ON public.b2b_ads_metrics
FOR INSERT
WITH CHECK (has_full_access(auth.uid()));

CREATE POLICY "CEO and admins can update b2b ads metrics"
ON public.b2b_ads_metrics
FOR UPDATE
USING (has_full_access(auth.uid()));

CREATE POLICY "CEO and admins can delete b2b ads metrics"
ON public.b2b_ads_metrics
FOR DELETE
USING (has_full_access(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_b2b_ads_metrics_updated_at
BEFORE UPDATE ON public.b2b_ads_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();