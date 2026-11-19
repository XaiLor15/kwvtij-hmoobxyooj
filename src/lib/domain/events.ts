// Event (activity) rules.
import type { ClanEvent } from "./types.ts";

export type EventPhase = "upcoming" | "past";

export const EVENT_CATEGORIES = [
  "ງານຕະກູນ",
  "ງານບຸນ",
  "ງານສົບ",
  "ງານດອງ",
  "ປະຊຸມ",
  "ຊ່ວຍເຫຼືອຜ່າຕັດ",
  "ອື່ນໆ",
] as const;

export const EVENT_PHASE_LABEL: Record<EventPhase, string> = {
  upcoming: "ກຳລັງຈະຈັດ",
  past: "ຜ່ານມາແລ້ວ",
};

/** Parse "08:00 – 16:00" / "08:00-16:00" / "08:00" into start and end. */
export function parseTimeRange(time: string | null | undefined): {
  start: string;
  end: string;
} {
  const parts = String(time ?? "").match(/\d{1,2}:\d{2}/g) ?? [];
  const pad = (t: string) => (t.length === 4 ? `0${t}` : t);
  return { start: parts[0] ? pad(parts[0]) : "", end: parts[1] ? pad(parts[1]) : "" };
}

export function formatTimeRange(start: string, end: string): string {
  if (start && end) return `${start} – ${end}`;
  return start || end || "";
}

/**
 * Whether an event is upcoming or past, derived from its date and end time
 * (an event without an end time counts as upcoming until the end of its day).
 */
export function getEventPhase(
  event: Pick<ClanEvent, "date" | "time"> | null | undefined,
  now: Date = new Date(),
): EventPhase {
  if (!event?.date) return "upcoming";
  const { start, end } = parseTimeRange(event.time);
  const endTime = end || start;
  const d = endTime ? new Date(`${event.date}T${endTime}:00`) : new Date(`${event.date}T23:59:59`);
  if (Number.isNaN(d.getTime())) return "upcoming";
  return now > d ? "past" : "upcoming";
}

/** Validate an event form. Returns an error message (Lao) or null. */
export function validateEvent(input: {
  title: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  location: string;
  expectedPerMember: number | string;
}): string | null {
  if (!input.title.trim()) return "ກະລຸນາປ້ອນຊື່ກິດຈະກຳ";
  if (!input.date) return "ກະລຸນາເລືອກວັນທີຈັດງານ";
  if (!input.timeStart) return "ກະລຸນາປ້ອນເວລາເລີ່ມ";
  if (input.timeEnd && input.timeEnd <= input.timeStart) return "ເວລາສິ້ນສຸດຕ້ອງຫຼັງເວລາເລີ່ມ";
  if (!input.location.trim()) return "ກະລຸນາປ້ອນສະຖານທີ່";
  const amt = Number(input.expectedPerMember);
  if (!Number.isFinite(amt) || amt < 0) return "ຈຳນວນເງິນຕໍ່ຄົນບໍ່ຖືກຕ້ອງ";
  return null;
}
