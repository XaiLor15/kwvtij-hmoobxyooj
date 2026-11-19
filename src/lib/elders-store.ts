// @ts-nocheck
// Elders store — backed by Supabase (public.elders), single source of truth.
// Extra UI-only fields are round-tripped through the JSONB `data` column.
import { assertPermission } from "@/lib/permissions";
import { useSyncExternalStore, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeBranch } from "@/lib/utils";
import { readColumns, ELDERS_PUBLIC_COLUMNS } from "@/lib/public-read";
import { toast } from "sonner";

const KNOWN = new Set([
  "id","name","age","branch","phone","photo","note","memberId","member_id",
  "position","bio","department","displayOrder","display_order","active",
  "personType","person_type","createdAt","created_at","updatedAt","updated_at","data",
]);

function fromRow(r) {
  const extra = r.data ?? {};
  return {
    id: r.id,
    name: r.name ?? "",
    age: r.age ?? undefined,
    branch: normalizeBranch(r.branch),
    phone: r.phone ?? "",
    photo: r.photo ?? null,
    note: r.note ?? "",
    position: r.position ?? "",
    bio: r.bio ?? "",
    department: r.department ?? "",
    memberId: r.member_id ?? undefined,
    displayOrder: r.display_order ?? 0,
    active: r.active !== false,
    personType: r.person_type ?? "senior",
    createdAt: r.created_at ?? null,
    updatedAt: r.updated_at ?? null,
    ...extra,
  };
}

function toRow(o) {
  const row = {
    name: o.name,
    age: typeof o.age === "number" ? o.age : o.age ? Number(o.age) : null,
    branch: normalizeBranch(o.branch),
    phone: o.phone,
    photo: o.photo ?? null,
    note: o.note,
    position: o.position ?? o.role ?? null,
    bio: o.bio ?? null,
    department: o.department ?? null,
    person_type: o.personType ?? "senior",
  };
  if ("memberId" in o) row.member_id = o.memberId ?? null;
  if ("displayOrder" in o) row.display_order = Number(o.displayOrder) || 0;
  if ("active" in o) row.active = o.active !== false;
  const extra = {};
  for (const k of Object.keys(o)) { if (!KNOWN.has(k)) extra[k] = o[k]; }
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
    .from("elders")
    .select(await readColumns(ELDERS_PUBLIC_COLUMNS))
    .order("display_order", { ascending: true })
    .order("id", { ascending: true });
  loading = false;
  if (error) { loadError = error; console.error("elders hydrate", error); emit(); return; }
  loadError = null;
  items = (data ?? []).map(fromRow);
  emit();
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  hydrate();
  supabase.channel("realtime:elders")
    .on("postgres_changes", { event: "*", schema: "public", table: "elders" }, (payload) => {
      const { eventType, new: nr, old: or } = payload;
      if (eventType === "INSERT") { const obj = fromRow(nr); if (!items.some((l) => l.id === obj.id)) items = [obj, ...items]; }
      else if (eventType === "UPDATE") { items = items.map((l) => (l.id === nr.id ? fromRow(nr) : l)); }
      else if (eventType === "DELETE") { items = items.filter((l) => l.id !== or.id); }
      emit();
    }).subscribe();
}

export function getEldersState() { return { loading, error: loadError }; }

export async function refreshElders() { await hydrate(); }

export async function addElder(item) {
  if (!assertPermission("create", "elders")) return null;
  const nextOrder =
    item?.displayOrder != null
      ? item.displayOrder
      : items.reduce((max, l) => Math.max(max, l.displayOrder ?? 0), 0) + 1;
  const row = toRow({ ...item, displayOrder: nextOrder, active: item?.active !== false });
  delete row.id;
  const { data: inserted, error } = await supabase.from("elders").insert(row).select("*").single();
  if (error) { console.error("addElder", error); toast.error("ບັນທຶກບໍ່ສຳເລັດ: " + error.message); return null; }
  const obj = fromRow(inserted);
  if (!items.some((l) => l.id === obj.id)) items = [obj, ...items];
  emit();
  return obj;
}

export async function updateElder(id, patch) {
  if (!assertPermission("edit", "elders")) return false;
  const prev = items.find((l) => l.id === id);
  items = items.map((l) => (l.id === id ? { ...l, ...patch } : l));
  emit();
  const merged = items.find((l) => l.id === id);
  const row = toRow(merged);
  delete row.id;
  const { error } = await supabase.from("elders").update(row).eq("id", id);
  if (error) {
    console.error("updateElder", error);
    toast.error("ອັບເດດບໍ່ສຳເລັດ: " + error.message);
    if (prev) { items = items.map((l) => (l.id === id ? prev : l)); emit(); }
    return false;
  }
  return true;
}

export async function toggleElderActive(id, active) { return updateElder(id, { active }); }

export async function reorderElder(id, displayOrder) {
  return updateElder(id, { displayOrder: Number(displayOrder) || 0 });
}

export async function deleteElder(id) {
  if (!assertPermission("delete", "elders")) return false;
  const prev = items;
  items = items.filter((l) => l.id !== id);
  emit();
  const { error } = await supabase.from("elders").delete().eq("id", id);
  if (error) {
    console.error("deleteElder", error);
    toast.error("ລຶບບໍ່ສຳເລັດ: " + error.message);
    items = prev; emit();
    return false;
  }
  return true;
}

export function useElders() {
  useEffect(() => { ensureInit(); }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
