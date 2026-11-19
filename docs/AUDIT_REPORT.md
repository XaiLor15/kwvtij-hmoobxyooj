# ລາຍງານການກວດສອບ ແລະ ປັບປຸງລະບົບ — Kwv Tij Hmoob Xyooj

ວັນທີ: 19 ພະຈິກ 2026 · Git: `27ea15e` (ຕົ້ນສະບັບ) → `b7ebfc4` (ຈັດຮູບແບບເທົ່ານັ້ນ) → commit ປັບປຸງ 3 ອັນ

ສະຖານະ: **COMPLETED** · **PARTIALLY COMPLETED** · **NOT COMPLETED** · **NEEDS VERIFICATION**

---

## 1. ສະຫຼຸບຜົນ

| ຕົວຊີ້ວັດ | ກ່ອນ | ຫຼັງ |
|---|---|---|
| ໄຟລ໌ທີ່ປິດການກວດ Type (`@ts-nocheck`) | 27 ໄຟລ໌ (ທຸກ store + 8 ໜ້າ) | 0 (ເຫຼືອແຕ່ `routeTree.gen.ts` ທີ່ສ້າງອັດຕະໂນມັດ) |
| TypeScript errors (ຫຼັງເປີດການກວດ) | ບໍ່ຮູ້ (ຖືກປິດ) | **0** |
| ESLint | 2,712 ບັນຫາ (2,689 error) | **0 error**, 7 warning (ໃນ shadcn/ui ທີ່ບໍ່ໄດ້ແຕະ) |
| Production build | ຜ່ານ | **ຜ່ານ** |
| Unit tests | ບໍ່ມີ | **22/22 ຜ່ານ** (`npm test`) |
| Browser smoke (10 ໜ້າ × 4 ຂະໜາດຈໍ × guest/member) | ບໍ່ມີ | **80/80 ຜ່ານ** (ບໍ່ມີ console error, ບໍ່ມີ horizontal overflow) |
| Browser CRUD flows | ບໍ່ມີ | **24/24 ຜ່ານ** |
| Migration ທົດສອບໃນ PostgreSQL 16 ຈິງ | — | 13/13 apply ໄດ້, idempotent |
| ໂຄດໃນ `src/` | — | −15,118 / +9,486 ແຖວ (ຫຼຸດ ~5,600) |
| ຂະໜາດໜ້າ (ແຖວ) | Members 1,958 · Finance 1,628 · Elders 1,552 | 518 · 572 · 462 |

> ການທົດສອບ CRUD ໃນ browser ໃຊ້ **mock ຂອງ Supabase API ໃນໜ່ວຍຄວາມຈຳ** — ບໍ່ມີ request ໃດໄປເຖິງຖານຂໍ້ມູນຈິງ.
> ການທົດສອບ RLS ໃຊ້ PostgreSQL 16 ຊົ່ວຄາວໃນເຄື່ອງ ທີ່ apply migration ທັງໝົດຕາມລຳດັບ.

---

## 2. ບັນຫາທີ່ພົບ ແລະ ການແກ້ໄຂ (ຮຽງຕາມຄວາມຮ້າຍແຮງ)

### 🔴 ຄວາມປອດໄພ / ຂໍ້ມູນ (ຮ້າຍແຮງ)

| # | ບັນຫາ | ຫຼັກຖານ | ສະຖານະ |
|---|---|---|---|
| S1 | **ຜູ້ໃດກໍໄດ້ໃນອິນເຕີເນັດ (ບໍ່ຕ້ອງເຂົ້າລະບົບ) ແກ້ໄຂຊື່ສະມາຊິກ ແລະ ປ່ຽນສາຍພໍ່-ລູກໄດ້** — RLS `members_update_anon USING (true)` | ທົດສອບໃນ PostgreSQL: anon `UPDATE members SET name='HACKED'` → `UPDATE 1` | **COMPLETED** ໃນ code + migration `20261119000100` (ຫຼັງ migration: `permission denied`). **NEEDS VERIFICATION**: ຕ້ອງ apply ໃນ production |
| S2 | **ທຸກຄົນທີ່ສະໝັກໃໝ່ໄດ້ role `member` ອັດຕະໂນມັດ ແລະ ລຶບ/ແກ້ການເງິນທັງໝົດໄດ້** | ທົດສອບ: ບັນຊີໃໝ່ `DELETE FROM transactions` → `DELETE 15` | **PARTIALLY COMPLETED** — ສະຄຣິບ `supabase/proposed/role_hardening.sql` (ທົດສອບແລ້ວ: ບັນຊີໃໝ່ → `guest`, ລຶບໄດ້ 0). **ບໍ່ໄດ້ apply ອັດຕະໂນມັດ — ຕ້ອງການການຕັດສິນໃຈຈາກຜູ້ບໍລິຫານ** |
| S3 | ສິດໃນ UI ໃຊ້ CSS ເຊື່ອງປຸ່ມຕາມ **icon** (`button:has(svg.lucide-plus)`) — ປຸ່ມຍັງຢູ່ໃນ DOM, ປຸ່ມອື່ນທີ່ໃຊ້ icon ດຽວກັນກໍຖືກເຊື່ອງ | `styles.css` | **COMPLETED** — ລຶບອອກ, ໃຊ້ `usePermissions()` ກວດຢ່າງຊັດເຈນ + ກວດອີກຄັ້ງໃນ store ກ່ອນຂຽນ |
| S4 | ໜ້າ ການເງິນ / ກອງທຶນ / ຕິດຕາມ ສະແດງ ₭0 ແລະ "ຄ້າງຈ່າຍ" ໃຫ້ guest (ຂໍ້ມູນຜິດ ແລະ ເປີດເຜີຍລາຍຊື່) | — | **COMPLETED** — `RequireAuth` ແລະ ໄອຄອນ 🔒 ໃນ sidebar |
| S5 | User ທີ່ອ່ານ role ບໍ່ໄດ້ ຖືກໃຫ້ເປັນ `member` (fail-open) | `permissions.tsx` | **COMPLETED** — ເປັນ `guest` (fail-closed) |
| S6 | Realtime payload ຂອງ `members/leadership/elders` ອາດມີ column ສ່ວນຕົວ (phone) ໄປເຖິງ anon | ບໍ່ສາມາດທົດສອບກັບ Realtime ຈິງ | **NEEDS VERIFICATION** — app ບໍ່ subscribe guest ກັບຕາຕະລາງເຫຼົ່ານີ້ແລ້ວ |
| S7 | CSV export ບໍ່ກັນ formula injection | — | **COMPLETED** (`=`, `+`, `-`, `@` ຖືກ escape) |

### 🔴 Logic ຜິດ / ໜ້າພັງ

| # | ບັນຫາ | ສະຖານະ |
|---|---|---|
| L1 | **ໜ້າສະມາຊິກພັງ (infinite recursion)** ເມື່ອເລືອກລູກຫຼານຂອງຕົນເປັນພໍ່ — `buildPath` ບໍ່ມີການກັນ loop ແລະ form ອະນຸຍາດໃຫ້ເລືອກ | **COMPLETED** — ລູກຫຼານຖືກ disable ໃນ form, ກວດໃນ store, ທຸກ function ເດີນຕົ້ນໄມ້ກັນ cycle, DB CHECK `parent_id <> id` |
| L2 | **ຍອດຄົງເຫຼືອຕິດລົບ ສະແດງເປັນບວກ** (`Math.abs`) ໃນໜ້າການເງິນ | **COMPLETED** — ສະແດງ `-780,000 ₭` ສີແດງ |
| L3 | ປຸ່ມກອງ "ມື້ນີ້/ເດືອນນີ້/ປີນີ້" ໃນການເງິນ **ບໍ່ເຮັດວຽກ** (state ບໍ່ຖືກນຳໃຊ້) | **COMPLETED** |
| L4 | ກຣາຟລາຍເດືອນ **ລວມຫຼາຍປີເຂົ້າກັນ** (ມີນາ 2025 + ມີນາ 2026) | **COMPLETED** — ເລືອກປີ |
| L5 | ລຶບຜູ້ເຂົ້າຮ່ວມກອງທຶນ **ສະແດງ "ລຶບບໍ່ໄດ້" ສະເໝີ ແຕ່ລຶບຈິງ** (async ຖືກ destructure ແບບ sync); Undo ບໍ່ເຄີຍສະແດງ | **COMPLETED** — ທົດສອບ: toast ສຳເລັດ + Undo ກູ້ຄືນໄດ້ |
| L6 | ການຈ່າຍຫຼາຍງວດ **ນັບແຕ່ງວດສຸດທ້າຍ** (60k+40k → 40k) | **COMPLETED** — ລວມທຸກງວດ, ເພີ່ມສະຖານະ "ຈ່າຍບາງສ່ວນ" |
| L7 | ລາຍຮັບດຽວອາດ **ຖືກນັບໃຫ້ຫຼາຍຄົນ** ເມື່ອຊື່ຊ້ຳ | **COMPLETED** — 1 ລາຍການ = ສູງສຸດ 1 ຄົນ; ສະແດງການກວດຍອດກັບໜ້າການເງິນ |
| L8 | ອາຍຸຄິດຈາກ **ປີ ລົບ ປີ** (ຜິດ 1 ປີກ່ອນວັນເກີດ) | **COMPLETED** — `ageFromBirthdate` |
| L9 | ປ່ຽນພໍ່ ແຕ່ **ລຸ້ນຂອງລູກຫຼານບໍ່ປ່ຽນຕາມ**; `member_relations` ບໍ່ຖືກປັບ | **COMPLETED** |
| L10 | Toast "ສຳເລັດ" ສະແດງ **ກ່ອນ** ບັນທຶກແລ້ວ (ເຖິງຈະລົ້ມເຫຼວ) — ທຸກໜ້າ | **COMPLETED** — ທຸກ store return `Result`; error ສະແດງໃນ form |
| L11 | ລະຫັດທຸລະກຳ `TXN-` + 6 ຕົວເລກທ້າຍຂອງ ms → **ຊ້ຳກັນໄດ້** | **COMPLETED** — `TXN-<time36>-<rand>` |
| L12 | ບໍ່ສາມາດເລືອກ **ວັນທີ** ຂອງທຸລະກຳ (ບັງຄັບເປັນມື້ນີ້); ແກ້ໄຂໄດ້ສະເພາະບາງ field | **COMPLETED** — form ດຽວສຳລັບເພີ່ມ/ແກ້ທຸກ field |
| L13 | Dashboard: ເອົາ id ຂອງຄະນະນຳ ໄປເປີດເປັນ id ສະມາຊິກ (ເປີດຄົນຜິດ); ນັບແຕ່ active ແຕ່ສະແດງທັງໝົດ; chart ເປັນ NaN ເມື່ອບໍ່ມີຂໍ້ມູນ; ສີ `white` ພັງໃນ dark mode | **COMPLETED** |
| L14 | ຂໍ້ຄວາມລຶບກິດຈະກຳ ບອກວ່າ ຜູ້ເຂົ້າຮ່ວມ/ຮູບ "ຍັງຄົງຢູ່" ແຕ່ DB ລຶບ (CASCADE) | **COMPLETED** — ຂໍ້ຄວາມຖືກຕ້ອງ |
| L15 | ສະຖານະຄະນະນຳ/ຜູ້ອາວຸໂສ ເກັບໃນ JSON ທີ່ guest ອ່ານບໍ່ໄດ້ → guest ເຫັນທຸກຄົນເປັນ "ດຳລົງຕຳແໜ່ງ" | **COMPLETED** ໃນ code (fallback) + migration ຍ້າຍເປັນ column |
| L16 | ຫຼັງເຂົ້າ/ອອກລະບົບ ຂໍ້ມູນບໍ່ໂຫຼດໃໝ່ (ສະມາຊິກຍັງບໍ່ເຫັນເບີໂທຈົນກວ່າ refresh) | **COMPLETED** — ທຸກ store ໂຫຼດໃໝ່ເມື່ອ session ປ່ຽນ |
| L17 | ຕົວເລືອກສະມາຊິກໃນກິດຈະກຳ ອ່ານ array ທີ່ບໍ່ reactive → ສະມາຊິກໃໝ່ບໍ່ສະແດງ | **COMPLETED** |
| L18 | ເວລາສິ້ນສຸດກ່ອນເວລາເລີ່ມ ບັນທຶກໄດ້; ວັນເກີດໃນອະນາຄົດໄດ້; ບໍ່ກັນສະມາຊິກຊ້ຳ | **COMPLETED** — validation + ເຕືອນຂໍ້ມູນຊ້ຳ |

### 🟠 UI ທີ່ບໍ່ມີ Logic (ປຸ່ມກົດແລ້ວບໍ່ເຮັດຫຍັງ / ຂໍ້ມູນປອມ)

| ບ່ອນ | ບັນຫາ | ການແກ້ໄຂ |
|---|---|---|
| Header | ແຈ້ງເຕືອນ **hardcode** ("ວັນເກີດ 3 ຄົນ", "ບໍລິຈາກ ₭500,000") | ຄຳນວນຈາກຂໍ້ມູນຈິງ: ວັນເກີດ 7 ມື້, ກິດຈະກຳ 14 ມື້ |
| ສະມາຊິກ | Export, Import ບໍ່ເຮັດວຽກ | Export CSV ເຮັດວຽກ; Import ລຶບອອກ (ບໍ່ມີ logic) |
| ກິດຈະກຳ | "ປະຕິທິນ", ປຸ່ມ 💵 ໃນ card ບໍ່ເຮັດວຽກ | ລຶບ; ການເງິນຂອງກິດຈະກຳຢູ່ໃນແຖບ "ການເງິນ" |
| ຄະນະນຳ | Export, ພິມ, "ສ້າງປະກາດ", "ຈັດກອງປະຊຸມ", "ຈັດການເອກະສານ" — ສະແດງແຕ່ toast | Export CSV ເຮັດວຽກ; ອື່ນໆລຶບອອກ |
| ຜູ້ອາວຸໂສ | Export/ພິມ/Filter ບໍ່ເຮັດວຽກ; ອັບໂຫຼດຮູບເກັບແຕ່ໃນ browser (ຫາຍເມື່ອ refresh) | Export, ກອງ ເຮັດວຽກ; ຮູບບັນທຶກລົງ DB (ບີບອັດ) |
| ຂ່າວ | ຄຳເຫັນ, ຮູບ/ວິດີໂອເພີ່ມເຕີມ ເກັບແຕ່ໃນ browser ແຕ່ສະແດງ "ສຳເລັດ"; "ສະບັບຮ່າງ" ນັບຈາກ field ທີ່ບໍ່ມີ | ລຶບ feature ປອມ; ສະບັບຮ່າງຈິງ (column `published`) |
| ຄະນະນຳ | `buildLeadersFromMembers` — ສ້າງຄະນະນຳປອມຈາກລຸ້ນ ພ້ອມ email ປອມ | ລຶບ |
| ກອງທຶນ | ທາງເລືອກ "ລຶບການບໍລິຈາກທັງໝົດ" ລຶບລາຍຮັບທຸກລາຍການຂອງສະມາຊິກ | ລຶບອອກ — ຂໍ້ມູນການເງິນລຶບໄດ້ສະເພາະໃນໜ້າການເງິນ |

---

## 3. ໄຟລ໌ທີ່ປ່ຽນແປງ

**ໃໝ່**
- `src/lib/domain/` — logic ບໍລິສຸດ (ບໍ່ຂຶ້ນກັບ React/Supabase) + `domain.test.ts`: `format`, `family`, `finance`, `fund`, `events`, `csv`, `notifications`, `types`
- `src/lib/store/realtime-store.ts` — factory ດຽວສຳລັບທຸກ store
- `src/lib/roster-store.ts`, `permissions-core.ts`, `auth-context.ts`, `image.ts`, `download.ts`, `nav.ts`, `search-params.ts`
- `src/components/enterprise/` — `form-dialog`, `field`, `person-avatar`, `require-auth`, `segmented`
- `src/components/members/`, `activities/`, `finance/`, `roster/`
- `supabase/migrations/20261119000100_audit_hardening.sql`, `supabase/proposed/*`
- `tests/e2e/` (mock, smoke, crud), `docs/AUDIT_REPORT.md`

**ຂຽນໃໝ່**: ທຸກ route (`dashboard`, `members`, `activities`, `finance`, `fund-contributors`, `donation-tracking`, `leadership`, `elders`, `news`, `login`), ທຸກ store, `app-shell`, `app-sidebar`, `permissions.tsx`, `searchable-member-select`, `data-table`, `stat-card`

**ປັບ**: `__root.tsx`, `page-header`, `styles.css` (ລຶບ CSS hack), `ui/calendar.tsx` (type), `package.json` (script `test`, `typecheck`)

## 4. Code ທີ່ລຶບ ແລະ ເຫດຜົນ

| ໄຟລ໌ | ເຫດຜົນ |
|---|---|
| `lib/seed-data.ts` | ຂໍ້ມູນ mock — ບໍ່ມີໃຜ import |
| `lib/supabase-store-helpers.ts` | factory ທີ່ບໍ່ໄດ້ໃຊ້ (ແທນດ້ວຍ factory ໃໝ່ທີ່ມີ type) |
| `lib/files-store.ts`, `lib/meetings-store.ts` | ບໍ່ມີໜ້າໃດໃຊ້ (ຕາຕະລາງ DB ຍັງຢູ່ຄົບ) |
| `lib/persist.ts`, `hooks/use-persistent-state.ts` | localStorage store ເກົ່າ — ບໍ່ໄດ້ໃຊ້ |
| `lib/roster-counts.ts` | ຄິດໄລ່ຄະນະນຳ/ຜູ້ອາວຸໂສ ປອມຈາກລຸ້ນ — ບໍ່ໄດ້ໃຊ້ |
| `lib/events-data.ts`, `lib/fund-finance.ts`, `lib/types.ts`, `lib/public-read.ts`, `lib/init-data.ts`, `lib/file-to-data-url.ts` | ຍ້າຍເຂົ້າ `lib/domain/` ຫຼື store ໃໝ່ |
| `components/member-combobox.tsx`, `event-combobox.tsx` | ຊ້ຳກັບ `SearchableMemberSelect` (ບໍ່ reactive) |
| `components/enterprise/back-to-home-button.tsx` | ບໍ່ສອດຄ່ອງ — ມີ sidebar ແລ້ວ |

ກວດ import/route ທຸກຄັ້ງກ່ອນລຶບ (`tsc` 0 error ຢືນຢັນ). **ບໍ່ມີຕາຕະລາງ, column, migration ຫຼື ຂໍ້ມູນໃດຖືກລຶບ.**

## 5. ຖານຂໍ້ມູນ

**Migration `20261119000100_audit_hardening.sql`** (ເພີ່ມ/ຮັດສິດເທົ່ານັ້ນ, idempotent, ມີ rollback ໃນໄຟລ໌) — **NEEDS VERIFICATION: ຍັງບໍ່ໄດ້ apply ໃນ production**
1. ຖອນສິດ UPDATE ຂອງ anon ໃນ `members`, `member_relations`
2. `leadership.status`, `elders.status` — column ໃໝ່, backfill ຈາກ JSON, guest ອ່ານໄດ້
3. `news.published` (ຄ່າເລີ່ມຕົ້ນ `true` — ຂ່າວເກົ່າຍັງເຜີຍແຜ່) + guest ເຫັນສະເພາະທີ່ເຜີຍແຜ່
4. `increment_news_views(news_id)` — ນັບການເບິ່ງແບບ atomic (ເກົ່າ: guest ນັບບໍ່ໄດ້ ແລະ ມີ race)
5. CHECK `NOT VALID` (ບໍ່ກວດຂໍ້ມູນເກົ່າ, ບໍ່ລົ້ມ): ຈຳນວນເງິນ ≥ 0, ຮູບແບບວັນທີ, ບໍ່ເປັນພໍ່ຂອງຕົນເອງ
6. Index: `leadership.member_id`, `elders.member_id`, `transactions.created_at`, `news(published, date)`

App ເຮັດວຽກໄດ້ **ທັງກ່ອນ ແລະ ຫຼັງ** apply migration (fallback ອັດຕະໂນມັດ).

**ສະເໜີ (ບໍ່ apply)**: `supabase/proposed/role_hardening.sql` — ເບິ່ງ `supabase/proposed/README.md`.

## 6. ການອອກແບບ (UI/UX) — COMPLETED

- ທຸກໜ້າໃຊ້ Design System ດຽວ: `PageHeader`, `StatCard`, `SectionCard`, `DataTable`, `FormDialog`, `Field`, `StatusBadge`, `EmptyState`, `LoadingState`, `ErrorState`, `ConfirmDialog`
- ໃຊ້ token ສີເດີມ (Navy) — ບໍ່ມີ gradient, ບໍ່ມີ animation ນັບຕົວເລກ, ຮອງຮັບ dark mode ທຸກໜ້າ
- ມືຖື: ຕາຕະລາງປ່ຽນເປັນລາຍການ card, form ເຕັມຈໍ, ບໍ່ມີ horizontal overflow (ກວດ 390/820/1280/1440px)
- Accessibility: label ເຊື່ອມກັບ input, `aria-*` ໃນ tree/tabs/sort, skip-link, keyboard ໃຊ້ໄດ້
- ການເຊື່ອມ module: deep link (`?member=`, `?event=`, `?news=`, `?add=`), ຄົ້ນຫາທົ່ວລະບົບ Ctrl+K (ສະມາຊິກ/ກິດຈະກຳ/ຂ່າວ/ໜ້າ), ກິດຈະກຳ → ບັນທຶກລາຍຮັບ/ຈ່າຍ → ຕິດຕາມການບໍລິຈາກ, ສະມາຊິກ "ຄະນະນຳ" → ສະເໜີເພີ່ມເຂົ້າລາຍຊື່ຄະນະນຳ

## 7. Skills ທີ່ນຳໃຊ້ຈິງ

**ບໍ່ມີ Skill ໃດຖືກເອີ້ນໃຊ້.** Skills ທີ່ມີໃນ session (`code-review`, `simplify`, `security-review` ແລະ ອື່ນໆ) ເຮັດວຽກກັບ git diff ຂອງ branch; ການກວດໃນໂຄງການນີ້ເຮັດດ້ວຍມື ຕາມມາດຕະຖານ Senior Engineer ພ້ອມຫຼັກຖານທົດສອບຂ້າງເທິງ. ແນະນຳໃຫ້ລັນ `/security-review` ຫຼື `/code-review` ກ່ອນ merge ເຂົ້າ Lovable.

## 8. ສິ່ງທີ່ຍັງເຫຼືອ / ຕ້ອງກວດ

| ລາຍການ | ສະຖານະ |
|---|---|
| Apply migration `20261119000100` ໃນ production ແລ້ວທົດສອບດ້ວຍບັນຊີຈິງ | **NEEDS VERIFICATION** |
| ຕັດສິນໃຈເລື່ອງ `role_hardening.sql` (ສິດຂອງບັນຊີໃໝ່) | **NOT COMPLETED** — ລໍຖ້າການຢືນຢັນ |
| CRUD ກັບ Supabase ຈິງ (ທົດສອບແລ້ວກັບ mock + PostgreSQL ໃນເຄື່ອງ) | **NEEDS VERIFICATION** |
| Google OAuth (ບໍ່ສາມາດທົດສອບໃນສະພາບແວດລ້ອມນີ້) | **NEEDS VERIFICATION** |
| Regenerate `src/integrations/supabase/types.ts` ຫຼັງ migration (Lovable ເຮັດໃຫ້) | **NOT COMPLETED** |
| ຍ້າຍຮູບຈາກ base64 ໃນຕາຕະລາງ → Supabase Storage | **NOT COMPLETED** (ຕອນນີ້ບີບອັດຮູບແລ້ວ) |
| ໜ້າຈັດການ role ສຳລັບ admin (ຕອນນີ້ຕ້ອງໃຊ້ SQL) | **NOT COMPLETED** |
| 7 ESLint warnings ໃນ `components/ui/*` (shadcn ຕົ້ນສະບັບ) | ເຈດຕະນາບໍ່ແຕະ |

## 9. ຄຳແນະນຳສຳລັບການພັດທະນາຕໍ່

1. Apply migration ໃນ staging ກ່ອນ → ຕັດສິນໃຈເລື່ອງ role → apply production.
2. ເພີ່ມໜ້າ "ຜູ້ໃຊ້ ແລະ ສິດ" ສຳລັບ admin ອະນຸມັດບັນຊີໃໝ່.
3. ໃຊ້ Supabase Storage ສຳລັບຮູບ ແລະ ລຶບ base64 ອອກຈາກຕາຕະລາງເທື່ອລະໜ້ອຍ.
4. ໃຫ້ CI ລັນ `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` ທຸກ commit.
5. ກວດ Realtime PII (S6) ຫຼື ໃຫ້ guest subscribe ຜ່ານ view ສາທາລະນະເທົ່ານັ້ນ.
6. ເມື່ອຂໍ້ມູນເກົ່າສະອາດແລ້ວ ໃຫ້ `VALIDATE CONSTRAINT` ທີ່ເປັນ `NOT VALID`.
