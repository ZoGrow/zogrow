-- Update RLS policies to recognize CEO as full access and ISA for client management

-- Update clients policies to include CEO and ISA
DROP POLICY IF EXISTS "Users can view their own clients or admins see all" ON public.clients;
CREATE POLICY "Users can view their own clients or full access see all" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (
  public.has_full_access(auth.uid()) 
  OR public.can_manage_clients(auth.uid())
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Only admins can insert clients" ON public.clients;
CREATE POLICY "CEO and admins can insert clients" 
ON public.clients 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_full_access(auth.uid()));

DROP POLICY IF EXISTS "Only admins can update clients" ON public.clients;
CREATE POLICY "CEO and admins can update clients" 
ON public.clients 
FOR UPDATE 
TO authenticated
USING (public.has_full_access(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete clients" ON public.clients;
CREATE POLICY "CEO and admins can delete clients" 
ON public.clients 
FOR DELETE 
TO authenticated
USING (public.has_full_access(auth.uid()));

-- Update metrics policies to include CEO and ISA
DROP POLICY IF EXISTS "Users can view metrics for their clients" ON public.metrics;
CREATE POLICY "Users can view metrics for their clients" 
ON public.metrics 
FOR SELECT 
TO authenticated
USING (
  public.has_full_access(auth.uid()) 
  OR public.can_manage_clients(auth.uid())
  OR EXISTS (SELECT 1 FROM clients WHERE clients.id = metrics.client_id AND clients.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert metrics for their clients" ON public.metrics;
CREATE POLICY "Users can insert metrics for their clients" 
ON public.metrics 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.has_full_access(auth.uid()) 
  OR public.can_manage_clients(auth.uid())
  OR EXISTS (SELECT 1 FROM clients WHERE clients.id = metrics.client_id AND clients.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update metrics for their clients" ON public.metrics;
CREATE POLICY "Users can update metrics for their clients" 
ON public.metrics 
FOR UPDATE 
TO authenticated
USING (
  public.has_full_access(auth.uid()) 
  OR public.can_manage_clients(auth.uid())
  OR EXISTS (SELECT 1 FROM clients WHERE clients.id = metrics.client_id AND clients.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete metrics for their clients" ON public.metrics;
CREATE POLICY "Users can delete metrics for their clients" 
ON public.metrics 
FOR DELETE 
TO authenticated
USING (
  public.has_full_access(auth.uid()) 
  OR public.can_manage_clients(auth.uid())
  OR EXISTS (SELECT 1 FROM clients WHERE clients.id = metrics.client_id AND clients.user_id = auth.uid())
);

-- Update sales_metrics policies to include CEO (ISA cannot see sales)
DROP POLICY IF EXISTS "Admins can view sales metrics" ON public.sales_metrics;
CREATE POLICY "CEO and admins can view sales metrics" 
ON public.sales_metrics 
FOR SELECT 
TO authenticated
USING (public.has_full_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert sales metrics" ON public.sales_metrics;
CREATE POLICY "CEO and admins can insert sales metrics" 
ON public.sales_metrics 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_full_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can update sales metrics" ON public.sales_metrics;
CREATE POLICY "CEO and admins can update sales metrics" 
ON public.sales_metrics 
FOR UPDATE 
TO authenticated
USING (public.has_full_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete sales metrics" ON public.sales_metrics;
CREATE POLICY "CEO and admins can delete sales metrics" 
ON public.sales_metrics 
FOR DELETE 
TO authenticated
USING (public.has_full_access(auth.uid()));

-- Update user_roles policies to include CEO
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "CEO and admins can manage roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (public.has_full_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "CEO and admins can view all roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (public.has_full_access(auth.uid()));

-- Update campaigns policies
DROP POLICY IF EXISTS "Users can view campaigns for their clients" ON public.campaigns;
CREATE POLICY "Users can view campaigns for their clients" 
ON public.campaigns 
FOR SELECT 
TO authenticated
USING (
  public.has_full_access(auth.uid()) 
  OR public.can_manage_clients(auth.uid())
  OR EXISTS (SELECT 1 FROM clients WHERE clients.id = campaigns.client_id AND clients.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can manage campaigns for their clients" ON public.campaigns;
CREATE POLICY "Users can manage campaigns for their clients" 
ON public.campaigns 
FOR ALL 
TO authenticated
USING (
  public.has_full_access(auth.uid()) 
  OR EXISTS (SELECT 1 FROM clients WHERE clients.id = campaigns.client_id AND clients.user_id = auth.uid())
);