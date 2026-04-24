-- Assign admin role to the specified user after they sign up
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'jaydenoah.louis@gmail.com'
);