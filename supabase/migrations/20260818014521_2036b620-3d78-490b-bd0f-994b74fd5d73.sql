
-- 1. Transactions: remove public read access
DROP POLICY IF EXISTS transactions_read_anon ON public.transactions;
REVOKE SELECT ON public.transactions FROM anon;

-- 2. Remove public direct-table read on PII tables
DROP POLICY IF EXISTS members_read_anon ON public.members;
DROP POLICY IF EXISTS elders_read_anon ON public.elders;
DROP POLICY IF EXISTS leadership_read_anon ON public.leadership;
REVOKE SELECT ON public.members FROM anon;
REVOKE SELECT ON public.elders FROM anon;
REVOKE SELECT ON public.leadership FROM anon;

-- 3. Public-safe views excluding sensitive columns
CREATE OR REPLACE VIEW public.members_public
WITH (security_invoker = false) AS
SELECT id, name, nickname, gender, age, gen, role, branch, village, district,
       province, status, photo, parent_id, category, position, created_at
FROM public.members;

CREATE OR REPLACE VIEW public.elders_public
WITH (security_invoker = false) AS
SELECT id, name, age, branch, photo, note, member_id, data, created_at,
       position, bio, department, display_order, active, person_type, updated_at
FROM public.elders;

CREATE OR REPLACE VIEW public.leadership_public
WITH (security_invoker = false) AS
SELECT id, name, position, branch, photo, bio, member_id, data, created_at,
       department, display_order, active, person_type, updated_at
FROM public.leadership;

GRANT SELECT ON public.members_public TO anon, authenticated;
GRANT SELECT ON public.elders_public TO anon, authenticated;
GRANT SELECT ON public.leadership_public TO anon, authenticated;
