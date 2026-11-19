// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BackToHomeButton } from "@/components/enterprise/back-to-home-button";

export const Route = createFileRoute("/elders")({
  head: () => ({
    meta: [
      { title: "ຜູ້ອາວຸໂສ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ຜູ້ອາວຸໂສ — ລະບົບຄຸ້ມຄອງຂໍ້ມູນຕະກູນ" },
      { property: "og:title", content: "ຜູ້ອາວຸໂສ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { property: "og:description", content: "ຜູ້ອາວຸໂສ — ລະບົບຄຸ້ມຄອງຂໍ້ມູນຕະກູນ" },
    ],
  }),
  component: EldersPage,
});

import { useState, useEffect, useMemo } from "react";
import {
  useElders,
  addElder as addElderStore,
  updateElder as updateElderStore,
  deleteElder as deleteElderStore,
} from "@/lib/elders-store";
import {
  Users,
  Cake,
  TreePine,
  Medal,
  HeartPulse,
  Flame,
  Search,
  X,
  Phone,
  MapPin,
  Home,
  Baby,
  UsersRound,
  CheckCircle2,
  UserPlus,
  FileText,
  Image,
  FolderOpen,
  Printer,
  Upload,
  Sparkles,
  Scale,
  Leaf,
  Music,
  Building2,
  Landmark,
  Lightbulb,
  Star,
  Crown,
  Sprout,
  CandlestickChart,
  Pencil,
  Trash2,
  Save,
  ChevronRight,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { MEMBERS, useMembers } from "@/lib/members-data";
import { SearchableMemberSelect, ELDER_POSITIONS } from "@/components/searchable-member-select";
import { CreatableCombobox } from "@/components/creatable-combobox";
import { formatAddress } from "@/lib/utils";
import { useMediaLightbox } from "@/components/media-lightbox";

const ELDER_PALETTE = [
  { color: "#1b4332", accentColor: "#2d6a4f" },
  { color: "#40916c", accentColor: "#52b788" },
  { color: "#52b788", accentColor: "#74c69d" },
  { color: "#2d6a4f", accentColor: "#40916c" },
];

function deriveInitials(name: string): string {
  const cleaned = name.replace(/^(ທ່ານ\s+ນາງ|ທ່ານ|ນາງ|ທ້າວ)\s+/g, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const pick = words.slice(0, 2).map((w) => w[0]).join("");
  return pick || name.slice(0, 2);
}

// ─── Derive elders from MEMBERS (gen 1–3 = ancestors / elders) ────────────────

const GEN_LABEL: Record<number, string> = {
  1: "ລຸ້ນທີ 1 (Phaj 1)",
  2: "ລຸ້ນທີ 2 (Phaj 2)",
  3: "ລຸ້ນທີ 3 (Phaj 3)",
};

// Priority/seniority rank for the list view: earlier generation first, and
// within the same generation the elder born earliest (most senior) first.
// Lower = higher rank (more senior).
function rankElder(e: { generation: string; birthYear: number }): number {
  const m = /(\d+)/.exec(e.generation);
  const gen = m ? parseInt(m[1], 10) : 99;
  return gen * 10000 + (e.birthYear || 9999);
}

function buildEldersFromMembers(membersList: any[] = MEMBERS): any[] {
  const elderMembers = membersList.filter((m: any) => m.gen <= 3);
  return elderMembers.map((m: any, idx: number) => {
    const pal = ELDER_PALETTE[idx % ELDER_PALETTE.length];
    const childIds: number[] = m.children || [];
    const grandIds = childIds.flatMap((cid: number) => {
      const c = membersList.find((x: any) => x.id === cid);
      return c?.children || [];
    });
    const isDeceased = m.status === "deceased";
    // Real age from the database: prefer birthdate, fall back to the age column.
    // Never guess from generation.
    const nowYear = new Date().getFullYear();
    const bdYear = m.birthdate ? parseInt(String(m.birthdate).slice(0, 4), 10) : NaN;
    const realAge =
      Number.isFinite(bdYear) && bdYear > 1800 && bdYear <= nowYear
        ? nowYear - bdYear
        : typeof m.age === "number" && m.age > 0
          ? m.age
          : undefined;
    const birthYear = realAge ? nowYear - realAge : 0;
    const deathYear = undefined;
    return {
      id: m.id,
      memberId: m.id,
      name: m.name,
      age: isDeceased ? undefined : realAge,
      birthYear,
      deathYear,
      generation: GEN_LABEL[m.gen] || `ລຸ້ນທີ ${m.gen}`,
      lineage: m.branch,
      gender: m.gender === "F" ? "female" : "male",
      status: isDeceased ? "deceased" : (m.gen === 3 ? "advisor" : "living"),
      role: m.role || "ຜູ້ອາວຸໂສ",
      village: m.village || "-",
      province: m.province || "-",
      phone: m.phone && m.phone !== "-" ? m.phone : undefined,
      bio: m.note || `${m.role} ໃນ ${m.branch}. ມີລູກ ${childIds.length} ຄົນ ແລະ ຫຼານ ${grandIds.length} ຄົນ.`,
      contributions: [
        `ມີລູກ ${childIds.length} ຄົນ`,
        `ມີຫຼານ ${grandIds.length} ຄົນ`,
        `ສືບທອດ ${m.branch}`,
      ],
      honors: m.gen === 1 ? ["Phaj 1", "ຜູ້ກໍ່ຕັ້ງສາຍຕະກູນ"] : m.gen === 2 ? ["Phaj 2"] : ["ຜູ້ອາວຸໂສ"],
      initials: deriveInitials(m.name),
      color: pal.color,
      accentColor: pal.accentColor,
      children: childIds.length,
      grandchildren: grandIds.length,
    };
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Elder {
  id: number;
  memberId?: number;
  name: string;
  age?: number;
  birthYear: number;
  deathYear?: number;
  generation: string;
  lineage: string;
  gender: "male" | "female";
  status: "living" | "deceased" | "advisor";
  role: string;
  village: string;
  province: string;
  phone?: string;
  bio: string;
  contributions: string[];
  honors: string[];
  initials: string;
  color: string;
  accentColor: string;
  children: number;
  grandchildren: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

// initialElders is computed reactively inside EldersPage via useMembers().

function computeElderStats(eldersArr: Elder[]) {
  const total = eldersArr.length;
  const living = eldersArr.filter((e) => e.status === "living").length;
  const advisors = eldersArr.filter((e) => e.status === "advisor").length;
  const deceased = eldersArr.filter((e) => e.status === "deceased").length;
  const males = eldersArr.filter((e) => e.gender === "male").length;
  const females = eldersArr.filter((e) => e.gender === "female").length;
  const ages = eldersArr.filter((e) => typeof e.age === "number").map((e) => e.age as number);
  const oldest = ages.length ? Math.max(...ages) : 0;
  return [
    { label: "ຜູ້ອາວຸໂສທັງໝົດ", value: String(total), Icon: Users, desc: "ທຸກລຸ້ນ" },
    { label: "ອາຍຸສູງສຸດ", value: oldest ? String(oldest) : "—", Icon: Cake, desc: "ປີ" },
    { label: "ຜູ້ຊາຍ", value: String(males), Icon: TreePine, desc: "ເພດຊາຍ" },
    { label: "ຜູ້ຍິງ", value: String(females), Icon: Medal, desc: "ເພດຍິງ" },
    { label: "ຍັງມີຊີວິດ", value: String(living + advisors), Icon: HeartPulse, desc: `ທີ່ປຶກສາ ${advisors} ຄົນ` },
    { label: "ລ່ວງລັບ", value: String(deceased), Icon: Flame, desc: "ອະນຸສອນ" },
  ];
}

function computeCulturalRoles(eldersArr: Elder[]) {
  const total = eldersArr.length;
  const living = eldersArr.filter((e) => e.status !== "deceased").length;
  const advisors = eldersArr.filter((e) => e.status === "advisor").length;
  const male = eldersArr.filter((e) => e.gender === "male").length;
  const female = eldersArr.filter((e) => e.gender === "female").length;
  return [
    { Icon: Sparkles, title: "ຜູ້ໃຫ້ພອນ", desc: "ດຳເນີນພິທີໃຫ້ພອນໃນງານສຳຄັນຕ່າງໆ ຂອງຕະກູນ", count: Math.max(0, Math.round(living * 0.25)) },
    { Icon: Scale, title: "ຜູ້ໄກ່ເກ່ຍ", desc: "ແກ້ໄຂຂໍ້ຂັດແຍ່ງ ແລະ ສ້າງຄວາມສາມັກຄີໃນຕະກູນ", count: Math.max(0, advisors) },
    { Icon: Award, title: "ຜູ້ສືບທອດ", desc: "ຮັກສາ ແລະ ຖ່າຍທອດປະເພນີ ແລະ ຄ່ານິຍົມ", count: total },
    { Icon: Leaf, title: "ຜູ້ຮູ້ສະໝຸນໄພ", desc: "ມີຄວາມຮູ້ດ້ານຢາສະໝຸນໄພ ແລະ ການດູແລສຸຂະພາບ", count: female },
    { Icon: Music, title: "ຜູ້ຮູ້ດົນຕີ", desc: "ຮັກສາ ແລະ ສອນດົນຕີ ແລະ ເພງຂອງຕະກູນ", count: Math.max(0, Math.round(male * 0.4)) },
    { Icon: Lightbulb, title: "ທີ່ປຶກສາ", desc: "ໃຫ້ຄຳປຶກສາ ແລະ ແນະນຳໃນການຕັດສິນໃຈສຳຄັນ", count: Math.max(advisors, Math.round(total * 0.5)) },
  ];
}

const quickActions = [
  { Icon: UserPlus, label: "ເພີ່ມຜູ້ອາວຸໂສ" },
  
  { Icon: Image, label: "ອັບໂຫຼດຮູບອະດີດ" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, Icon, desc }: { label: string; value: string; Icon: any; desc: string }) {
  return (
    <div className="rounded-xl border bg-card shadow-sm p-5 flex items-center gap-4 hover:-translate-y-1 transition-transform cursor-default">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold text-foreground leading-tight">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5 truncate">{label}</div>
        <div className="text-xs text-muted-foreground/60 mt-0.5">{desc}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Elder["status"] }) {
  if (status === "deceased")
    return <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">ລ່ວງລັບ</span>;
  if (status === "advisor")
    return <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700">ທີ່ປຶກສາ</span>;
  return <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">ຍັງມີຊີວິດ</span>;
}

function ElderCard({ elder, onClick, onViewMember, onEdit, onDelete }: { elder: Elder; onClick: () => void; onViewMember: (id?: number) => void; onEdit?: (e: Elder) => void; onDelete?: (e: Elder) => void }) {
  const isDeceased = elder.status === "deceased";

  return (
    <div
      onClick={onClick}
      className={[
        "rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col cursor-pointer relative",
        "hover:-translate-y-1 hover:shadow-md transition-all duration-200",
        isDeceased ? "opacity-85" : "",
      ].join(" ")}
    >
      <div className="absolute top-3 right-3 z-10 flex gap-1">
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(elder); }}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors bg-card/60 backdrop-blur"
            aria-label="ແກ້ໄຂ"
            title="ແກ້ໄຂ"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(elder); }}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors bg-card/60 backdrop-blur"
            aria-label="ລຶບ"
            title="ລຶບຜູ້ອາວຸໂສ"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {/* Top accent strip */}
      <div className={isDeceased ? "h-1 bg-slate-300" : "h-1 bg-primary"} />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Avatar row */}
        <div className="flex items-start justify-between">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
              {elder.initials}
            </div>
            {isDeceased && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-100 border border-border flex items-center justify-center">
                <Flame className="w-3 h-3 text-slate-500" />
              </div>
            )}
          </div>
          <StatusBadge status={elder.status} />
        </div>

        {/* Name */}
        <div>
          <div className={`font-bold text-sm leading-snug ${isDeceased ? "text-muted-foreground" : "text-foreground"}`}>
            {elder.name}
          </div>
          <div className="text-xs text-primary font-semibold mt-1">
            {isDeceased
              ? elder.birthYear
                ? `ເກີດ ${elder.birthYear}`
                : "ລ່ວງລັບແລ້ວ"
              : elder.age
                ? `ອາຍຸ ${elder.age} ປີ (ເກີດ ${elder.birthYear})`
                : "ອາຍຸ —"}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {[elder.generation, elder.lineage, elder.province].map(tag => (
            <span key={tag} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>

        {/* Role */}
        <div className="text-xs font-semibold text-foreground">{elder.role}</div>


        {/* Family stats */}
        <div className="flex gap-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Baby className="w-3.5 h-3.5" /> {elder.children} ລູກ
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <UsersRound className="w-3.5 h-3.5" /> {elder.grandchildren} ຫຼານ
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-1">
          <button onClick={onClick} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
            ເບິ່ງຂໍ້ມູນ
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onViewMember(elder.memberId); }}
            disabled={!elder.memberId}
            className="flex-1 py-2 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ສາຍຕະກູນ
          </button>
        </div>
      </div>
    </div>
  );
}

// Ranked list row — used in priority/seniority order (most senior first).
// `rank === 1` (the clan's most senior living or founding ancestor) gets a
// gold highlight to mark them out, mirroring the reference design.
function ElderRankRow({ elder, rank, onClick, onViewMember, onEdit, onDelete }: { elder: Elder; rank: number; onClick: () => void; onViewMember: (id?: number) => void; onEdit?: (e: Elder) => void; onDelete?: (e: Elder) => void }) {
  const isDeceased = elder.status === "deceased";
  const isTopRank = rank === 1;
  return (
    <div
      onClick={onClick}
      className={[
        "rounded-xl border bg-card shadow-sm p-4 cursor-pointer transition-all duration-200 hover:shadow-md",
        isTopRank ? "border-2 border-amber-400" : "border-border",
        isDeceased ? "opacity-85" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
          {rank}
        </div>
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
            {elder.initials}
          </div>
          {isDeceased && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-100 border border-border flex items-center justify-center">
              <Flame className="w-3 h-3 text-slate-500" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className={`font-bold text-sm leading-snug ${isDeceased ? "text-muted-foreground" : "text-foreground"}`}>{elder.name}</div>
              <div className="text-sm text-primary font-semibold mt-0.5">{elder.role}</div>
            </div>
            <StatusBadge status={elder.status} />
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {isDeceased
              ? elder.birthYear
                ? `ເກີດ ${elder.birthYear}`
                : "ລ່ວງລັບແລ້ວ"
              : elder.age
                ? `ອາຍຸ ${elder.age} ປີ`
                : "ອາຍຸ —"} · {elder.generation}
          </div>
        </div>
      </div>


      <div className="flex items-center justify-between mt-3 gap-3">
        <div className="flex gap-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Baby className="w-3.5 h-3.5" /> {elder.children} ລູກ
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <UsersRound className="w-3.5 h-3.5" /> {elder.grandchildren} ຫຼານ
          </div>
        </div>
        <div className="flex gap-1.5">
          {onEdit && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(elder); }} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="ແກ້ໄຂ">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onViewMember(elder.memberId); }}
            disabled={!elder.memberId}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ສາຍຕະກູນ
          </button>
          {onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(elder); }} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors" title="ລຶບ">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-xs font-bold text-primary uppercase tracking-widest mb-3">{title}</div>
      {children}
    </div>
  );
}

function DetailPanel({ elder, onClose, onViewMember, onEdit, onViewPhotos, hasPhotos }: { elder: Elder; onClose: () => void; onViewMember: (id?: number) => void; onEdit: () => void; onViewPhotos: () => void; hasPhotos: boolean }) {
  const isDeceased = elder.status === "deceased";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-end"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md h-screen overflow-y-auto bg-background shadow-2xl animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className={`p-8 relative ${isDeceased ? "bg-slate-500" : "bg-primary"}`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold text-white">
              {elder.initials}
            </div>
            {isDeceased && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center">
                <Flame className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          <div className="text-xl font-bold text-white mb-1">{elder.name}</div>
          <div className="text-sm text-white/80 mb-4">
            {isDeceased ? (elder.birthYear ? `ເກີດ ${elder.birthYear}` : "ລ່ວງລັບແລ້ວ") : elder.age ? `ອາຍຸ ${elder.age} ປີ` : "ອາຍຸ —"} · {elder.role}
          </div>

          <div className="flex flex-wrap gap-2">
            {[elder.generation, elder.lineage, elder.province].map(tag => (
              <span key={tag} className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        </div>

        <div className="p-6">


          <Section title="ການປະກອບສ່ວນ">
            {elder.contributions.map((c, i) => (
              <div key={i} className="flex gap-2 items-start mb-2">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">{c}</span>
              </div>
            ))}
          </Section>

          <Section title="ກຽດຕິຍົດ ແລະ ຕຳແໜ່ງ">
            <div className="flex flex-wrap gap-2">
              {elder.honors.map((h, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
                  <Award className="w-3 h-3" />{h}
                </span>
              ))}
            </div>
          </Section>

          <Section title="ຄອບຄົວ">
            {(() => {
              const linkedMember = (MEMBERS as any[]).find((m) => m.id === (elder as any).memberId);
              const memberAddress =
                linkedMember?.address
                || formatAddress({
                  village: linkedMember?.village ?? elder.village,
                  district: linkedMember?.district ?? (elder as any).district,
                  province: linkedMember?.province ?? elder.province,
                })
                || "-";
              return (
                <>
                  <div className="bg-muted rounded-xl p-3 mb-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mb-1.5" />
                    <div className="text-xs text-muted-foreground mb-0.5">ທີ່ຢູ່ (ຈາກຂໍ້ມູນສະມາຊິກ)</div>
                    <div className="text-sm font-semibold text-foreground">{memberAddress}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted rounded-xl p-3">
                      <Baby className="w-4 h-4 text-muted-foreground mb-1.5" />
                      <div className="text-xs text-muted-foreground mb-0.5">ລູກ</div>
                      <div className="text-sm font-semibold text-foreground">{elder.children} ຄົນ</div>
                    </div>
                    <div className="bg-muted rounded-xl p-3">
                      <UsersRound className="w-4 h-4 text-muted-foreground mb-1.5" />
                      <div className="text-xs text-muted-foreground mb-0.5">ຫຼານ</div>
                      <div className="text-sm font-semibold text-foreground">{elder.grandchildren} ຄົນ</div>
                    </div>
                  </div>
                </>
              );
            })()}
          </Section>

          {!isDeceased && elder.phone && (
            <Section title="ຂໍ້ມູນຕິດຕໍ່">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 text-primary" />
                {elder.phone}
              </div>
            </Section>
          )}

          {isDeceased && (
            <div className="bg-muted border border-border rounded-xl p-4 mb-6 text-center">
              <Flame className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <div className="text-sm text-muted-foreground leading-relaxed">
                ດ້ວຍຄວາມເຄົາລົບ ແລະ ລໍາລຶກ<br />
                {elder.birthYear ? <strong className="text-foreground">ເກີດ {elder.birthYear}</strong> : null}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={onEdit} className="py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-1.5">
              <Pencil className="w-4 h-4" /> ແກ້ໄຂຂໍ້ມູນ
            </button>
            <button
              onClick={() => onViewMember(elder.memberId)}
              disabled={!elder.memberId}
              className="py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ໂປຣໄຟລ໌ສະມາຊິກ
            </button>
          </div>
          {hasPhotos && (
            <button onClick={onViewPhotos} className="w-full mb-8 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors inline-flex items-center justify-center gap-1.5">
              <Image className="w-4 h-4" /> ດູຮູບອະດີດ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddElderModal({ onClose, onAdd }: { onClose: () => void; onAdd: (e: Elder) => void }) {
  const [memberId, setMemberId] = useState<number | null>(null);
  const member = memberId ? (MEMBERS as any[]).find((m) => m.id === memberId) : null;
  const [form, setForm] = useState({
    status: "living" as Elder["status"],
    role: "",
    bio: "",
    contributions: "",
    honors: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!member) {
      toast.error("ກະລຸນາເລືອກສະມາຊິກ");
      return;
    }
    if (!form.role.trim()) {
      toast.error("ກະລຸນາປ້ອນບົດບາດ");
      return;
    }
    const birthYear = member.birthdate
      ? new Date(member.birthdate).getFullYear()
      : (member.gen === 1 ? 1900 : member.gen === 2 ? 1925 : 1950);
    const childIds: number[] = member.children || [];
    const grandIds = childIds.flatMap((cid: number) => {
      const c = (MEMBERS as any[]).find((x) => x.id === cid);
      return c?.children || [];
    });
    const pal = ELDER_PALETTE[Math.floor(Math.random() * ELDER_PALETTE.length)];
    const elder: Elder = {
      id: Date.now(),
      memberId: member.id,
      name: member.name,
      age: form.status !== "deceased" && birthYear ? new Date().getFullYear() - birthYear : undefined,
      birthYear,
      deathYear: undefined,
      generation: GEN_LABEL[member.gen] || `ລຸ້ນທີ ${member.gen}`,
      lineage: member.branch,
      gender: member.gender === "F" ? "female" : "male",
      status: form.status,
      role: form.role.trim(),
      village: member.village || "-",
      district: member.district || "-",
      province: member.province || "-",
      address: member.address || formatAddress({ village: member.village, district: member.district, province: member.province }),
      phone: member.phone && member.phone !== "-" ? member.phone : undefined,
      bio: form.bio.trim(),
      contributions: form.contributions.split(",").map((c) => c.trim()).filter(Boolean),
      honors: form.honors.split(",").map((h) => h.trim()).filter(Boolean),
      initials: deriveInitials(member.name),
      color: pal.color,
      accentColor: pal.accentColor,
      children: childIds.length,
      grandchildren: grandIds.length,
    };
    onAdd(elder);
    toast.success("ເພີ່ມຜູ້ອາວຸໂສສຳເລັດ");
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
            <h2 className="font-bold text-foreground">ເພີ່ມຜູ້ອາວຸໂສ</h2>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-sm space-y-1">
                  <span className="text-xs text-muted-foreground">ເພດ</span>
                  <input className={inputCls} value={member.gender === "F" ? "ຍິງ" : "ຊາຍ"} readOnly disabled />
                </label>
                <label className="text-sm space-y-1">
                  <span className="text-xs text-muted-foreground">ວັນເກີດ</span>
                  <input className={inputCls} value={member.birthdate || "-"} readOnly disabled />
                </label>
                <label className="text-sm space-y-1">
                  <span className="text-xs text-muted-foreground">ລຸ້ນ</span>
                  <input className={inputCls} value={`ລຸ້ນ ${member.gen}`} readOnly disabled />
                </label>
                <label className="text-sm space-y-1">
                  <span className="text-xs text-muted-foreground">ເບີໂທ</span>
                  <input className={inputCls} value={member.phone || "-"} readOnly disabled />
                </label>
                <label className="text-sm space-y-1 sm:col-span-2">
                  <span className="text-xs text-muted-foreground">ທີ່ຢູ່</span>
                  <input
                    className={inputCls}
                    value={member.address || formatAddress({ village: member.village, district: member.district, province: member.province }) || "-"}
                    readOnly disabled
                  />
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm space-y-1 sm:col-span-2">
              <span className="font-medium text-foreground">ບົດບາດ <span className="text-destructive">*</span></span>
              <CreatableCombobox
                className={inputCls}
                value={form.role}
                onChange={(v) => set("role", v)}
                options={ELDER_POSITIONS}
                placeholder="ເລືອກ ຫຼື ພິມບົດບາດ..."
              />
            </label>
            <label className="text-sm space-y-1 sm:col-span-2">
              <span className="font-medium text-foreground">ສະຖານະ</span>
              <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="living">ຍັງມີຊີວິດ</option>
                <option value="advisor">ທີ່ປຶກສາ</option>
                <option value="deceased">ລ່ວງລັບ</option>
              </select>
            </label>
          </div>
          <label className="text-sm space-y-1 block">
            <span className="font-medium text-foreground">ການປະກອບສ່ວນ <span className="text-muted-foreground text-xs">(ຄັ່ນດ້ວຍ ,)</span></span>
            <input className={inputCls} value={form.contributions} onChange={(e) => set("contributions", e.target.value)} />
          </label>
          <label className="text-sm space-y-1 block">
            <span className="font-medium text-foreground">ກຽດຕິຍົດ <span className="text-muted-foreground text-xs">(ຄັ່ນດ້ວຍ ,)</span></span>
            <input className={inputCls} value={form.honors} onChange={(e) => set("honors", e.target.value)} />
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


function EldersPage() {
  const navigate = useNavigate();
  const viewMember = (id?: number) => {
    if (id) navigate({ to: "/members", search: { member: id } });
  };
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState<"grid" | "cultural">("grid");
  const [selectedElder, setSelectedElder] = useState<Elder | null>(null);
  const members = useMembers();
  // Single source of truth: the elders table in the database (realtime).
  const elderRows = useElders();
  const elders = useMemo<Elder[]>(
    () =>
      elderRows.map((r: any) => ({
        ...r,
        lineage: r.lineage ?? r.branch ?? "",
        generation: r.generation ?? "",
        province: r.province ?? "",
        status: r.status ?? "alive",
        image: r.photo ?? r.image ?? "",
      })),
    [elderRows],
  );
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Elder | null>(null);
  const [photosByElder, setPhotosByElder] = useState<Record<number, { id: string; url: string; name: string; caption?: string }[]>>({});
  const [photoModal, setPhotoModal] = useState<{ mode: "upload" | "view"; elder: Elder | null } | null>(null);

  const addElder = (e: any) => { void addElderStore(e); };
  const removeElder = async (e: Elder) => {
    if (typeof window !== "undefined" && !window.confirm(`ຢືນຢັນລຶບ "${e.name}" ?`)) return;
    setSelectedElder(null);
    const ok = await deleteElderStore(e.id);
    if (ok) toast.success("ລຶບຜູ້ອາວຸໂສສຳເລັດ");
  };

  const filtered = elders.filter((e) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      (e.name || "").toLowerCase().includes(q) ||
      (e.generation || "").toLowerCase().includes(q) ||
      (e.lineage || "").toLowerCase().includes(q) ||
      (e.province || "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    return matchSearch && matchStatus && (e as any).active !== false;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">

        {/* Back button */}
        <BackToHomeButton />


        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">ຜູ້ອາວຸໂສ</h1>
            <p className="text-sm text-muted-foreground mt-1">ຜູ້ໃຫຍ່ ແລະ ຜູ້ມີບົດບາດສຳຄັນໃນຕະກູນ</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
              <UserPlus className="w-4 h-4" /> ເພີ່ມຜູ້ອາວຸໂສ
            </button>
            {["Export", "ພິມ", "Filter"].map(label => (
              <button key={label} className="px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-semibold hover:bg-muted transition-colors">
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {computeElderStats(elders).map(s => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Search & Filter */}
        <div className="rounded-xl border bg-card shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ຄົ້ນຫາຊື່, ລຸ້ນ, ສາຍຕະກູນ..."
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "ທັງໝົດ" },
              { key: "living", label: "ຍັງມີຊີວິດ", Icon: HeartPulse },
              { key: "advisor", label: "ທີ່ປຶກສາ", Icon: Medal },
              { key: "deceased", label: "ລ່ວງລັບ", Icon: Flame },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={[
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors",
                  filterStatus === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                ].join(" ")}
              >
                {f.Icon && <f.Icon className="w-3.5 h-3.5" />}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
          {[
            { key: "grid", label: "ລາຍການ", Icon: Users },
            
            { key: "cultural", label: "ບົດບາດວັດທະນາທຳ", Icon: Landmark },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={[
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <tab.Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab: Grid — ranked by seniority (earliest generation, then earliest birth year, first) */}
        {activeTab === "grid" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ພົບ <strong className="text-foreground">{filtered.length}</strong> ລາຍການ
            </p>
            {filtered.length === 0 ? (
              <div className="rounded-xl border bg-card shadow-sm py-16 text-center">
                <X className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">ບໍ່ພົບຜົນການຄົ້ນຫາ</p>
              </div>
            ) : (
              (() => {
                const ranked = [...filtered].sort((a, b) => rankElder(a) - rankElder(b));
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {ranked.map((elder, idx) => {
                      const prevGen = idx === 0 ? null : ranked[idx - 1].generation;
                      const showDivider = elder.generation !== prevGen;
                      return (
                        <div key={elder.id} className="contents">
                          {showDivider && (
                            <div className="col-span-full flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 mt-2">
                              <TreePine className="w-3.5 h-3.5 text-primary" /> {elder.generation}
                            </div>
                          )}
                          <ElderRankRow
                            elder={elder}
                            rank={idx + 1}
                            onClick={() => setSelectedElder(elder)}
                            onViewMember={viewMember}
                            onEdit={(e) => setEditing(e)}
                            onDelete={(e) => removeElder(e)}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* Tab: Cultural Roles */}
        {activeTab === "cultural" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {computeCulturalRoles(elders).map((role, idx) => (
              <div
                key={idx}
                className="rounded-xl border bg-card shadow-sm p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-default"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <role.Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-base font-bold text-foreground mb-2">{role.title}</div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{role.desc}</p>
                <span className="inline-block text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                  {role.count} ທ່ານ
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="quick-actions rounded-xl border bg-card shadow-sm p-5">
          <div className="text-sm font-bold text-foreground mb-4">ການດຳເນີນການດ່ວນ</div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => {
                  if (action.label === "ເພີ່ມຜູ້ອາວຸໂສ") setShowAdd(true);
                  
                  else if (action.label === "ອັບໂຫຼດຮູບອະດີດ") setPhotoModal({ mode: "upload", elder: null });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground text-xs font-semibold border border-border hover:bg-primary hover:text-primary-foreground transition-all duration-150"
              >
                <action.Icon className="w-3.5 h-3.5" />
                {action.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Detail Panel */}
      {selectedElder && (
        <DetailPanel
          elder={selectedElder}
          onClose={() => setSelectedElder(null)}
          onViewMember={viewMember}
          onEdit={() => { setEditing(selectedElder); setSelectedElder(null); }}
          onViewPhotos={() => setPhotoModal({ mode: "view", elder: selectedElder })}
          hasPhotos={(photosByElder[selectedElder.id]?.length ?? 0) > 0}
        />
      )}

      {/* Add Modal */}
      {showAdd && <AddElderModal onClose={() => setShowAdd(false)} onAdd={addElder} />}

      {/* Edit Modal */}
      {editing && (
        <EditElderModal
          elder={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            const id = editing.id;
            setEditing(null);
            const ok = await updateElderStore(id, patch);
            if (ok) toast.success("ບັນທຶກການແກ້ໄຂສຳເລັດ");
          }}
        />
      )}

      {/* Photo modal — upload or gallery view */}
      {photoModal && (
        <PhotoModal
          mode={photoModal.mode}
          elder={photoModal.elder}
          elders={elders}
          photos={photoModal.elder ? (photosByElder[photoModal.elder.id] ?? []) : []}
          onClose={() => setPhotoModal(null)}
          onUpload={(elderId, files) => {
            const next = files.map((f) => ({
              id: `P-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
              url: URL.createObjectURL(f),
              name: f.name,
            }));
            setPhotosByElder((prev) => ({ ...prev, [elderId]: [...(prev[elderId] ?? []), ...next] }));
            toast.success(`ອັບໂຫລດ ${next.length} ຮູບແລ້ວ`);
          }}
          onDelete={(elderId, photoId) => {
            setPhotosByElder((prev) => ({ ...prev, [elderId]: (prev[elderId] ?? []).filter((p) => p.id !== photoId) }));
          }}
        />
      )}
    </div>
  );
}

// ── Edit Elder Modal ─────────────────────────────────────────────────────────
function EditElderModal({ elder, onClose, onSave }: { elder: Elder; onClose: () => void; onSave: (patch: Partial<Elder>) => void }) {
  const [form, setForm] = useState<any>({
    status: elder.status,
    role: elder.role ?? "",
    bio: elder.bio ?? "",
    phone: elder.phone ?? "",
    contributions: (elder.contributions ?? []).join("\n"),
    honors: (elder.honors ?? []).join(", "),
  });
  const linkedMember = (MEMBERS as any[]).find((m) => m.id === (elder as any).memberId);
  const memberAddress =
    linkedMember?.address
    || formatAddress({
      village: linkedMember?.village ?? elder.village,
      district: linkedMember?.district ?? (elder as any).district,
      province: linkedMember?.province ?? elder.province,
    })
    || "-";
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      status: form.status,
      role: form.role.trim(),
      bio: form.bio.trim(),
      // Address mirrors the linked member record — do not override here.
      village: linkedMember?.village ?? elder.village,
      district: linkedMember?.district ?? (elder as any).district,
      province: linkedMember?.province ?? elder.province,
      address: memberAddress,
      phone: form.phone.trim(),
      contributions: form.contributions.split("\n").map((s: string) => s.trim()).filter(Boolean),
      honors: form.honors.split(",").map((s: string) => s.trim()).filter(Boolean),
    } as any);
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2"><Pencil className="w-5 h-5 text-primary" /><h2 className="font-bold text-foreground">ແກ້ໄຂຜູ້ອາວຸໂສ: {elder.name}</h2></div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <label className="block text-sm space-y-1">
            <span className="font-medium">ສະຖານະ</span>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
              <option value="living">ຍັງມີຊີວິດ</option>
              <option value="advisor">ທີ່ປຶກສາ</option>
              <option value="deceased">ລ່ວງລັບ</option>
            </select>
          </label>
          <label className="block text-sm space-y-1">
            <span className="font-medium">ບົດບາດ</span>
            <CreatableCombobox
              value={form.role}
              onChange={(v) => set("role", v)}
              options={ELDER_POSITIONS}
              placeholder="ເລືອກ ຫຼື ພິມບົດບາດ..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </label>
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
            <div className="text-xs text-muted-foreground mb-1">ທີ່ຢູ່ (ດຶງຈາກຂໍ້ມູນສະມາຊິກ)</div>
            <div className="font-medium text-foreground">{memberAddress}</div>
          </div>
          <label className="block text-sm space-y-1"><span className="font-medium">ເບີໂທ</span><input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></label>
          
          <label className="block text-sm space-y-1"><span className="font-medium">ການປະກອບສ່ວນ (ບັນທັດລະຂໍ້)</span><textarea value={form.contributions} onChange={(e) => set("contributions", e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></label>
          <label className="block text-sm space-y-1"><span className="font-medium">ກຽດຕິຍົດ (ຂັ້ນດ້ວຍ ,)</span><input value={form.honors} onChange={(e) => set("honors", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" /></label>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted">ຍົກເລີກ</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1.5"><Save className="w-4 h-4" />ບັນທຶກ</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Photo Modal — upload + gallery ───────────────────────────────────────────
function PhotoModal({ mode, elder, elders, photos, onClose, onUpload, onDelete }: any) {
  const [selectedElderId, setSelectedElderId] = useState<number | null>(elder?.id ?? null);
  const { open: openMedia } = useMediaLightbox();
  const fileRef = useState<HTMLInputElement | null>(null)[0]; // placeholder
  const handleFiles = (files: FileList | null) => {
    if (!selectedElderId) { toast.error("ກະລຸນາເລືອກຜູ້ອາວຸໂສກ່ອນ"); return; }
    if (!files?.length) return;
    const imgs = Array.from(files).filter((f) => f.type?.startsWith("image/"));
    if (!imgs.length) { toast.error("ກະລຸນາເລືອກໄຟລ໌ຮູບພາບ"); return; }
    onUpload(selectedElderId, imgs);
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">{mode === "upload" ? "ອັບໂຫລດຮູບອະດີດ" : `ຮູບອະດີດ — ${elder?.name ?? ""}`}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          {mode === "upload" && (
            <>
              <label className="block text-sm space-y-1">
                <span className="font-medium">ເລືອກຜູ້ອາວຸໂສ <span className="text-destructive">*</span></span>
                <select value={selectedElderId ?? ""} onChange={(e) => setSelectedElderId(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                  <option value="">— ເລືອກ —</option>
                  {elders.map((el: Elder) => <option key={el.id} value={el.id}>{el.name}</option>)}
                </select>
              </label>
              <label className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${selectedElderId ? "border-primary/30 hover:border-primary hover:bg-primary/5" : "border-border opacity-50"}`}>
                <input type="file" accept="image/*" multiple className="hidden" disabled={!selectedElderId} onChange={(e) => { handleFiles(e.target.files); e.currentTarget.value = ""; }} />
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">ກົດເພື່ອເລືອກຮູບ ຫຼື ລາກໄຟລ໌ມາວາງ</p>
                <p className="text-xs text-muted-foreground mt-1">ຮອງຮັບໄຟລ໌ຮູບພາບທຸກປະເພດ</p>
              </label>
              {selectedElderId && (photos?.length ?? 0) === 0 && (
                <p className="text-xs text-muted-foreground text-center">ຍັງບໍ່ມີຮູບ — ເລີ່ມຕົ້ນອັບໂຫລດໄດ້ເລີຍ</p>
              )}
            </>
          )}
          {(mode === "view" || (mode === "upload" && (photos?.length ?? 0) > 0)) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(photos ?? []).map((p: any) => (
                <div key={p.id} className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-square">
                  <img
                    src={p.url}
                    alt={p.name}
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() => openMedia({ type: "image", src: p.url, alt: p.name })}
                  />
                  <button onClick={() => onDelete(elder?.id ?? selectedElderId, p.id)} className="absolute top-1 right-1 w-7 h-7 rounded-md bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center" title="ລຶບ">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 text-[10px] text-white truncate">{p.name}</div>
                </div>
              ))}
            </div>
          )}
          {mode === "view" && (photos?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">ຍັງບໍ່ມີຮູບສຳລັບຜູ້ອາວຸໂສນີ້</p>
          )}
        </div>
      </div>
    </div>
  );
}
