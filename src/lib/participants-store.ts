// @ts-nocheck
// Participants store — backed by Supabase (public.participants).
// Presents a { [eventId]: memberId[] } map to consumers to preserve the
// existing hook shape.
import { useSyncExternalStore, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

let byEvent = {};
let snapshot = {};
const listeners = new Set();
let initialized = false;
function emit() {
  snapshot = { ...byEvent };
  for (const l of listeners) l();
}
function subscribe(cb) {
  ensureInit();
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return snapshot;
}

async function hydrate() {
  const { data, error } = await supabase.from("participants").select("event_id, member_id");
  if (error) {
    console.error("participants hydrate", error);
    return;
  }
  const map = {};
  for (const r of data ?? []) {
    (map[r.event_id] ??= []).push(r.member_id);
  }
  byEvent = map;
  emit();
}
function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  hydrate();
  supabase
    .channel("realtime:participants")
    .on("postgres_changes", { event: "*", schema: "public", table: "participants" }, (payload) => {
      const { eventType, new: nr, old: or } = payload;
      if (eventType === "INSERT") {
        const list = byEvent[nr.event_id] ?? [];
        if (!list.includes(nr.member_id)) byEvent[nr.event_id] = [...list, nr.member_id];
      } else if (eventType === "DELETE") {
        const list = byEvent[or.event_id] ?? [];
        byEvent[or.event_id] = list.filter((id) => id !== or.member_id);
      }
      emit();
    })
    .subscribe();
}

export async function addParticipant(eventId, memberId) {
  const list = byEvent[eventId] ?? [];
  if (list.includes(memberId)) return;
  byEvent[eventId] = [...list, memberId];
  emit();
  const { error } = await supabase
    .from("participants")
    .insert({ event_id: eventId, member_id: memberId });
  if (error && !String(error.message).includes("duplicate")) {
    console.error("addParticipant", error);
    toast.error("ບັນທຶກບໍ່ສຳເລັດ");
  }
}

export async function removeParticipant(eventId, memberId) {
  const list = byEvent[eventId] ?? [];
  byEvent[eventId] = list.filter((id) => id !== memberId);
  emit();
  const { error } = await supabase
    .from("participants")
    .delete()
    .eq("event_id", eventId)
    .eq("member_id", memberId);
  if (error) {
    console.error("removeParticipant", error);
    toast.error("ລຶບບໍ່ສຳເລັດ");
  }
}

export function useParticipants(eventId) {
  useEffect(() => {
    ensureInit();
  }, []);
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return all[eventId] ?? [];
}
export function useAllParticipants() {
  useEffect(() => {
    ensureInit();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
