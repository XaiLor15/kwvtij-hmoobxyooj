-- Run in the NEW project's SQL editor after scripts/migrate-data.mjs --apply.
-- Rows were copied with their original ids, so identity counters must be moved
-- past the highest id or the next insert would fail with "duplicate key".
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['members','member_relations','events','leadership','elders',
                           'news','participants','gallery','meetings','stories','files'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format(
        'SELECT setval(pg_get_serial_sequence(%L, ''id''), GREATEST(COALESCE((SELECT max(id) FROM public.%I), 0), 1), true)',
        'public.' || t, t);
    END IF;
  END LOOP;
END $$;
