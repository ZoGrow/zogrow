-- Add user_id column to clients table for ownership
ALTER TABLE public.clients 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;

-- Create role-based view policy: admins see all, users see only their assigned clients
CREATE POLICY "Users can view their own clients or admins see all"
ON public.clients
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') 
  OR user_id = auth.uid()
  OR user_id IS NULL
);

-- Create role-based insert policy: users can create clients assigned to themselves
CREATE POLICY "Users can insert clients assigned to themselves"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
  OR user_id IS NULL
);

-- Create role-based update policy: admins can update all, users can update their own
CREATE POLICY "Users can update their own clients or admins update all"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
);