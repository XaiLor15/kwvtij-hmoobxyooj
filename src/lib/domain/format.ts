// Formatting helpers. Pure functions — safe on server and client.

const numberFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Full Kip amount, e.g. 1500000 → "1,500,000 ₭". Keeps the sign. */
export function formatKip(amount: number | null | undefined): string {
  const n = Number(amount) || 0;
  const sign = n < 0 ? "-" : "";
  return `${sign}${numberFmt.format(Math.abs(Math.round(n)))} ₭`;
}

/** Compact Kip for tight spaces, e.g. 1500000 → "1.5M ₭", -2500 → "-2.5K ₭". Keeps the sign. */
export function formatKipCompact(amount: number | null | undefined): string {
  const n = Number(amount) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${trim(abs / 1_000_000_000)}B ₭`;
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}M ₭`;
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}K ₭`;
  return `${sign}${numberFmt.format(abs)} ₭`;
}

function trim(v: number): string {
  return v.toFixed(1).replace(/\.0$/, "");
}

export function formatNumber(n: number | null | undefined): string {
  return numberFmt.format(Number(n) || 0);
}

const LAO_MONTHS = [
  "ມັງກອນ",
  "ກຸມພາ",
  "ມີນາ",
  "ເມສາ",
  "ພຶດສະພາ",
  "ມິຖຸນາ",
  "ກໍລະກົດ",
  "ສິງຫາ",
  "ກັນຍາ",
  "ຕຸລາ",
  "ພະຈິກ",
  "ທັນວາ",
];
export const LAO_MONTHS_SHORT = [
  "ມ.ກ",
  "ກ.ພ",
  "ມ.ນ",
  "ມ.ສ",
  "ພ.ພ",
  "ມິ.ຖ",
  "ກ.ລ",
  "ສ.ຫ",
  "ກ.ຍ",
  "ຕ.ລ",
  "ພ.ຈ",
  "ທ.ວ",
];

/** "2026-03-12" → "12 ມີນາ 2026". Returns "—" for empty/invalid input. */
export function formatDateLao(iso: string | null | undefined): string {
  const d = parseISODate(iso);
  if (!d) return "—";
  return `${d.day} ${LAO_MONTHS[d.month - 1]} ${d.year}`;
}

/** Parse a YYYY-MM-DD (optionally with time) string without timezone drift. */
export function parseISODate(
  iso: string | null | undefined,
): { year: number; month: number; day: number } | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/** Today's date as YYYY-MM-DD in the local timezone. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Age in whole years from a birthdate, correctly accounting for whether the
 * birthday has happened yet this year. Returns null if unknown or in the future.
 */
export function ageFromBirthdate(
  birthdate: string | null | undefined,
  today: Date = new Date(),
): number | null {
  const b = parseISODate(birthdate);
  if (!b) return null;
  const ty = today.getFullYear();
  const tm = today.getMonth() + 1;
  const td = today.getDate();
  let age = ty - b.year;
  if (tm < b.month || (tm === b.month && td < b.day)) age -= 1;
  return age >= 0 ? age : null;
}

/** Initials from a Lao/Hmong name, skipping honorific prefixes (ທ້າວ/ນາງ/ທ່ານ). */
export function initialsOf(name: string | null | undefined): string {
  const cleaned = String(name ?? "")
    .replace(/^(ທ່ານ|ນາງ|ທ້າວ)\s+/u, "")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const pick = words
    .slice(0, 2)
    .map((w) => Array.from(w)[0] ?? "")
    .join("");
  return pick || "?";
}

/** Strip the honorific prefix and keep the first two words of a name. */
export function shortName(name: string | null | undefined): string {
  return String(name ?? "")
    .replace(/^(ທ້າວ|ນາງ|ທ່ານ)\s+/u, "")
    .split(/\s+/)
    .slice(0, 2)
    .join(" ");
}

export function genLabel(gen: number | null | undefined): string {
  const g = Number(gen) || 1;
  return `ລຸ້ນທີ ${g} (Phaj ${g})`;
}

export function memberCode(id: number): string {
  return `M${String(id).padStart(4, "0")}`;
}
