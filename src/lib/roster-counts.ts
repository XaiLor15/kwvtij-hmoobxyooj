// @ts-nocheck
// Shared counts + preview lists derived from MEMBERS so the dashboard
// can render Leadership / Elders sections immediately without requiring
// the user to first visit /leadership or /elders to seed those stores.

const LEADER_POSITIONS = [
  "ປະທານຕະກູນ",
  "ຮອງປະທານ",
  "ເລຂານຸການ",
  "ຄະນະກຳມະການການເງິນ",
  "ຫົວໜ້າພາກສ່ວນກິດຈະກຳ",
  "ຫົວໜ້າພາກສ່ວນວັດທະນາທຳ",
  "ຄະນະປະຊາສຳພັນ",
  "ຫົວໜ້າຄອບຄົວ",
];

const deriveInitials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const pick = parts.length >= 3 ? parts.slice(1) : parts;
  return pick.slice(0, 2).map((w) => w[0] || "").join("");
};

export function getLeadersCountFromMembers(members: any[]): number {
  if (!Array.isArray(members)) return 0;
  let n = 0;
  for (const m of members) {
    if (m.gen === 4) n += 1;
    else if (m.gen === 2 || m.gen === 3) n += 1;
  }
  return n;
}

export function getEldersCountFromMembers(members: any[]): number {
  if (!Array.isArray(members)) return 0;
  return members.filter((m) => m && m.gen <= 3).length;
}

// Lightweight preview list (same shape used by dashboard's leadersDisplay).
export function getLeadersPreviewFromMembers(members: any[]): any[] {
  if (!Array.isArray(members)) return [];
  const gen4 = members.filter((m) => m && m.gen === 4);
  const advisors = members.filter((m) => m && (m.gen === 2 || m.gen === 3));
  const all = [...gen4, ...advisors];
  return all.map((m, idx) => ({
    id: m.id,
    memberId: m.id,
    name: m.name,
    position:
      m.gen === 4
        ? LEADER_POSITIONS[Math.min(idx, LEADER_POSITIONS.length - 1)]
        : "ທີ່ປຶກສາອາວຸໂສ",
    generation: `ລຸ້ນທີ ${m.gen} (Phaj ${m.gen})`,
    lineage: m.branch || "",
    initials: deriveInitials(m.name),
  }));
}

// Lightweight preview list (same shape used by dashboard's eldersPreview).
export function getEldersPreviewFromMembers(members: any[]): any[] {
  if (!Array.isArray(members)) return [];
  return members
    .filter((m) => m && m.gen <= 3)
    .map((m) => ({
      id: m.id,
      memberId: m.id,
      name: m.name,
      role: m.role || "ຜູ້ອາວຸໂສ",
      generation: `ລຸ້ນທີ ${m.gen} (Phaj ${m.gen})`,
      initials: deriveInitials(m.name),
    }));
}
