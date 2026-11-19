// Treasury (transactions) store — public.transactions. Members only (RLS).
import { createRealtimeStore, num, optNum, str, type Result } from "@/lib/store/realtime-store";
import { newTransactionId } from "@/lib/domain/finance";
import type { Transaction, TxDirection } from "@/lib/domain/types";

export { eventTotals } from "@/lib/domain/finance";

function fromRow(r: Record<string, unknown>): Transaction {
  return {
    id: str(r.id),
    createdAt: num(r.created_at, 0),
    date: str(r.date),
    direction: (r.direction === "expense" ? "expense" : "income") as TxDirection,
    amount: Math.abs(num(r.amount)),
    description: str(r.description),
    eventId: optNum(r.event_id),
    eventTitle: str(r.event_title),
    category: r.category ? str(r.category) : undefined,
    memberId: optNum(r.member_id),
    type: str(r.type),
    contributor: str(r.contributor),
    method: str(r.method),
    note: str(r.note),
  };
}

const store = createRealtimeStore<Transaction>({
  table: "transactions",
  module: "finance",
  label: "ທຸລະກຳ",
  fromRow,
  getId: (t) => t.id,
  requiresAuth: true,
  order: [{ column: "date", ascending: false }],
  sort: (a, b) => (b.date === a.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)),
});

export const useTransactions = store.useItems;
export const useTransactionsState = store.useStore;
export const refreshTransactions = store.refresh;

export interface TransactionInput {
  direction: TxDirection;
  date: string;
  amount: number;
  type: string;
  category?: string;
  eventId?: number | null;
  eventTitle?: string;
  memberId?: number | null;
  contributor?: string;
  method?: string;
  note?: string;
}

function toRow(t: TransactionInput) {
  return {
    date: t.date,
    direction: t.direction,
    amount: Math.abs(Number(t.amount) || 0),
    type: t.type,
    category: t.category || null,
    event_id: t.eventId ?? null,
    event_title: t.eventTitle || null,
    member_id: t.memberId ?? null,
    contributor: t.contributor?.trim() || null,
    method: t.method || null,
    note: t.note?.trim() || null,
    description: t.note?.trim() || t.category || t.type,
  };
}

export function addTransaction(t: TransactionInput): Promise<Result<Transaction>> {
  return store.insert({ id: newTransactionId(), created_at: Date.now(), ...toRow(t) });
}

export function updateTransaction(id: string, t: TransactionInput): Promise<Result<Transaction>> {
  return store.update(id, toRow(t));
}

export function deleteTransaction(id: string): Promise<Result<null>> {
  return store.remove(id);
}

/** Delete every income transaction linked to a member (used when removing a fund member). */
export function deleteMemberIncome(memberId: number): Promise<Result<null>> {
  const ids = store
    .getItems()
    .filter((t) => t.memberId === memberId && t.direction === "income")
    .map((t) => t.id);
  return store.removeWhere("id", ids);
}
