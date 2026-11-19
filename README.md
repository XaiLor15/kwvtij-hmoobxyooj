# ລະບົບຄຸ້ມຄອງຕະກູນ — Kwv Tij Hmoob Xyooj

ໂປຣເຈັກແຫຼ່ງ (source) ຂອງໄຟລ໌ ZIP ນີ້.

## ສິ່ງທີມີຢູ່ໃນໂຟມ

- `src/` — ລະຫັດ React ທັງໝົດ (pages ໃນ `src/routes/`, ຊົ່ວໂມງໃນ `src/components/`, ຂໍ້ມູນ/ເລົ່າเก็บໃນ `src/lib/`)
- `supabase/migrations/` — ຄຳສັ່ງສ້າງຕະຕາງ, RLS ແລະ Realtime ທັງໝົດ (ລຳດັບຕາມວັນທີ)
- `supabase/config.toml` — ການຕັ້ງຄ່າພາຍໃນ
- `public/` — ຮູບ/ໄຟລ໌ທີຂາຍອອກໄປທາງໜ້າ
- `.env` — ທີ່ຢູ່ backend ແລະ ກุญແຈສາທາລະນະ (publishable) ເທົ່ານັ້ນ
- `package.json`, `bun.lock`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `components.json`, `.prettierrc`

## ວິທີເປີດໃຊ້

ຕ້ອງການ Node.js 20+ ແລະ bun.

```bash
bun install
bun run dev      # ເປີດຕົວຢ່າງໃນເຄື່ອງ (ໂດຍປົກກະຕິ http://localhost:8080)
bun run build    # ສ້າງເອກະສານຈຳໜ່າຍ
bun run lint     # ກວດຮ່າງຮ້າງລະຫັດ
npm run typecheck # ກວດ TypeScript
npm test         # unit tests ຂອງ business logic
```

ລາຍງານການກວດສອບ: [`docs/AUDIT_REPORT.md`](docs/AUDIT_REPORT.md) · ການທົດສອບ browser: [`tests/e2e/`](tests/e2e/README.md)

## ຖານຂໍ້ມູນ

ຂໍ້ມູນທັງໝົດຢູ່ Lovable Cloud (Supabase). ເມື່ອຍ້າຍໄປໂປຣເຈັກໃໝ່:

1. ຕັ້ງຄ່າ `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` ໃນ `.env` ໃຫ້ຕົງກັບໂປຣເຈັກໃໝ່.
2. ນຳ `supabase/migrations/*.sql` ເຂົ້າຖານຂໍ້ມູນໃໝ່ ຕາມລຳດັບຊື່ໄຟລ໌ (ເກົ່າ → ໃໝ່).
3. ຕັ້ງຄ່າ Auth (email, Google) ໃນ dashboard ຂອງ Lovable Cloud ໃຫ້ເປີດໃຊ້.

ໝາຍເຫດ: `.env` ໃນໂຟມນີ້ມີແຕ່ຄ່າທີເປີດເຜີຍໄດ້ (URL + publishable key) — ບໍ່ມີກุญລັບ.
