-- Add contracts_signed column to metrics table
ALTER TABLE public.metrics 
ADD COLUMN contracts_signed integer DEFAULT 0;