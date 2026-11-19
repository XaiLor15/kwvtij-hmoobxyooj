
-- Drop public SELECT policies and anon SELECT grants; add authenticated-only SELECT

-- profiles
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon;
CREATE POLICY "profiles_read_auth" ON public.profiles FOR SELECT TO authenticated USING (true);

-- members: remove anon update + anon read
DROP POLICY IF EXISTS "members_read_all" ON public.members;
DROP POLICY IF EXISTS "members_update_anon" ON public.members;
REVOKE SELECT, UPDATE ON public.members FROM anon;
CREATE POLICY "members_read_auth" ON public.members FOR SELECT TO authenticated USING (true);

-- member_relations
DROP POLICY IF EXISTS "member_relations_read_all" ON public.member_relations;
REVOKE SELECT ON public.member_relations FROM anon;
CREATE POLICY "member_relations_read_auth" ON public.member_relations FOR SELECT TO authenticated USING (true);

-- transactions
DROP POLICY IF EXISTS "tx_read_all" ON public.transactions;
REVOKE SELECT ON public.transactions FROM anon;
CREATE POLICY "tx_read_auth" ON public.transactions FOR SELECT TO authenticated USING (true);

-- fund_members
DROP POLICY IF EXISTS "fm_read_all" ON public.fund_members;
REVOKE SELECT ON public.fund_members FROM anon;
CREATE POLICY "fm_read_auth" ON public.fund_members FOR SELECT TO authenticated USING (true);

-- leadership
DROP POLICY IF EXISTS "lead_read_all" ON public.leadership;
REVOKE SELECT ON public.leadership FROM anon;
CREATE POLICY "lead_read_auth" ON public.leadership FOR SELECT TO authenticated USING (true);

-- elders
DROP POLICY IF EXISTS "elders_read_all" ON public.elders;
REVOKE SELECT ON public.elders FROM anon;
CREATE POLICY "elders_read_auth" ON public.elders FOR SELECT TO authenticated USING (true);

-- files
DROP POLICY IF EXISTS "files_read_all" ON public.files;
REVOKE SELECT ON public.files FROM anon;
CREATE POLICY "files_read_auth" ON public.files FOR SELECT TO authenticated USING (true);

-- gallery
DROP POLICY IF EXISTS "gallery_read_all" ON public.gallery;
REVOKE SELECT ON public.gallery FROM anon;
CREATE POLICY "gallery_read_auth" ON public.gallery FOR SELECT TO authenticated USING (true);

-- participants
DROP POLICY IF EXISTS "participants_read_all" ON public.participants;
REVOKE SELECT ON public.participants FROM anon;
CREATE POLICY "participants_read_auth" ON public.participants FOR SELECT TO authenticated USING (true);

-- Revoke EXECUTE on SECURITY DEFINER functions from anon/authenticated/public
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
