
-- Re-enable guest (anon) read access across all public content tables
-- and allow guests to edit only the Member module.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'elders','events','files','fund_members','gallery','leadership',
    'meetings','member_relations','members','news','participants',
    'stories','transactions'
  ] LOOP
    -- Drop any prior anon read policy with our name
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_read_anon', t);
    -- Grant + create SELECT policy for anon
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon USING (true)',
      t || '_read_anon', t
    );
  END LOOP;
END $$;

-- Guest edit rights: ONLY members + member_relations
DROP POLICY IF EXISTS members_update_anon ON public.members;
GRANT UPDATE ON public.members TO anon;
CREATE POLICY members_update_anon ON public.members
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS member_relations_update_anon ON public.member_relations;
GRANT UPDATE ON public.member_relations TO anon;
CREATE POLICY member_relations_update_anon ON public.member_relations
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
