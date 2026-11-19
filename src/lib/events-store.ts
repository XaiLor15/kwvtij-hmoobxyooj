// Events (activities) store — public.events.
import { createRealtimeStore, num, str, strArray, type Result } from "@/lib/store/realtime-store";
import type { ClanEvent } from "@/lib/domain/types";

function fromRow(r: Record<string, unknown>): ClanEvent {
  return {
    id: num(r.id),
    title: str(r.title, "ບໍ່ມີຫົວຂໍ້"),
    category: str(r.category, "ງານຕະກູນ"),
    status: str(r.status),
    description: str(r.description),
    date: str(r.date),
    time: str(r.time),
    location: str(r.location),
    organizer: str(r.organizer),
    attendees: num(r.attendees),
    budget: num(r.budget),
    spent: num(r.spent),
    contributions: num(r.contributions),
    expectedPerMember: num(r.expected_per_member),
    tags: strArray(r.tags),
    cover: str(r.cover),
    colorA: str(r.color_a),
    colorB: str(r.color_b),
  };
}

const store = createRealtimeStore<ClanEvent>({
  table: "events",
  module: "activities",
  label: "ກິດຈະກຳ",
  fromRow,
  getId: (e) => e.id,
  order: [{ column: "date", ascending: false }],
  sort: (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
});

export const useEvents = store.useItems;
export const useEventsState = store.useStore;
export const getEvents = store.getItems;
export const getEventById = (id: number | null | undefined) =>
  id == null ? null : store.getById(id);

export interface EventInput {
  title: string;
  category: string;
  date: string;
  time: string;
  location: string;
  organizer: string;
  expectedPerMember: number;
  description: string;
}

function toRow(e: EventInput) {
  return {
    title: e.title.trim(),
    category: e.category,
    date: e.date,
    time: e.time,
    location: e.location.trim(),
    organizer: e.organizer.trim(),
    expected_per_member: Math.max(0, Number(e.expectedPerMember) || 0),
    description: e.description.trim(),
  };
}

export function addEvent(e: EventInput): Promise<Result<ClanEvent>> {
  return store.insert({ ...toRow(e), status: "upcoming", tags: [] });
}

export function updateEvent(id: number, e: EventInput): Promise<Result<ClanEvent>> {
  return store.update(id, toRow(e));
}

/** Participants & gallery cascade in the DB; transactions keep their history (event_id → NULL). */
export function deleteEvent(id: number): Promise<Result<null>> {
  return store.remove(id);
}
