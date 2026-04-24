-- Allow all authenticated users to view profiles (for setter dropdown, etc.)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Users can view all profiles (needed for dropdowns and user lists)
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Users can still only update their own profile
-- (This policy already exists but let's make sure it's correct)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);