// @ts-nocheck
// Gallery store — backed by Supabase (public.gallery).
// Presents a { [eventId]: {id,url,name}[] } map to consumers.
// Blob URLs are session-only (not persisted).
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
  const { data, error } = await supabase
    .from("gallery")
    .select("*")
    .order("id", { ascending: true });
  if (error) {
    console.error("gallery hydrate", error);
    return;
  }
  const map = {};
  for (const r of data ?? []) {
    (map[r.event_id] ??= []).push({ id: r.id, url: r.url, name: r.name ?? "" });
  }
  byEvent = map;
  emit();
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  hydrate();
  supabase
    .channel("realtime:gallery")
    .on("postgres_changes", { event: "*", schema: "public", table: "gallery" }, (payload) => {
      const { eventType, new: nr, old: or } = payload;
      if (eventType === "INSERT") {
        const list = byEvent[nr.event_id] ?? [];
        if (!list.some((x) => x.id === nr.id))
          byEvent[nr.event_id] = [...list, { id: nr.id, url: nr.url, name: nr.name ?? "" }];
      } else if (eventType === "DELETE") {
        const list = byEvent[or.event_id] ?? [];
        byEvent[or.event_id] = list.filter((x) => x.id !== or.id);
      }
      emit();
    })
    .subscribe();
}

import { fileToDataUrl } from "@/lib/file-to-data-url";

export async function addImages(eventId, files) {
  const rows = [];
  for (const file of files) {
    if (!file.type?.startsWith("image/")) continue;
    try {
      const url = await fileToDataUrl(file);
      rows.push({ event_id: eventId, url, name: file.name });
    } catch (e) {
      console.error("fileToDataUrl", e);
      toast.error(`ອ່ານໄຟລ໌ ${file.name} ບໍ່ສຳເລັດ`);
    }
  }
  if (rows.length === 0) return;
  const { data: inserted, error } = await supabase.from("gallery").insert(rows).select("*");
  if (error) {
    console.error("addImages", error);
    toast.error("ອັບໂຫລດບໍ່ສຳເລັດ");
    return;
  }
  const list = byEvent[eventId] ?? [];
  const additions = (inserted ?? [])
    .map((r) => ({ id: r.id, url: r.url, name: r.name ?? "" }))
    .filter((x) => !list.some((y) => y.id === x.id));
  if (additions.length) {
    byEvent[eventId] = [...list, ...additions];
    emit();
  }
}

export async function removeImage(eventId, imgId) {
  const list = byEvent[eventId] ?? [];
  const target = list.find((i) => i.id === imgId);
  if (target?.url?.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(target.url);
    } catch {}
  }
  byEvent[eventId] = list.filter((i) => i.id !== imgId);
  emit();
  if (typeof imgId === "number") {
    const { error } = await supabase.from("gallery").delete().eq("id", imgId);
    if (error) {
      console.error("removeImage", error);
      toast.error("ລຶບບໍ່ສຳເລັດ");
    }
  }
}

export function useGallery(eventId) {
  useEffect(() => {
    ensureInit();
  }, []);
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return all[eventId] ?? [];
}
