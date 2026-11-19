// @ts-nocheck
// News store — backed by Supabase (public.news).
import { useSyncExternalStore, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const NEWS_CATEGORIES = ["ປະກາດ", "ກິດຈະກຳ", "ປະຊຸມ", "ການເງິນ", "ລຳລຶກ", "ດ່ວນ"];

function fromRow(r) {
  return {
    id: r.id,
    title: r.title ?? "ບໍ່ມີຫົວຂໍ້",
    summary: r.summary ?? "",
    content: r.content ?? "",
    category: r.category ?? NEWS_CATEGORIES[0],
    author: r.author ?? "ບໍ່ລະບຸ",
    date: r.date ?? "",
    tags: Array.isArray(r.tags) ? r.tags : [],
    views: r.views ?? 0,
    comments: r.comments ?? 0,
    pinned: !!r.pinned,
    featured: !!r.featured,
    urgent: !!r.urgent,
    image: r.image ?? null,
  };
}

let news = [];
let snapshot = [];
const listeners = new Set();
let initialized = false;
function emit() {
  snapshot = news.slice();
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
  const { data, error } = await supabase.from("news").select("*").order("id", { ascending: false });
  if (error) {
    console.error("news hydrate", error);
    return;
  }
  news = (data ?? []).map(fromRow);
  emit();
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  hydrate();
  supabase
    .channel("realtime:news")
    .on("postgres_changes", { event: "*", schema: "public", table: "news" }, (payload) => {
      const { eventType, new: nr, old: or } = payload;
      if (eventType === "INSERT") {
        const obj = fromRow(nr);
        if (!news.some((n) => n.id === obj.id)) news = [obj, ...news];
      } else if (eventType === "UPDATE") {
        news = news.map((n) => (n.id === nr.id ? fromRow(nr) : n));
      } else if (eventType === "DELETE") {
        news = news.filter((n) => n.id !== or.id);
      }
      emit();
    })
    .subscribe();
}

export async function setNews(next) {
  news = Array.isArray(next) ? [...next] : [];
  emit();
}

export async function addNews(data) {
  const item = {
    title: data.title?.trim() || "ບໍ່ມີຫົວຂໍ້",
    summary: data.summary?.trim() || "",
    content: data.content?.trim() || "",
    category: data.category || NEWS_CATEGORIES[0],
    author: data.author?.trim() || "ບໍ່ລະບຸ",
    date: data.date || new Date().toISOString().slice(0, 10),
    tags: Array.isArray(data.tags) ? data.tags : [],
    views: 0,
    comments: 0,
    pinned: !!data.pinned,
    featured: !!data.featured,
    urgent: !!data.urgent,
    image: typeof data.image === "string" && !data.image.startsWith("blob:") ? data.image : null,
  };
  const { data: inserted, error } = await supabase.from("news").insert(item).select("*").single();
  if (error) {
    console.error("addNews", error);
    toast.error("ບັນທຶກບໍ່ສຳເລັດ");
    return null;
  }
  const obj = fromRow(inserted);
  if (!news.some((n) => n.id === obj.id)) news = [obj, ...news];
  emit();
  return obj;
}

export async function updateNews(id, patch) {
  news = news.map((n) => (n.id === id ? { ...n, ...patch } : n));
  emit();
  const row = { ...patch };
  delete row.id;
  const { error } = await supabase.from("news").update(row).eq("id", id);
  if (error) {
    console.error("updateNews", error);
    toast.error("ອັບເດດບໍ່ສຳເລັດ");
  }
}

export async function deleteNews(id) {
  news = news.filter((n) => n.id !== id);
  emit();
  const { error } = await supabase.from("news").delete().eq("id", id);
  if (error) {
    console.error("deleteNews", error);
    toast.error("ລຶບບໍ່ສຳເລັດ");
  }
}

export async function incrementNewsViews(id) {
  const target = news.find((n) => n.id === id);
  const next = (target?.views ?? 0) + 1;
  news = news.map((n) => (n.id === id ? { ...n, views: next } : n));
  emit();
  await supabase.from("news").update({ views: next }).eq("id", id);
}

export function useNews() {
  useEffect(() => {
    ensureInit();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
