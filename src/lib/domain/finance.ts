// Treasury calculations. Single source of truth = the transactions list;
// derived numbers are never stored.
import type { Transaction } from "./types.ts";
import { parseISODate } from "./format.ts";

export interface Totals {
  income: number;
  expense: number;
  balance: number;
  count: number;
}

/** Amounts are stored positive; direction decides the sign. */
export function signedAmount(t: Pick<Transaction, "amount" | "direction">): number {
  const a = Math.abs(Number(t.amount) || 0);
  return t.direction === "expense" ? -a : a;
}

export function totalsOf(txns: readonly Pick<Transaction, "amount" | "direction">[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of txns) {
    const a = Math.abs(Number(t.amount) || 0);
    if (t.direction === "expense") expense += a;
    else income += a;
  }
  return { income, expense, balance: income - expense, count: txns.length };
}

export function eventTotals(txns: readonly Transaction[], eventId: number): Totals {
  return totalsOf(txns.filter((t) => t.eventId === eventId));
}

export type DateRange = "all" | "today" | "month" | "year";

export const DATE_RANGE_LABEL: Record<DateRange, string> = {
  today: "ມື້ນີ້",
  month: "ເດືອນນີ້",
  year: "ປີນີ້",
  all: "ທັງໝົດ",
};

/** Whether a YYYY-MM-DD date falls inside the range relative to `now`. */
export function inDateRange(date: string, range: DateRange, now: Date = new Date()): boolean {
  if (range === "all") return true;
  const d = parseISODate(date);
  if (!d) return false;
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (range === "year") return d.year === y;
  if (range === "month") return d.year === y && d.month === m;
  return d.year === y && d.month === m && d.day === now.getDate();
}

/** Years that have at least one transaction, newest first. */
export function yearsWithData(txns: readonly Pick<Transaction, "date">[]): number[] {
  const set = new Set<number>();
  for (const t of txns) {
    const d = parseISODate(t.date);
    if (d) set.add(d.year);
  }
  return [...set].sort((a, b) => b - a);
}

/** Income/expense per month (index 0 = January) for one calendar year. */
export function monthlySeries(
  txns: readonly Pick<Transaction, "date" | "amount" | "direction">[],
  year: number,
): { month: number; income: number; expense: number }[] {
  const out = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, income: 0, expense: 0 }));
  for (const t of txns) {
    const d = parseISODate(t.date);
    if (!d || d.year !== year) continue;
    const a = Math.abs(Number(t.amount) || 0);
    if (t.direction === "expense") out[d.month - 1].expense += a;
    else out[d.month - 1].income += a;
  }
  return out;
}

/** Sum of amounts per category for one direction, largest first, with percentage. */
export function categoryBreakdown(
  txns: readonly Transaction[],
  direction: Transaction["direction"],
): { label: string; amount: number; pct: number }[] {
  const sums = new Map<string, number>();
  let total = 0;
  for (const t of txns) {
    if (t.direction !== direction) continue;
    const key = (t.category || "ອື່ນໆ").trim() || "ອື່ນໆ";
    const a = Math.abs(Number(t.amount) || 0);
    sums.set(key, (sums.get(key) ?? 0) + a);
    total += a;
  }
  return [...sums.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, amount]) => ({
      label,
      amount,
      pct: total > 0 ? Math.round((amount / total) * 100) : 0,
    }));
}

/** Key identifying who a transaction is from/to: a member id, or a typed name. */
export function partyKey(t: Pick<Transaction, "memberId" | "contributor">): string | null {
  if (t.memberId != null) return `m:${t.memberId}`;
  const name = (t.contributor || "").trim().toLowerCase();
  return name ? `n:${name}` : null;
}

export function uniqueDonorCount(txns: readonly Transaction[]): number {
  const keys = new Set<string>();
  for (const t of txns) {
    if (t.direction !== "income") continue;
    const k = partyKey(t);
    if (k) keys.add(k);
  }
  return keys.size;
}

/** Top income contributors (by member id or typed name). */
export function topContributors(
  txns: readonly Transaction[],
  limit = 5,
): { key: string; memberId?: number; name: string; amount: number; count: number }[] {
  const map = new Map<
    string,
    { key: string; memberId?: number; name: string; amount: number; count: number }
  >();
  for (const t of txns) {
    if (t.direction !== "income") continue;
    const key = partyKey(t);
    if (!key) continue;
    const cur = map.get(key) ?? {
      key,
      memberId: t.memberId,
      name: t.contributor || "",
      amount: 0,
      count: 0,
    };
    cur.amount += Math.abs(Number(t.amount) || 0);
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, limit);
}

/** Collision-resistant transaction id ("TXN-" + time + random suffix). */
export function newTransactionId(now: number = Date.now(), rand: () => number = Math.random) {
  const suffix = Math.floor(rand() * 36 ** 4)
    .toString(36)
    .padStart(4, "0")
    .toUpperCase();
  return `TXN-${now.toString(36).toUpperCase()}-${suffix}`;
}

/** Validate a transaction form; returns a Lao error message or null. */
export function validateTransaction(input: {
  amount: number | string;
  date: string;
  type: string;
}): string | null {
  if (!input.type) return "ກະລຸນາເລືອກປະເພດທຸລະກຳ";
  const amt = Number(input.amount);
  if (!Number.isFinite(amt) || amt <= 0) return "ກະລຸນາປ້ອນຈຳນວນເງິນທີ່ຖືກຕ້ອງ (ຫຼາຍກວ່າ 0)";
  if (amt > 100_000_000_000) return "ຈຳນວນເງິນໃຫຍ່ເກີນໄປ";
  if (!parseISODate(input.date)) return "ກະລຸນາເລືອກວັນທີ";
  return null;
}
