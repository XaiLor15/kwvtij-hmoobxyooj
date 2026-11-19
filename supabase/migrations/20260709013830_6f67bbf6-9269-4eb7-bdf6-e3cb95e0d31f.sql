
-- Grant EXECUTE on has_role to authenticated so RLS can call it
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- profiles: own row only
DROP POLICY IF EXISTS "profiles_read_auth" ON public.profiles;
CREATE POLICY "profiles_read_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- helper: is_member_or_admin via has_role
-- meetings/events/stories/news: remove public SELECT; role-based
DROP POLICY IF EXISTS "meet_read_all" ON public.meetings;
DROP POLICY IF EXISTS "events_read_all" ON public.events;
DROP POLICY IF EXISTS "stories_read_all" ON public.stories;
DROP POLICY IF EXISTS "news_read_all" ON public.news;
REVOKE SELECT ON public.meetings, public.events, public.stories, public.news FROM anon;

CREATE POLICY "meet_read_role" ON public.meetings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "events_read_role" ON public.events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "stories_read_role" ON public.stories FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "news_read_role" ON public.news FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'));

-- Replace blanket-true SELECT policies on sensitive tables with role checks
DROP POLICY IF EXISTS "members_read_auth" ON public.members;
CREATE POLICY "members_read_role" ON public.members FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "member_relations_read_auth" ON public.member_relations;
CREATE POLICY "mr_read_role" ON public.member_relations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "elders_read_auth" ON public.elders;
CREATE POLICY "elders_read_role" ON public.elders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "lead_read_auth" ON public.leadership;
CREATE POLICY "lead_read_role" ON public.leadership FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "tx_read_auth" ON public.transactions;
CREATE POLICY "tx_read_role" ON public.transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "fm_read_auth" ON public.fund_members;
CREATE POLICY "fm_read_role" ON public.fund_members FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "files_read_auth" ON public.files;
CREATE POLICY "files_read_role" ON public.files FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "gallery_read_auth" ON public.gallery;
CREATE POLICY "gallery_read_role" ON public.gallery FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "participants_read_auth" ON public.participants;
CREATE POLICY "participants_read_role" ON public.participants FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'));

-- Replace *_all_auth blanket-true FOR ALL policies with role-based CRUD (member or admin)
DO $$
DECLARE
  t text;
  policy_name text;
BEGIN
  FOR t, policy_name IN
    SELECT * FROM (VALUES
      ('members','members_all_auth'),
      ('member_relations','member_relations_all_auth'),
      ('events','events_all_auth'),
      ('transactions','tx_all_auth'),
      ('fund_members','fm_all_auth'),
      ('leadership','lead_all_auth'),
      ('elders','elders_all_auth'),
      ('meetings','meet_all_auth'),
      ('stories','stories_all_auth'),
      ('news','news_all_auth'),
      ('files','files_all_auth'),
      ('gallery','gallery_all_auth'),
      ('participants','participants_all_auth')
    ) AS x(t, policy_name)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
        WITH CHECK (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'));
    $f$, t || '_insert_role', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
        USING (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'))
        WITH CHECK (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'));
    $f$, t || '_update_role', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
        USING (public.has_role(auth.uid(),'member') OR public.has_role(auth.uid(),'admin'));
    $f$, t || '_delete_role', t);
  END LOOP;
END$$;
