
-- Create pipeline stage enum
CREATE TYPE public.pipeline_stage AS ENUM (
  'live_transfer_received',
  'connected',
  'not_connected',
  'appointment_booked',
  'appointment_held',
  'sent_to_lender',
  'showing_property',
  'docs_signed',
  'deal_closed'
);

-- Create deal_pipeline table
CREATE TABLE public.deal_pipeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  appointment_at TIMESTAMP WITH TIME ZONE,
  isa_notes TEXT,
  stage public.pipeline_stage NOT NULL DEFAULT 'live_transfer_received',
  source TEXT NOT NULL DEFAULT 'manual',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_pipeline_client_stage ON public.deal_pipeline(client_id, stage, position);

ALTER TABLE public.deal_pipeline ENABLE ROW LEVEL SECURITY;

-- Service role (webhooks) full access
CREATE POLICY "Service role full access on deal_pipeline"
ON public.deal_pipeline
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated viewing
CREATE POLICY "Users can view pipeline for their clients"
ON public.deal_pipeline
FOR SELECT
TO authenticated
USING (
  has_full_access(auth.uid())
  OR can_manage_clients(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = deal_pipeline.client_id
    AND clients.user_id = auth.uid()
  )
);

-- Authenticated insert
CREATE POLICY "Users can insert pipeline for their clients"
ON public.deal_pipeline
FOR INSERT
TO authenticated
WITH CHECK (
  has_full_access(auth.uid())
  OR can_manage_clients(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = deal_pipeline.client_id
    AND clients.user_id = auth.uid()
  )
);

-- Authenticated update
CREATE POLICY "Users can update pipeline for their clients"
ON public.deal_pipeline
FOR UPDATE
TO authenticated
USING (
  has_full_access(auth.uid())
  OR can_manage_clients(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = deal_pipeline.client_id
    AND clients.user_id = auth.uid()
  )
);

-- Authenticated delete
CREATE POLICY "Users can delete pipeline for their clients"
ON public.deal_pipeline
FOR DELETE
TO authenticated
USING (
  has_full_access(auth.uid())
  OR can_manage_clients(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = deal_pipeline.client_id
    AND clients.user_id = auth.uid()
  )
);

-- Updated at trigger
CREATE TRIGGER update_deal_pipeline_updated_at
BEFORE UPDATE ON public.deal_pipeline
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
