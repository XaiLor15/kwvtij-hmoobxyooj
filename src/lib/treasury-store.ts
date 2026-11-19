// @ts-nocheck
// Treasury (transactions) store — backed by Supabase (public.transactions).
import { useSyncExternalStore, useEffect } from "react";
import { assertPermission } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { isAuthenticated } from "@/lib/public-read";
import { toast } from "sonner";

function fromRow(r) {
  return {
    id: r.id,
    createdAt: Number(r.created_at ?? Date.now()),
    date: r.date ?? "",
    direction: r.direction ?? "income",
    amount: Number(r.amount ?? 0),
    description: r.description ?? "",
    eventId: r.event_id ?? undefined,
    eventTitle: r.event_title ?? "",
    category: r.category ?? undefined,
    memberId: r.member_id ?? undefined,
    type: r.type ?? "",
    contributor: r.contributor ?? "",
    method: r.method ?? "",
    note: r.note ?? "",
  };
}
const DB_COLS = new Set([
  "id","created_at","date","direction","amount","description",
  "event_id","event_title","category","member_id",
  "type","contributor","method","note",
]);
function toRow(t) {
  const row: any = {};
  const map: Record<string,string> = {
    createdAt: "created_at", eventId: "event_id", eventTitle: "event_title", memberId: "member_id",
  };
  for (const k of Object.keys(t)) {
    const col = map[k] ?? k;
    if (DB_COLS.has(col)) row[col] = (t as any)[k] ?? null;
  }
  return row;
}


let transactions = [];
let snapshot = [];
const listeners = new Set();
let initialized = false;
function emit() { snapshot = transactions.slice(); for (const l of listeners) l(); }
function subscribe(cb) { ensureInit(); listeners.add(cb); return () => listeners.delete(cb); }
function getSnapshot() { return snapshot; }

async function hydrate() {
  // Financial records are restricted to signed-in members/admins.
  if (!(await isAuthenticated())) { transactions = []; emit(); return; }
  const { data, error } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
  if (error) { console.error("tx hydrate", error); return; }
  transactions = (data ?? []).map(fromRow);
  emit();
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  hydrate();
  supabase.auth.onAuthStateChange(() => { hydrate(); });
  supabase.channel("realtime:transactions")
    .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, (payload) => {
      const { eventType, new: nr, old: or } = payload;
      if (eventType === "INSERT") {
        const obj = fromRow(nr);
        if (!transactions.some((t) => t.id === obj.id)) transactions = [obj, ...transactions];
      } else if (eventType === "UPDATE") {
        transactions = transactions.map((t) => (t.id === nr.id ? fromRow(nr) : t));
      } else if (eventType === "DELETE") {
        transactions = transactions.filter((t) => t.id !== or.id);
      }
      emit();
    }).subscribe();
}

export async function addTransaction(t) {
  if (!assertPermission("create", "finance")) return null;
  const id = "TXN-" + String(Date.now()).slice(-6);
  const item = { id, createdAt: Date.now(), date: new Date().toISOString().slice(0, 10), ...t };
  transactions = [item, ...transactions];
  emit();
  const row = toRow(item);
  const { error } = await supabase.from("transactions").insert(row);
  if (error) {
    console.error("addTransaction", error);
    toast.error("ບັນທຶກບໍ່ສຳເລັດ: " + error.message);
    transactions = transactions.filter((x) => x.id !== id);
    emit();
    return null;
  }
  return id;
}

export async function updateTransaction(id, patch) {
  if (!assertPermission("edit", "finance")) return false;
  transactions = transactions.map((t) => (t.id === id ? { ...t, ...patch } : t));
  emit();
  const row = toRow(patch); delete row.id;
  const { error } = await supabase.from("transactions").update(row).eq("id", id);
  if (error) { console.error("updateTransaction", error); toast.error("ອັບເດດບໍ່ສຳເລັດ"); return false; }
  return true;
}

export async function deleteTransaction(id) {
  if (!assertPermission("delete", "finance")) return false;
  transactions = transactions.filter((t) => t.id !== id);
  emit();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) { console.error("deleteTransaction", error); toast.error("ລຶບບໍ່ສຳເລັດ"); return false; }
  return true;
}

export async function cascadeDeleteMemberDonations(memberId) {
  if (!assertPermission("delete", "finance")) return 0;
  const targets = transactions.filter(
    (t) => t.memberId === memberId && t.direction === "income" && t.category === "ບໍລິຈາກ",
  );
  const before = transactions.length;
  transactions = transactions.filter(
    (t) => !(t.memberId === memberId && t.direction === "income" && t.category === "ບໍລິຈາກ"),
  );
  if (targets.length > 0) {
    emit();
    const ids = targets.map((t) => t.id);
    const { error } = await supabase.from("transactions").delete().in("id", ids);
    if (error) { console.error("cascadeDeleteMemberDonations", error); }
  }
  return before - transactions.length;
}

export async function setTransactions(next) {
  transactions = Array.isArray(next) ? [...next] : [];
  emit();
}

export function useTransactions() {
  useEffect(() => { ensureInit(); }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function eventTotals(txns, eventId) {
  let income = 0, expense = 0;
  for (const t of txns) {
    if (t.eventId !== eventId) continue;
    if (t.direction === "expense") expense += Math.abs(t.amount);
    else income += Math.abs(t.amount);
  }
  return { income, expense, balance: income - expense };
}
