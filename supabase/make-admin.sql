-- Give an existing account a role. Run in the Supabase SQL editor AFTER the
-- person has signed up on the website. Replace the email address.
--   'admin'  = full access + administration
--   'member' = read/write clan data

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'you@example.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Remove the read-only 'guest' role if role_hardening.sql gave it one:
DELETE FROM public.user_roles r USING auth.users u
 WHERE r.user_id = u.id AND u.email = 'you@example.com' AND r.role = 'guest';

-- Check:
SELECT u.email, r.role FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id ORDER BY u.email;
