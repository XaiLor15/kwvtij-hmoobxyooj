
-- Fix 1: has_role no longer runs as SECURITY DEFINER. Users can already
-- read their own user_roles row via RLS, which is the only lookup pattern
-- used (has_role(auth.uid(), ...)), so SECURITY INVOKER works and removes
-- the definer-bypass exposure.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Fix 2: explicit deny policies on user_roles so no client can ever
-- insert/update/delete roles. Role assignment stays server-side (trigger
-- handle_new_user runs as SECURITY DEFINER and bypasses these policies;
-- service_role also bypasses RLS).
DROP POLICY IF EXISTS "No client inserts on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "No client updates on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "No client deletes on user_roles" ON public.user_roles;

CREATE POLICY "No client inserts on user_roles"
  ON public.user_roles FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "No client updates on user_roles"
  ON public.user_roles FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "No client deletes on user_roles"
  ON public.user_roles FOR DELETE TO anon, authenticated
  USING (false);
