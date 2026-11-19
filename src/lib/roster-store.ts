// Shared persistence for the two "roster" tables (leadership, elders): ordered,
// toggleable lists of people optionally linked to a member, with extra
// role-specific fields kept in the JSONB `data` column.
//
// `status` is promoted to a real column by migration 20261119000100 so guests
// can read it. Until that migration is applied the store falls back to
// data.status and keeps working.
import {
  createRealtimeStore,
  obj,
  type Result,
  type StoreConfig,
} from "@/lib/store/realtime-store";
import type { Module } from "@/lib/permissions-core";

export function createRosterStore<T extends { id: number; displayOrder: number }>(opts: {
  table: "leadership" | "elders";
  module: Module;
  label: string;
  publicColumns: string;
  fromRow: (row: Record<string, unknown>, data: Record<string, unknown>) => T;
}) {
  let hasStatusColumn = false;
  const rawData = new Map<number, Record<string, unknown>>();

  const cfg: StoreConfig<T> = {
    table: opts.table,
    module: opts.module,
    label: opts.label,
    getId: (x) => x.id,
    select: (authed) => (authed ? ["*"] : [`${opts.publicColumns},status`, opts.publicColumns]),
    order: [
      { column: "display_order", ascending: true },
      { column: "id", ascending: true },
    ],
    sort: (a, b) => a.displayOrder - b.displayOrder || a.id - b.id,
    realtimeForGuests: false,
    fromRow: (r) => {
      if ("status" in r) hasStatusColumn = true;
      const data = obj(r.data);
      if (r.data !== undefined) rawData.set(Number(r.id), data);
      return opts.fromRow(r, data);
    },
  };
  const store = createRealtimeStore<T>(cfg);

  /** Build a DB row: known columns + `data` merged over the existing JSON. */
  function toRow(
    id: number | null,
    columns: Record<string, unknown>,
    extra: Record<string, unknown>,
  ) {
    const status = extra.status;
    const base = id != null ? (rawData.get(id) ?? {}) : {};
    const row: Record<string, unknown> = { ...columns, data: { ...base, ...extra } };
    if (hasStatusColumn && status !== undefined) row.status = status;
    return row;
  }

  function nextOrder(): number {
    return store.getItems().reduce((m, x) => Math.max(m, x.displayOrder), 0) + 1;
  }

  return {
    ...store,
    async add(
      columns: Record<string, unknown>,
      extra: Record<string, unknown>,
    ): Promise<Result<T>> {
      const row = toRow(null, { display_order: nextOrder(), active: true, ...columns }, extra);
      return store.insert(row);
    },
    update(id: number, columns: Record<string, unknown>, extra: Record<string, unknown>) {
      return store.update(id, toRow(id, columns, extra));
    },
    setActive(id: number, active: boolean, optimistic: Partial<T>) {
      return store.update(id, { active }, optimistic);
    },
    /** Swap display order with the neighbour above/below. */
    async move(id: number, dir: -1 | 1): Promise<Result<null>> {
      const list = store.getItems();
      const idx = list.findIndex((x) => x.id === id);
      const other = list[idx + dir];
      if (idx < 0 || !other) return { ok: true, data: null };
      const a = list[idx];
      // Equal orders (legacy data) would not swap — derive distinct values from position.
      const aOrder = a.displayOrder === other.displayOrder ? idx + 1 : a.displayOrder;
      const bOrder = a.displayOrder === other.displayOrder ? idx + 1 + dir : other.displayOrder;
      const r1 = await store.update(a.id, { display_order: bOrder });
      if (!r1.ok) return r1;
      const r2 = await store.update(other.id, { display_order: aOrder });
      return r2.ok ? { ok: true, data: null } : r2;
    },
  };
}
