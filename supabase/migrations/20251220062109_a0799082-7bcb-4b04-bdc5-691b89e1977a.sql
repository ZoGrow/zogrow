-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  market TEXT NOT NULL,
  state TEXT NOT NULL,
  niche TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (since no auth yet)
CREATE POLICY "Anyone can view clients" 
ON public.clients 
FOR SELECT 
USING (true);

-- Create policy for public delete access (since no auth yet)
CREATE POLICY "Anyone can delete clients" 
ON public.clients 
FOR DELETE 
USING (true);

-- Create policy for public insert access
CREATE POLICY "Anyone can insert clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (true);

-- Create policy for public update access
CREATE POLICY "Anyone can update clients" 
ON public.clients 
FOR UPDATE 
USING (true);

-- Insert initial clients data with proper UUIDs
INSERT INTO public.clients (client_name, market, state, niche, status) VALUES
  ('Summit Realty Group', 'Phoenix', 'AZ', 'FTHB', 'active'),
  ('Coastal Properties', 'Miami', 'FL', 'Downsizer', 'active'),
  ('Mountain View Homes', 'Denver', 'CO', 'New Construction', 'active'),
  ('Lakeside Real Estate', 'Austin', 'TX', 'FTHB', 'active'),
  ('Urban Living Group', 'Seattle', 'WA', 'Downsizer', 'inactive'),
  ('Desert Sun Properties', 'Las Vegas', 'NV', 'New Construction', 'active'),
  ('Harbor Homes', 'San Diego', 'CA', 'FTHB', 'active'),
  ('Prairie Land Realty', 'Kansas City', 'MO', 'Other', 'active'),
  ('Atlantic Coast Homes', 'Charlotte', 'NC', 'Downsizer', 'inactive'),
  ('Pacific Heights Realty', 'Portland', 'OR', 'New Construction', 'active');