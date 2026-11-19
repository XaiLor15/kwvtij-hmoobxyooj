// Unit tests for pure business logic. Run with: npm test
// (Node's built-in test runner + type stripping; no extra dependencies.)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ageFromBirthdate,
  formatKip,
  formatKipCompact,
  initialsOf,
  parseISODate,
} from "./format.ts";
import {
  ancestorIds,
  descendantGenerationPatches,
  findPossibleDuplicates,
  generationFor,
  lineagePath,
  wouldCreateCycle,
} from "./family.ts";
import {
  categoryBreakdown,
  inDateRange,
  monthlySeries,
  newTransactionId,
  totalsOf,
  validateTransaction,
} from "./finance.ts";
import { activityStats, attributeIncome, lifetimeContributions, paymentStatus } from "./fund.ts";
import { getEventPhase, parseTimeRange, validateEvent } from "./events.ts";
import { csvCell, toCSV } from "./csv.ts";
import { upcomingBirthdays } from "./notifications.ts";
import type { ClanEvent, FundMember, Member, Transaction } from "./types.ts";

const member = (p: Partial<Member> & { id: number }): Member => ({
  name: `M${p.id}`,
  nickname: "",
  gender: "M",
  age: 0,
  gen: 1,
  role: "",
  branch: "",
  village: "",
  district: "",
  province: "",
  address: "",
  status: "alive",
  phone: "",
  photo: null,
  children: [],
  spouse: [],
  ...p,
});

const tx = (p: Partial<Transaction> & { id: string }): Transaction => ({
  createdAt: 0,
  date: "2026-01-01",
  direction: "income",
  amount: 0,
  description: "",
  eventTitle: "",
  type: "",
  contributor: "",
  method: "",
  note: "",
  ...p,
});

const event = (p: Partial<ClanEvent> & { id: number }): ClanEvent => ({
  title: "E",
  category: "",
  status: "",
  description: "",
  date: "2026-06-01",
  time: "",
  location: "",
  organizer: "",
  attendees: 0,
  budget: 0,
  spent: 0,
  contributions: 0,
  expectedPerMember: 0,
  tags: [],
  cover: "",
  colorA: "",
  colorB: "",
  ...p,
});

// ── format ──────────────────────────────────────────────────────────────
test("age accounts for birthdays not yet reached this year", () => {
  const today = new Date(2026, 10, 19); // 19 Nov 2026
  assert.equal(ageFromBirthdate("2000-11-19", today), 26);
  assert.equal(ageFromBirthdate("2000-11-20", today), 25);
  assert.equal(ageFromBirthdate("2000-01-01", today), 26);
  assert.equal(ageFromBirthdate("2030-01-01", today), null);
  assert.equal(ageFromBirthdate("", today), null);
  assert.equal(ageFromBirthdate("not-a-date", today), null);
});

test("kip formatting keeps the sign (negative balance must not look positive)", () => {
  assert.equal(formatKip(1500000), "1,500,000 ₭");
  assert.equal(formatKip(-2500), "-2,500 ₭");
  assert.equal(formatKipCompact(-1_500_000), "-1.5M ₭");
  assert.equal(formatKipCompact(2_000_000), "2M ₭");
  assert.equal(formatKip(undefined), "0 ₭");
});

test("parseISODate rejects garbage", () => {
  assert.deepEqual(parseISODate("2026-03-12"), { year: 2026, month: 3, day: 12 });
  assert.equal(parseISODate("2026-13-01"), null);
  assert.equal(parseISODate(null), null);
});

test("initials skip honorifics", () => {
  assert.equal(initialsOf("ທ້າວ ບຸນມີ ແສງສະຫວັນ"), "ບແ");
  assert.equal(initialsOf(""), "?");
});

// ── family ──────────────────────────────────────────────────────────────
const tree = [
  member({ id: 1, gen: 1 }),
  member({ id: 2, gen: 2, parent: 1 }),
  member({ id: 3, gen: 3, parent: 2 }),
  member({ id: 4, gen: 2, parent: 1 }),
];

test("cycle detection prevents choosing a descendant as parent", () => {
  assert.equal(wouldCreateCycle(1, 3, tree), true);
  assert.equal(wouldCreateCycle(2, 2, tree), true);
  assert.equal(wouldCreateCycle(3, 4, tree), false);
  assert.equal(wouldCreateCycle(3, null, tree), false);
});

test("ancestor walk terminates on corrupted cyclic data", () => {
  const cyclic = [member({ id: 1, parent: 2 }), member({ id: 2, parent: 1 })];
  assert.deepEqual(ancestorIds(1, cyclic), [2]);
  assert.equal(lineagePath(1, cyclic).length, 2);
});

test("generation follows parent and cascades to descendants", () => {
  assert.equal(generationFor(2, tree), 3);
  assert.equal(generationFor(null, tree), 1);
  // Move member 2 (gen 2) to be a root (gen 1) → its child 3 must become gen 2.
  assert.deepEqual(descendantGenerationPatches(2, 1, tree), [{ id: 3, gen: 2 }]);
});

test("duplicate detection uses name + birthdate or parent", () => {
  const list = [
    member({ id: 10, name: "ທ້າວ ສົມ ພອນ", birthdate: "2000-01-01" }),
    member({ id: 11, name: "ນາງ ດາວ", parent: 1 }),
  ];
  assert.equal(
    findPossibleDuplicates({ name: "ສົມ  ພອນ", birthdate: "2000-01-01" }, list).length,
    1,
  );
  assert.equal(findPossibleDuplicates({ name: "ສົມ ພອນ", birthdate: "1999-01-01" }, list).length, 0);
  assert.equal(findPossibleDuplicates({ name: "ດາວ", parent: 1 }, list).length, 1);
  assert.equal(findPossibleDuplicates({ id: 11, name: "ດາວ", parent: 1 }, list).length, 0);
});

// ── finance ─────────────────────────────────────────────────────────────
const txns = [
  tx({ id: "a", amount: 1000, date: "2025-03-01" }),
  tx({ id: "b", amount: 3000, date: "2026-03-05", direction: "expense", category: "ອາຫານ" }),
  tx({ id: "c", amount: 500, date: "2026-03-20" }),
];

test("totals and negative balance", () => {
  assert.deepEqual(totalsOf(txns), { income: 1500, expense: 3000, balance: -1500, count: 3 });
});

test("monthly series is scoped to a single year (no cross-year mixing)", () => {
  const s2026 = monthlySeries(txns, 2026);
  assert.equal(s2026[2].income, 500);
  assert.equal(s2026[2].expense, 3000);
  assert.equal(monthlySeries(txns, 2025)[2].income, 1000);
});

test("date range filter", () => {
  const now = new Date(2026, 2, 20);
  assert.equal(inDateRange("2026-03-20", "today", now), true);
  assert.equal(inDateRange("2026-03-05", "month", now), true);
  assert.equal(inDateRange("2025-03-01", "year", now), false);
  assert.equal(inDateRange("", "year", now), false);
  assert.equal(inDateRange("", "all", now), true);
});

test("category breakdown", () => {
  assert.deepEqual(categoryBreakdown(txns, "expense"), [
    { label: "ອາຫານ", amount: 3000, pct: 100 },
  ]);
});

test("transaction ids do not collide within the same millisecond", () => {
  let i = 0;
  const seq = [0.1, 0.2];
  const a = newTransactionId(1, () => seq[i++]);
  const b = newTransactionId(1, () => seq[i++]);
  assert.notEqual(a, b);
});

test("transaction validation", () => {
  assert.equal(validateTransaction({ amount: 0, date: "2026-01-01", type: "x" }) !== null, true);
  assert.equal(validateTransaction({ amount: 10, date: "", type: "x" }) !== null, true);
  assert.equal(validateTransaction({ amount: 10, date: "2026-01-01", type: "x" }), null);
});

// ── fund / donation tracking ───────────────────────────────────────────
const people = [
  member({ id: 1, name: "ບຸນມີ" }),
  member({ id: 2, name: "ສົມ" }),
  member({ id: 3, name: "ສົມ" }), // same name → ambiguous
];
const byId = new Map(people.map((m) => [m.id, m]));
const fms: FundMember[] = people.map((m) => ({
  id: `FM-${m.id}`,
  memberId: m.id,
  joinedAt: "2026-01-01",
  status: "active",
  note: "",
  createdAt: 0,
  updatedAt: 0,
}));

test("explicit memberId wins; ambiguous names are not double-credited", () => {
  const map = attributeIncome(
    [
      tx({ id: "1", memberId: 1, amount: 100 }),
      tx({ id: "2", contributor: "ບຸນມີ", amount: 50 }),
      tx({ id: "3", contributor: "ສົມ", amount: 70 }),
    ],
    people,
  );
  assert.equal(map.get("1"), 1);
  assert.equal(map.get("2"), 1);
  assert.equal(map.has("3"), false);
});

test("installments are summed and partial payments are recognised", () => {
  const ev = event({ id: 9, date: "2026-06-01", expectedPerMember: 100 });
  const stats = activityStats({
    event: ev,
    fundMembers: fms,
    membersById: byId,
    transactions: [
      tx({ id: "p1", eventId: 9, memberId: 1, amount: 60 }),
      tx({ id: "p2", eventId: 9, memberId: 1, amount: 40 }),
      tx({ id: "p3", eventId: 9, memberId: 2, amount: 30 }),
      tx({ id: "p4", eventId: 9, contributor: "outsider", amount: 500 }),
    ],
    now: new Date(2026, 6, 1),
  });
  const row = (id: number) => stats.rows.find((r) => r.member.id === id)!;
  assert.equal(row(1).paid, 100);
  assert.equal(row(1).status, "paid");
  assert.equal(row(2).status, "partial");
  assert.equal(row(3).status, "overdue");
  assert.equal(stats.collected, 130);
  assert.equal(stats.financeIncome, 630);
  assert.equal(stats.unattributed, 500);
  assert.equal(stats.expectedTotal, 300);
});

test("members who joined after the event are excluded", () => {
  assert.equal(
    paymentStatus({ paid: 0, expected: 100, eventDate: "2025-01-01", joinedAt: "2026-01-01" }),
    "none",
  );
  assert.equal(
    paymentStatus({ paid: 0, expected: 100, eventDate: "2099-01-01", now: new Date(2026, 0, 1) }),
    "pending",
  );
});

test("lifetime contributions use the same attribution", () => {
  const life = lifetimeContributions(
    [tx({ id: "x", memberId: 1, amount: 10 }), tx({ id: "y", contributor: "ບຸນມີ", amount: 5 })],
    fms,
    byId,
  );
  assert.equal(life.get(1)?.total, 15);
});

// ── events ──────────────────────────────────────────────────────────────
test("event time parsing and phase", () => {
  assert.deepEqual(parseTimeRange("8:00 – 16:30"), { start: "08:00", end: "16:30" });
  const now = new Date(2026, 5, 1, 17, 0);
  assert.equal(getEventPhase({ date: "2026-06-01", time: "08:00 – 16:30" }, now), "past");
  assert.equal(getEventPhase({ date: "2026-06-01", time: "08:00 – 18:00" }, now), "upcoming");
  assert.equal(getEventPhase({ date: "2026-06-01", time: "" }, now), "upcoming");
});

test("event validation rejects end before start", () => {
  const base = { title: "t", date: "2026-01-01", location: "x", expectedPerMember: 0 };
  assert.notEqual(validateEvent({ ...base, timeStart: "10:00", timeEnd: "09:00" }), null);
  assert.equal(validateEvent({ ...base, timeStart: "10:00", timeEnd: "" }), null);
});

// ── csv / notifications ────────────────────────────────────────────────
test("csv escapes quotes and neutralises formulas", () => {
  assert.equal(csvCell('a"b'), '"a""b"');
  assert.equal(csvCell("=SUM(A1)"), `"'=SUM(A1)"`);
  assert.equal(csvCell(-5), '"-5"');
  assert.equal(toCSV([{ a: 1, b: "x" }]), '"a","b"\n"1","x"');
});

test("upcoming birthdays wrap across the new year and skip deceased", () => {
  const list = [
    member({ id: 1, birthdate: "1990-01-02" }),
    member({ id: 2, birthdate: "1990-12-30", status: "deceased" }),
  ];
  const res = upcomingBirthdays(list, new Date(2026, 11, 29), 7);
  assert.equal(res.length, 1);
  assert.equal(res[0].inDays, 4);
});
