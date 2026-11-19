// @ts-nocheck
// Meetings store — backed by Supabase (public.meetings).
import { useSyncExternalStore, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const KNOWN = new Set(["id","title","category","date","participants","summary","tags","pinned"]);
function fromRow(r) {
  const extra = r.data ?? {};
  return {
    id: r.id,
    title: r.title ?? "ບໍ່ມີຫົວຂໍ້",
    category: r.category ?? "ວາງແຜນ",
    date: r.date ?? "",
    participants: r.participants ?? 0,
    summary: r.summary ?? "",
    tags: Array.isArray(r.tags) ? r.tags : [],
    pinned: !!r.pinned,
    ...extra,
  };
}
function toRow(o) {
  const row = {
    title: o.title, category: o.category, date: o.date,
    participants: o.participants, summary: o.summary,
    tags: o.tags ?? [], pinned: !!o.pinned,
  };
  const extra = {};
  for (const k of Object.keys(o)) { if (!KNOWN.has(k)) extra[k] = o[k]; }
  row.data = extra;
  return row;
}

let meetings = [];
let snapshot = [];
const listeners = new Set();
let initialized = false;
function emit() { snapshot = meetings.slice(); for (const l of listeners) l(); }
function subscribe(cb) { ensureInit(); listeners.add(cb); return () => listeners.delete(cb); }
function getSnapshot() { return snapshot; }

async function hydrate() {
  const { data, error } = await supabase.from("meetings").select("*").order("id", { ascending: false });
  if (error) { console.error("meetings hydrate", error); return; }
  meetings = (data ?? []).map(fromRow);
  emit();
}
function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  hydrate();
  supabase.channel("realtime:meetings")
    .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, (payload) => {
      const { eventType, new: nr, old: or } = payload;
      if (eventType === "INSERT") { const obj = fromRow(nr); if (!meetings.some((m) => m.id === obj.id)) meetings = [obj, ...meetings]; }
      else if (eventType === "UPDATE") { meetings = meetings.map((m) => (m.id === nr.id ? fromRow(nr) : m)); }
      else if (eventType === "DELETE") { meetings = meetings.filter((m) => m.id !== or.id); }
      emit();
    }).subscribe();
}

export async function setMeetings(next) { meetings = Array.isArray(next) ? [...next] : []; emit(); }

export async function addMeeting(data) {
  const item = {
    title: data.title?.trim() || "ບໍ່ມີຫົວຂໍ້",
    category: data.category || "ວາງແຜນ",
    date: data.date || new Date().toISOString().slice(0, 10),
    participants: Number(data.participants) || 0,
    summary: data.summary?.trim() || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    pinned: !!data.pinned,
  };
  const { data: inserted, error } = await supabase.from("meetings").insert(toRow(item)).select("*").single();
  if (error) { console.error("addMeeting", error); toast.error("ບັນທຶກບໍ່ສຳເລັດ"); return null; }
  const obj = fromRow(inserted);
  if (!meetings.some((m) => m.id === obj.id)) meetings = [obj, ...meetings];
  emit();
  return obj;
}

export async function updateMeeting(id, patch) {
  meetings = meetings.map((m) => (m.id === id ? { ...m, ...patch } : m));
  emit();
  const merged = meetings.find((m) => m.id === id);
  const { error } = await supabase.from("meetings").update(toRow(merged)).eq("id", id);
  if (error) { console.error("updateMeeting", error); toast.error("ອັບເດດບໍ່ສຳເລັດ"); }
}

export async function deleteMeeting(id) {
  meetings = meetings.filter((m) => m.id !== id);
  emit();
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) { console.error("deleteMeeting", error); toast.error("ລຶບບໍ່ສຳເລັດ"); }
}

export function useMeetings() {
  useEffect(() => { ensureInit(); }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
