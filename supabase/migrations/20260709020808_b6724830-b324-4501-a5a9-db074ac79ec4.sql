
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'elders','events','files','fund_members','gallery','leadership',
    'meetings','member_relations','members','news','participants','stories','transactions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_read_anon', t);
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS members_update_anon ON public.members;
DROP POLICY IF EXISTS member_relations_update_anon ON public.member_relations;
REVOKE UPDATE ON public.members FROM anon;
REVOKE UPDATE ON public.member_relations FROM anon;
