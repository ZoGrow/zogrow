-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own clients or admins see all" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients assigned to themselves" ON public.clients;

-- Create stricter view policy: admins see all (including unassigned), users see only their own
CREATE POLICY "Users can view their own clients or admins see all"
ON public.clients
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') 
  OR user_id = auth.uid()
);

-- Create stricter insert policy: admins can insert any, users must assign to themselves
CREATE POLICY "Users can insert clients assigned to themselves"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
);