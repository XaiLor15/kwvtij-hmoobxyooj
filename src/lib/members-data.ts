// @ts-nocheck
// Members store — backed by Supabase (public.members + public.member_relations).
// Preserves the exported surface used across the app:
//   MEMBERS (mutable array), useMembers(), addMember(), updateMember(),
//   deleteMember(), setMembers(), getMemberById().
import { useSyncExternalStore, useEffect } from "react";
import {
  formatAddress,
  normalizeVillage,
  normalizeDistrict,
  normalizeProvince,
  normalizeBranch,
} from "@/lib/utils";
import { assertPermission } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { readColumns, MEMBERS_PUBLIC_COLUMNS } from "@/lib/public-read";
import { toast } from "sonner";

// ---- Row <-> object mapping ----
function fromRow(r) {
  return {
    id: r.id,
    name: r.name ?? "ບໍ່ມີຊື່",
    nickname: r.nickname ?? "",
    gender: r.gender ?? "M",
    age: r.age ?? 0,
    gen: r.gen ?? 1,
    role: r.role ?? "ສະມາຊິກ",
    branch: normalizeBranch(r.branch),
    village: r.village ?? "-",
    district: r.district ?? "-",
    province: r.province ?? "-",
    address: r.address ?? "",
    status: r.status ?? "alive",
    phone: r.phone ?? "-",
    photo: r.photo ?? null,
    parent: r.parent_id ?? undefined,
    note: r.note ?? undefined,
    birthdate: r.birthdate ?? undefined,
    category: r.category ?? undefined,
    position: r.position ?? undefined,
    // relations filled after fetch
    children: [],
    spouse: [],
  };
}

function toRow(m) {
  const row = { ...m };
  if ("parent" in row) { row.parent_id = row.parent ?? null; delete row.parent; }
  delete row.children;
  delete row.spouse;
  return row;
}

// ---- Store state ----
export const MEMBERS = [];
let snapshot = [];
const listeners = new Set();
let initialized = false;

function emit() { snapshot = MEMBERS.slice(); for (const l of listeners) l(); }
function subscribe(cb) { ensureInit(); listeners.add(cb); return () => listeners.delete(cb); }
function getSnapshot() { return snapshot; }

async function hydrate() {
  const [membersRes, relationsRes] = await Promise.all([
    supabase.from("members").select(await readColumns(MEMBERS_PUBLIC_COLUMNS)).order("id", { ascending: true }),
    supabase.from("member_relations").select("*"),
  ]);
  if (membersRes.error) { console.error("members hydrate", membersRes.error); return; }
  const list = (membersRes.data ?? []).map(fromRow);
  // Attach relations
  const rels = relationsRes.data ?? [];
  const byId = new Map(list.map((m) => [m.id, m]));
  for (const r of rels) {
    const owner = byId.get(r.member_id);
    if (!owner) continue;
    if (r.relation_type === "child" && !owner.children.includes(r.related_id))
      owner.children.push(r.related_id);
    if (r.relation_type === "spouse" && !owner.spouse.includes(r.related_id))
      owner.spouse.push(r.related_id);
  }
  MEMBERS.splice(0, MEMBERS.length, ...list);
  emit();
}

async function reloadRelations() {
  const { data } = await supabase.from("member_relations").select("*");
  if (!data) return;
  for (const m of MEMBERS) { m.children = []; m.spouse = []; }
  const byId = new Map(MEMBERS.map((m) => [m.id, m]));
  for (const r of data) {
    const owner = byId.get(r.member_id);
    if (!owner) continue;
    if (r.relation_type === "child" && !owner.children.includes(r.related_id))
      owner.children.push(r.related_id);
    if (r.relation_type === "spouse" && !owner.spouse.includes(r.related_id))
      owner.spouse.push(r.related_id);
  }
  emit();
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  hydrate();
  try {
    supabase.channel("realtime:members")
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, (payload) => {
        const { eventType, new: nr, old: or } = payload;
        if (eventType === "INSERT") {
          const obj = fromRow(nr);
          if (!MEMBERS.some((m) => m.id === obj.id)) { MEMBERS.unshift(obj); emit(); }
        } else if (eventType === "UPDATE") {
          const obj = fromRow(nr);
          const i = MEMBERS.findIndex((m) => m.id === obj.id);
          if (i !== -1) {
            // preserve children/spouse from local cache
            obj.children = MEMBERS[i].children;
            obj.spouse = MEMBERS[i].spouse;
            MEMBERS[i] = obj; emit();
          }
        } else if (eventType === "DELETE") {
          const i = MEMBERS.findIndex((m) => m.id === or.id);
          if (i !== -1) { MEMBERS.splice(i, 1); emit(); }
        }
      })
      .subscribe();
    supabase.channel("realtime:member_relations")
      .on("postgres_changes", { event: "*", schema: "public", table: "member_relations" }, () => {
        reloadRelations();
      })
      .subscribe();
  } catch (err) { console.error("members realtime", err); }
}

export function getMemberById(id) {
  return MEMBERS.find((m) => m.id === id) ?? null;
}

export async function setMembers(next) {
  // Bulk replace — used by init/migration only. Not called at runtime.
  if (!Array.isArray(next)) return;
  MEMBERS.splice(0, MEMBERS.length, ...next);
  emit();
}

export async function addMember(data) {
  if (!assertPermission("create", "members")) return null;
  const village = normalizeVillage(data.village ?? "");
  const district = normalizeDistrict(data.district ?? "");
  const province = normalizeProvince(data.province ?? "");
  const address = formatAddress({ village, district, province });
  const merged = {
    name: data.name?.trim() || "ບໍ່ມີຊື່",
    nickname: data.nickname ?? "",
    gender: data.gender ?? "M",
    age: Number(data.age) || 0,
    gen: Number(data.gen) || 1,
    role: data.role ?? "ສະມາຊິກ",
    branch: normalizeBranch(data.branch),
    status: data.status ?? "alive",
    phone: data.phone ?? "-",
    photo: data.photo ?? null,
    parent: data.parent ?? undefined,
    note: data.note,
    birthdate: data.birthdate,
    category: data.category,
    position: data.position,
    village: village || "-",
    district: district || "-",
    province: province || "-",
    address: address || data.address || "",
  };
  const row = toRow(merged);
  const { data: inserted, error } = await supabase
    .from("members").insert(row).select("*").single();
  if (error) {
    console.error("addMember", error);
    toast.error("ບັນທຶກສະມາຊິກບໍ່ສຳເລັດ: " + error.message);
    return null;
  }
  const obj = fromRow(inserted);
  // Insert parent-child relation if parent provided
  if (obj.parent) {
    await supabase.from("member_relations").insert({
      member_id: obj.parent, related_id: obj.id, relation_type: "child",
    });
  }
  if (!MEMBERS.some((m) => m.id === obj.id)) MEMBERS.unshift(obj);
  emit();
  return obj;
}

export async function updateMember(id, patch) {
  const idx = MEMBERS.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const next = { ...MEMBERS[idx], ...patch };
  if ("village" in patch || "district" in patch || "province" in patch) {
    next.village = normalizeVillage(next.village ?? "") || "-";
    next.district = normalizeDistrict(next.district ?? "") || "-";
    next.province = normalizeProvince(next.province ?? "") || "-";
    next.address = formatAddress(next);
  }
  MEMBERS[idx] = next;
  emit();
  const row = toRow(patch);
  delete row.id;
  if ("village" in patch || "district" in patch || "province" in patch) {
    row.village = next.village; row.district = next.district;
    row.province = next.province; row.address = next.address;
  }
  const { error } = await supabase.from("members").update(row).eq("id", id);
  if (error) {
    console.error("updateMember", error);
    toast.error("ອັບເດດບໍ່ສຳເລັດ: " + error.message);
  }
  return MEMBERS[idx];
}

export async function deleteMember(id) {
  if (!assertPermission("delete", "members")) return false;
  const idx = MEMBERS.findIndex((m) => m.id === id);
  if (idx === -1) return false;
  const removed = MEMBERS[idx];
  MEMBERS.splice(idx, 1);
  // Local cleanup of stale refs
  for (const m of MEMBERS) {
    if (m.parent === id) m.parent = undefined;
    if (Array.isArray(m.children)) m.children = m.children.filter((c) => c !== id);
    if (Array.isArray(m.spouse)) m.spouse = m.spouse.filter((s) => s !== id);
  }
  emit();
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) {
    console.error("deleteMember", error);
    toast.error("ລຶບບໍ່ສຳເລັດ: " + error.message);
    MEMBERS.splice(idx, 0, removed);
    emit();
    return false;
  }
  return removed;
}

export function useMembers() {
  useEffect(() => { ensureInit(); }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
