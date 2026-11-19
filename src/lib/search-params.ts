// Helpers for typed, optional URL search params (deep links between modules).

export function optionalNumber(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function optionalString(v: unknown): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}
