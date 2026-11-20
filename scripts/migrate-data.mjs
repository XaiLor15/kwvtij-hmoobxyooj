#!/usr/bin/env node
// Copy clan data from the OLD Supabase project (e.g. Lovable Cloud) to a NEW one.
//
//   SOURCE: read with the public key + a signed-in member/admin account
//           (RLS lets members read every content table — no service key needed).
//   TARGET: written with the NEW project's service_role key (bypasses RLS).
//
// Default is a DRY RUN that only prints row counts. Nothing is written unless
// you pass --apply. Rows already in the target are only removed with --wipe-target.
//
// Usage (see docs/DEPLOY_RAILWAY.md):
//   SOURCE_URL=... SOURCE_KEY=... SOURCE_EMAIL=... SOURCE_PASSWORD=... \
//   TARGET_URL=... TARGET_SERVICE_ROLE_KEY=... \
//   node scripts/migrate-data.mjs [--apply] [--wipe-target]
//
// Users/passwords are NOT copied (they live in auth.users). Members sign up
// again on the new site; then grant roles with supabase/make-admin.sql.
import { createClient } from "@supabase/supabase-js";

// Parent tables first (foreign keys).
export const TABLES = [
  "members",
  "member_relations",
  "events",
  "transactions",
  "fund_members",
  "leadership",
  "elders",
  "news",
  "participants",
  "gallery",
  "meetings",
  "stories",
  "files",
];
const PAGE = 1000;
const BATCH = 200;

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const WIPE = args.has("--wipe-target");

function env(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing environment variable ${name}`);
    process.exit(2);
  }
  return v;
}

async function readAll(client, table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) {
      // Tables missing in older projects are skipped, not fatal.
      if (error.code === "42P01" || error.code === "PGRST205") return null;
      throw new Error(`read ${table}: ${error.message}`);
    }
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

async function count(client, table) {
  const { count: n, error } = await client.from(table).select("id", { count: "exact", head: true });
  return error ? null : n;
}

/** Drop columns the target table doesn't have (source may be older/newer). */
async function targetColumns(client, table, sample) {
  const { data, error } = await client.from(table).select("*").limit(1);
  if (error) return null;
  if (data.length) return new Set(Object.keys(data[0]));
  // Empty table: probe each column of the sample row.
  const cols = new Set();
  for (const c of Object.keys(sample)) {
    const { error: e } = await client.from(table).select(c).limit(1);
    if (!e) cols.add(c);
  }
  return cols;
}

async function main() {
  const source = { url: env("SOURCE_URL"), key: env("SOURCE_KEY") };
  const target = { url: env("TARGET_URL"), key: env("TARGET_SERVICE_ROLE_KEY") };
  if (new URL(source.url).host === new URL(target.url).host) {
    console.error("SOURCE_URL and TARGET_URL are the same project — refusing to run.");
    process.exit(2);
  }

  const src = createClient(source.url, source.key, { auth: { persistSession: false } });
  const { error: authErr } = await src.auth.signInWithPassword({
    email: env("SOURCE_EMAIL"),
    password: env("SOURCE_PASSWORD"),
  });
  if (authErr) throw new Error(`Source sign-in failed: ${authErr.message}`);
  const dst = createClient(target.url, target.key, { auth: { persistSession: false } });

  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN (no writes)"}${WIPE ? " + wipe target" : ""}`);
  console.log(`Source: ${new URL(source.url).host}  →  Target: ${new URL(target.url).host}\n`);

  const data = {};
  for (const t of TABLES) {
    data[t] = await readAll(src, t);
    const existing = await count(dst, t);
    console.log(
      `${t.padEnd(18)} source=${data[t] == null ? "n/a" : String(data[t].length).padStart(5)}   target(now)=${existing ?? "n/a"}`,
    );
  }

  const nonEmpty = [];
  for (const t of TABLES) if ((await count(dst, t)) > 0) nonEmpty.push(t);
  if (!APPLY) {
    console.log("\nDry run finished. Re-run with --apply to copy.");
    if (nonEmpty.length)
      console.log(
        `Target already has rows in: ${nonEmpty.join(", ")} (add --wipe-target to clear them first).`,
      );
    return;
  }
  if (nonEmpty.length && !WIPE) {
    console.error(
      `\nTarget is not empty (${nonEmpty.join(", ")}). Re-run with --wipe-target to clear it first.`,
    );
    process.exit(3);
  }

  if (WIPE) {
    for (const t of [...TABLES].reverse()) {
      if ((await count(dst, t)) == null) continue;
      const { error } = await dst.from(t).delete().not("id", "is", null);
      if (error) throw new Error(`wipe ${t}: ${error.message}`);
    }
    console.log("\nTarget tables cleared.");
  }

  for (const t of TABLES) {
    const rows = data[t];
    if (!rows?.length) continue;
    const cols = await targetColumns(dst, t, rows[0]);
    if (!cols) {
      console.log(`skip ${t} (not in target)`);
      continue;
    }
    // members.parent_id references members: insert without it, then link.
    const prepared = rows.map((r) => {
      const o = Object.fromEntries(Object.entries(r).filter(([k]) => cols.has(k)));
      if (t === "members") o.parent_id = null;
      return o;
    });
    for (let i = 0; i < prepared.length; i += BATCH) {
      const { error } = await dst.from(t).insert(prepared.slice(i, i + BATCH));
      if (error) throw new Error(`insert ${t}: ${error.message}`);
    }
    if (t === "members") {
      for (const r of rows.filter((x) => x.parent_id != null)) {
        const { error } = await dst
          .from("members")
          .update({ parent_id: r.parent_id })
          .eq("id", r.id);
        if (error) throw new Error(`link parent of member ${r.id}: ${error.message}`);
      }
    }
    console.log(`copied ${t}: ${rows.length}`);
  }

  console.log(
    "\nDone. NEXT: run supabase/post-import.sql in the TARGET SQL editor (resets ID counters).",
  );
}

main().catch((e) => {
  console.error("\nFAILED:", e.message);
  process.exit(1);
});
