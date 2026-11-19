// @ts-nocheck
// Shared source of truth for clan activities/events.
// Imported by both the Activities page and the Treasury (Finance) page so the
// "ກິດຈະກຳ" selector always reflects the events that exist in the system.

export const EVENTS = [];

// Status meta: maps internal status to the labels requested (ກຳລັງຈັດ / ຜ່ານມາແລ້ວ)
export const EVENT_STATUS = {
  upcoming: { label: "ກຳລັງຈະຈັດ", bg: "#dcfce7", text: "#166534", dot: "#22c55e" },
  past: { label: "ຜ່ານມາແລ້ວ", bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" },
};

/**
 * Derive the display status of an event from its date/time.
 * If the event has passed the current moment, it is "past"; otherwise "upcoming".
 * Times are parsed from the end of the `time` string (e.g. "08:00 – 16:00").
 * If no usable time is present, the event is considered upcoming until the end
 * of its scheduled date.
 */
export function getEventStatus(event) {
  if (!event?.date) return "upcoming";
  const now = new Date();
  const datePart = event.date;
  const timeStr = String(event.time || "");
  const endMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*$/);
  let endTime = "";
  if (endMatch) {
    const [, h, m] = endMatch;
    endTime = `${h.padStart(2, "0")}:${m}`;
  }
  const d = endTime ? new Date(`${datePart}T${endTime}:00`) : new Date(`${datePart}T23:59:59`);
  if (isNaN(d.getTime())) return "upcoming";
  return now > d ? "past" : "upcoming";
}

export function getEventById(id) {
  return EVENTS.find((e) => e.id === id) ?? null;
}
