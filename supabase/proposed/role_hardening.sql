-- PROPOSED — review before running (see README.md in this folder).
-- New sign-ups become read-only 'guest'; existing roles are untouched.

-- 0) Review who currently has write access:
--    SELECT u.email, r.role FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id ORDER BY r.role, u.email;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'guest')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- To approve someone (run as an administrator):
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'member' FROM auth.users WHERE email = 'person@example.com'
--   ON CONFLICT DO NOTHING;
--   DELETE FROM public.user_roles r USING auth.users u
--    WHERE r.user_id = u.id AND u.email = 'person@example.com' AND r.role = 'guest';

-- ROLLBACK (restore original behaviour: every sign-up becomes 'member'):
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- BEGIN
--   INSERT INTO public.profiles (id, email, display_name)
--   VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
--   INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
--   RETURN NEW;
-- END;
-- $$;
