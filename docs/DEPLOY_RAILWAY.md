# ຄູ່ມື Deploy ຂຶ້ນ Railway + ເຊື່ອມຕໍ່ຖານຂໍ້ມູນ

ເອກະສານນີ້ພາທ່ານຈາກ repo ນີ້ ໄປຫາເວັບທີ່ໃຊ້ງານໄດ້ຢູ່ URL ຂອງ Railway.
ທຸກໄຟລ໌ທີ່ຕ້ອງໃຊ້ມີຢູ່ໃນ repo ແລ້ວ ແລະ **ທົດສອບແລ້ວ** (ເບິ່ງ §9).

---

## 0. ສະຖາປັດຕະຍະກຳ — ອ່ານກ່ອນ

```
ຜູ້ໃຊ້ ──► Railway (ເວັບ: Docker, Node 22)  ──► Supabase (ຖານຂໍ້ມູນ + Auth + Realtime)
```

**ສຳຄັນ: ຖານຂໍ້ມູນຕ້ອງເປັນ Supabase — ບໍ່ແມ່ນ Railway Postgres.**
ແອັບນີ້ໃຊ້ Supabase Auth (ເຂົ້າລະບົບ), REST API ອັດຕະໂນມັດ, Realtime ແລະ RLS
(`auth.uid()`). Postgres ທຳມະດາຂອງ Railway ບໍ່ມີສິ່ງເຫຼົ່ານີ້ — ຖ້າໃຊ້ ຕ້ອງຂຽນ backend ໃໝ່ທັງໝົດ.

### ເລືອກຖານຂໍ້ມູນ (ເລືອກ 1 ທາງ)

| ທາງເລືອກ | ເໝາະກັບ | ຂໍ້ຄວນລະວັງ |
|---|---|---|
| **A. Supabase project ໃໝ່ຂອງທ່ານເອງ** (ແນະນຳ) | ຕ້ອງການຄວບຄຸມເອງ, ອອກຈາກ Lovable | ຕ້ອງຍ້າຍຂໍ້ມູນ (§3) ແລະ ສະມາຊິກຕ້ອງສະໝັກບັນຊີໃໝ່ |
| **B. ໃຊ້ຖານຂໍ້ມູນ Lovable Cloud ເດີມ** | ຢາກໄດ້ URL ໄວທີ່ສຸດ, ຂໍ້ມູນ/ບັນຊີຢູ່ຄືເກົ່າ | ຕັ້ງຄ່າ Auth ຂອງ Lovable Cloud (redirect URL) ອາດເຮັດບໍ່ໄດ້ທັງໝົດ → ເຂົ້າລະບົບດ້ວຍ Google ອາດໃຊ້ບໍ່ໄດ້ຢູ່ Railway; email ຢືນຢັນອາດພາກັບໄປເວັບ Lovable |

ທາງ B: ຂ້າມໄປ §4 ເລີຍ ແລະ ໃຊ້ຄ່າຈາກໄຟລ໌ `.env` ໃນ repo. ຢ່າລືມ apply migration
`20261119000100_audit_hardening.sql` ໃນ Lovable Cloud (ຖ້າຍັງ).

---

## 1. ສ້າງ Supabase project (ທາງ A)

1. ເຂົ້າ <https://supabase.com> → **New project**
2. Region: **Southeast Asia (Singapore)** — ໃກ້ລາວທີ່ສຸດ
3. ຕັ້ງ Database password ທີ່ແຂງແຮງ ແລະ ເກັບໄວ້ (ບໍ່ຕ້ອງໃສ່ໃນ Railway)
4. ລໍຖ້າ project ພ້ອມ ແລ້ວໄປ **Project Settings → API** ຈົດ:
   - **Project URL** → `https://<ref>.supabase.co`
   - **Publishable key** (ຫຼື `anon` key ແບບເກົ່າ) — ເປີດເຜີຍໄດ້
   - **service_role / secret key** — ❗ ລັບ: ໃຊ້ສະເພາະ script ຍ້າຍຂໍ້ມູນໃນເຄື່ອງທ່ານ, **ຫ້າມ** ໃສ່ Railway ຫຼື GitHub

## 2. ສ້າງຕາຕະລາງ (ລັນ migration)

**ວິທີ 1 — Supabase CLI** (ໃນເຄື່ອງທີ່ມີ Node 22):

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <ref>
```

```bash
npx supabase db push
```

**ວິທີ 2 — SQL Editor**: ເປີດໄຟລ໌ໃນ `supabase/migrations/` ຕາມລຳດັບຊື່ (ເກົ່າ → ໃໝ່,
13 ໄຟລ໌) ແລ້ວ Run ເທື່ອລະໄຟລ໌.

ແລ້ວແນະນຳໃຫ້ລັນ `supabase/proposed/role_hardening.sql` ດ້ວຍ — ສຳລັບ project ໃໝ່ນີ້ປອດໄພ:
ບັນຊີທີ່ສະໝັກໃໝ່ຈະເບິ່ງໄດ້ຢ່າງດຽວ ຈົນກວ່າ admin ອະນຸມັດ (§6).

> ⚠ Migration ທຳອິດໃສ່ **ຂໍ້ມູນຕົວຢ່າງ** (15 ສະມາຊິກ, 5 ກິດຈະກຳ, 15 ທຸລະກຳ, 3 ຂ່າວ). §3 ຈະແທນທີ່ ຫຼື ລຶບມັນ.

## 3. ຂໍ້ມູນ: ຍ້າຍຈາກ Lovable ຫຼື ເລີ່ມໃໝ່

### 3a. ຍ້າຍຂໍ້ມູນເດີມ (ແນະນຳ)

ຕ້ອງການ: ບັນຊີທີ່ເປັນ **member/admin** ໃນເວັບເກົ່າ (ອ່ານຂໍ້ມູນທັງໝົດໄດ້) + service key ຂອງ project ໃໝ່.

```bash
npm ci
```

ທົດລອງກ່ອນ (DRY RUN — ບໍ່ຂຽນຫຍັງ, ສະແດງແຕ່ຈຳນວນແຖວ):

```bash
SOURCE_URL="https://<lovable-ref>.supabase.co" SOURCE_KEY="<publishable key ເກົ່າ ຈາກ .env>" SOURCE_EMAIL="you@example.com" SOURCE_PASSWORD="..." TARGET_URL="https://<ref>.supabase.co" TARGET_SERVICE_ROLE_KEY="<service key ໃໝ່>" node scripts/migrate-data.mjs
```

ຖ້າຈຳນວນຖືກຕ້ອງ, ລັນຄຳສັ່ງດຽວກັນ ແຕ່ຕື່ມ `--apply --wipe-target` ທ້າຍສຸດ
(`--wipe-target` ລຶບຂໍ້ມູນຕົວຢ່າງໃນ project **ໃໝ່** ກ່ອນ; script ປະຕິເສດຖ້າ source = target).
ສຸດທ້າຍລັນ `supabase/post-import.sql` ໃນ SQL Editor ຂອງ project ໃໝ່.

**ບໍ່ຖືກຍ້າຍ:** ບັນຊີຜູ້ໃຊ້ / ລະຫັດຜ່ານ (ຢູ່ໃນ `auth.users` ຂອງ Lovable). ສະມາຊິກສະໝັກໃໝ່ໃນເວັບໃໝ່.

### 3b. ເລີ່ມໃໝ່ (ບໍ່ມີຂໍ້ມູນເກົ່າ)

ລັນ `supabase/remove-demo-data.sql` ໃນ SQL Editor (ລຶບສະເພາະຂໍ້ມູນຕົວຢ່າງ).

## 4. ຕັ້ງຄ່າ Auth ໃນ Supabase (ທາງ A)

**Authentication → URL Configuration**
- Site URL: `https://<app>.up.railway.app` (ໄດ້ຈາກ §5 ຂັ້ນ 4 — ກັບມາແກ້ຫຼັງໄດ້ domain)
- Redirect URLs: `https://<app>.up.railway.app/**` (+ domain ຂອງທ່ານເອງຖ້າມີ)

**Authentication → Providers**
- Email: ເປີດ, ແນະນຳເປີດ "Confirm email"
- Google (ຖ້າຕ້ອງການ): ສ້າງ OAuth Client ໃນ Google Cloud Console →
  Authorized redirect URI = `https://<ref>.supabase.co/auth/v1/callback` → ໃສ່ Client ID/Secret ໃນ Supabase

## 5. Deploy ຂຶ້ນ Railway

1. <https://railway.com> → **New Project → Deploy from GitHub repo** → ເລືອກ `XaiLor15/kwvtij-hmoobxyooj`
   (ອະນຸຍາດ Railway GitHub App ເຂົ້າເຖິງ repo ນີ້)
2. Railway ອ່ານ `railway.json` → build ດ້ວຍ `Dockerfile` ອັດຕະໂນມັດ
3. ໄປ **Variables** ໃສ່ຄ່າຕາມຕາຕະລາງລຸ່ມ (ຫຼື **Raw Editor** ແລ້ວວາງຈາກ `.env.example`)
4. **Settings → Networking → Generate Domain** → ໄດ້ `https://<app>.up.railway.app`
5. ໃສ່ domain ນັ້ນໃນ `PUBLIC_SITE_URL` ແລະ ໃນ Supabase §4 → **Redeploy**

| Variable | ຄ່າ | ໝາຍເຫດ |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | ໃຊ້ຕອນ build (ຝັງໃນ browser) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable / anon key | ເປີດເຜີຍໄດ້ |
| `VITE_SUPABASE_PROJECT_ID` | `<ref>` | |
| `SUPABASE_URL` | ຄືກັບ `VITE_SUPABASE_URL` | ໃຊ້ຕອນ server render |
| `SUPABASE_PUBLISHABLE_KEY` | ຄືກັບ publishable key | |
| `VITE_AUTH_MODE` | `supabase` | Google login ຜ່ານ Supabase (ທາງ B ໃຊ້ `lovable` ກໍໄດ້ ແຕ່ອາດບໍ່ເຮັດວຽກນອກ Lovable) |
| `PUBLIC_SITE_URL` | `https://<app>.up.railway.app` | ລິ້ງໃນ `/sitemap.xml` |

**ຫ້າມໃສ່:** `PORT` (Railway ກຳນົດເອງ), service_role key, ລະຫັດຜ່ານຖານຂໍ້ມູນ.

> ຕົວແປ `VITE_*` ຖືກຝັງຕອນ **build** — ປ່ຽນແລ້ວຕ້ອງ Redeploy ຈຶ່ງມີຜົນ.
> ຖ້າລືມໃສ່ build ຈະລົ້ມພ້ອມຂໍ້ຄວາມ `ERROR: set VITE_SUPABASE_URL ...` (ຕັ້ງໃຈ — ກັນເວັບເສຍ).

## 6. ຫຼັງ Deploy ສຳເລັດ

1. ເປີດ `https://<app>.up.railway.app/healthz` → ຕ້ອງເຫັນ `{"ok":true,"supabaseConfigured":true}`
2. ສະໝັກບັນຊີຂອງທ່ານໃນເວັບ (ແລະ ຢືນຢັນ email)
3. ແກ້ email ໃນ `supabase/make-admin.sql` ແລ້ວ Run ໃນ SQL Editor → ທ່ານເປັນ admin
4. ອອກຈາກລະບົບ ແລ້ວເຂົ້າໃໝ່ (ເພື່ອໂຫຼດ role)

### ລາຍການກວດ

- [ ] ໜ້າຫຼັກສະແດງຈຳນວນສະມາຊິກ/ກິດຈະກຳ ຖືກຕ້ອງ (ທຽບກັບເວັບເກົ່າ)
- [ ] ຜູ້ຢ້ຽມຊົມ (ບໍ່ເຂົ້າລະບົບ) ເຫັນໄອຄອນ 🔒 ໃນໜ້າການເງິນ, ບໍ່ເຫັນເບີໂທ
- [ ] Admin ເພີ່ມ / ແກ້ / ລຶບ ສະມາຊິກໄດ້ ແລະ ຂໍ້ມູນຍັງຢູ່ຫຼັງ refresh
- [ ] ບັນທຶກລາຍຮັບ → ຍອດຄົງເຫຼືອປ່ຽນ, ໜ້າຕິດຕາມການບໍລິຈາກປ່ຽນຕາມ
- [ ] ເປີດ 2 browser → ແກ້ໃນອັນໜຶ່ງ ອີກອັນອັບເດດເອງ (Realtime)
- [ ] ເຂົ້າລະບົບດ້ວຍ Google (ຖ້າເປີດ)
- [ ] ບັນຊີໃໝ່ທີ່ສະໝັກ ເປັນ "ເບິ່ງໄດ້ຢ່າງດຽວ" (ຖ້າລັນ role_hardening)

## 7. ການເຮັດວຽກຮ່ວມກັບ Lovable

- Push ຂຶ້ນ `main` → Railway deploy ໃໝ່ອັດຕະໂນມັດ (ແລະ Lovable sync ຖ້າເຊື່ອມ repo ນີ້)
- Build ຂອງ Lovable **ບໍ່ປ່ຽນ** (ຍັງເປັນ Cloudflare); Railway ໃຊ້ `npm run build:node` / Dockerfile
- ⚠ ຖ້າໃຊ້ທາງ A, Lovable preview ຍັງຊີ້ໄປຖານຂໍ້ມູນເກົ່າ → ຂໍ້ມູນສອງບ່ອນຈະບໍ່ກົງກັນ.
  ຕັດສິນໃຈໃຫ້ຖານຂໍ້ມູນໃໝ່ເປັນບ່ອນດຽວ ແລະ ຢຸດໃຊ້ເວັບເກົ່າຫຼັງຍ້າຍ.

## 8. ແກ້ບັນຫາ

| ອາການ | ສາເຫດ / ວິທີແກ້ |
|---|---|
| Build ລົ້ມ `ERROR: set VITE_SUPABASE_URL` | ຍັງບໍ່ໃສ່ Variables → ໃສ່ ແລ້ວ Redeploy |
| ເວັບຂຶ້ນ ແຕ່ບໍ່ມີຂໍ້ມູນ | migration ຍັງບໍ່ລັນ ຫຼື URL/key ຜິດ project → ກວດ Console ຂອງ browser |
| ເຂົ້າລະບົບໄດ້ ແຕ່ເພີ່ມຂໍ້ມູນບໍ່ໄດ້ "ບໍ່ມີສິດ" | ບັນຊີຍັງບໍ່ມີ role member/admin → `make-admin.sql` ແລ້ວເຂົ້າລະບົບໃໝ່ |
| ກົດລິ້ງຢືນຢັນ email ໄປ localhost / ເວັບເກົ່າ | Site URL / Redirect URLs ໃນ Supabase §4 |
| Google: `redirect_uri_mismatch` | Redirect URI ໃນ Google Console ຕ້ອງເປັນ `https://<ref>.supabase.co/auth/v1/callback` |
| ເພີ່ມສະມາຊິກຫຼັງຍ້າຍຂໍ້ມູນ: `duplicate key` | ຍັງບໍ່ລັນ `supabase/post-import.sql` |
| Healthcheck ລົ້ມ | ເບິ່ງ Deploy Logs; server ຕ້ອງຂຶ້ນ `Listening on: ...` |
| Supabase free tier ຢຸດ (paused) | project ທີ່ບໍ່ມີການໃຊ້ງານໄລຍະໜຶ່ງຈະຖືກ pause — ກົດ Restore ໃນ dashboard ຫຼື ໃຊ້ແຜນເສຍເງິນ |

## 9. ສິ່ງທີ່ທົດສອບແລ້ວ (ກ່ອນ push)

- `docker build` ຈາກ Dockerfile ນີ້: `npm ci` → unit tests 22/22 → build `node-server` ✔
- Container: ຟັງ `PORT` ທີ່ກຳນົດ, `/healthz` 200, ທຸກໜ້າ 200, ໜ້າບໍ່ມີ 404, ລັນເປັນ user `node` (ບໍ່ແມ່ນ root) ✔
- Build ທີ່ບໍ່ມີ Supabase variables ລົ້ມພ້ອມຂໍ້ຄວາມຊັດເຈນ ✔
- `scripts/migrate-data.mjs` ກັບ mock Supabase 2 ຕົວ: 11/11 (dry run ບໍ່ຂຽນ, ປະຕິເສດ target ທີ່ມີຂໍ້ມູນ, ເຊື່ອມພໍ່-ລູກຄືນ, ຫຼາຍກວ່າ 1,000 ແຖວ, ປະຕິເສດ source=target) ✔
- SQL ທັງໝົດ (13 migrations, `remove-demo-data`, `post-import`, `make-admin`) ໃນ PostgreSQL 16 ✔
- Build ຂອງ Lovable (Cloudflare) ຍັງຜ່ານ ✔

**ຍັງບໍ່ໄດ້ທົດສອບ** (ຕ້ອງມີບັນຊີຂອງທ່ານ): deploy ຈິງໃນ Railway, Supabase project ຈິງ, Google OAuth, ການຍ້າຍຂໍ້ມູນຈາກ Lovable Cloud ຈິງ.
