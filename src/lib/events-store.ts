// @ts-nocheck
// Events store — backed by Supabase (public.events).
import { useSyncExternalStore, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function fromRow(r) {
  return {
    id: r.id,
    title: r.title ?? "ບໍ່ມີຫົວຂໍ້",
    category: r.category ?? "ງານຕະກູນ",
    status: r.status ?? "upcoming",
    description: r.description ?? "",
    date: r.date ?? "",
    time: r.time ?? "",
    location: r.location ?? "",
    organizer: r.organizer ?? "",
    attendees: r.attendees ?? 0,
    budget: Number(r.budget ?? 0),
    spent: Number(r.spent ?? 0),
    contributions: Number(r.contributions ?? 0),
    expectedPerMember: Number(r.expected_per_member ?? 0),
    tags: Array.isArray(r.tags) ? r.tags : [],
    cover: r.cover ?? "📅",
    colorA: r.color_a ?? "#1b4332",
    colorB: r.color_b ?? "#52b788",
  };
}

function toRow(e) {
  const row = { ...e };
  if ("colorA" in row) {
    row.color_a = row.colorA;
    delete row.colorA;
  }
  if ("colorB" in row) {
    row.color_b = row.colorB;
    delete row.colorB;
  }
  if ("expectedPerMember" in row) {
    row.expected_per_member = row.expectedPerMember;
    delete row.expectedPerMember;
  }
  return row;
}

let events = [];
let snapshot = [];
const listeners = new Set();
let initialized = false;

function emit() {
  snapshot = events.slice();
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
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("id", { ascending: true });
  if (error) {
    console.error("events hydrate", error);
    return;
  }
  events = (data ?? []).map(fromRow);
  emit();
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  hydrate();
  supabase
    .channel("realtime:events")
    .on("postgres_changes", { event: "*", schema: "public", table: "events" }, (payload) => {
      const { eventType, new: nr, old: or } = payload;
      if (eventType === "INSERT") {
        const obj = fromRow(nr);
        if (!events.some((e) => e.id === obj.id)) events = [obj, ...events];
      } else if (eventType === "UPDATE") {
        const obj = fromRow(nr);
        events = events.map((e) => (e.id === obj.id ? obj : e));
      } else if (eventType === "DELETE") {
        events = events.filter((e) => e.id !== or.id);
      }
      emit();
    })
    .subscribe();
}

export async function setEvents(next) {
  events = Array.isArray(next) ? next.map((e) => ({ ...e })) : [];
  emit();
}

export async function updateEvent(id, patch) {
  events = events.map((e) => (e.id === id ? { ...e, ...patch } : e));
  emit();
  const row = toRow(patch);
  delete row.id;
  const { error } = await supabase.from("events").update(row).eq("id", id);
  if (error) {
    console.error("updateEvent", error);
    toast.error("ອັບເດດບໍ່ສຳເລັດ");
  }
}

export async function addEvent(data) {
  const merged = {
    title: "ກິດຈະກຳໃໝ່",
    category: "ງານຕະກູນ",
    status: "upcoming",
    description: "",
    date: "",
    time: "",
    location: "",
    organizer: "",
    attendees: 0,
    contributions: 0,
    budget: 0,
    spent: 0,
    tags: [],
    cover: "📅",
    colorA: "#1b4332",
    colorB: "#52b788",
    ...data,
  };
  const row = toRow(merged);
  delete row.id;
  const { data: inserted, error } = await supabase.from("events").insert(row).select("*").single();
  if (error) {
    console.error("addEvent", error);
    toast.error("ບັນທຶກບໍ່ສຳເລັດ");
    return null;
  }
  const obj = fromRow(inserted);
  if (!events.some((e) => e.id === obj.id)) events = [obj, ...events];
  emit();
  return obj;
}

export async function deleteEvent(id) {
  events = events.filter((e) => e.id !== id);
  emit();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) {
    console.error("deleteEvent", error);
    toast.error("ລຶບບໍ່ສຳເລັດ");
  }
}

export function useEvents() {
  useEffect(() => {
    ensureInit();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useEvent(id) {
  const all = useEvents();
  return all.find((e) => e.id === id) ?? null;
}
