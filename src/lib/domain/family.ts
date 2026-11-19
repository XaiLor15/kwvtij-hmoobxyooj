// Family-tree business rules. Pure functions over the member list.
import type { Member } from "./types.ts";

type Lite = Pick<Member, "id" | "parent" | "gen">;

/** Ancestor ids of a member (parent, grandparent, ...), cycle-safe. */
export function ancestorIds(memberId: number, members: readonly Lite[]): number[] {
  const byId = new Map(members.map((m) => [m.id, m]));
  const out: number[] = [];
  const seen = new Set<number>([memberId]);
  let cur = byId.get(memberId);
  while (cur?.parent != null && !seen.has(cur.parent)) {
    out.push(cur.parent);
    seen.add(cur.parent);
    cur = byId.get(cur.parent);
  }
  return out;
}

/** Lineage path from the root ancestor down to the member itself, cycle-safe. */
export function lineagePath<T extends Lite>(memberId: number, members: readonly T[]): T[] {
  const byId = new Map(members.map((m) => [m.id, m]));
  const self = byId.get(memberId);
  if (!self) return [];
  const path = ancestorIds(memberId, members)
    .map((id) => byId.get(id))
    .filter((m): m is T => !!m)
    .reverse();
  path.push(self);
  return path;
}

/** All descendant ids (children, grandchildren, ...), cycle-safe. */
export function descendantIds(memberId: number, members: readonly Lite[]): Set<number> {
  const childrenOf = new Map<number, number[]>();
  for (const m of members) {
    if (m.parent == null) continue;
    const list = childrenOf.get(m.parent) ?? [];
    list.push(m.id);
    childrenOf.set(m.parent, list);
  }
  const out = new Set<number>();
  const stack = [...(childrenOf.get(memberId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id) || id === memberId) continue;
    out.add(id);
    stack.push(...(childrenOf.get(id) ?? []));
  }
  return out;
}

/**
 * Whether setting `parentId` as the parent of `memberId` would create a loop
 * (a member being their own ancestor).
 */
export function wouldCreateCycle(
  memberId: number,
  parentId: number | null | undefined,
  members: readonly Lite[],
): boolean {
  if (parentId == null) return false;
  if (parentId === memberId) return true;
  return descendantIds(memberId, members).has(parentId);
}

/** Generation number for a child of the given parent (root = 1). */
export function generationFor(
  parentId: number | null | undefined,
  members: readonly Lite[],
): number {
  if (parentId == null) return 1;
  const p = members.find((m) => m.id === parentId);
  return p ? (Number(p.gen) || 1) + 1 : 1;
}

/**
 * After a member's generation changes, all descendants must shift by the same
 * amount. Returns the `{id, gen}` patches needed (excluding the member itself).
 */
export function descendantGenerationPatches(
  memberId: number,
  newGen: number,
  members: readonly Lite[],
): { id: number; gen: number }[] {
  const byParent = new Map<number, Lite[]>();
  for (const m of members) {
    if (m.parent == null) continue;
    const list = byParent.get(m.parent) ?? [];
    list.push(m);
    byParent.set(m.parent, list);
  }
  const patches: { id: number; gen: number }[] = [];
  const seen = new Set<number>([memberId]);
  const queue: { id: number; gen: number }[] = [{ id: memberId, gen: newGen }];
  while (queue.length) {
    const { id, gen } = queue.shift()!;
    for (const child of byParent.get(id) ?? []) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      const childGen = gen + 1;
      if (child.gen !== childGen) patches.push({ id: child.id, gen: childGen });
      queue.push({ id: child.id, gen: childGen });
    }
  }
  return patches;
}

function normName(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/^(ທ້າວ|ນາງ|ທ່ານ)\s+/u, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Likely duplicates of a member being created/edited: same normalised name
 * and either the same birthdate, or the same parent when birthdates are unknown.
 */
export function findPossibleDuplicates<
  T extends Pick<Member, "id" | "name" | "birthdate" | "parent">,
>(
  candidate: { id?: number; name: string; birthdate?: string; parent?: number | null },
  members: readonly T[],
): T[] {
  const n = normName(candidate.name);
  if (!n) return [];
  return members.filter((m) => {
    if (candidate.id != null && m.id === candidate.id) return false;
    if (normName(m.name) !== n) return false;
    if (candidate.birthdate && m.birthdate) return candidate.birthdate === m.birthdate;
    return (candidate.parent ?? null) === (m.parent ?? null);
  });
}

/** Children of a member, sorted by birthdate (unknown last), then id. */
export function childrenOf<T extends Pick<Member, "id" | "parent" | "birthdate">>(
  memberId: number,
  members: readonly T[],
): T[] {
  return members
    .filter((m) => m.parent === memberId)
    .sort((a, b) => {
      const ab = a.birthdate || "9999";
      const bb = b.birthdate || "9999";
      return ab === bb ? a.id - b.id : ab.localeCompare(bb);
    });
}
