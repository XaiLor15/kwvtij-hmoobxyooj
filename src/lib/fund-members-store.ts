// @ts-nocheck
// Fund Members store — backed by Supabase (public.fund_members).
// Enrollment records only; financial figures derived from treasury-store.
import { useSyncExternalStore, useEffect } from "react";
import { assertPermission } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cascadeDeleteMemberDonations } from "@/lib/treasury-store";

function fromRow(r) {
  return {
    id: r.id,
    memberId: r.member_id,
    joinedAt: r.joined_at ?? "",
    status: r.status ?? "active",
    note: r.note ?? "",
    createdAt: Number(r.created_at ?? Date.now()),
    updatedAt: Number(r.updated_at ?? Date.now()),
  };
}
function toRow(o) {
  const row = { ...o };
  if ("memberId" in row) { row.member_id = row.memberId; delete row.memberId; }
  if ("joinedAt" in row) { row.joined_at = row.joinedAt; delete row.joinedAt; }
  if ("createdAt" in row) { row.created_at = row.createdAt; delete row.createdAt; }
  if ("updatedAt" in row) { row.updated_at = row.updatedAt; delete row.updatedAt; }
  return row;
}

let items = [];
let snapshot = [];
const listeners = new Set();
let initialized = false;
function emit() { snapshot = items.slice(); for (const l of listeners) l(); }
function subscribe(cb) { ensureInit(); listeners.add(cb); return () => listeners.delete(cb); }
function getSnapshot() { return snapshot; }

async function hydrate() {
  const { data, error } = await supabase.from("fund_members").select("*").order("created_at", { ascending: false });
  if (error) { console.error("fund_members hydrate", error); return; }
  items = (data ?? []).map(fromRow);
  emit();
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  hydrate();
  supabase.channel("realtime:fund_members")
    .on("postgres_changes", { event: "*", schema: "public", table: "fund_members" }, (payload) => {
      const { eventType, new: nr, old: or } = payload;
      if (eventType === "INSERT") {
        const obj = fromRow(nr);
        if (!items.some((x) => x.id === obj.id)) items = [obj, ...items];
      } else if (eventType === "UPDATE") {
        items = items.map((x) => (x.id === nr.id ? fromRow(nr) : x));
      } else if (eventType === "DELETE") {
        items = items.filter((x) => x.id !== or.id);
      }
      emit();
    }).subscribe();
}

export async function addFundMember({ memberId, joinedAt, status = "active", note = "" }) {
  if (!memberId) throw new Error("memberId required");
  if (!assertPermission("create", "fund")) return null;
  const existing = items.find((x) => x.memberId === memberId);
  if (existing) {
    const patch = { status, note, joinedAt: joinedAt || existing.joinedAt, updatedAt: Date.now() };
    items = items.map((x) => (x.memberId === memberId ? { ...x, ...patch } : x));
    emit();
    const row = toRow(patch);
    const { error } = await supabase.from("fund_members").update(row).eq("id", existing.id);
    if (error) { console.error("addFundMember update", error); toast.error("ອັບເດດບໍ່ສຳເລັດ"); }
    return items.find((x) => x.memberId === memberId) || null;
  }
  const now = Date.now();
  const item = {
    id: "FM-" + now,
    memberId,
    joinedAt: joinedAt || new Date().toISOString().slice(0, 10),
    status, note, createdAt: now, updatedAt: now,
  };
  items = [item, ...items];
  emit();
  const row = toRow(item);
  const { error } = await supabase.from("fund_members").insert(row);
  if (error) {
    console.error("addFundMember insert", error);
    toast.error("ບັນທຶກບໍ່ສຳເລັດ: " + error.message);
    items = items.filter((x) => x.id !== item.id);
    emit();
    return null;
  }
  return item;
}

export async function updateFundMember(memberId, patch) {
  if (!assertPermission("edit", "fund")) return false;
  const merged = { ...patch, updatedAt: Date.now() };
  items = items.map((x) => (x.memberId === memberId ? { ...x, ...merged } : x));
  emit();
  const target = items.find((x) => x.memberId === memberId);
  if (!target) return false;
  const row = toRow(merged);
  const { error } = await supabase.from("fund_members").update(row).eq("id", target.id);
  if (error) { console.error("updateFundMember", error); toast.error("ອັບເດດບໍ່ສຳເລັດ"); return false; }
  return true;
}

export async function removeFundMember(memberId, opts = {}) {
  if (!assertPermission("delete", "fund")) return { ok: false, snapshot: null };
  const snap = [...items];
  const target = items.find((x) => x.memberId === memberId);
  items = items.filter((x) => x.memberId !== memberId);
  emit();
  if (target) {
    const { error } = await supabase.from("fund_members").delete().eq("id", target.id);
    if (error) {
      console.error("removeFundMember", error);
      toast.error("ລຶບບໍ່ສຳເລັດ: " + error.message);
      items = snap; emit();
      return { ok: false, snapshot: null };
    }
  }
  if (opts.cascade) {
    try { await cascadeDeleteMemberDonations(memberId); } catch { /* noop */ }
  }
  return { ok: true, snapshot: snap };
}

export async function restoreFundMembers(snapshotArr) {
  if (!Array.isArray(snapshotArr)) return;
  // Re-insert missing rows into DB
  const currentIds = new Set(items.map((x) => x.id));
  const toRestore = snapshotArr.filter((x) => !currentIds.has(x.id));
  items = [...snapshotArr];
  emit();
  if (toRestore.length > 0) {
    const rows = toRestore.map(toRow);
    const { error } = await supabase.from("fund_members").insert(rows);
    if (error) console.error("restoreFundMembers", error);
  }
}

export function useFundMembers() {
  useEffect(() => { ensureInit(); }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useActiveFundMemberIds() {
  useEffect(() => { ensureInit(); }, []);
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return all.filter((x) => x.status === "active").map((x) => x.memberId);
}

export function getFundMember(memberId) {
  return items.find((x) => x.memberId === memberId) || null;
}

export function pruneOrphanFundMembers(memberExists) {
  const before = items.length;
  const toDelete = items.filter((x) => !memberExists(x.memberId));
  items = items.filter((x) => memberExists(x.memberId));
  if (items.length !== before) emit();
  if (toDelete.length > 0) {
    // Fire-and-forget clean-up in DB
    const ids = toDelete.map((x) => x.id);
    supabase.from("fund_members").delete().in("id", ids).then(() => {}, () => {});
  }
}
