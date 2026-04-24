-- Drop the existing INSERT policy for clients
DROP POLICY IF EXISTS "Users can insert clients assigned to themselves" ON public.clients;

-- Create new policy: Only admins can insert clients
CREATE POLICY "Only admins can insert clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop and recreate the UPDATE policy to be admin-only
DROP POLICY IF EXISTS "Users can update their own clients or admins update all" ON public.clients;

CREATE POLICY "Only admins can update clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));