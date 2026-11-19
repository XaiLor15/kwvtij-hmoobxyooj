// @ts-nocheck
// Leadership store — backed by Supabase (public.leadership), single source of truth.
// Extra UI-only fields are round-tripped through the JSONB `data` column.
import { assertPermission } from "@/lib/permissions";
import { useSyncExternalStore, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeBranch } from "@/lib/utils";
import { readColumns, LEADERSHIP_PUBLIC_COLUMNS } from "@/lib/public-read";
import { toast } from "sonner";

const KNOWN = new Set([
  "id","name","position","branch","phone","photo","bio","memberId","member_id",
  "department","displayOrder","display_order","active","personType","person_type",
  "createdAt","created_at","updatedAt","updated_at","data",
]);

function fromRow(r) {
  const extra = r.data ?? {};
  return {
    id: r.id,
    name: r.name ?? "",
    position: r.position ?? "",
    department: r.department ?? "",
    branch: normalizeBranch(r.branch),
    phone: r.phone ?? "",
    photo: r.photo ?? null,
    bio: r.bio ?? "",
    memberId: r.member_id ?? undefined,
    displayOrder: r.display_order ?? 0,
    active: r.active !== false,
    personType: r.person_type ?? "leadership",
    createdAt: r.created_at ?? null,
    updatedAt: r.updated_at ?? null,
    ...extra,
  };
}

function toRow(o) {
  const row = {
    name: o.name,
    position: o.position,
    department: o.department ?? null,
    branch: normalizeBranch(o.branch),
    phone: o.phone,
    photo: o.photo ?? null,
    bio: o.bio,
    person_type: o.personType ?? "leadership",
  };
  if ("memberId" in o) row.member_id = o.memberId ?? null;
  if ("displayOrder" in o) row.display_order = Number(o.displayOrder) || 0;
  if ("active" in o) row.active = o.active !== false;
  const extra = {};
  for (const k of Object.keys(o)) {
    if (!KNOWN.has(k)) extra[k] = o[k];
  }
  row.data = extra;
  return row;
}

function sortItems(list) {
  return [...list].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || Number(a.id) - Number(b.id),
  );
}

let items = [];
let snapshot = [];
let loading = true;
let loadError = null;
const listeners = new Set();
let initialized = false;
function emit() { snapshot = sortItems(items); for (const l of listeners) l(); }
function subscribe(cb) { ensureInit(); listeners.add(cb); return () => listeners.delete(cb); }
function getSnapshot() { return snapshot; }

async function hydrate() {
  const { data, error } = await supabase
    .from("leadership")
    .select(await readColumns(LEADERSHIP_PUBLIC_COLUMNS))
    .order("display_order", { ascending: true })
    .order("id", { ascending: true });
  loading = false;
  if (error) { loadError = error; console.error("leadership hydrate", error); emit(); return; }
  loadError = null;
  items = (data ?? []).map(fromRow);
  emit();
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  hydrate();
  supabase.channel("realtime:leadership")
    .on("postgres_changes", { event: "*", schema: "public", table: "leadership" }, (payload) => {
      const { eventType, new: nr, old: or } = payload;
      if (eventType === "INSERT") {
        const obj = fromRow(nr);
        if (!items.some((l) => l.id === obj.id)) items = [obj, ...items];
      } else if (eventType === "UPDATE") {
        items = items.map((l) => (l.id === nr.id ? fromRow(nr) : l));
      } else if (eventType === "DELETE") {
        items = items.filter((l) => l.id !== or.id);
      }
      emit();
    }).subscribe();
}

export function getLeadershipState() {
  return { loading, error: loadError };
}

export async function refreshLeaders() { await hydrate(); }

export async function addLeader(item) {
  if (!assertPermission("create", "leadership")) return null;
  const nextOrder =
    item?.displayOrder != null
      ? item.displayOrder
      : items.reduce((max, l) => Math.max(max, l.displayOrder ?? 0), 0) + 1;
  const row = toRow({ ...item, displayOrder: nextOrder, active: item?.active !== false });
  delete row.id;
  const { data: inserted, error } = await supabase.from("leadership").insert(row).select("*").single();
  if (error) { console.error("addLeader", error); toast.error("ບັນທຶກບໍ່ສຳເລັດ: " + error.message); return null; }
  const obj = fromRow(inserted);
  if (!items.some((l) => l.id === obj.id)) items = [obj, ...items];
  emit();
  return obj;
}

export async function updateLeader(id, patch) {
  if (!assertPermission("edit", "leadership")) return false;
  const prev = items.find((l) => l.id === id);
  items = items.map((l) => (l.id === id ? { ...l, ...patch } : l));
  emit();
  const merged = items.find((l) => l.id === id);
  const row = toRow(merged);
  delete row.id;
  const { error } = await supabase.from("leadership").update(row).eq("id", id);
  if (error) {
    console.error("updateLeader", error);
    toast.error("ອັບເດດບໍ່ສຳເລັດ: " + error.message);
    if (prev) { items = items.map((l) => (l.id === id ? prev : l)); emit(); }
    return false;
  }
  return true;
}

export async function toggleLeaderActive(id, active) {
  return updateLeader(id, { active });
}

export async function reorderLeader(id, displayOrder) {
  return updateLeader(id, { displayOrder: Number(displayOrder) || 0 });
}

export async function deleteLeader(id) {
  if (!assertPermission("delete", "leadership")) return false;
  const prev = items;
  items = items.filter((l) => l.id !== id);
  emit();
  const { error } = await supabase.from("leadership").delete().eq("id", id);
  if (error) {
    console.error("deleteLeader", error);
    toast.error("ລຶບບໍ່ສຳເລັດ: " + error.message);
    items = prev; emit();
    return false;
  }
  return true;
}

export function useLeaders() {
  useEffect(() => { ensureInit(); }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
