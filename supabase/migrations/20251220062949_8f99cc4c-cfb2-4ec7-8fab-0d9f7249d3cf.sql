-- Add explicit deny for anon role on clients table
CREATE POLICY "Deny anonymous access to clients"
ON public.clients
FOR ALL
TO anon
USING (false);

-- Add explicit deny for anon role on user_roles table  
CREATE POLICY "Deny anonymous access to user_roles"
ON public.user_roles
FOR ALL
TO anon
USING (false);