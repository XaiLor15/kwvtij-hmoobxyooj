
ALTER VIEW public.members_public SET (security_invoker = true);
ALTER VIEW public.elders_public SET (security_invoker = true);
ALTER VIEW public.leadership_public SET (security_invoker = true);

-- Column-level read access for visitors (sensitive columns excluded)
GRANT SELECT (id, name, nickname, gender, age, gen, role, branch, village, district,
              province, status, photo, parent_id, category, position, created_at)
  ON public.members TO anon;
GRANT SELECT (id, name, age, branch, photo, note, member_id, data, created_at,
              position, bio, department, display_order, active, person_type, updated_at)
  ON public.elders TO anon;
GRANT SELECT (id, name, position, branch, photo, bio, member_id, data, created_at,
              department, display_order, active, person_type, updated_at)
  ON public.leadership TO anon;

CREATE POLICY members_read_anon ON public.members FOR SELECT TO anon USING (true);
CREATE POLICY elders_read_anon ON public.elders FOR SELECT TO anon USING (true);
CREATE POLICY leadership_read_anon ON public.leadership FOR SELECT TO anon USING (true);
