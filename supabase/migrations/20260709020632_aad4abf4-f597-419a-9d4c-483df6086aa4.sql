
-- Allow guest (anon) read access across content tables, and allow anon to edit members only.

DO $$
DECLARE
  t text;
  content_tables text[] := ARRAY[
    'elders','events','files','fund_members','gallery','leadership',
    'meetings','member_relations','members','news','participants','stories','transactions'
  ];
BEGIN
  FOREACH t IN ARRAY content_tables LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_read_anon', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon USING (true)',
      t || '_read_anon', t
    );
  END LOOP;
END $$;

-- Guests can edit members (profile info) and member_relations, but not insert/delete.
GRANT UPDATE ON public.members TO anon;
GRANT UPDATE ON public.member_relations TO anon;

DROP POLICY IF EXISTS members_update_anon ON public.members;
CREATE POLICY members_update_anon ON public.members
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS member_relations_update_anon ON public.member_relations;
CREATE POLICY member_relations_update_anon ON public.member_relations
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
