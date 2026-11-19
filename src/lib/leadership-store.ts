// Leadership store — public.leadership. Shown on the dashboard (active only).
import { createRosterStore } from "@/lib/roster-store";
import { num, optNum, str, strArray } from "@/lib/store/realtime-store";
import { normalizeBranch } from "@/lib/utils";
import type { Leader, LeaderStatus } from "@/lib/domain/types";

export const LEADER_STATUS_LABEL: Record<LeaderStatus, string> = {
  active: "ກຳລັງດຳລົງຕຳແໜ່ງ",
  advisor: "ທີ່ປຶກສາ",
  former: "ອະດີດ",
};

export const LEADER_POSITIONS = [
  "ປະທານຕະກູນ",
  "ຮອງປະທານ",
  "ເລຂານຸການ",
  "ຮອງເລຂານຸການ",
  "ຄະນະກຳມະການການເງິນ",
  "ຫົວໜ້າພາກສ່ວນກິດຈະກຳ",
  "ຫົວໜ້າພາກສ່ວນວັດທະນາທຳ",
  "ຄະນະປະຊາສຳພັນ",
  "ກຳມະການ",
];

function asStatus(v: unknown): LeaderStatus {
  return v === "advisor" || v === "former" ? v : "active";
}

const store = createRosterStore<Leader>({
  table: "leadership",
  module: "leadership",
  label: "ຄະນະນຳ",
  publicColumns:
    "id,name,position,branch,photo,bio,member_id,created_at,department,display_order,active,person_type,updated_at",
  fromRow: (r, data) => ({
    id: num(r.id),
    memberId: optNum(r.member_id),
    name: str(r.name),
    position: str(r.position),
    department: str(r.department),
    branch: normalizeBranch(str(r.branch)),
    phone: str(r.phone) === "-" ? "" : str(r.phone),
    photo: r.photo ? str(r.photo) : null,
    bio: str(r.bio),
    displayOrder: num(r.display_order),
    active: r.active !== false,
    status: asStatus(r.status ?? data.status),
    startYear: optNum(data.startYear),
    endYear: optNum(data.endYear),
    achievements: strArray(data.achievements),
    updatedAt: r.updated_at ? str(r.updated_at) : null,
  }),
});

export const useLeaders = store.useItems;
export const useLeadersState = store.useStore;

export interface LeaderInput {
  memberId?: number;
  name: string;
  position: string;
  department: string;
  branch: string;
  phone: string;
  bio: string;
  photo: string | null;
  status: LeaderStatus;
  startYear?: number;
  endYear?: number;
  achievements: string[];
}

function split(l: LeaderInput) {
  return {
    columns: {
      member_id: l.memberId ?? null,
      name: l.name.trim(),
      position: l.position.trim(),
      department: l.department.trim() || null,
      branch: normalizeBranch(l.branch),
      phone: l.phone.trim() || null,
      bio: l.bio.trim() || null,
      photo: l.photo,
      person_type: "leadership",
    },
    extra: {
      status: l.status,
      startYear: l.startYear ?? null,
      endYear: l.endYear ?? null,
      achievements: l.achievements,
    },
  };
}

export function addLeader(l: LeaderInput) {
  const { columns, extra } = split(l);
  return store.add(columns, extra);
}
export function updateLeader(id: number, l: LeaderInput) {
  const { columns, extra } = split(l);
  return store.update(id, columns, extra);
}
export const deleteLeader = store.remove;
export const moveLeader = store.move;
export function setLeaderActive(id: number, active: boolean) {
  return store.setActive(id, active, { active });
}
