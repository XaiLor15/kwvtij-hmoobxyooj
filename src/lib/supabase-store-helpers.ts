// @ts-nocheck
// Shared factory for building reactive, realtime-synced stores backed by
// Supabase. Preserves the useSyncExternalStore hook shape so existing
// components keep working. Each store defines:
//   - table:      Postgres table name
//   - fromRow:    (row) => object (snake_case → camelCase)
//   - toRow:      (obj) => row   (camelCase → snake_case)
//   - order:      { column, ascending }  (optional; default id asc)
//   - pk:         primary key column name in the DB row (default 'id')
//
// The factory returns { items (mutable array), snapshot getter, subscribe,
// emit, hydrate, ensureInit, and CRUD helpers (insert/update/delete) that
// perform optimistic local updates then reconcile with Supabase }.

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function createRealtimeStore({
  table,
  fromRow,
  toRow = (x) => x,
  order = { column: "id", ascending: true },
  pk = "id",
  onError = null,
}) {
  const items = [];
  let snapshot = [];
  const listeners = new Set();
  let initialized = false;
  let channel = null;

  function emit() {
    snapshot = items.slice();
    for (const l of listeners) l();
  }

  function findIndex(id) {
    return items.findIndex((x) => x[pk] === id);
  }

  async function hydrate() {
    const q = supabase.from(table).select("*");
    if (order) q.order(order.column, { ascending: order.ascending });
    const { data, error } = await q;
    if (error) {
      console.error(`[${table}] hydrate failed`, error);
      onError?.(error);
      return;
    }
    const mapped = (data ?? []).map(fromRow);
    items.splice(0, items.length, ...mapped);
    emit();
  }

  function applyChange(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;
    if (eventType === "INSERT") {
      const obj = fromRow(newRow);
      const idx = findIndex(obj[pk]);
      if (idx === -1) {
        // Insert at front to match previous UX (newest first)
        items.unshift(obj);
        emit();
      }
    } else if (eventType === "UPDATE") {
      const obj = fromRow(newRow);
      const idx = findIndex(obj[pk]);
      if (idx !== -1) {
        items[idx] = obj;
        emit();
      } else {
        items.unshift(obj);
        emit();
      }
    } else if (eventType === "DELETE") {
      const id = oldRow?.[pk];
      const idx = findIndex(id);
      if (idx !== -1) {
        items.splice(idx, 1);
        emit();
      }
    }
  }

  function ensureInit() {
    if (initialized) return;
    if (typeof window === "undefined") return;
    initialized = true;
    hydrate();
    try {
      channel = supabase
        .channel(`realtime:${table}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, (payload) =>
          applyChange(payload),
        )
        .subscribe();
    } catch (err) {
      console.error(`[${table}] realtime subscribe failed`, err);
    }
  }

  function subscribe(cb) {
    ensureInit();
    listeners.add(cb);
    return () => listeners.delete(cb);
  }
  function getSnapshot() {
    return snapshot;
  }

  async function insertRow(data, { optimistic = true } = {}) {
    const row = toRow(data);
    // Strip undefined pk so DB generates it
    if (row[pk] == null) delete row[pk];
    let tempIdx = -1;
    if (optimistic && data[pk] != null) {
      items.unshift(data);
      tempIdx = 0;
      emit();
    }
    const { data: inserted, error } = await supabase.from(table).insert(row).select("*").single();
    if (error) {
      if (tempIdx !== -1) {
        items.splice(tempIdx, 1);
        emit();
      }
      console.error(`[${table}] insert failed`, error);
      toast.error("ບັນທຶກບໍ່ສຳເລັດ: " + error.message);
      return null;
    }
    const obj = fromRow(inserted);
    // Reconcile: replace optimistic or add
    const existingIdx = findIndex(obj[pk]);
    if (existingIdx !== -1) items[existingIdx] = obj;
    else items.unshift(obj);
    emit();
    return obj;
  }

  async function updateRow(id, patch) {
    const idx = findIndex(id);
    const prev = idx !== -1 ? { ...items[idx] } : null;
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...patch };
      emit();
    }
    const row = toRow(patch);
    delete row[pk];
    const { data, error } = await supabase.from(table).update(row).eq(pk, id).select("*").single();
    if (error) {
      if (prev && idx !== -1) {
        items[idx] = prev;
        emit();
      }
      console.error(`[${table}] update failed`, error);
      toast.error("ອັບເດດບໍ່ສຳເລັດ: " + error.message);
      return null;
    }
    const obj = fromRow(data);
    const nidx = findIndex(obj[pk]);
    if (nidx !== -1) items[nidx] = obj;
    emit();
    return obj;
  }

  async function deleteRow(id) {
    const idx = findIndex(id);
    const prev = idx !== -1 ? items[idx] : null;
    if (idx !== -1) {
      items.splice(idx, 1);
      emit();
    }
    const { error } = await supabase.from(table).delete().eq(pk, id);
    if (error) {
      if (prev) {
        items.unshift(prev);
        emit();
      }
      console.error(`[${table}] delete failed`, error);
      toast.error("ລຶບບໍ່ສຳເລັດ: " + error.message);
      return false;
    }
    return true;
  }

  return {
    items,
    subscribe,
    getSnapshot,
    emit,
    ensureInit,
    hydrate,
    insertRow,
    updateRow,
    deleteRow,
    findIndex,
  };
}
