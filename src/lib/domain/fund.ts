// Fund participation & donation tracking. Everything is DERIVED from:
//   transactions (finance) + events + fund_members + members.
// Each income transaction is attributed to at most ONE fund member so
// amounts can never be double-counted.
import type { ClanEvent, FundMember, Member, Transaction } from "./types.ts";

export type PaymentStatus = "paid" | "partial" | "pending" | "overdue" | "none";

export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; tone: "success" | "info" | "warning" | "destructive" | "neutral" }
> = {
  paid: { label: "ຈ່າຍຄົບແລ້ວ", tone: "success" },
  partial: { label: "ຈ່າຍບາງສ່ວນ", tone: "info" },
  pending: { label: "ຍັງບໍ່ທັນຈ່າຍ", tone: "warning" },
  overdue: { label: "ຄ້າງຈ່າຍ", tone: "destructive" },
  none: { label: "ບໍ່ຢູ່ໃນເງື່ອນໄຂ", tone: "neutral" },
};

type MemberLite = Pick<Member, "id" | "name" | "nickname">;

function norm(s: string | null | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Build an attribution map: transaction id → member id.
 * - An explicit `memberId` always wins (if that member is a candidate).
 * - Otherwise the typed contributor name is matched against candidates'
 *   name/nickname, but only when exactly ONE candidate matches (ambiguous
 *   names are left unattributed rather than credited twice).
 */
export function attributeIncome(
  txns: readonly Transaction[],
  candidates: readonly MemberLite[],
): Map<string, number> {
  const ids = new Set(candidates.map((m) => m.id));
  const byName = new Map<string, number[]>();
  for (const m of candidates) {
    for (const key of [norm(m.name), norm(m.nickname)]) {
      if (!key) continue;
      const list = byName.get(key) ?? [];
      if (!list.includes(m.id)) list.push(m.id);
      byName.set(key, list);
    }
  }
  const out = new Map<string, number>();
  for (const t of txns) {
    if (t.direction !== "income") continue;
    if (t.memberId != null) {
      if (ids.has(t.memberId)) out.set(t.id, t.memberId);
      continue;
    }
    const matches = byName.get(norm(t.contributor));
    if (matches && matches.length === 1) out.set(t.id, matches[0]);
  }
  return out;
}

/** Expected contribution per member for an event. */
export function expectedPerMember(
  event: Pick<ClanEvent, "expectedPerMember" | "contributions" | "attendees"> | null,
): number {
  if (!event) return 0;
  if (event.expectedPerMember > 0) return event.expectedPerMember;
  if (event.contributions > 0 && event.attendees > 0)
    return Math.round(event.contributions / event.attendees);
  return 0;
}

export function paymentStatus(args: {
  paid: number;
  expected: number;
  eventDate: string;
  joinedAt?: string;
  now?: Date;
}): PaymentStatus {
  const { paid, expected, eventDate, joinedAt } = args;
  if (joinedAt && eventDate && eventDate < joinedAt) return "none";
  if (paid > 0 && (expected <= 0 || paid >= expected)) return "paid";
  if (paid > 0) return "partial";
  if (!eventDate) return "pending";
  const due = new Date(`${eventDate}T23:59:59`);
  return (args.now ?? new Date()) > due ? "overdue" : "pending";
}

export interface ParticipantRow {
  member: Member;
  fundMember: FundMember;
  paid: number;
  payments: Transaction[];
  lastPaymentDate: string;
  expected: number;
  status: PaymentStatus;
}

export interface ActivityStats {
  event: ClanEvent;
  rows: ParticipantRow[];
  perMember: number;
  expectedTotal: number;
  /** Collected from fund members (attributed). */
  collected: number;
  /** All income linked to this event in Finance (includes non-fund donors). */
  financeIncome: number;
  /** Event income that couldn't be attributed to any fund member. */
  unattributed: number;
  remaining: number;
  counts: Record<PaymentStatus, number>;
  progressPct: number;
}

/**
 * Per-event view of every active fund member. When `respectJoinDate` is true,
 * members who joined after the event are marked "none" and excluded from the
 * expected total.
 */
export function activityStats(args: {
  event: ClanEvent;
  fundMembers: readonly FundMember[];
  membersById: ReadonlyMap<number, Member>;
  transactions: readonly Transaction[];
  respectJoinDate?: boolean;
  now?: Date;
}): ActivityStats {
  const { event, membersById, transactions, respectJoinDate = true } = args;
  const active = args.fundMembers.filter((f) => f.status === "active");
  const candidates = active.map((f) => membersById.get(f.memberId)).filter((m): m is Member => !!m);
  const eventTxns = transactions.filter((t) => t.eventId === event.id && t.direction === "income");
  const attribution = attributeIncome(eventTxns, candidates);
  const perMember = expectedPerMember(event);

  const counts: Record<PaymentStatus, number> = {
    paid: 0,
    partial: 0,
    pending: 0,
    overdue: 0,
    none: 0,
  };
  const rows: ParticipantRow[] = [];
  let collected = 0;
  let expectedTotal = 0;
  for (const fm of active) {
    const member = membersById.get(fm.memberId);
    if (!member) continue;
    const payments = eventTxns.filter((t) => attribution.get(t.id) === member.id);
    const paid = payments.reduce((s, t) => s + Math.abs(t.amount), 0);
    const status = paymentStatus({
      paid,
      expected: perMember,
      eventDate: event.date,
      joinedAt: respectJoinDate ? fm.joinedAt : undefined,
      now: args.now,
    });
    const lastPaymentDate = payments.reduce((d, t) => (t.date > d ? t.date : d), "");
    counts[status] += 1;
    collected += paid;
    if (status !== "none") expectedTotal += perMember;
    rows.push({
      member,
      fundMember: fm,
      paid,
      payments,
      lastPaymentDate,
      expected: perMember,
      status,
    });
  }
  const financeIncome = eventTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
  return {
    event,
    rows,
    perMember,
    expectedTotal,
    collected,
    financeIncome,
    unattributed: Math.max(0, financeIncome - collected),
    remaining: Math.max(0, expectedTotal - collected),
    counts,
    progressPct:
      expectedTotal > 0 ? Math.min(100, Math.round((collected / expectedTotal) * 100)) : 0,
  };
}

/** Lifetime income attributed to each fund member (all events + general). */
export function lifetimeContributions(
  transactions: readonly Transaction[],
  fundMembers: readonly FundMember[],
  membersById: ReadonlyMap<number, Member>,
): Map<number, { total: number; count: number; last: string }> {
  const candidates = fundMembers
    .map((f) => membersById.get(f.memberId))
    .filter((m): m is Member => !!m);
  const attribution = attributeIncome(transactions, candidates);
  const out = new Map<number, { total: number; count: number; last: string }>();
  for (const t of transactions) {
    const mid = attribution.get(t.id);
    if (mid == null) continue;
    const cur = out.get(mid) ?? { total: 0, count: 0, last: "" };
    cur.total += Math.abs(t.amount);
    cur.count += 1;
    if (t.date > cur.last) cur.last = t.date;
    out.set(mid, cur);
  }
  return out;
}
