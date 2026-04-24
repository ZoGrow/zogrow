-- Create profiles table for user settings
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  agency_name TEXT,
  agency_website TEXT,
  email_alerts BOOLEAN DEFAULT true,
  low_roas_alert BOOLEAN DEFAULT true,
  high_cpl_alert BOOLEAN DEFAULT false,
  weekly_reports BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  platform TEXT DEFAULT 'Meta',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Campaigns inherit client access (users see campaigns for their clients, admins see all)
CREATE POLICY "Users can view campaigns for their clients"
ON public.campaigns
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (SELECT 1 FROM public.clients WHERE clients.id = campaigns.client_id AND clients.user_id = auth.uid())
);

CREATE POLICY "Users can manage campaigns for their clients"
ON public.campaigns
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (SELECT 1 FROM public.clients WHERE clients.id = campaigns.client_id AND clients.user_id = auth.uid())
);

-- Create metrics table for real data persistence
CREATE TABLE public.metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ad_spend DECIMAL(12,2) DEFAULT 0,
  leads INTEGER DEFAULT 0,
  dials_made INTEGER DEFAULT 0,
  pickups INTEGER DEFAULT 0,
  appointments_booked INTEGER DEFAULT 0,
  appointments_showed INTEGER DEFAULT 0,
  deals_closed INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, campaign_id, date)
);

-- Enable RLS on metrics
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;

-- Metrics inherit client access
CREATE POLICY "Users can view metrics for their clients"
ON public.metrics
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (SELECT 1 FROM public.clients WHERE clients.id = metrics.client_id AND clients.user_id = auth.uid())
);

CREATE POLICY "Users can insert metrics for their clients"
ON public.metrics
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (SELECT 1 FROM public.clients WHERE clients.id = metrics.client_id AND clients.user_id = auth.uid())
);

CREATE POLICY "Users can update metrics for their clients"
ON public.metrics
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (SELECT 1 FROM public.clients WHERE clients.id = metrics.client_id AND clients.user_id = auth.uid())
);

CREATE POLICY "Users can delete metrics for their clients"
ON public.metrics
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (SELECT 1 FROM public.clients WHERE clients.id = metrics.client_id AND clients.user_id = auth.uid())
);

-- Create indexes for better query performance
CREATE INDEX idx_metrics_client_date ON public.metrics(client_id, date);
CREATE INDEX idx_metrics_date ON public.metrics(date);
CREATE INDEX idx_campaigns_client ON public.campaigns(client_id);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);

-- Create trigger to auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metrics_updated_at
BEFORE UPDATE ON public.metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();