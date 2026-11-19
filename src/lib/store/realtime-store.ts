// Typed, realtime-synced store backed by a Supabase table.
//
// Replaces nine hand-copied store implementations. Every store gets:
//   • loading / error state (for skeletons and error panels)
//   • automatic re-hydration when the user signs in or out (guests read a
//     public-safe column list; members read everything)
//   • realtime INSERT/UPDATE/DELETE sync
//   • optimistic updates with rollback on failure
//   • a Result return value so callers only show "success" when it succeeded
//   • a permission check before any write (RLS remains the real enforcement)
import { useMemo, useSyncExternalStore } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase as typedClient } from "@/integrations/supabase/client";
import { checkPermission, type Action, type Module } from "@/lib/permissions-core";

// Table names are dynamic here; row typing is handled by each store's fromRow.
const supabase = typedClient as unknown as SupabaseClient;

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export interface StoreState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  /** True once the first load (success or failure) has completed. */
  loaded: boolean;
}

type Row = Record<string, unknown>;
type Id = string | number;

export interface StoreConfig<T> {
  table: string;
  module: Module;
  fromRow: (row: Row) => T;
  getId: (item: T) => Id;
  /** Column lists to try in order (first that works wins). Default "*". */
  select?: (authed: boolean) => string[];
  order?: { column: string; ascending: boolean }[];
  /** Client-side sort applied to every snapshot. */
  sort?: (a: T, b: T) => number;
  /** If true, guests get an empty list without querying (e.g. finance). */
  requiresAuth?: boolean;
  /** Subscribe to realtime for guests too (false for tables with private columns). */
  realtimeForGuests?: boolean;
  /** Human label used in error toasts. */
  label: string;
}

let currentUserId: string | null | undefined;
const registry = new Set<() => void>();
let authListening = false;

function listenToAuth() {
  if (authListening || typeof window === "undefined") return;
  authListening = true;
  supabase.auth.onAuthStateChange((_event, session) => {
    const uid = session?.user?.id ?? null;
    if (uid === currentUserId) return;
    const first = currentUserId === undefined;
    currentUserId = uid;
    if (first) return; // initial session: stores hydrate themselves
    // Defer out of the auth callback to avoid deadlocking the auth client.
    setTimeout(() => registry.forEach((reload) => reload()), 0);
  });
}

async function isAuthed(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    currentUserId ??= data.session?.user?.id ?? null;
    return !!data.session;
  } catch {
    return false;
  }
}

function messageOf(err: unknown): string {
  if (!err) return "ບໍ່ຮູ້ສາເຫດ";
  if (typeof err === "string") return err;
  const e = err as { message?: string; code?: string };
  if (e.code === "42501" || /row-level security|permission denied/i.test(e.message ?? ""))
    return "ທ່ານບໍ່ມີສິດດຳເນີນການນີ້";
  if (e.code === "23505") return "ຂໍ້ມູນນີ້ມີຢູ່ແລ້ວ (ຊ້ຳ)";
  if (e.code === "23503") return "ຂໍ້ມູນນີ້ຖືກອ້າງອີງໂດຍຂໍ້ມູນອື່ນ";
  return e.message ?? "ບໍ່ຮູ້ສາເຫດ";
}

export function createRealtimeStore<T>(cfg: StoreConfig<T>) {
  let state: StoreState<T> = { items: [], loading: true, error: null, loaded: false };
  const listeners = new Set<() => void>();
  let initialized = false;
  let channel: RealtimeChannel | null = null;
  let loadSeq = 0;

  const sortItems = (items: T[]) => (cfg.sort ? [...items].sort(cfg.sort) : items);

  function setState(patch: Partial<StoreState<T>>) {
    const items = patch.items ? sortItems(patch.items) : state.items;
    state = { ...state, ...patch, items };
    listeners.forEach((l) => l());
  }

  async function hydrate() {
    const seq = ++loadSeq;
    const authed = await isAuthed();
    if (cfg.requiresAuth && !authed) {
      if (seq === loadSeq) setState({ items: [], loading: false, error: null, loaded: true });
      syncChannel(false);
      return;
    }
    setState({ loading: true });
    const variants = cfg.select?.(authed) ?? ["*"];
    let lastError: unknown = null;
    for (const cols of variants) {
      let q = supabase.from(cfg.table).select(cols);
      for (const o of cfg.order ?? []) q = q.order(o.column, { ascending: o.ascending });
      const { data, error } = await q;
      if (seq !== loadSeq) return; // a newer load superseded this one
      if (!error) {
        setState({
          items: ((data ?? []) as unknown as Row[]).map(cfg.fromRow),
          loading: false,
          error: null,
          loaded: true,
        });
        syncChannel(authed);
        return;
      }
      lastError = error;
      // 42703 = undefined column (migration not yet applied) → try next variant.
      if ((error as { code?: string }).code !== "42703") break;
    }
    console.error(`[${cfg.table}] load failed`, lastError);
    setState({ loading: false, error: messageOf(lastError), loaded: true });
  }

  function applyChange(payload: { eventType: string; new: Row; old: Row }) {
    const { eventType } = payload;
    if (eventType === "DELETE") {
      const id = payload.old?.id as Id | undefined;
      if (id == null) return;
      setState({ items: state.items.filter((x) => cfg.getId(x) !== id) });
      return;
    }
    const obj = cfg.fromRow(payload.new);
    const id = cfg.getId(obj);
    const exists = state.items.some((x) => cfg.getId(x) === id);
    setState({
      items: exists
        ? state.items.map((x) => (cfg.getId(x) === id ? obj : x))
        : [obj, ...state.items],
    });
  }

  function syncChannel(authed: boolean) {
    const want = authed || cfg.realtimeForGuests !== false;
    if (want && !channel) {
      try {
        channel = supabase
          .channel(`rt:${cfg.table}`)
          .on("postgres_changes", { event: "*", schema: "public", table: cfg.table }, (p) =>
            applyChange(p as unknown as { eventType: string; new: Row; old: Row }),
          )
          .subscribe();
      } catch (err) {
        console.error(`[${cfg.table}] realtime subscribe failed`, err);
      }
    } else if (!want && channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
  }

  function ensureInit() {
    if (initialized || typeof window === "undefined") return;
    initialized = true;
    listenToAuth();
    registry.add(() => void hydrate());
    void hydrate();
  }

  function subscribe(cb: () => void) {
    ensureInit();
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }
  const getSnapshot = () => state;
  const serverSnapshot: StoreState<T> = { items: [], loading: true, error: null, loaded: false };
  const getServerSnapshot = () => serverSnapshot;

  function guard(action: Action): string | null {
    const denied = checkPermission(action, cfg.module);
    if (denied) toast.error(denied);
    return denied;
  }

  function fail<R>(op: string, err: unknown): Result<R> {
    const msg = messageOf(err);
    console.error(`[${cfg.table}] ${op} failed`, err);
    toast.error(`${op}${cfg.label}ບໍ່ສຳເລັດ: ${msg}`);
    return { ok: false, error: msg };
  }

  async function insert(row: Row): Promise<Result<T>> {
    const denied = guard("create");
    if (denied) return { ok: false, error: denied };
    const { data, error } = await supabase.from(cfg.table).insert(row).select("*").single();
    if (error) return fail("ບັນທຶກ", error);
    const obj = cfg.fromRow(data as Row);
    const id = cfg.getId(obj);
    setState({
      items: state.items.some((x) => cfg.getId(x) === id)
        ? state.items.map((x) => (cfg.getId(x) === id ? obj : x))
        : [obj, ...state.items],
    });
    return { ok: true, data: obj };
  }

  async function insertMany(rows: Row[]): Promise<Result<T[]>> {
    const denied = guard("create");
    if (denied) return { ok: false, error: denied };
    if (!rows.length) return { ok: true, data: [] };
    const { data, error } = await supabase.from(cfg.table).insert(rows).select("*");
    if (error) return fail("ບັນທຶກ", error);
    const objs = ((data ?? []) as Row[]).map(cfg.fromRow);
    const ids = new Set(objs.map(cfg.getId));
    setState({ items: [...objs, ...state.items.filter((x) => !ids.has(cfg.getId(x)))] });
    return { ok: true, data: objs };
  }

  /** Update by id. `optimistic` is applied locally first and rolled back on error. */
  async function update(id: Id, row: Row, optimistic?: Partial<T>): Promise<Result<T>> {
    const denied = guard("edit");
    if (denied) return { ok: false, error: denied };
    const prev = state.items.find((x) => cfg.getId(x) === id);
    if (prev && optimistic) {
      setState({
        items: state.items.map((x) => (cfg.getId(x) === id ? { ...x, ...optimistic } : x)),
      });
    }
    const { data, error } = await supabase
      .from(cfg.table)
      .update(row)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error || !data) {
      if (prev) setState({ items: state.items.map((x) => (cfg.getId(x) === id ? prev : x)) });
      return fail("ອັບເດດ", error ?? { code: "42501" });
    }
    const obj = cfg.fromRow(data as Row);
    setState({ items: state.items.map((x) => (cfg.getId(x) === id ? obj : x)) });
    return { ok: true, data: obj };
  }

  async function remove(id: Id): Promise<Result<null>> {
    const denied = guard("delete");
    if (denied) return { ok: false, error: denied };
    const prev = state.items;
    setState({ items: state.items.filter((x) => cfg.getId(x) !== id) });
    const { error } = await supabase.from(cfg.table).delete().eq("id", id);
    if (error) {
      setState({ items: prev });
      return fail("ລຶບ", error);
    }
    return { ok: true, data: null };
  }

  async function removeWhere(column: string, values: Id[]): Promise<Result<null>> {
    const denied = guard("delete");
    if (denied) return { ok: false, error: denied };
    if (!values.length) return { ok: true, data: null };
    const { error } = await supabase.from(cfg.table).delete().in(column, values);
    if (error) return fail("ລຶບ", error);
    await hydrate();
    return { ok: true, data: null };
  }

  function useStore(): StoreState<T> & { refresh: () => Promise<void> } {
    const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    return useMemo(() => ({ ...s, refresh: hydrate }), [s]);
  }

  return {
    useStore,
    useItems: () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).items,
    getItems: () => {
      ensureInit();
      return state.items;
    },
    getById: (id: Id) => state.items.find((x) => cfg.getId(x) === id) ?? null,
    refresh: hydrate,
    subscribe,
    insert,
    insertMany,
    update,
    remove,
    removeWhere,
  };
}

/** Read a typed field from a JSON-ish row value. */
export function str(v: unknown, fallback = ""): string {
  return v == null ? fallback : String(v);
}
export function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
export function optNum(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
export function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
export function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)) : [];
}

/** Random suffix for client-generated text ids. */
export function randomId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${rand.toUpperCase()}`;
}
