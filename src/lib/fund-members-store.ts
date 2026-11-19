// Fund enrolment store — public.fund_members (one row per member, UNIQUE member_id).
// Money figures are derived from transactions (see lib/domain/fund.ts).
import { createRealtimeStore, num, randomId, str, type Result } from "@/lib/store/realtime-store";
import type { FundMember } from "@/lib/domain/types";

function fromRow(r: Record<string, unknown>): FundMember {
  return {
    id: str(r.id),
    memberId: num(r.member_id),
    joinedAt: str(r.joined_at),
    status: str(r.status, "active"),
    note: str(r.note),
    createdAt: num(r.created_at),
    updatedAt: num(r.updated_at),
  };
}

const store = createRealtimeStore<FundMember>({
  table: "fund_members",
  module: "fund",
  label: "ຜູ້ເຂົ້າຮ່ວມກອງທຶນ",
  fromRow,
  getId: (f) => f.id,
  requiresAuth: true,
  order: [{ column: "created_at", ascending: false }],
});

export const useFundMembers = store.useItems;
export const useFundMembersState = store.useStore;

export interface FundMemberInput {
  memberId: number;
  joinedAt: string;
  status: string;
  note: string;
}

export function getFundMemberByMemberId(memberId: number): FundMember | null {
  return store.getItems().find((f) => f.memberId === memberId) ?? null;
}

export function addFundMember(input: FundMemberInput): Promise<Result<FundMember>> {
  const now = Date.now();
  return store.insert({
    id: randomId("FM"),
    member_id: input.memberId,
    joined_at: input.joinedAt,
    status: input.status,
    note: input.note.trim(),
    created_at: now,
    updated_at: now,
  });
}

export function updateFundMember(id: string, input: FundMemberInput): Promise<Result<FundMember>> {
  return store.update(id, {
    joined_at: input.joinedAt,
    status: input.status,
    note: input.note.trim(),
    updated_at: Date.now(),
  });
}

export function removeFundMember(id: string): Promise<Result<null>> {
  return store.remove(id);
}

/** Re-create a previously removed enrolment (used by Undo). */
export function restoreFundMember(f: FundMember): Promise<Result<FundMember>> {
  return store.insert({
    id: f.id,
    member_id: f.memberId,
    joined_at: f.joinedAt,
    status: f.status,
    note: f.note,
    created_at: f.createdAt,
    updated_at: Date.now(),
  });
}
