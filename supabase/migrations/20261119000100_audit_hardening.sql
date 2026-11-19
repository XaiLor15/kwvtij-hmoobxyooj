-- ============================================================================
-- Audit hardening (2026-11-19) — additive / privilege-tightening only.
--   * No table or column is dropped, no row is deleted or rewritten
--     (except backfilling two NEW columns from existing JSON).
--   * Every step is idempotent (safe to re-run).
--   * Rollback statements are listed at the bottom of this file.
-- ============================================================================

-- 1) Anonymous visitors may no longer modify family records.
--    Previously anon had UPDATE on members/member_relations with USING (true):
--    anyone on the internet could rename members or re-wire parent links.
--    (The app's guest-edit form already failed because phone/address/birthdate
--    were revoked from anon in 20260819022122.)
DROP POLICY IF EXISTS members_update_anon ON public.members;
DROP POLICY IF EXISTS member_relations_update_anon ON public.member_relations;
REVOKE UPDATE ON public.members FROM anon;
REVOKE UPDATE ON public.member_relations FROM anon;

-- 2) Promote roster status to a real column so guests can read it.
--    It previously lived only in the private `data` JSONB (not readable by anon),
--    so visitors saw every leader as "active" and every elder as "living".
ALTER TABLE public.leadership ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.elders ADD COLUMN IF NOT EXISTS status text;

UPDATE public.leadership
   SET status = CASE WHEN data->>'status' IN ('active','advisor','former') THEN data->>'status' ELSE 'active' END
 WHERE status IS NULL;
UPDATE public.elders
   SET status = CASE WHEN data->>'status' IN ('living','advisor','deceased') THEN data->>'status' ELSE 'living' END
 WHERE status IS NULL;

ALTER TABLE public.leadership ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.elders ALTER COLUMN status SET DEFAULT 'living';

DO $$ BEGIN
  ALTER TABLE public.leadership
    ADD CONSTRAINT leadership_status_check CHECK (status IN ('active','advisor','former')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.elders
    ADD CONSTRAINT elders_status_check CHECK (status IN ('living','advisor','deceased')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT (status) ON public.leadership TO anon;
GRANT SELECT (status) ON public.elders TO anon;

-- 3) News drafts: `published` flag. Existing news stay published.
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_news_published_date ON public.news (published, date DESC);

-- Visitors only see published news; signed-in members keep seeing everything
-- through the existing news_read_role policy.
DROP POLICY IF EXISTS news_read_anon ON public.news;
CREATE POLICY news_read_anon ON public.news FOR SELECT TO anon USING (published);

-- 4) Atomic view counter usable by visitors (they cannot UPDATE news).
--    SECURITY DEFINER but it can only increment `views` of a published row.
CREATE OR REPLACE FUNCTION public.increment_news_views(news_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.news SET views = COALESCE(views, 0) + 1
   WHERE id = news_id AND published;
$$;
REVOKE ALL ON FUNCTION public.increment_news_views(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_news_views(bigint) TO anon, authenticated;

-- 5) Data-integrity checks. NOT VALID = enforced for new/updated rows only,
--    existing rows are not re-checked, so this cannot fail on legacy data.
--    Run `ALTER TABLE ... VALIDATE CONSTRAINT ...` later once data is verified.
DO $$ BEGIN
  ALTER TABLE public.transactions ADD CONSTRAINT transactions_amount_nonneg CHECK (amount >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_date_format CHECK (date IS NULL OR date ~ '^\d{4}-\d{2}-\d{2}$') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.events
    ADD CONSTRAINT events_expected_nonneg CHECK (expected_per_member >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.members
    ADD CONSTRAINT members_birthdate_format CHECK (birthdate IS NULL OR birthdate = '' OR birthdate ~ '^\d{4}-\d{2}-\d{2}$') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.members
    ADD CONSTRAINT members_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6) Indexes for foreign keys / common filters that had none.
CREATE INDEX IF NOT EXISTS idx_leadership_member ON public.leadership (member_id);
CREATE INDEX IF NOT EXISTS idx_elders_member ON public.elders (member_id);
CREATE INDEX IF NOT EXISTS idx_tx_created_at ON public.transactions (created_at DESC);

-- ----------------------------------------------------------------------------
-- ROLLBACK (manual, if ever needed):
--   DROP INDEX IF EXISTS idx_leadership_member, idx_elders_member, idx_tx_created_at, idx_news_published_date;
--   ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_amount_nonneg,
--                                   DROP CONSTRAINT IF EXISTS transactions_date_format;
--   ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_expected_nonneg;
--   ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_birthdate_format,
--                              DROP CONSTRAINT IF EXISTS members_not_own_parent;
--   DROP FUNCTION IF EXISTS public.increment_news_views(bigint);
--   DROP POLICY IF EXISTS news_read_anon ON public.news;
--   CREATE POLICY news_read_anon ON public.news FOR SELECT TO anon USING (true);
--   (status / published columns can stay; the app falls back if absent.)
--   Re-allowing anonymous member edits is NOT recommended.
-- ----------------------------------------------------------------------------
