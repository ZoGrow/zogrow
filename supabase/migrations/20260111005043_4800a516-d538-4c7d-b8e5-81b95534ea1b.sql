-- Add setter column to metrics table to track who booked appointments
ALTER TABLE public.metrics 
ADD COLUMN setter text;