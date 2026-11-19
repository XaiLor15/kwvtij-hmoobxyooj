// Role-based access rules (frontend). The database RLS policies are the real
// enforcement; these rules decide what the UI offers so users never see an
// action they cannot perform.
//
//   guest  — not signed in: read-only (public data only)
//   member — signed-in clan member: create / edit / delete
//   admin  — as member, plus administrative management
//
// NOTE: guests used to be allowed to edit members. That path wrote to columns
// the database had already revoked from anonymous users, so it always failed,
// and it let anyone on the internet rewrite family records. It is removed.

export type Role = "guest" | "member" | "admin";
export type Action = "view" | "create" | "edit" | "delete" | "manage";
export type Module =
  "members" | "leadership" | "elders" | "activities" | "finance" | "fund" | "news" | "dashboard";

/** Modules whose data is private to signed-in members (RLS blocks anon reads). */
export const PRIVATE_MODULES: ReadonlySet<Module> = new Set(["finance", "fund"]);

export function can(role: Role, action: Action, module: Module): boolean {
  if (action === "view") return role !== "guest" || !PRIVATE_MODULES.has(module);
  if (action === "manage") return role === "admin";
  return role === "member" || role === "admin";
}

// Mirror of the current role for non-React code paths (store mutations).
let roleMirror: Role = "guest";
export function setRoleMirror(role: Role) {
  roleMirror = role;
}
export function getRole(): Role {
  return roleMirror;
}

/** Returns an error message if the current user may not perform the action. */
export function checkPermission(action: Action, module: Module): string | null {
  if (can(roleMirror, action, module)) return null;
  return roleMirror === "guest" ? "ກະລຸນາເຂົ້າລະບົບກ່ອນດຳເນີນການນີ້" : "ທ່ານບໍ່ມີສິດດຳເນີນການນີ້";
}
