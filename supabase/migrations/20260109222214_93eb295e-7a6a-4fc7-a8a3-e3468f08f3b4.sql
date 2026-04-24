-- Create sales_metrics table for frontend sales tracking
CREATE TABLE public.sales_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'daily' CHECK (period_type IN ('daily', 'monthly')),
  
  -- Call Activity
  new_calls_scheduled INTEGER DEFAULT 0,
  followup_calls_scheduled INTEGER DEFAULT 0,
  new_calls_taken INTEGER DEFAULT 0,
  qualified_calls_taken INTEGER DEFAULT 0,
  followup_calls_taken INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  cancelled INTEGER DEFAULT 0,
  rescheduled INTEGER DEFAULT 0,
  
  -- Closes & Revenue
  new_closes INTEGER DEFAULT 0,
  new_mrr NUMERIC DEFAULT 0,
  upsell_mrr NUMERIC DEFAULT 0,
  otp NUMERIC DEFAULT 0,
  cash_committed NUMERIC DEFAULT 0,
  total_cash_collected NUMERIC DEFAULT 0,
  
  -- Client Retention (for monthly)
  base_starting_mrr NUMERIC DEFAULT 0,
  base_clients INTEGER DEFAULT 0,
  lost_clients INTEGER DEFAULT 0,
  lost_mrr NUMERIC DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint for date + period_type
  UNIQUE(date, period_type)
);

-- Enable RLS
ALTER TABLE public.sales_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies - Only admins can manage sales metrics
CREATE POLICY "Admins can view sales metrics"
ON public.sales_metrics
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert sales metrics"
ON public.sales_metrics
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sales metrics"
ON public.sales_metrics
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sales metrics"
ON public.sales_metrics
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_sales_metrics_updated_at
BEFORE UPDATE ON public.sales_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();