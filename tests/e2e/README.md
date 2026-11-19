# Browser smoke & CRUD tests

Runs the real app in Chromium with an **in-memory mock** of the Supabase REST API
and a stubbed realtime socket — no request ever reaches the real database.
Fixture data exists only in `mock.cjs`.

```bash
npm run dev -- --port 8080 --host 127.0.0.1   # in another terminal
node tests/e2e/smoke.cjs   # 10 pages × 4 viewports × guest/member: errors, overflow, headings
node tests/e2e/crud.cjs    # add/edit/delete flows, cycle guard, duplicates, finance, fund undo, drafts
```

Requires `playwright` with Chromium available (`npm i -D playwright` if not installed globally).
Screenshots are written to `tests/e2e/shots/` (git-ignored).
