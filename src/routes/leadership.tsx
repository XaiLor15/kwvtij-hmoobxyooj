// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BackToHomeButton } from "@/components/enterprise/back-to-home-button";

export const Route = createFileRoute("/leadership")({
  head: () => ({
    meta: [
      { title: "ຄະນະນຳ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ຄະນະນຳ — ລະບົບຄຸ້ມຄອງຂໍ້ມູນຕະກູນ" },
      { property: "og:title", content: "ຄະນະນຳ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { property: "og:description", content: "ຄະນະນຳ — ລະບົບຄຸ້ມຄອງຂໍ້ມູນຕະກູນ" },
    ],
  }),
  component: LeadershipPage,
});

import { useState, useEffect, useMemo } from "react";
import {
  useLeaders,
  addLeader as addLeaderStore,
  updateLeader as updateLeaderStore,
  deleteLeader as deleteLeaderStore,
  toggleLeaderActive,
} from "@/lib/leadership-store";
import { fileToDataUrl } from "@/lib/file-to-data-url";
import { ConfirmDialog } from "@/components/enterprise/confirm-dialog";
import { usePermissions } from "@/lib/permissions";
import {
  Users,
  CheckCircle2,
  Award,
  Building2,
  ScrollText,
  Calendar,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Phone,
  Mail,
  UserPlus,
  Megaphone,
  FolderOpen,
  Printer,
  Upload,
  Star,
  UserCheck,
  Pencil,
  Crown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { MEMBERS, useMembers } from "@/lib/members-data";
import { SearchableMemberSelect, LEADER_POSITIONS } from "@/components/searchable-member-select";
import { CreatableCombobox } from "@/components/creatable-combobox";

const PALETTE = ["#2d6a4f", "#40916c", "#52b788", "#74c69d", "#95d5b2", "#b7e4c7"];

function deriveInitials(name: string): string {
  const cleaned = name.replace(/^(ທ່ານ|ນາງ|ທ້າວ)\s+/g, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const pick = words.slice(0, 2).map((w) => w[0]).join("");
  return pick || name.slice(0, 2);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Leader {
  id: number;
  memberId?: number;
  name: string;
  position: string;
  department: string;
  generation: string;
  lineage: string;
  status: "active" | "former" | "advisor";
  startYear: number;
  endYear?: number;
  phone: string;
  email: string;
  bio: string;
  achievements: string[];
  image: string;
  initials: string;
  color: string;
}

interface OrgNode {
  id: number;
  name: string;
  position: string;
  initials: string;
  color: string;
  children?: OrgNode[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

// Position hierarchy — order here defines seniority/rank across the clan
// leadership (index 0 = highest authority). Reused both to build mock
// leaders and to rank the list view by importance.
const POSITIONS = [
  "ປະທານຕະກູນ",
  "ຮອງປະທານ",
  "ເລຂານຸການ",
  "ຄະນະກຳມະການການເງິນ",
  "ຫົວໜ້າພາກສ່ວນກິດຈະກຳ",
  "ຫົວໜ້າພາກສ່ວນວັດທະນາທຳ",
  "ຄະນະປະຊາສຳພັນ",
  "ຫົວໜ້າຄອບຄົວ",
];

const POSITION_RANK: Record<string, number> = POSITIONS.reduce(
  (acc, pos, idx) => ({ ...acc, [pos]: idx }),
  {} as Record<string, number>,
);

// Priority/seniority rank for the list view: active leaders first (ordered
// by position hierarchy), then advisors, then former leaders. Lower = higher rank.
function rankLeader(l: Leader): number {
  const statusOrder = l.status === "active" ? 0 : l.status === "advisor" ? 1 : 2;
  const posRank = POSITION_RANK[l.position] ?? 50;
  return statusOrder * 1000 + posRank;
}

const LEADER_SECTION_META: Record<Leader["status"], { label: string; Icon: any }> = {
  active: { label: "ຄະນະບໍລິຫານ", Icon: Users },
  advisor: { label: "ທີ່ປຶກສາອາວຸໂສ", Icon: Award },
  former: { label: "ອະດີດຜູ້ນຳ", Icon: ScrollText },
};

// Derived from MEMBERS: gen 4 members act as the current clan leadership
// (one per parent family); gen 2-3 living members appear as advisors.
function buildLeadersFromMembers(MEMBERS: any[]): Leader[] {
  const leaders: Leader[] = [];
  const DEPARTMENTS = [
    "ຄະນະກຳມະການໃຫຍ່",
    "ຄະນະກຳມະການໃຫຍ່",
    "ຄະນະເລຂານຸການ",
    "ພາກສ່ວນການເງິນ",
    "ພາກສ່ວນກິດຈະກຳ",
    "ພາກສ່ວນວັດທະນາທຳ",
    "ພາກສ່ວນປະຊາສຳພັນ",
    "ຄອບຄົວ",
  ];

  const gen4 = MEMBERS.filter((m: any) => m.gen === 4);
  gen4.forEach((m: any, idx: number) => {
    const posIdx = Math.min(idx, POSITIONS.length - 1);
    const slug = m.nickname ? m.nickname.toLowerCase().replace(/[^a-z0-9]/g, "") : `mem${m.id}`;
    leaders.push({
      id: 1000 + m.id,
      memberId: m.id,
      name: m.name,
      position: POSITIONS[posIdx],
      department: DEPARTMENTS[posIdx],
      generation: `ລຸ້ນທີ ${m.gen} (Phaj ${m.gen})`,
      lineage: m.branch,
      status: "active",
      startYear: 2020 + (idx % 5),
      phone: m.phone && m.phone !== "-" ? m.phone : "020-xxxx-xxxx",
      email: `${slug}@clan.la`,
      bio: m.note || `${POSITIONS[posIdx]} ປະຈຳ ${m.branch}. ມີລູກ ${(m.children || []).length} ຄົນ.`,
      achievements: [
        `ຄຸ້ມຄອງ ${m.branch}`,
        `ສືບທອດສາຍຕະກູນ Phaj ${m.gen}`,
        `ມີລູກ ${(m.children || []).length} ຄົນ`,
      ],
      image: "",
      initials: deriveInitials(m.name),
      color: PALETTE[idx % PALETTE.length],
    });
  });

  // Add gen 2-3 living/deceased ancestors as advisors
  const advisors = MEMBERS.filter((m: any) => m.gen >= 2 && m.gen <= 3);
  advisors.forEach((m: any, idx: number) => {
    const slug = m.nickname ? m.nickname.toLowerCase().replace(/[^a-z0-9]/g, "") : `mem${m.id}`;
    leaders.push({
      id: 2000 + m.id,
      memberId: m.id,
      name: m.name,
      position: "ທີ່ປຶກສາອາວຸໂສ",
      department: "ທີ່ປຶກສາ",
      generation: `ລຸ້ນທີ ${m.gen} (Phaj ${m.gen})`,
      lineage: m.branch,
      status: m.status === "deceased" ? "former" : "advisor",
      startYear: 1990 + idx,
      phone: "-",
      email: `${slug}@clan.la`,
      bio: m.note || `Phaj ${m.gen} / ທີ່ປຶກສາອາວຸໂສ ປະຈຳ ${m.branch}`,
      achievements: [`ສືບທອດ ${m.branch}`, `ມີລູກ ${(m.children || []).length} ຄົນ`],
      image: "",
      initials: deriveInitials(m.name),
      color: PALETTE[(idx + 3) % PALETTE.length],
    });
  });

  return leaders;
}


function computeLeadershipStats(leaders: Leader[]) {
  const total = leaders.length;
  const active = leaders.filter((l) => l.status === "active").length;
  const advisors = leaders.filter((l) => l.status === "advisor").length;
  const former = leaders.filter((l) => l.status === "former").length;
  const departments = new Set(leaders.map((l) => l.department).filter(Boolean)).size;
  const positions = new Set(leaders.map((l) => l.position).filter(Boolean)).size;
  return [
    { label: "ຄະນະນຳທັງໝົດ", value: String(total), trend: "", Icon: Users },
    { label: "ກຳລັງດຳລົງຕຳແໜ່ງ", value: String(active), trend: "", Icon: CheckCircle2 },
    { label: "ອາວຸໂສທີ່ປຶກສາ", value: String(advisors), trend: "", Icon: Award },
    { label: "ຈຳນວນພາກສ່ວນ", value: String(departments), trend: "", Icon: Building2 },
    { label: "ຜູ້ນຳຮຸ່ນກ່ອນ", value: String(former), trend: "", Icon: ScrollText },
    { label: "ຈຳນວນຕຳແໜ່ງ", value: String(positions), trend: "", Icon: Calendar },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusMeta(status: Leader["status"]) {
  if (status === "active") return { label: "ກຳລັງດຳລົງຕຳແໜ່ງ", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (status === "advisor") return { label: "ທີ່ປຶກສາ", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "ອະດີດ", cls: "bg-slate-100 text-slate-500 border-slate-200" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, trend, Icon }: { label: string; value: string; trend: string; Icon: any }) {
  const isPositive = trend && trend.startsWith("+");
  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 flex items-center gap-3 min-w-0">
      <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1 truncate">{label}</div>
      </div>
      {trend ? (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${isPositive ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
          {trend}
        </span>
      ) : null}
    </div>
  );
}

function LeaderCard({ leader, onClick, onViewMember, onEdit, onDelete }: { leader: Leader; onClick: () => void; onViewMember: (id: number) => void; onEdit?: (l: Leader) => void; onDelete?: (l: Leader) => void }) {
  const sm = statusMeta(leader.status);
  return (
    <div
      onClick={onClick}
      className="rounded-xl border bg-card shadow-sm overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all duration-200 flex flex-col relative"
    >
      <div className="absolute top-3 right-3 z-10 flex gap-1">
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(leader); }}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors bg-card/60 backdrop-blur"
            aria-label="ແກ້ໄຂ"
            title="ແກ້ໄຂ"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(leader); }}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors bg-card/60 backdrop-blur"
            aria-label="ລຶບ"
            title="ລຶບຄະນະນຳ"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {/* Top accent strip */}
      <div className="h-1.5 bg-primary/60" />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Avatar + status */}
        <div className="flex items-start justify-between">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0 select-none">
            {leader.initials}
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${sm.cls}`}>
            {sm.label}
          </span>
        </div>

        {/* Name & role */}
        <div>
          <div className="font-bold text-base text-foreground leading-snug">{leader.name}</div>
          <div className="text-sm text-primary font-semibold mt-0.5">{leader.position}</div>
        </div>

        {/* Badges */}
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{leader.generation}</span>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{leader.lineage}</span>
        </div>

        {/* Bio */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{leader.bio}</p>

        {/* Service */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          {leader.startYear}{leader.endYear ? `–${leader.endYear}` : "–ປັດຈຸບັນ"}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-1">
          <button onClick={onClick} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
            ເບິ່ງຂໍ້ມູນ
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onViewMember(leader.memberId); }}
            disabled={!leader.memberId}
            className="flex-1 py-2 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ເບິ່ງສາຍຕະກູນ
          </button>
        </div>
      </div>
    </div>
  );
}

// Featured hero card for the #1-ranked leader (ປະທານຕະກູນ / top active leader).
function LeaderHeroCard({ leader, onClick, onViewMember }: { leader: Leader; onClick: () => void; onViewMember: (id?: number) => void }) {
  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground shadow-md cursor-pointer"
    >
      <Crown className="pointer-events-none absolute -right-6 -top-6 w-40 h-40 text-primary-foreground/10 rotate-12" strokeWidth={1.25} />
      <div className="relative flex flex-col gap-4 max-w-lg">
        <span className="inline-flex w-fit items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
          <Crown className="w-3.5 h-3.5" /> ຫົວໜ້າຕະກູນປັດຈຸບັນ
        </span>
        <div>
          <div className="text-2xl sm:text-3xl font-bold leading-tight">{leader.name}</div>
          <div className="text-sm text-primary-foreground/80 mt-1.5 leading-relaxed">
            {leader.position}
          </div>
        </div>
        {leader.phone && leader.phone !== "-" && leader.phone !== "020-xxxx-xxxx" && (
          <div className="flex items-center gap-2 text-sm text-primary-foreground/90">
            <Phone className="w-4 h-4" /> {leader.phone}
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onViewMember(leader.memberId); }}
          disabled={!leader.memberId}
          className="mt-1 w-fit px-5 py-2.5 rounded-xl bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur"
        >
          ເບິ່ງໂປຣໄຟລ໌
        </button>
      </div>
    </div>
  );
}

// Compact ranked row used for everyone below the hero — carries the rank
// number so the ordering (priority within the leadership) is explicit.
function LeaderRankRow({ leader, rank, onClick, onViewMember, onEdit, onDelete }: { leader: Leader; rank: number; onClick: () => void; onViewMember: (id?: number) => void; onEdit?: (l: Leader) => void; onDelete?: (l: Leader) => void }) {
  const sm = statusMeta(leader.status);
  return (
    <div
      onClick={onClick}
      className="group rounded-xl border bg-card shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
    >
      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
        {rank}
      </div>
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 select-none">
        {leader.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-foreground truncate">{leader.name}</div>
        <div className="text-xs text-primary font-semibold mt-0.5 truncate">{leader.position}</div>
        <div className="flex gap-1.5 flex-wrap mt-1.5">
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{leader.generation}</span>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{leader.lineage}</span>
        </div>
      </div>
      <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${sm.cls}`}>{sm.label}</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(leader); }} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="ແກ້ໄຂ">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onViewMember(leader.memberId); }} disabled={!leader.memberId} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="ເບິ່ງສາຍຕະກູນ">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          {onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(leader); }} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors" title="ລຶບ">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ leader, onClose, onViewMember, onEdit }: { leader: Leader; onClose: () => void; onViewMember: (id: number) => void; onEdit?: () => void }) {
  const sm = statusMeta(leader.status);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-end"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-full overflow-y-auto bg-card border-l border-border shadow-2xl flex flex-col"
        style={{ animation: "slideIn 0.25s ease" }}
      >
        {/* Header */}
        <div className="bg-primary p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-xl mb-4 select-none">
            {leader.initials}
          </div>
          <div className="text-xl font-bold text-white mb-1">{leader.name}</div>
          <div className="text-sm text-white/80 mb-3">{leader.position}</div>
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full">{leader.generation}</span>
            <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full">{leader.department}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${sm.cls}`}>{sm.label}</span>
          </div>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Achievements */}
          <section>
            <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">ຜົນສຳເລັດ</div>
            <ul className="space-y-2">
              {leader.achievements.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Star className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{a}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Contact */}
          <section>
            <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">ຂໍ້ມູນຕິດຕໍ່</div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground w-16">ໂທລະສັບ</span>
                <span className="text-sm font-medium text-foreground">{leader.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground w-16">ອີເມລ</span>
                <span className="text-sm font-medium text-foreground">{leader.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground w-16">ພາກສ່ວນ</span>
                <span className="text-sm font-medium text-foreground">{leader.department}</span>
              </div>
            </div>
          </section>

          {/* Service */}
          <section>
            <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">ການດຳລົງຕຳແໜ່ງ</div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground w-16">ເລີ່ມ</span>
                <span className="text-sm font-medium text-foreground">{leader.startYear}</span>
              </div>
              <div className="flex items-center gap-3">
                <ScrollText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground w-16">ສາຍຕະກູນ</span>
                <span className="text-sm font-medium text-foreground">{leader.lineage}</span>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {onEdit && (
              <button onClick={onEdit} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                ແກ້ໄຂຂໍ້ມູນ
              </button>
            )}
            <button
              onClick={() => onViewMember(leader.memberId)}
              disabled={!leader.memberId}
              className="flex-1 py-2.5 rounded-xl border border-border bg-background text-foreground font-semibold text-sm hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ໂປຣໄຟລ໌ສະມາຊິກ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddLeaderModal({ onClose, onAdd }: { onClose: () => void; onAdd: (l: Leader) => void }) {
  const [memberId, setMemberId] = useState<number | null>(null);
  const member = memberId ? (MEMBERS as any[]).find((m) => m.id === memberId) : null;
  const [form, setForm] = useState({
    position: "",
    department: "ຄະນະກຳມະການໃຫຍ່",
    status: "active" as Leader["status"],
    startDate: new Date().toISOString().slice(0, 10),
    email: "",
    achievements: "",
    photo: "",
    displayOrder: "",
    active: true,
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const onPhoto = async (file?: File | null) => {
    if (!file) return;
    try { set("photo", await fileToDataUrl(file)); } catch { toast.error("ອັບໂຫຼດຮູບບໍ່ສຳເລັດ"); }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) {
      toast.error("ກະລຸນາເລືອກສະມາຊິກ");
      return;
    }
    if (!form.position.trim()) {
      toast.error("ກະລຸນາປ້ອນຕຳແໜ່ງ");
      return;
    }
    const leader: any = {
      memberId: member.id,
      name: member.name,
      position: form.position.trim(),
      department: form.department.trim(),
      personType: "leadership",
      generation: `ລຸ້ນທີ ${member.gen} (Phaj ${member.gen})`,
      branch: member.branch,
      lineage: member.branch,
      status: form.status,
      startYear: form.startDate ? new Date(form.startDate).getFullYear() : new Date().getFullYear(),
      phone: member.phone && member.phone !== "-" ? member.phone : "-",
      email: form.email.trim() || "-",
      achievements: form.achievements.split(",").map((a) => a.trim()).filter(Boolean),
      photo: form.photo || null,
      active: !!form.active,
      ...(form.displayOrder !== "" ? { displayOrder: Number(form.displayOrder) || 0 } : {}),
      initials: deriveInitials(member.name),
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    };
    onAdd(leader);
    toast.success("ເພີ່ມຄະນະນຳສຳເລັດ");
    onClose();
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">ເພີ່ມຄະນະນຳ</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="text-sm space-y-1">
            <span className="font-medium text-foreground">ຊື່ <span className="text-destructive">*</span></span>
            <SearchableMemberSelect
              value={memberId}
              onChange={setMemberId}
              placeholder="ເລືອກສະມາຊິກ..."
            />
          </div>

          {member && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
              <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">ຂໍ້ມູນຈາກສະມາຊິກ</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm space-y-1">
                  <span className="text-xs text-muted-foreground">ລຸ້ນ</span>
                  <input className={inputCls} value={`ລຸ້ນ ${member.gen}`} readOnly disabled />
                </label>
                <label className="text-sm space-y-1">
                  <span className="text-xs text-muted-foreground">ເບີໂທ</span>
                  <input className={inputCls} value={member.phone || "-"} readOnly disabled />
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm space-y-1 sm:col-span-2">
              <span className="font-medium text-foreground">ຕຳແໜ່ງ <span className="text-destructive">*</span></span>
              <CreatableCombobox
                className={inputCls}
                value={form.position}
                onChange={(v) => set("position", v)}
                options={LEADER_POSITIONS}
                placeholder="ເລືອກ ຫຼື ພິມຕຳແໜ່ງ..."
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="font-medium text-foreground">ພາກສ່ວນ</span>
              <input className={inputCls} value={form.department} onChange={(e) => set("department", e.target.value)} />
            </label>
            <label className="text-sm space-y-1">
              <span className="font-medium text-foreground">ສະຖານະ</span>
              <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="active">ກຳລັງດຳລົງຕຳແໜ່ງ</option>
                <option value="advisor">ທີ່ປຶກສາ</option>
                <option value="former">ອະດີດ</option>
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="font-medium text-foreground">ເລີ່ມວັນທີ</span>
              <input type="date" className={inputCls} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </label>
            <label className="text-sm space-y-1">
              <span className="font-medium text-foreground">ລຳດັບການສະແດງ</span>
              <input type="number" className={inputCls} value={form.displayOrder} onChange={(e) => set("displayOrder", e.target.value)} placeholder="ອັດຕະໂນມັດ" />
            </label>
            <label className="flex items-center gap-2 text-sm sm:pt-6">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4" />
              <span className="font-medium text-foreground">ເຜີຍແຜ່ (Active)</span>
            </label>
            <div className="text-sm space-y-1 sm:col-span-2">
              <span className="font-medium text-foreground">ຮູບພາບ</span>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                  {form.photo ? <img src={form.photo} alt="preview" className="h-full w-full object-cover" /> : deriveInitials(member?.name || "?")}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                  <Upload className="h-3.5 w-3.5" /> ອັບໂຫຼດຮູບ
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { onPhoto(e.target.files?.[0]); e.currentTarget.value = ""; }} />
                </label>
                {form.photo && <button type="button" onClick={() => set("photo", "")} className="text-xs text-rose-600 hover:underline">ລຶບຮູບ</button>}
              </div>
            </div>
            <label className="text-sm space-y-1 sm:col-span-2">
              <span className="font-medium text-foreground">ອີເມລ</span>
              <input className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@clan.la" />
            </label>
          </div>
          <label className="text-sm space-y-1 block">
            <span className="font-medium text-foreground">ຜົນສຳເລັດ <span className="text-muted-foreground text-xs">(ຄັ່ນດ້ວຍ ,)</span></span>
            <input className={inputCls} value={form.achievements} onChange={(e) => set("achievements", e.target.value)} placeholder="ສ້າງກອງທຶນ, ຈັດງານ..." />
          </label>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border bg-background text-foreground font-semibold text-sm hover:bg-muted transition-colors">
              ຍົກເລີກ
            </button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
              ບັນທຶກ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────


function LeadershipPage() {
  const navigate = useNavigate();
  const perms = usePermissions();
  const canCreateLeader = perms.canCreate("leadership");
  const canEditLeader = perms.canEdit("leadership");
  const canDeleteLeader = perms.canDelete("leadership");
  const viewMember = (id?: number) => {
    if (id) navigate({ to: "/members", search: { member: id } });
  };
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"grid">("grid");
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null);

  // Single source of truth: the leadership table in the database (realtime).
  const rows = useLeaders();
  const leaders = useMemo<Leader[]>(
    () =>
      rows.map((r: any) => ({
        ...r,
        lineage: r.lineage ?? r.branch ?? "",
        image: r.photo ?? r.image ?? "",
        status: r.status ?? "active",
        department: r.department ?? "",
        bio: r.bio ?? "",
        achievements: Array.isArray(r.achievements) ? r.achievements : [],
        initials: r.initials || deriveInitials(r.name || ""),
        color: r.color || PALETTE[Number(r.id) % PALETTE.length],
      })),
    [rows],
  );

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Leader | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const addLeader = (l: any) => { void addLeaderStore(l); };
  const [deletingLeader, setDeletingLeader] = useState<Leader | null>(null);
  const requestRemoveLeader = (l: Leader) => setDeletingLeader(l);
  const confirmRemoveLeader = async () => {
    const l = deletingLeader;
    if (!l) return;
    setSelectedLeader(null);
    setDeletingLeader(null);
    const ok = await deleteLeaderStore(l.id);
    if (ok) toast.success("ລຶບຄະນະນຳສຳເລັດ");
  };

  const filtered = leaders.filter((l) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      (l.name || "").toLowerCase().includes(q) ||
      (l.position || "").toLowerCase().includes(q) ||
      (l.department || "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    const matchActive = showInactive || l.active !== false;
    return matchSearch && matchStatus && matchActive;
  });

  const tabs = [
    { key: "grid", label: "ລາຍການ", Icon: Users },
  ] as const;

  const quickActions = [
    { Icon: UserPlus, label: "ເພີ່ມຜູ້ນຳ" },
    { Icon: Megaphone, label: "ສ້າງປະກາດ" },
    { Icon: Calendar, label: "ຈັດກອງປະຊຸມ" },
    { Icon: FolderOpen, label: "ຈັດການເອກະສານ" },
    { Icon: Printer, label: "ພິມລາຍງານ" },
    { Icon: Upload, label: "Export ລາຍຊື່" },
  ];

  return (
    <>
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>

      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
        {/* Back button */}
        <BackToHomeButton />


        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">ຄະນະນຳ</h1>
            <p className="text-sm text-muted-foreground mt-1">ຂໍ້ມູນຄະນະນຳ ແລະ ຜູ້ບໍລິຫານຕະກູນ</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canCreateLeader && (
              <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors">
                <UserPlus className="w-4 h-4" /> ເພີ່ມຄະນະນຳ
              </button>
            )}
            {canCreateLeader && (
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-semibold hover:bg-muted transition-colors">
                <Upload className="w-4 h-4" /> Export
              </button>
            )}
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-semibold hover:bg-muted transition-colors">
              <Printer className="w-4 h-4" /> ພິມ
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {computeLeadershipStats(leaders).map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* Search & Filter */}
        <div className="rounded-xl border bg-card shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ຄົ້ນຫາຊື່, ຕຳແໜ່ງ, ພາກສ່ວນ..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "active", "advisor", "former"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  filterStatus === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {s === "all" ? "ທັງໝົດ" : s === "active" ? "ດຳລົງຕຳແໜ່ງ" : s === "advisor" ? "ທີ່ປຶກສາ" : "ອະດີດ"}
              </button>
            ))}
            {canEditLeader && (
              <button
                onClick={() => setShowInactive((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  showInactive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                ລວມທີ່ເຊື່ອງໄວ້
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === key
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Tab: Grid — ranked by leadership priority (position hierarchy, then advisors, then former) */}
        {activeTab === "grid" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ພົບ <strong className="text-foreground">{filtered.length}</strong> ລາຍການ
            </p>
            {filtered.length === 0 ? (
              <div className="rounded-xl border bg-card shadow-sm p-16 text-center text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>ບໍ່ພົບຜົນການຄົ້ນຫາ</p>
              </div>
            ) : (
              (() => {
                const ranked = [...filtered].sort((a, b) => rankLeader(a) - rankLeader(b));
                const [hero, ...rest] = ranked;
                return (
                  <div className="space-y-6">
                    <LeaderHeroCard leader={hero} onClick={() => setSelectedLeader(hero)} onViewMember={viewMember} />
                    <div className="space-y-3">
                      {rest.map((leader, idx) => {
                        const prevStatus = idx === 0 ? hero.status : rest[idx - 1].status;
                        const showDivider = leader.status !== prevStatus;
                        const meta = LEADER_SECTION_META[leader.status];
                        return (
                          <div key={leader.id}>
                            {showDivider && (
                              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 mt-2">
                                <meta.Icon className="w-3.5 h-3.5 text-primary" /> {meta.label}
                              </div>
                            )}
                            <LeaderRankRow
                              leader={leader}
                              rank={idx + 2}
                              onClick={() => setSelectedLeader(leader)}
                              onViewMember={viewMember}
                              onEdit={canEditLeader ? (l) => setEditing(l) : undefined}
                              onDelete={canDeleteLeader ? (l) => requestRemoveLeader(l) : undefined}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}


        {/* Quick Actions — hidden for visitors (view-only role) */}
        {perms.canShowQuickActions() && (
          <div className="quick-actions rounded-xl border bg-card shadow-sm p-5">
            <h2 className="text-sm font-bold text-foreground mb-4">ການດຳເນີນການດ່ວນ</h2>
            <div className="flex gap-2 flex-wrap">
              {quickActions
                .filter(({ label }) => {
                  if (label === "ເພີ່ມຜູ້ນຳ") return canCreateLeader;
                  if (label === "Export ລາຍຊື່") return canCreateLeader;
                  return true;
                })
                .map(({ Icon, label }) => (
                  <button
                    key={label}
                    onClick={() => {
                      if (label === "ເພີ່ມຜູ້ນຳ") setShowAdd(true);
                      else toast.info(label);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background text-muted-foreground text-xs font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedLeader && (
        <DetailPanel
          leader={selectedLeader}
          onClose={() => setSelectedLeader(null)}
          onViewMember={viewMember}
          onEdit={canEditLeader ? () => { setEditing(selectedLeader); setSelectedLeader(null); } : undefined}
        />
      )}

      {/* Add Modal — guarded */}
      {showAdd && canCreateLeader && <AddLeaderModal onClose={() => setShowAdd(false)} onAdd={addLeader} />}

      {/* Edit Modal */}
      {editing && (
        <EditLeaderModal
          leader={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            const id = editing.id;
            setEditing(null);
            const ok = await updateLeaderStore(id, patch);
            if (ok) toast.success("ບັນທຶກການແກ້ໄຂສຳເລັດ");
          }}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deletingLeader}
        onOpenChange={(v) => { if (!v) setDeletingLeader(null); }}
        title="ຢືນຢັນລຶບຄະນະນຳ"
        description={deletingLeader ? `ຕ້ອງການລຶບ "${deletingLeader.name}" ອອກຈາກລາຍຊື່ຄະນະນຳແທ້ບໍ?` : ""}
        confirmLabel="ລຶບ"
        destructive
        onConfirm={confirmRemoveLeader}
      />
    </>
  );
}

// ── Edit Leader Modal ────────────────────────────────────────────────────────
function EditLeaderModal({ leader, onClose, onSave }: { leader: Leader; onClose: () => void; onSave: (patch: Partial<Leader>) => void }) {
  const [form, setForm] = useState<any>({
    name: leader.name ?? "",
    position: leader.position ?? "",
    department: leader.department ?? "",
    status: leader.status,
    phone: leader.phone ?? "",
    email: leader.email ?? "",
    startYear: leader.startYear ?? "",
    endYear: leader.endYear ?? "",
    achievements: (leader.achievements ?? []).join("\n"),
    photo: (leader as any).photo ?? "",
    displayOrder: (leader as any).displayOrder ?? 0,
    active: (leader as any).active !== false,
  });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const onPhoto = async (file?: File | null) => {
    if (!file) return;
    try { set("photo", await fileToDataUrl(file)); } catch { toast.error("ອັບໂຫຼດຮູບບໍ່ສຳເລັດ"); }
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: form.name.trim() || leader.name,
      position: form.position.trim(),
      department: form.department.trim(),
      status: form.status,
      phone: form.phone.trim(),
      email: form.email.trim(),
      photo: form.photo || null,
      displayOrder: Number(form.displayOrder) || 0,
      active: !!form.active,
      startYear: form.startYear,
      endYear: form.endYear || undefined,
      achievements: form.achievements.split("\n").map((s: string) => s.trim()).filter(Boolean),
    } as any);
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2"><Pencil className="w-5 h-5 text-primary" /><h2 className="font-bold text-foreground">ແກ້ໄຂ: {leader.name}</h2></div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
              {form.photo ? <img src={form.photo} alt={form.name} className="h-full w-full object-cover" /> : deriveInitials(form.name || leader.name)}
            </div>
            <div className="space-y-1">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                <Upload className="h-3.5 w-3.5" /> ອັບໂຫຼດຮູບ
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { onPhoto(e.target.files?.[0]); e.currentTarget.value = ""; }} />
              </label>
              {form.photo && (
                <button type="button" onClick={() => set("photo", "")} className="ml-2 text-xs text-rose-600 hover:underline">ລຶບຮູບ</button>
              )}
            </div>
          </div>
          <label className="block text-sm space-y-1"><span className="font-medium">ຊື່-ນາມສະກຸນ</span><input value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></label>
          <label className="block text-sm space-y-1"><span className="font-medium">ຕຳແໜ່ງ</span><CreatableCombobox value={form.position} onChange={(v) => set("position", v)} options={LEADER_POSITIONS} placeholder="ເລືອກ ຫຼື ພິມຕຳແໜ່ງ..." className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm space-y-1"><span className="font-medium">ລຳດັບການສະແດງ</span><input type="number" value={form.displayOrder} onChange={(e) => set("displayOrder", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></label>
            <label className="flex items-center gap-2 pt-6 text-sm">
              <input type="checkbox" checked={!!form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4" />
              <span className="font-medium">ເຜີຍແຜ່ (Active)</span>
            </label>
          </div>
          <label className="block text-sm space-y-1"><span className="font-medium">ພາກສ່ວນ</span><input value={form.department} onChange={(e) => set("department", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></label>
          <label className="block text-sm space-y-1"><span className="font-medium">ສະຖານະ</span>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
              <option value="active">ດຳລົງຕຳແໜ່ງ</option>
              <option value="advisor">ທີ່ປຶກສາ</option>
              <option value="former">ອະດີດ</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm space-y-1"><span className="font-medium">ປີເລີ່ມ</span><input value={form.startYear} onChange={(e) => set("startYear", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></label>
            <label className="block text-sm space-y-1"><span className="font-medium">ປີສິ້ນສຸດ</span><input value={form.endYear} onChange={(e) => set("endYear", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder="ປະຈຸບັນ" /></label>
          </div>
          <label className="block text-sm space-y-1"><span className="font-medium">ໂທລະສັບ</span><input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></label>
          <label className="block text-sm space-y-1"><span className="font-medium">ອີເມລ</span><input value={form.email} onChange={(e) => set("email", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></label>
          <label className="block text-sm space-y-1"><span className="font-medium">ຜົນສຳເລັດ (ບັນທັດລະຂໍ້)</span><textarea value={form.achievements} onChange={(e) => set("achievements", e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></label>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted">ຍົກເລີກ</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">ບັນທຶກ</button>
          </div>
        </form>
      </div>
    </div>
  );
}
