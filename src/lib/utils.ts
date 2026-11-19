import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Lao-friendly search normalization ─────────────────────────────────────────
// Strips Lao tone marks & combining vowels so "ສົມ" matches "ສົ່ມ", lowercase,
// collapses whitespace. Makes member search forgiving of tone/vowel typing.
export function normalizeSearchText(v?: string | null): string {
  return (v ?? "")
    .toLowerCase()
    .replace(/[ັິີຶືຸູົຼ່້໊໋໌ໍ຺]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// All whitespace-separated tokens must be found somewhere in the haystack.
export function matchesSearchTokens(query: string, ...fields: Array<string | null | undefined>): boolean {
  const tokens = normalizeSearchText(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = normalizeSearchText(fields.filter(Boolean).join(" "));
  return tokens.every((t) => hay.includes(t));
}

// ── Address helpers ─────────────────────────────────────────────────────────
// Users only type the bare names (e.g. "ໂນນສະຫວ່າງ"). The system prepends
// "ບ້ານ", "ເມືອງ", "ແຂວງ" when composing the address string for storage
// and display.
function stripPrefix(value: string, prefix: string) {
  const v = (value ?? "").trim();
  return v.startsWith(prefix) ? v.slice(prefix.length).trim() : v;
}

export function normalizeVillage(v: string) { return stripPrefix(v, "ບ້ານ"); }
export function normalizeDistrict(v: string) { return stripPrefix(v, "ເມືອງ"); }
export function normalizeProvince(v: string) { return stripPrefix(v, "ແຂວງ"); }

// ── Group (ກຸ່ມ) helpers ────────────────────────────────────────────────────
// Canonical group names. Any legacy spelling is folded into these two.
export const BRANCH_GROUP_1 = "Pog Loj (Pog Txauj Tsim)";
export const BRANCH_GROUP_2 = "Pog Yau (Pog Liag Leej)";
export const BRANCHES = [BRANCH_GROUP_1, BRANCH_GROUP_2];

export function normalizeBranch(v?: string | null): string {
  const s = (v ?? "").trim();
  if (!s) return "";
  const l = s.toLowerCase();
  if (l.includes("txauj") || l.includes("pog loj") || l.includes("ກຸ່ມທີ 1") || l.includes("ກຸ່ມ 1")) return BRANCH_GROUP_1;
  if (l.includes("liag") || l.includes("pog yau") || l.includes("ກຸ່ມທີ 2") || l.includes("ກຸ່ມ 2")) return BRANCH_GROUP_2;
  return s;
}


export function formatAddress(parts: { village?: string; district?: string; province?: string }) {
  const v = normalizeVillage(parts.village ?? "");
  const d = normalizeDistrict(parts.district ?? "");
  const p = normalizeProvince(parts.province ?? "");
  const segs: string[] = [];
  if (v && v !== "-") segs.push(`ບ້ານ${v}`);
  if (d && d !== "-") segs.push(`ເມືອງ${d}`);
  if (p && p !== "-") segs.push(`ແຂວງ${p}`);
  return segs.join(", ");
}

// Best-effort parse of an existing combined address back into its parts.
export function parseAddress(addr?: string): { village: string; district: string; province: string } {
  const out = { village: "", district: "", province: "" };
  if (!addr) return out;
  for (const raw of addr.split(",")) {
    const s = raw.trim();
    if (!s || s === "-") continue;
    if (s.startsWith("ບ້ານ")) out.village = s.slice(3).trim();
    else if (s.startsWith("ເມືອງ")) out.district = s.slice(4).trim();
    else if (s.startsWith("ແຂວງ")) out.province = s.slice(4).trim();
    else if (!out.village) out.village = s;
    else if (!out.district) out.district = s;
    else if (!out.province) out.province = s;
  }
  return out;
}
