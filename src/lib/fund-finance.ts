// @ts-nocheck
// Derived financial helpers for Fund Members.
// SINGLE SOURCE OF TRUTH: treasury-store transactions + events-store.
// Never persist derived numbers.

const DAY = 24 * 60 * 60 * 1000;

// Any income transaction is treated as a fund contribution. Finance records
// two income types ("ຄ່າທຳນຽມ" and "ບໍລິຈາກ"); both count toward a fund
// member's participation, so we no longer filter by category.
export function isDonation(t) {
  return t && t.direction === "income";
}

function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Match a transaction to a fund member: primary link is memberId; fall back
// to matching by contributor name against the member's name/nickname so
// Finance records typed without a member selector still get credited.
export function txMatchesMember(t, member) {
  if (!member) return false;
  if (t.memberId != null && t.memberId === member.id) return true;
  if (t.memberId != null) return false;
  const c = norm(t.contributor);
  if (!c) return false;
  return c === norm(member.name) || (member.nickname && c === norm(member.nickname));
}

// Donations by member across ALL activities.
export function memberDonationsAll(transactions, member) {
  return transactions.filter((t) => isDonation(t) && txMatchesMember(t, member));
}

// Donation for a specific event by member (last one wins if multiple).
export function memberDonationForEvent(transactions, member, eventId) {
  const list = transactions.filter(
    (t) => isDonation(t) && t.eventId === eventId && txMatchesMember(t, member),
  );
  if (!list.length) return null;
  return list.reduce((a, b) => (new Date(a.date) > new Date(b.date) ? a : b));
}

// Expected contribution per member for an event. Uses event.expectedPerMember,
// else event.contributions/attendees, else 0.
export function expectedPerMember(event) {
  if (!event) return 0;
  if (event.expectedPerMember && event.expectedPerMember > 0) return event.expectedPerMember;
  if (event.contributions && event.attendees)
    return Math.round(event.contributions / event.attendees);
  return 0;
}

// paid | pending | overdue | none (none = event has no due date yet)
export function paymentStatus({ event, donation, joinedAt, graceDays = 0, today = Date.now() }) {
  // Members only obligated for events on/after their joinedAt date
  if (joinedAt && event?.date && new Date(event.date) < new Date(joinedAt)) return "none";
  if (donation && donation.amount > 0) return "paid";
  if (!event?.date) return "pending";
  const due = new Date(event.date).getTime() + graceDays * DAY;
  if (today > due) return "overdue";
  return "pending";
}

export const STATUS_META = {
  paid: { label: "ຈ່າຍແລ້ວ", color: "emerald", dot: "#22c55e" },
  pending: { label: "ຍັງບໍ່ທັນຈ່າຍ", color: "amber", dot: "#f59e0b" },
  overdue: { label: "ຄ້າງຈ່າຍ", color: "rose", dot: "#ef4444" },
  none: { label: "ບໍ່ຢູ່ໃນເງື່ອນໄຂ", color: "slate", dot: "#94a3b8" },
};

// Compute member-level rollup across all events they're obligated to.
export function memberActivityStats({
  member,
  fundMember,
  events,
  transactions,
  today = Date.now(),
}) {
  const rows = [];
  for (const ev of events) {
    if (fundMember?.joinedAt && ev.date && new Date(ev.date) < new Date(fundMember.joinedAt))
      continue;
    const donation = memberDonationForEvent(transactions, member, ev.id);
    const status = paymentStatus({ event: ev, donation, joinedAt: fundMember?.joinedAt, today });
    rows.push({ event: ev, donation, status, expected: expectedPerMember(ev) });
  }
  const totalActivities = rows.length;
  const paid = rows.filter((r) => r.status === "paid").length;
  const overdue = rows.filter((r) => r.status === "overdue").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const totalDonation = rows.reduce((s, r) => s + (r.donation?.amount || 0), 0);
  const lastDonation =
    rows
      .filter((r) => r.donation)
      .map((r) => r.donation)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
  const avgDonation = paid > 0 ? Math.round(totalDonation / paid) : 0;
  const contributionRate = totalActivities > 0 ? Math.round((paid / totalActivities) * 100) : 0;
  return {
    rows,
    totalActivities,
    paid,
    pending,
    overdue,
    totalDonation,
    lastDonation,
    avgDonation,
    contributionRate,
  };
}

// Per-activity view: list of members with statuses.
export function activityParticipantStats({
  event,
  activeFundMembers,
  membersById,
  transactions,
  today = Date.now(),
  ignoreJoinDate = false,
}) {
  const rows = [];
  for (const fm of activeFundMembers) {
    const member = membersById.get(fm.memberId);
    if (!member) continue;
    if (
      !ignoreJoinDate &&
      fm.joinedAt &&
      event.date &&
      new Date(event.date) < new Date(fm.joinedAt)
    )
      continue;
    const donation = memberDonationForEvent(transactions, member, event.id);
    const status = paymentStatus({
      event,
      donation,
      joinedAt: ignoreJoinDate ? null : fm.joinedAt,
      today,
    });
    rows.push({ member, donation, status, expected: expectedPerMember(event) });
  }
  const paid = rows.filter((r) => r.status === "paid").length;
  const overdue = rows.filter((r) => r.status === "overdue").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const collected = rows.reduce((s, r) => s + (r.donation?.amount || 0), 0);
  // Expected is ALWAYS derived: fund member count x amount per person.
  const perMember = expectedPerMember(event);
  const memberCount = rows.length;
  const expectedTotal = memberCount * perMember;
  const remaining = Math.max(0, expectedTotal - collected);
  return {
    rows,
    paid,
    pending,
    overdue,
    collected,
    perMember,
    memberCount,
    expectedTotal,
    remaining,
    amountRate: expectedTotal > 0 ? Math.round((collected / expectedTotal) * 100) : 0,
    rate: rows.length ? Math.round((paid / rows.length) * 100) : 0,
  };
}
