// Elders store — public.elders. Shown on the dashboard (active only).
import { createRosterStore } from "@/lib/roster-store";
import { num, optNum, str } from "@/lib/store/realtime-store";
import { normalizeBranch } from "@/lib/utils";
import type { Elder, ElderStatus } from "@/lib/domain/types";

export const ELDER_STATUS_LABEL: Record<ElderStatus, string> = {
  living: "ຍັງມີຊີວິດ",
  advisor: "ທີ່ປຶກສາ",
  deceased: "ລ່ວງລັບແລ້ວ",
};

export const ELDER_POSITIONS = [
  "ປະທານຜູ້ອາວຸໂສ",
  "ຮອງປະທານ",
  "ທີ່ປຶກສາ",
  "ຜູ້ໃຫ້ພອນ",
  "ຜູ້ໄກ່ເກ່ຍ",
  "ຜູ້ຮັກສາປະເພນີ",
];

function asStatus(v: unknown): ElderStatus {
  return v === "advisor" || v === "deceased" ? v : "living";
}

const store = createRosterStore<Elder>({
  table: "elders",
  module: "elders",
  label: "ຜູ້ອາວຸໂສ",
  publicColumns:
    "id,name,age,branch,photo,member_id,created_at,position,bio,department,display_order,active,person_type,updated_at",
  fromRow: (r, data) => ({
    id: num(r.id),
    memberId: optNum(r.member_id),
    name: str(r.name),
    age: optNum(r.age),
    branch: normalizeBranch(str(r.branch)),
    phone: str(r.phone) === "-" ? "" : str(r.phone),
    photo: r.photo ? str(r.photo) : null,
    note: str(r.note),
    position: str(r.position ?? data.role),
    bio: str(r.bio),
    department: str(r.department),
    displayOrder: num(r.display_order),
    active: r.active !== false,
    status: asStatus(r.status ?? data.status),
    contributions: str(data.contributions),
    honors: str(data.honors),
    updatedAt: r.updated_at ? str(r.updated_at) : null,
  }),
});

export const useElders = store.useItems;
export const useEldersState = store.useStore;

export interface ElderInput {
  memberId?: number;
  name: string;
  position: string;
  branch: string;
  phone: string;
  bio: string;
  note: string;
  photo: string | null;
  status: ElderStatus;
  contributions: string;
  honors: string;
}

function split(e: ElderInput) {
  return {
    columns: {
      member_id: e.memberId ?? null,
      name: e.name.trim(),
      position: e.position.trim() || null,
      branch: normalizeBranch(e.branch),
      phone: e.phone.trim() || null,
      bio: e.bio.trim() || null,
      note: e.note.trim() || null,
      photo: e.photo,
      person_type: "senior",
    },
    extra: {
      status: e.status,
      role: e.position.trim(),
      contributions: e.contributions.trim(),
      honors: e.honors.trim(),
    },
  };
}

export function addElder(e: ElderInput) {
  const { columns, extra } = split(e);
  return store.add(columns, extra);
}
export function updateElder(id: number, e: ElderInput) {
  const { columns, extra } = split(e);
  return store.update(id, columns, extra);
}
export const deleteElder = store.remove;
export const moveElder = store.move;
export function setElderActive(id: number, active: boolean) {
  return store.setActive(id, active, { active });
}
