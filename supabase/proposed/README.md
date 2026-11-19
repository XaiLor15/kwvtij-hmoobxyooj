# Proposed database changes — NOT applied automatically

Files in this folder are **not** in `supabase/migrations/`, so they are not run
by any deploy. They change who can write data, so the clan's administrators
must decide before applying them.

## `role_hardening.sql` — stop giving write access to every new sign-up

**Problem found in the audit:** the `handle_new_user` trigger gives every new
account the `member` role, and RLS lets any `member` insert / update / delete
**all** tables, including `transactions` (the treasury). Because sign-up is open
on the login page, anyone on the internet can create an account and then edit
or delete financial records and family data.

**What the script does**

1. New sign-ups receive the `guest` role (read-only in the app, and RLS read
   policies keep finance/fund data hidden from them).
2. Existing users keep their current roles — nothing is removed.
3. An administrator promotes approved people to `member` with one SQL line
   (shown in the script).

**Before applying**

- Confirm the list of current `admin` / `member` users is correct
  (query at the top of the script).
- Apply in the Supabase/Lovable Cloud SQL editor, then sign up a test account
  and confirm it is read-only.

**Rollback:** re-run the original `handle_new_user` definition from
`20260707083951_…sql` (also included at the bottom of the script).

## Further recommendations (not scripted)

- **Image storage:** photos are stored as base64 data URLs inside table rows.
  The app now compresses them (≤1280px gallery, ≤512px portraits), but moving
  them to a Supabase Storage bucket would make pages load faster.
- **Realtime + private columns:** `members`, `leadership` and `elders` are in
  the realtime publication. Verify whether realtime change payloads for the
  `anon` role include column-revoked fields (e.g. `phone`). The app no longer
  subscribes guests to these channels, but a determined visitor could.
