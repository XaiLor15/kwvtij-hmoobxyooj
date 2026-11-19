// Real, data-derived notifications for the header bell.
import type { ClanEvent, Member } from "./types.ts";
import { parseISODate } from "./format.ts";
import { getEventPhase } from "./events.ts";

const DAY = 86_400_000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Living members whose birthday falls within the next `days` days (today included). */
export function upcomingBirthdays(
  members: readonly Member[],
  now: Date = new Date(),
  days = 7,
): { member: Member; inDays: number; date: string }[] {
  const today = startOfDay(now);
  const out: { member: Member; inDays: number; date: string }[] = [];
  for (const m of members) {
    if (m.status !== "alive") continue;
    const b = parseISODate(m.birthdate);
    if (!b) continue;
    for (const year of [now.getFullYear(), now.getFullYear() + 1]) {
      const next = new Date(year, b.month - 1, b.day).getTime();
      const diff = Math.round((next - today) / DAY);
      if (diff >= 0 && diff < days) {
        out.push({
          member: m,
          inDays: diff,
          date: `${year}-${String(b.month).padStart(2, "0")}-${String(b.day).padStart(2, "0")}`,
        });
        break;
      }
    }
  }
  return out.sort((a, b) => a.inDays - b.inDays);
}

/** Upcoming events happening within the next `days` days. */
export function eventsWithin(
  events: readonly ClanEvent[],
  now: Date = new Date(),
  days = 14,
): { event: ClanEvent; inDays: number }[] {
  const today = startOfDay(now);
  return events
    .filter((e) => getEventPhase(e, now) === "upcoming")
    .map((e) => {
      const d = parseISODate(e.date);
      if (!d) return null;
      const t = new Date(d.year, d.month - 1, d.day).getTime();
      return { event: e, inDays: Math.round((t - today) / DAY) };
    })
    .filter(
      (x): x is { event: ClanEvent; inDays: number } => !!x && x.inDays >= 0 && x.inDays < days,
    )
    .sort((a, b) => a.inDays - b.inDays);
}

export function relativeDayLabel(inDays: number): string {
  if (inDays === 0) return "ມື້ນີ້";
  if (inDays === 1) return "ມື້ອື່ນ";
  return `ອີກ ${inDays} ມື້`;
}
