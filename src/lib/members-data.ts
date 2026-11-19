// Members store — public.members + public.member_relations.
import { useMemo } from "react";
import { createRealtimeStore, num, optNum, str, type Result } from "@/lib/store/realtime-store";
import {
  formatAddress,
  normalizeBranch,
  normalizeDistrict,
  normalizeProvince,
  normalizeVillage,
} from "@/lib/utils";
import { descendantGenerationPatches, generationFor, wouldCreateCycle } from "@/lib/domain/family";
import type { Gender, Member, MemberStatus } from "@/lib/domain/types";

export type { Member } from "@/lib/domain/types";

/** Columns readable by guests (contact details and private notes excluded). */
export const MEMBERS_PUBLIC_COLUMNS =
  "id,name,nickname,gender,age,gen,role,branch,village,district,province,status,photo,parent_id,category,position,created_at";

function dash(v: unknown): string {
  const s = str(v).trim();
  return s === "-" ? "" : s;
}

function fromRow(r: Record<string, unknown>): Member {
  return {
    id: num(r.id),
    name: str(r.name, "ບໍ່ມີຊື່"),
    nickname: str(r.nickname),
    gender: (r.gender === "F" ? "F" : "M") as Gender,
    age: num(r.age),
    gen: num(r.gen, 1) || 1,
    role: str(r.role, "ສະມາຊິກ"),
    branch: normalizeBranch(str(r.branch)),
    village: dash(r.village),
    district: dash(r.district),
    province: dash(r.province),
    address: str(r.address),
    status: (r.status === "deceased" ? "deceased" : "alive") as MemberStatus,
    phone: dash(r.phone),
    photo: r.photo ? str(r.photo) : null,
    parent: optNum(r.parent_id),
    note: r.note ? str(r.note) : undefined,
    birthdate: r.birthdate ? str(r.birthdate) : undefined,
    category: r.category ? str(r.category) : undefined,
    position: r.position ? str(r.position) : undefined,
    children: [],
    spouse: [],
  };
}

const memberStore = createRealtimeStore<Member>({
  table: "members",
  module: "members",
  label: "ສະມາຊິກ",
  fromRow,
  getId: (m) => m.id,
  select: (authed) => [authed ? "*" : MEMBERS_PUBLIC_COLUMNS],
  order: [{ column: "id", ascending: true }],
  sort: (a, b) => a.id - b.id,
  // Realtime payloads are not column-filtered; don't stream rows to guests.
  realtimeForGuests: false,
});

interface Relation {
  id: number;
  memberId: number;
  relatedId: number;
  type: "child" | "spouse";
}

const relationStore = createRealtimeStore<Relation>({
  table: "member_relations",
  module: "members",
  label: "ຄວາມສຳພັນ",
  fromRow: (r) => ({
    id: num(r.id),
    memberId: num(r.member_id),
    relatedId: num(r.related_id),
    type: r.relation_type === "spouse" ? "spouse" : "child",
  }),
  getId: (r) => r.id,
});

function combine(members: Member[], relations: Relation[]): Member[] {
  const children = new Map<number, Set<number>>();
  const spouses = new Map<number, Set<number>>();
  const add = (map: Map<number, Set<number>>, k: number, v: number) => {
    const s = map.get(k) ?? new Set<number>();
    s.add(v);
    map.set(k, s);
  };
  for (const m of members) if (m.parent != null) add(children, m.parent, m.id);
  for (const r of relations) {
    if (r.type === "child") add(children, r.memberId, r.relatedId);
    else {
      add(spouses, r.memberId, r.relatedId);
      add(spouses, r.relatedId, r.memberId);
    }
  }
  const ids = new Set(members.map((m) => m.id));
  return members.map((m) => ({
    ...m,
    children: [...(children.get(m.id) ?? [])].filter((id) => ids.has(id)),
    spouse: [...(spouses.get(m.id) ?? [])].filter((id) => ids.has(id) && id !== m.id),
  }));
}

let cacheKey: [Member[], Relation[]] | null = null;
let cacheVal: Member[] = [];
function combined(): Member[] {
  const m = memberStore.getItems();
  const r = relationStore.getItems();
  if (!cacheKey || cacheKey[0] !== m || cacheKey[1] !== r) {
    cacheKey = [m, r];
    cacheVal = combine(m, r);
  }
  return cacheVal;
}

/** Live member list (with children/spouse ids). */
export function useMembers(): Member[] {
  const m = memberStore.useItems();
  const r = relationStore.useItems();
  return useMemo(() => combine(m, r), [m, r]);
}

/** Members + loading/error state for pages that render skeletons. */
export function useMembersState() {
  const s = memberStore.useStore();
  const r = relationStore.useItems();
  const items = useMemo(() => combine(s.items, r), [s.items, r]);
  return { ...s, items };
}

export function getMembers(): Member[] {
  return combined();
}

export function getMemberById(id: number | null | undefined): Member | null {
  if (id == null) return null;
  return combined().find((m) => m.id === id) ?? null;
}

export interface MemberInput {
  name: string;
  nickname?: string;
  gender: Gender;
  birthdate?: string;
  parent?: number | null;
  category?: string;
  position?: string;
  role?: string;
  branch?: string;
  village?: string;
  district?: string;
  province?: string;
  phone?: string;
  note?: string;
  status?: MemberStatus;
}

function toRow(input: MemberInput, gen: number, age: number) {
  const village = normalizeVillage(input.village ?? "");
  const district = normalizeDistrict(input.district ?? "");
  const province = normalizeProvince(input.province ?? "");
  const category = input.category || "ສະມາຊິກ";
  return {
    name: input.name.trim() || "ບໍ່ມີຊື່",
    nickname: (input.nickname ?? "").trim(),
    gender: input.gender,
    birthdate: input.birthdate || null,
    age,
    gen,
    parent_id: input.parent ?? null,
    category,
    position: input.position?.trim() || null,
    role: input.role?.trim() || (category === "ສະມາຊິກ" ? "ສະມາຊິກ" : input.position || category),
    branch: normalizeBranch(input.branch),
    village: village || "-",
    district: district || "-",
    province: province || "-",
    address: formatAddress({ village, district, province }),
    phone: input.phone?.trim() || "-",
    note: input.note?.trim() || null,
    status: input.status ?? "alive",
  };
}

export async function addMember(input: MemberInput, age: number): Promise<Result<Member>> {
  const all = combined();
  const gen = generationFor(input.parent, all);
  const res = await memberStore.insert(toRow(input, gen, age));
  if (res.ok && input.parent != null) {
    const rel = await relationStore.insert({
      member_id: input.parent,
      related_id: res.data.id,
      relation_type: "child",
    });
    if (!rel.ok) console.warn("child relation not saved; parent_id is still set", rel.error);
  }
  return res;
}

/**
 * Update a member. Handles parent changes safely: rejects cycles, moves the
 * child relation row, and shifts every descendant's generation.
 */
export async function updateMember(
  id: number,
  input: MemberInput,
  age: number,
): Promise<Result<Member>> {
  const all = combined();
  const current = all.find((m) => m.id === id);
  if (!current) return { ok: false, error: "ບໍ່ພົບສະມາຊິກ" };
  const parent = input.parent ?? null;
  if (wouldCreateCycle(id, parent, all)) {
    return { ok: false, error: "ບໍ່ສາມາດເລືອກລູກຫຼານຂອງຕົນເອງເປັນພໍ່/ແມ່ໄດ້" };
  }
  const parentChanged = (current.parent ?? null) !== parent;
  const gen = parentChanged ? generationFor(parent, all) : current.gen;
  const row = toRow(input, gen, age);
  const res = await memberStore.update(id, row);
  if (!res.ok) return res;

  if (parentChanged) {
    const stale = relationStore
      .getItems()
      .filter((r) => r.type === "child" && r.relatedId === id)
      .map((r) => r.id);
    if (stale.length) await relationStore.removeWhere("id", stale);
    if (parent != null)
      await relationStore.insert({ member_id: parent, related_id: id, relation_type: "child" });
  }
  if (gen !== current.gen) {
    for (const p of descendantGenerationPatches(id, gen, all)) {
      await memberStore.update(p.id, { gen: p.gen });
    }
  }
  return res;
}

/** Deleting cascades relations, fund enrolment and participation in the DB. */
export function deleteMember(id: number) {
  return memberStore.remove(id);
}

export const refreshMembers = () => Promise.all([memberStore.refresh(), relationStore.refresh()]);
