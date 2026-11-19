// Event participants — public.participants (UNIQUE(event_id, member_id)).
import { useMemo } from "react";
import { createRealtimeStore, num, type Result } from "@/lib/store/realtime-store";

interface Participant {
  id: number;
  eventId: number;
  memberId: number;
}

const store = createRealtimeStore<Participant>({
  table: "participants",
  module: "activities",
  label: "ຜູ້ເຂົ້າຮ່ວມ",
  fromRow: (r) => ({ id: num(r.id), eventId: num(r.event_id), memberId: num(r.member_id) }),
  getId: (p) => p.id,
  select: () => ["id,event_id,member_id"],
});

/** { [eventId]: memberId[] } */
export function useAllParticipants(): Record<number, number[]> {
  const items = store.useItems();
  return useMemo(() => {
    const map: Record<number, number[]> = {};
    for (const p of items) (map[p.eventId] ??= []).push(p.memberId);
    return map;
  }, [items]);
}

export function useParticipants(eventId: number): number[] {
  return useAllParticipants()[eventId] ?? [];
}

export async function addParticipant(eventId: number, memberId: number): Promise<Result<null>> {
  if (store.getItems().some((p) => p.eventId === eventId && p.memberId === memberId))
    return { ok: true, data: null };
  const res = await store.insert({ event_id: eventId, member_id: memberId });
  return res.ok ? { ok: true, data: null } : res;
}

export async function removeParticipant(eventId: number, memberId: number): Promise<Result<null>> {
  const row = store.getItems().find((p) => p.eventId === eventId && p.memberId === memberId);
  if (!row) return { ok: true, data: null };
  return store.remove(row.id);
}
