// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { BackToHomeButton } from "@/components/enterprise/back-to-home-button";

export const Route = createFileRoute("/members")({
  validateSearch: (search: Record<string, unknown>) => ({
    member: search.member != null ? Number(search.member) : undefined,
    action: typeof search.action === "string" ? search.action : undefined,
    edit: search.edit != null ? Number(search.edit) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "ສະມາຊິກ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ສະມາຊິກ — ລະບົບຄຸ້ມຄອງຂໍ້ມູນຕະກູນ" },
      { property: "og:title", content: "ສະມາຊິກ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { property: "og:description", content: "ສະມາຊິກ — ລະບົບຄຸ້ມຄອງຂໍ້ມູນຕະກູນ" },
    ],
  }),
  component: MembersPage,
});

import { useState, useEffect } from "react";
import {
  Users, Plus, Upload, Download, Network, List, Search,
  Filter, ChevronRight, ChevronDown, X, Pencil, Phone,
  MapPin, Heart, Star, Share2, Printer, LayoutGrid, User,
  Calendar, Archive, GitBranch, UserCheck, UserX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  SearchableMemberSelect,
  LEADER_POSITIONS,
  ELDER_POSITIONS,
} from "@/components/searchable-member-select";
import { CreatableCombobox } from "@/components/creatable-combobox";
import { formatAddress, parseAddress, matchesSearchTokens } from "@/lib/utils";

// ── Shared Data ─────────────────────────────────────────────────────────────
import {
  MEMBERS,
  useMembers,
  addMember as storeAddMember,
  updateMember as storeUpdateMember,
  deleteMember as storeDeleteMember,
} from "@/lib/members-data";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

import { BRANCHES } from "@/lib/utils";

function buildMemberStats(list = MEMBERS) {
  const total = list.length;
  const alive = list.filter((m) => m.status === "alive").length;
  const deceased = total - alive;
  const males = list.filter((m) => m.gender === "M").length;
  const females = list.filter((m) => m.gender === "F").length;
  const families = new Set(list.map((m) => m.branch).filter(Boolean)).size;
  const generations = new Set(list.map((m) => m.gen)).size;
  return [
    { label: "ສະມາຊິກທັງໝົດ", value: total, hint: `${families} ກຸ່ມ`, Icon: Users },
    { label: "ຈຳນວນຄອບຄົວ", value: families, hint: `${generations} ລຸ້ນ`, Icon: Network },
    { label: "ຜູ້ຊາຍ", value: males, hint: "ຄົນ", Icon: User },
    { label: "ຜູ້ຍິງ", value: females, hint: "ຄົນ", Icon: User },
    { label: "ຜູ້ມີຊີວິດ", value: alive, hint: "ຄົນ", Icon: UserCheck },
    { label: "ຜູ້ເສຍຊີວິດ", value: deceased, hint: "ຄົນ", Icon: UserX },
  ];
}
// ── Helpers ──────────────────────────────────────────────────────────────────
const GEN_NAMES = {
  1: "ລຸ້ນທີ 1 (Phaj 1)",
  2: "ລຸ້ນທີ 2 (Phaj 2)",
  3: "ລຸ້ນທີ 3 (Phaj 3)",
  4: "ລຸ້ນທີ 4 (Phaj 4)",
  5: "ລຸ້ນທີ 5 (Phaj 5)",
  6: "ລຸ້ນທີ 6 (Phaj 6)",
};
const genLabel = (g) => GEN_NAMES[g] ?? `ລຸ້ນທີ ${g} (Phaj ${g})`;

const AVATAR_COLORS = [
  "bg-emerald-700","bg-emerald-600","bg-teal-700","bg-teal-600",
  "bg-green-700","bg-green-600","bg-cyan-700","bg-sky-700",
  "bg-slate-700","bg-gray-700",
];
const avatarColor = (id) => AVATAR_COLORS[id % AVATAR_COLORS.length];
const initials = (name) => name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase().slice(0, 2);

// ── Member Avatar ────────────────────────────────────────────────────────────
const MemberAvatar = ({ member, className = "h-10 w-10" }) => (
  <Avatar className={className}>
    <AvatarFallback className={`${avatarColor(member.id)} text-white font-bold text-xs`}>
      {initials(member.name)}
    </AvatarFallback>
  </Avatar>
);

// ── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) =>
  status === "alive" ? (
    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">ມີຊີວິດ</Badge>
  ) : (
    <Badge className="bg-muted text-muted-foreground hover:bg-muted text-[10px]">ເສຍຊີວິດ</Badge>
  );

// ── Lineage Path ──────────────────────────────────────────────────────────────
const shortName = (name) =>
  name.replace(/^(ທ້າວ|ນາງ|ທ່ານ)\s+/, "").split(" ").slice(0, 2).join(" ");

// ── Tree search helpers ───────────────────────────────────────────────────────
function collectAncestorIds(member, allMembers) {
  const ids = new Set();
  let current = member;
  while (current?.parent) {
    ids.add(current.parent);
    const next = allMembers.find((m) => m.id === current.parent);
    if (!next || ids.has(next.id)) break;
    current = next;
  }
  return ids;
}

function getTreeSearchSets(query, allMembers) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      matchedIds: new Set(),
      visibleIds: new Set(allMembers.map((m) => m.id)),
    };
  }
  const matchedIds = new Set();
  for (const m of allMembers) {
    if (
      matchesSearchTokens(
        q,
        m.name,
        m.nickname,
        m.village,
        m.position,
        m.role,
        `m${String(m.id).padStart(4, "0")}`,
        String(m.id),
      )
    ) {
      matchedIds.add(m.id);
    }
  }
  const visibleIds = new Set(matchedIds);
  for (const id of matchedIds) {
    const m = allMembers.find((x) => x.id === id);
    if (m) for (const aid of collectAncestorIds(m, allMembers)) visibleIds.add(aid);
  }
  return { matchedIds, visibleIds };
}


const LineagePath = ({ member, allMembers, onSelect }) => {
  const buildPath = (m, acc = []) => {
    acc.unshift(m);
    if (m.parent) {
      const parent = allMembers.find((x) => x.id === m.parent);
      if (parent) return buildPath(parent, acc);
    }
    return acc;
  };
  const path = buildPath(member);
  return (
    <div className="flex items-center flex-wrap gap-1.5">
      {path.map((m, i) => {
        const isCurrent = m.id === member.id;
        return (
          <span key={m.id} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => !isCurrent && onSelect?.(m)}
              disabled={isCurrent}
              className={
                isCurrent
                  ? "inline-flex items-center gap-1 rounded-full border-2 border-emerald-500 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                  : "inline-flex items-center rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-emerald-50 hover:text-emerald-700"
              }
            >
              {shortName(m.name)}
              {isCurrent && <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" />}
            </button>
            {i < path.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            )}
          </span>
        );
      })}
    </div>
  );
};

// ── Tree Node ─────────────────────────────────────────────────────────────────
const TreeNode = ({ member, allMembers, depth = 0, onSelect, isLast = false, visibleIds, matchedIds }) => {
  const searching = visibleIds && visibleIds.size !== allMembers.length;
  const isMatch = matchedIds ? matchedIds.has(member.id) : false;
  const [expanded, setExpanded] = useState(depth < 2 || searching);

  if (searching && visibleIds && !visibleIds.has(member.id)) return null;

  const children = allMembers.filter((m) => m.parent === member.id);
  const visibleChildren = searching && visibleIds
    ? children.filter((c) => visibleIds.has(c.id))
    : children;
  const hasChildren = visibleChildren.length > 0;

  return (
    <div className="relative flex flex-col items-start">
      {depth > 0 && (
        <>
          <div
            aria-hidden="true"
            className={`absolute -left-7 top-0 w-0.5 bg-primary/35 ${isLast ? "h-8" : "bottom-0"}`}
          />
          <div aria-hidden="true" className="absolute -left-7 top-8 h-0.5 w-7 bg-primary/50" />
          <div aria-hidden="true" className="absolute -left-[1px] top-[29px] h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-card" />
        </>
      )}

      <div className="relative flex items-center">
        <div
          onClick={() => onSelect(member)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(member);
            }
          }}
          className={`group flex min-h-16 min-w-[200px] max-w-[260px] cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isMatch
              ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-200"
              : "border-primary/20 bg-card"
          }`}
        >
          <MemberAvatar member={member} className="h-9 w-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-semibold leading-tight truncate ${member.status === "deceased" ? "text-muted-foreground" : isMatch ? "text-emerald-800" : "text-foreground"}`}>
              {member.name}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${isMatch ? "text-emerald-700 border-emerald-300 bg-emerald-100/50" : "text-emerald-600 border-emerald-200"}`}>
                Phaj {member.gen}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{member.gender === "M" ? "♂" : "♀"}</span>
            </div>
          </div>
          {hasChildren && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="ml-auto h-7 w-7 shrink-0"
              aria-label={expanded ? `ຫຍໍ້ລູກຂອງ ${member.name}` : `ສະແດງລູກຂອງ ${member.name}`}
              aria-expanded={expanded}
            >
              {expanded
                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </Button>
          )}
        </div>
        {hasChildren && expanded && (
          <div aria-hidden="true" className="absolute left-6 top-full h-3 w-0.5 bg-primary/35" />
        )}
      </div>

      {hasChildren && expanded && (
        <div className="relative ml-6 mt-3 flex flex-col gap-3 pl-7">
          {visibleChildren.map((child, index) => (
            <TreeNode
              key={child.id}
              member={child}
              allMembers={allMembers}
              depth={depth + 1}
              onSelect={onSelect}
              isLast={index === visibleChildren.length - 1}
              visibleIds={visibleIds}
              matchedIds={matchedIds}
            />
          ))}
        </div>
      )}
    </div>
  );
};


// ── Family Section (redesigned) ────────────────────────────────────────────────
const FamilySection = ({ member, allMembers, onSelect }) => {
  const [expanded, setExpanded] = useState(true);
  const parent = member?.parent ? allMembers.find((m) => m.id === member.parent) : null;
  const spouse = allMembers.filter((m) => member?.spouse?.includes(m.id));
  const children = allMembers.filter((m) => m.parent === member?.id);
  const sons = children.filter((m) => m.gender === "M");
  const daughters = children.filter((m) => m.gender === "F");

  const hasFamily = parent || spouse.length > 0 || children.length > 0;
  if (!hasFamily) return null;

  const RelRow = ({ m, highlight }) => (
    <button
      type="button"
      onClick={() => onSelect?.(m)}
      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
        highlight ? "bg-muted" : "hover:bg-muted/60"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          m.gender === "M" ? "bg-amber-100 text-amber-800" : "bg-amber-100 text-amber-800"
        }`}
      >
        {initials(m.name)}
      </span>
      <span className="truncate text-base font-medium text-foreground">{shortName(m.name)}</span>
      <Badge className="ml-auto shrink-0 bg-amber-100 text-amber-800 hover:bg-amber-100">
        Phaj {m.gen}
      </Badge>
    </button>
  );

  const GroupHeader = ({ icon, label, count }) => (
    <div className="mt-3 mb-1 flex items-center gap-2">
      <span className="text-base">{icon}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
        {count}
      </span>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-base font-bold text-foreground">ຄອບຄົວ</h3>

      {/* Parent */}
      {parent && (
        <button
          type="button"
          onClick={() => onSelect?.(parent)}
          className="mt-3 flex w-full items-center justify-between gap-2 border-b border-border/60 pb-3 text-left"
        >
          <span className="text-sm text-muted-foreground">
            {parent.gender === "M" ? "ພໍ່" : "ແມ່"}
          </span>
          <span className="truncate text-base font-semibold text-emerald-600">
            {shortName(parent.name)}
          </span>
        </button>
      )}

      {/* Spouse */}
      {spouse.length > 0 && (
        <div className="border-b border-border/60 py-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between"
          >
            <span className="text-sm text-muted-foreground">ຄູ່ສົມລົດ</span>
            {expanded
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {spouse.map((m) => <RelRow key={m.id} m={m} />)}
            </div>
          )}
        </div>
      )}

      {/* Children */}
      {children.length > 0 && (
        <div className="pt-3">
          <p className="text-sm text-muted-foreground">
            ລູກທັງໝົດ: <span className="font-semibold text-foreground">{children.length}</span> ຄົນ
          </p>

          {sons.length > 0 && (
            <>
              <GroupHeader icon="👦" label="ລູກຊາຍ" count={sons.length} />
              <div className="space-y-1">
                {sons.map((m) => <RelRow key={m.id} m={m} highlight={m.id === member.id} />)}
              </div>
            </>
          )}

          {daughters.length > 0 && (
            <>
              <GroupHeader icon="👧" label="ລູກສາວ" count={daughters.length} />
              <div className="space-y-1">
                {daughters.map((m) => <RelRow key={m.id} m={m} highlight={m.id === member.id} />)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Detail Sheet (Member Profile — aligned with Leadership DetailPanel) ───────
// Section title — matches the leadership page: uppercase, primary, tracked.
const ProfileSectionTitle = ({ children }) => (
  <div className="text-xs font-bold text-primary uppercase tracking-wider mb-2">{children}</div>
);

// Info row — matches leadership contact/service rows (icon · label · value).
const ProfileRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3">
    {Icon ? (
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    ) : (
      <span className="w-4 flex-shrink-0" />
    )}
    <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
    <span className="text-sm font-medium text-foreground min-w-0 truncate">{value ?? "-"}</span>
  </div>
);

// Relationship row — restyled to the leadership palette (primary accents).
const RelCard = ({ m, sideLabel, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect?.(m)}
    className="group flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-all hover:bg-muted active:scale-[0.99]"
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold select-none">
      {initials(m.name)}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold text-foreground">
        {shortName(m.name)}
        {m.status === "deceased" && <span className="ml-1 text-muted-foreground">†</span>}
      </span>
      {sideLabel && <span className="block text-xs text-muted-foreground">{sideLabel}</span>}
    </span>
    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
      Phaj {m.gen}
    </span>
    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary shrink-0" />
  </button>
);

const DetailSheet = ({ member, allMembers, onClose, onSelect, onEdit }) => {
  if (!member) return null;

  const parent = member.parent ? allMembers.find((x) => x.id === member.parent) : null;
  const children = allMembers.filter((m) => m.parent === member.id);
  const sons = children.filter((c) => c.gender === "M");
  const daughters = children.filter((c) => c.gender === "F");
  const siblings = member.parent
    ? allMembers.filter((m) => m.parent === member.parent && m.id !== member.id)
    : [];
  const elderSiblings = siblings;
  const spouses = (member.spouse || [])
    .map((id) => allMembers.find((x) => x.id === id))
    .filter(Boolean);

  const birthdate = member.birthdate || member.dob || "-";
  const isAlive = member.status === "alive";
  const codeNo = `#${String(member.id).padStart(4, "0")}`;
  const genFull = genLabel(member.gen).split(" — ")[1] || "";
  const address = member.address
    || [member.village, member.province].filter((p) => p && p !== "-").join(", ")
    || "-";

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };
  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: member.name, url });
      else { await navigator.clipboard.writeText(url); toast.success("ສຳເນົາລິ້ງແລ້ວ"); }
    } catch { /* user cancelled */ }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-end"
      onClick={onClose}
    >
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-full overflow-y-auto bg-card border-l border-border shadow-2xl flex flex-col"
        style={{ animation: "slideIn 0.25s ease" }}
      >
        {/* Header — primary background, matching leadership DetailPanel */}
        <div className="bg-primary p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-xl mb-4 select-none">
            {initials(member.name)}
          </div>
          <div className="text-xl font-bold text-white mb-1">{member.name}</div>
          <div className="text-sm text-white/80 mb-3">
            {codeNo}
          </div>

          <div className="flex gap-2 flex-wrap">
            <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full">Phaj {member.gen}</span>
            {member.role && (
              <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full">{member.role}</span>
            )}
            <span className={`text-xs px-2.5 py-1 rounded-full border ${
              isAlive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
            }`}>
              {isAlive ? "ມີຊີວິດ" : "ເສຍຊີວິດ"}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Personal info */}
          <section>
            <ProfileSectionTitle>ຂໍ້ມູນສ່ວນຕົວ</ProfileSectionTitle>
            <div className="space-y-2">
              <ProfileRow icon={Calendar} label="ວັນເກີດ" value={birthdate} />
              <ProfileRow icon={User} label="ອາຍຸ" value={member.age ? `${member.age} ປີ` : "-"} />
              <ProfileRow icon={Phone} label="ເບີໂທ" value={member.phone} />
              <ProfileRow icon={MapPin} label="ທີ່ຢູ່" value={address} />
            </div>
          </section>

          {/* Position */}
          {member.role && (
            <section>
              <ProfileSectionTitle>ຕຳແໜ່ງ</ProfileSectionTitle>
              <div className="flex items-center gap-3">
                <Star className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-xs text-muted-foreground w-20 flex-shrink-0">ໜ້າທີ່</span>
                <span className="text-sm font-medium text-foreground min-w-0 truncate">{member.role}</span>
                <span className={`ml-auto shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  isAlive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}>
                  {isAlive ? "ກຳລັງດຳລົງ" : "ສິ້ນສຸດ"}
                </span>
              </div>
            </section>
          )}

          {/* Family */}
          <section>
            <ProfileSectionTitle>ຄອບຄົວ</ProfileSectionTitle>

            {parent && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">ພໍ່ / ແມ່</p>
                <RelCard
                  m={parent}
                  sideLabel={parent.gender === "F" ? "ແມ່" : "ພໍ່"}
                  onSelect={onSelect}
                />
              </div>
            )}

            {spouses.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">ຄູ່ສົມລົດ</p>
                <div className="space-y-2">
                  {spouses.map((s) => (
                    <RelCard key={s.id} m={s} sideLabel="ຄູ່ສົມລົດ" onSelect={onSelect} />
                  ))}
                </div>
              </div>
            )}

            {elderSiblings.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">
                  ອ້າຍນ້ອງ <span className="text-muted-foreground/70">({elderSiblings.length})</span>
                </p>
                <div className="space-y-2">
                  {elderSiblings.map((s) => (
                    <RelCard
                      key={s.id}
                      m={s}
                      sideLabel={s.gender === "F" ? "ເອື້ອຍ/ນ້ອງສາວ" : "ອ້າຍ/ນ້ອງຊາຍ"}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </div>
            )}

            {children.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  ລູກ <span className="text-muted-foreground/70">({children.length})</span>
                </p>
                <div className="space-y-2">
                  {[...sons, ...daughters].map((c) => (
                    <RelCard
                      key={c.id}
                      m={c}
                      sideLabel={c.gender === "F" ? "ລູກສາວ" : "ລູກຊາຍ"}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </div>
            )}

            {!parent && spouses.length === 0 && elderSiblings.length === 0 && children.length === 0 && (
              <p className="text-sm text-muted-foreground">ບໍ່ມີຂໍ້ມູນຄອບຄົວ</p>
            )}
          </section>

          {/* Actions — matching leadership detail panel footer */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <button onClick={() => onEdit?.(member)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
              <Pencil className="h-4 w-4" /> ແກ້ໄຂ
            </button>
            <button onClick={handleShare} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-background text-foreground font-semibold text-sm hover:bg-muted transition-colors">
              <Share2 className="h-4 w-4" /> ແຊຣ໌
            </button>
            <button onClick={handlePrint} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-background text-foreground font-semibold text-sm hover:bg-muted transition-colors">
              <Printer className="h-4 w-4" /> ພິມ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Member Card (Grid) — modern design ───────────────────────────────────────
const MemberCard = ({ member, onSelect, onEdit }) => {
  const addr = member.address
    || [member.village, member.province].filter((p) => p && p !== "-").join(", ");
  return (
    <Card
      onClick={() => onSelect(member)}
      className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-emerald-300 transition-all cursor-pointer"
    >
      {/* Gradient top accent */}
      <div className={`h-12 bg-gradient-to-br ${member.gender === "M" ? "from-emerald-600 to-teal-500" : "from-rose-500 to-pink-400"} opacity-90`} />

      <CardContent className="p-4 pt-0 -mt-7 relative">
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(member); }}
            className="absolute top-2 right-2 z-10 h-7 w-7 inline-flex items-center justify-center rounded-md bg-white/90 backdrop-blur text-muted-foreground shadow-sm hover:bg-white hover:text-foreground transition-colors"
            aria-label="ແກ້ໄຂ"
            title="ແກ້ໄຂ"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Avatar floats on top of header */}
        <div className="flex justify-center mb-2">
          <MemberAvatar member={member} className="h-14 w-14 ring-4 ring-card shadow-md" />
        </div>

        <div className="text-center min-w-0">
          <p className={`text-sm font-bold leading-tight truncate ${member.status === "deceased" ? "text-muted-foreground" : "text-foreground"}`}>
            {member.name}
          </p>
          {member.role && (
            <p className="text-[11px] text-emerald-600 mt-0.5 truncate font-medium">{member.role}</p>
          )}
        </div>

        <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] px-2 text-emerald-600 border-emerald-200 bg-emerald-50/50">
            Phaj {member.gen}
          </Badge>
          <Badge variant="secondary" className="text-[10px] px-2">
            {member.gender === "M" ? "♂ ຊາຍ" : "♀ ຍິງ"}{member.age ? ` · ${member.age}ປີ` : ""}
          </Badge>
          <StatusBadge status={member.status} />
        </div>

        {addr && (
          <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{addr}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};



// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState = ({ onAdd }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
    <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
    <p className="text-base font-semibold text-foreground mb-1">ຍັງບໍ່ມີສະມາຊິກ</p>
    <p className="text-sm text-muted-foreground mb-5">ເລີ່ມຕົ້ນໂດຍການເພີ່ມສະມາຊິກຄົນທຳອິດ</p>
    <Button size="sm" onClick={onAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
      <Plus className="h-4 w-4" /> ເພີ່ມສະມາຊິກຄົນທຳອິດ
    </Button>
  </div>
);

// ── Add Member Modal (consistent UI with elders / leadership) ────────────────
const EMPTY_FORM = {
  name: "",
  nickname: "",
  gender: "M",
  birthdate: "",
  parent: null,        // member id of father
  category: "ສະມາຊິກ", // ສະມາຊິກ | ຄະນະນຳ | ຜູ້ອາວຸໂສ
  position: "",         // dynamic position label
  branch: BRANCHES[0],
  village: "",          // ບ້ານ (bare name, prefix added on save)
  district: "",         // ເມືອງ
  province: "",         // ແຂວງ
  phone: "",
};

const INPUT_CLS =
  "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:cursor-not-allowed";

const AddMemberModal = ({ open, onOpenChange, allMembers, onAdd }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-calculate generation from selected father
  const father = form.parent ? allMembers.find((m) => m.id === Number(form.parent)) : null;
  const computedGen = father ? Number(father.gen) + 1 : 1;

  const positionOptions =
    form.category === "ຄະນະນຳ" ? LEADER_POSITIONS
    : form.category === "ຜູ້ອາວຸໂສ" ? ELDER_POSITIONS
    : [];

  const close = () => { setForm(EMPTY_FORM); onOpenChange(false); };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (!form.name.trim()) {
      toast.error("ກະລຸນາປ້ອນຊື່ສະມາຊິກ");
      return;
    }
    const newId = Math.max(0, ...allMembers.map((m) => m.id)) + 1;
    const role =
      form.category === "ສະມາຊິກ" ? "ສະມາຊິກ"
      : form.position || form.category;
    const member = {
      id: newId,
      name: form.name.trim(),
      nickname: form.nickname.trim(),
      gender: form.gender,
      birthdate: form.birthdate || undefined,
      age: form.birthdate ? new Date().getFullYear() - new Date(form.birthdate).getFullYear() : 0,
      gen: computedGen,
      role,
      category: form.category,
      position: form.position || undefined,
      branch: form.branch,
      village: form.village.trim() || "-",
      district: form.district.trim() || "-",
      province: form.province.trim() || "-",
      address: formatAddress({
        village: form.village,
        district: form.district,
        province: form.province,
      }),
      status: "alive",
      phone: form.phone.trim() || "-",
      photo: null,
      parent: form.parent ? Number(form.parent) : undefined,
    };
    onAdd(member);
    toast.success(`ເພີ່ມ "${member.name}" ສຳເລັດແລ້ວ`);
    close();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">ເພີ່ມສະມາຊິກໃໝ່</h2>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm space-y-1 sm:col-span-2">
              <span className="font-medium text-foreground">ຊື່ <span className="text-destructive">*</span></span>
              <input
                className={INPUT_CLS}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="ທ້າວ/ນາງ ..."
              />
            </label>

            <label className="text-sm space-y-1">
              <span className="font-medium text-foreground">ເພດ</span>
              <select className={INPUT_CLS} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="M">ຊາຍ</option>
                <option value="F">ຍິງ</option>
              </select>
            </label>

            <label className="text-sm space-y-1">
              <span className="font-medium text-foreground">ວັນເດືອນປີເກີດ</span>
              <input
                type="date"
                className={INPUT_CLS}
                value={form.birthdate}
                onChange={(e) => set("birthdate", e.target.value)}
              />
            </label>

            <div className="text-sm space-y-1 sm:col-span-2">
              <span className="font-medium text-foreground">ພໍ່</span>
              <SearchableMemberSelect
                value={form.parent}
                onChange={(id) => set("parent", id)}
                members={allMembers}
                placeholder="ເລືອກພໍ່ຈາກລາຍຊື່ສະມາຊິກ..."
                allowNone
              />
              <p className="text-xs text-muted-foreground">
                ຖ້າບໍ່ເລືອກພໍ່ ລະບົບກຳນົດ ລຸ້ນ = 1 ໂດຍອັດຕະໂນມັດ
              </p>
            </div>

            <label className="text-sm space-y-1">
              <span className="font-medium text-foreground">ລຸ້ນ <span className="text-xs text-muted-foreground">(ຄຳນວນອັດຕະໂນມັດ)</span></span>
              <input className={INPUT_CLS} value={`ລຸ້ນ ${computedGen}`} readOnly disabled />
            </label>

            <label className="text-sm space-y-1">
              <span className="font-medium text-foreground">ກຸ່ມ (Pawg)</span>
              <select className={INPUT_CLS} value={form.branch} onChange={(e) => set("branch", e.target.value)}>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>

            <label className="text-sm space-y-1">
              <span className="font-medium text-foreground">ຕຳແໜ່ງ</span>
              <select
                className={INPUT_CLS}
                value={form.category}
                onChange={(e) => { set("category", e.target.value); set("position", ""); }}
              >
                <option value="ສະມາຊິກ">ສະມາຊິກ (ບໍ່ມີຕຳແໜ່ງ)</option>
                <option value="ຄະນະນຳ">ຄະນະນຳ</option>
                <option value="ຜູ້ອາວຸໂສ">ຜູ້ອາວຸໂສ</option>
              </select>
            </label>

            {positionOptions.length > 0 && (
              <label className="text-sm space-y-1">
                <span className="font-medium text-foreground">ຕຳແໜ່ງ {form.category}</span>
                <CreatableCombobox
                  className={INPUT_CLS}
                  value={form.position}
                  onChange={(v) => set("position", v)}
                  options={positionOptions}
                  placeholder="ເລືອກ ຫຼື ພິມຕຳແໜ່ງ..."
                />
              </label>
            )}

            <div className="text-sm space-y-1 sm:col-span-2">
              <span className="font-medium text-foreground">ທີ່ຢູ່</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  className={INPUT_CLS}
                  value={form.village}
                  onChange={(e) => set("village", e.target.value)}
                  placeholder="ບ້ານ (ເຊັ່ນ: ໂນນສະຫວ່າງ)"
                />
                <input
                  className={INPUT_CLS}
                  value={form.district}
                  onChange={(e) => set("district", e.target.value)}
                  placeholder="ເມືອງ (ເຊັ່ນ: ໄຊເສດຖາ)"
                />
                <input
                  className={INPUT_CLS}
                  value={form.province}
                  onChange={(e) => set("province", e.target.value)}
                  placeholder="ແຂວງ (ເຊັ່ນ: ນະຄອນຫຼວງວຽງຈັນ)"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                ປ້ອນແຕ່ຊື່ — ລະບົບຈະເພີ່ມຄຳວ່າ "ບ້ານ", "ເມືອງ", "ແຂວງ" ໃຫ້ອັດຕະໂນມັດ
              </p>
            </div>
            <label className="text-sm space-y-1 sm:col-span-2">
              <span className="font-medium text-foreground">ເບີໂທ</span>
              <input className={INPUT_CLS} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="020-..." />
            </label>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={close}
              className="flex-1 py-2.5 rounded-xl border border-border bg-background text-foreground font-semibold text-sm hover:bg-muted transition-colors"
            >
              ຍົກເລີກ
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> ບັນທຶກ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
function MembersPage() {
  const [viewMode, setViewMode] = useState("table"); // tree | table (card view removed)
  const [search, setSearch] = useState("");
  const [filterGen, setFilterGen] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const members = useMembers();
  const [showAdd, setShowAdd] = useState(false);
  const [deletingMember, setDeletingMember] = useState<any>(null);
  const STATS = buildMemberStats(members);

  const addMember = (m) => { storeAddMember(m); };

  const { member: memberParam, action: actionParam, edit: editParam } = Route.useSearch();
  const [editing, setEditing] = useState<any>(null);
  useEffect(() => {
    if (memberParam != null) {
      const m = members.find((x) => x.id === Number(memberParam));
      if (m) setSelected(m);
    }
  }, [memberParam, members]);
  useEffect(() => {
    if (actionParam === "add") setShowAdd(true);
  }, [actionParam]);
  useEffect(() => {
    if (editParam != null) {
      const m = members.find((x) => x.id === Number(editParam));
      if (m) setEditing(m);
    }
  }, [editParam, members]);

  const updateMember = (id: number, patch: any) => { storeUpdateMember(id, patch); };

  const openEdit = (m: any) => { setSelected(null); setEditing(m); };

  // Search filter

  const filtered = members.filter((m) => {
    if (
      search.trim() &&
      !matchesSearchTokens(
        search,
        m.name,
        m.nickname,
        m.role,
        m.position,
        m.village,
        m.province,
        m.phone,
        m.branch,
        `m${String(m.id).padStart(4, "0")}`,
        String(m.id),
      )
    ) {
      return false;
    }
    const matchGen = filterGen === "all" || String(m.gen) === filterGen;
    const matchGender = filterGender === "all" || m.gender === filterGender;
    const matchStatus = filterStatus === "all" || m.status === filterStatus;
    return matchGen && matchGender && matchStatus;
  });

  // Quick-pick suggestions for the search box (top 8 matches)
  const suggestions = search.trim()
    ? members
        .filter((m) =>
          matchesSearchTokens(
            search,
            m.name,
            m.nickname,
            m.village,
            `m${String(m.id).padStart(4, "0")}`,
            String(m.id),
          ),
        )
        .slice(0, 8)
    : [];

  // Tree-view search sets: matches + ancestor paths
  const { matchedIds, visibleIds } = getTreeSearchSets(search, members);
  const treeSearching = search.trim().length > 0;

  const viewModes = [
    { id: "tree", Icon: Network, label: "ສາຍຕະກູນ" },
    { id: "table", Icon: List, label: "ຕາຕະລາງ" },
  ];


  return (
    <div data-allow-guest-edit className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">

      {/* Back button */}
      <BackToHomeButton />


      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">ສະມາຊິກຕະກູນ</h1>
          <p className="text-sm text-muted-foreground mt-1">ຄົ້ນຫາ, ຈັດການ ແລະ ເບິ່ງສາຍຕະກູນຂອງສະມາຊິກ</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> ເພີ່ມສະມາຊິກ
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-semibold hover:bg-muted transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-semibold hover:bg-muted transition-colors">
            <Upload className="w-4 h-4" /> Import
          </button>
        </div>
      </div>


      {/* Stats Grid — leadership-style icon-left cards, mobile-first 2 cols */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border bg-card shadow-sm p-3.5 sm:p-4 flex items-center gap-3 min-w-0"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <s.Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xl sm:text-2xl font-bold text-foreground leading-none tabular-nums">
                {s.value}
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate">
                {s.label}
              </div>
              {s.hint ? (
                <div className="text-[10px] sm:text-[11px] text-muted-foreground/70 mt-0.5 truncate">
                  {s.hint}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>


      {/* Search + Filters + View Toggle */}
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-0 basis-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="ຄົ້ນຫາຊື່, ຊື່ຫຼິ້ນ, ບ້ານ, ລະຫັດ (m0001)..."
            className="pl-9 pr-8 text-sm h-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="ລ້າງການຄົ້ນຫາ"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 sm:right-auto sm:min-w-[320px] rounded-lg border bg-popover shadow-lg overflow-hidden">
              {suggestions.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setSelected(m); setShowSuggestions(false); setSearch(m.name); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors"
                >
                  <MemberAvatar member={m} className="h-8 w-8 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      M{String(m.id).padStart(4, "0")}{m.village ? ` · ບ້ານ${m.village}` : ""}{m.nickname ? ` · ${m.nickname}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter toggle */}
        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1.5 text-xs h-9 shrink-0"
        >
          <Filter className="h-3.5 w-3.5" /> ກັ່ນຕອງ
        </Button>

        {/* View mode */}
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          {viewModes.map(({ id, Icon: Ic, label }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className={`flex items-center gap-1.5 px-3 h-9 text-xs transition-colors ${
                viewMode === id ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Ic className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card className="rounded-xl border bg-card shadow-sm">
          <CardContent className="p-4 flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1.5 min-w-[120px]">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">ລຸ້ນ</label>
              <Select value={filterGen} onValueChange={setFilterGen}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[["all","ທັງໝົດ"],["1","ລຸ້ນທີ 1 (Phaj 1)"],["2","ລຸ້ນທີ 2 (Phaj 2)"],["3","ລຸ້ນທີ 3 (Phaj 3)"],["4","ລຸ້ນທີ 4 (Phaj 4)"],["5","ລຸ້ນທີ 5 (Phaj 5)"],["6","ລຸ້ນທີ 6 (Phaj 6)"]].map(([v, l]) => (
                    <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 min-w-[120px]">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">ເພດ</label>
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[["all","ທັງໝົດ"],["M","ຊາຍ"],["F","ຍິງ"]].map(([v, l]) => (
                    <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 min-w-[120px]">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">ສະຖານະ</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[["all","ທັງໝົດ"],["alive","ມີຊີວິດ"],["deceased","ເສຍຊີວິດ"]].map(([v, l]) => (
                    <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterGen("all"); setFilterGender("all"); setFilterStatus("all"); setSearch(""); }}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs h-8 gap-1.5"
            >
              <X className="h-3.5 w-3.5" /> Reset
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Result count */}
      <p className="text-xs text-muted-foreground">
        {viewMode === "tree" && treeSearching ? (
          <>ພົບ <span className="text-primary font-semibold">{matchedIds.size}</span> ຄົນ ໃນສາຍຕະກູນ</>
        ) : (
          <>ສະແດງ <span className="text-primary font-semibold">{filtered.length}</span> / {members.length} ສະມາຊິກ</>
        )}
      </p>


      {/* ── TREE VIEW ── */}
      {viewMode === "tree" && (
        <Card className="rounded-xl border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 pb-3 pt-4 px-5 border-b border-border space-y-0">
            <Network className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-foreground">ສາຍຕະກູນ</span>
            {treeSearching && (
              <Badge variant="secondary" className="ml-2 text-[10px]">
                ພົບ {matchedIds.size} ຄົນ
              </Badge>
            )}
            <div className="ml-auto flex gap-2">
              {BRANCHES.map((b) => {
                const roots = members.filter((m) => !m.parent && m.branch === b);
                const hasVisible = roots.some((r) => visibleIds.has(r.id));
                if (treeSearching && !hasVisible) return null;
                return (
                  <Badge key={b} variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">{b.split(" (")[0]}</Badge>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="p-4 overflow-x-auto">
            <div className="flex flex-col gap-5 min-w-[320px]">
              {BRANCHES.map((branch) => {
                const roots = members.filter((m) => !m.parent && m.branch === branch);
                const visibleRoots = roots.filter((r) => visibleIds.has(r.id));
                if (visibleRoots.length === 0) return null;
                return (
                  <div key={branch}>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{branch}</p>
                    <div className="flex flex-col gap-2">
                      {visibleRoots.map((root) => (
                        <TreeNode
                          key={root.id}
                          member={root}
                          allMembers={members}
                          depth={0}
                          onSelect={setSelected}
                          visibleIds={visibleIds}
                          matchedIds={matchedIds}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}


      {/* ── GRID VIEW ── */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((m) => (
            <MemberCard key={m.id} member={m} onSelect={setSelected} onEdit={openEdit} />
          ))}
          {filtered.length === 0 && <EmptyState onAdd={() => setShowAdd(true)} />}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {viewMode === "table" && (
        <Card className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gradient-to-r from-emerald-50 to-teal-50/50">
                <tr className="border-b border-border">
                  {["ສະມາຊິກ","ເພດ","ອາຍຸ","Phaj","ຕຳແໜ່ງ","ທີ່ຢູ່","ສະຖານະ",""].map((h) => (
                    <th key={h} className="text-left text-[11px] font-bold text-emerald-700 uppercase tracking-wide px-4 py-3.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((m) => {
                  const addr = m.address || [m.village, m.province].filter((p) => p && p !== "-").join(", ") || "-";
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelected(m)}
                      className="cursor-pointer hover:bg-emerald-50/50 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <MemberAvatar member={m} className="h-9 w-9 shrink-0 ring-2 ring-transparent group-hover:ring-emerald-200 transition" />
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold truncate ${m.status === "deceased" ? "text-muted-foreground" : "text-foreground"}`}>{m.name}</p>
                            {m.nickname && <p className="text-[10px] text-muted-foreground truncate">@{m.nickname}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{m.gender === "M" ? "♂ ຊາຍ" : "♀ ຍິງ"}</td>
                      <td className="px-4 py-3 text-xs font-medium text-foreground">{m.age || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50/50">Phaj {m.gen}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground/80 whitespace-nowrap max-w-[180px] truncate">{m.role}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{addr}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); openEdit(m); }} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-emerald-100 hover:text-emerald-700 transition" aria-label="ແກ້ໄຂ" title="ແກ້ໄຂ">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeletingMember(m); }} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-100 hover:text-rose-700 transition" aria-label="ລຶບ" title="ລຶບ">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-10">
                <EmptyState onAdd={() => setShowAdd(true)} />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Detail Sheet */}
      <DetailSheet member={selected} allMembers={members} onClose={() => setSelected(null)} onSelect={setSelected} onEdit={openEdit} />

      {/* Add Member Modal */}
      <AddMemberModal open={showAdd} onOpenChange={setShowAdd} allMembers={members} onAdd={addMember} />

      {/* Edit Member Modal */}
      <EditMemberModal
        open={!!editing}
        onOpenChange={(v) => { if (!v) setEditing(null); }}
        member={editing}
        allMembers={members}
        onSave={(patch) => {
          if (!editing) return;
          updateMember(editing.id, patch);
          toast.success("ບັນທຶກການແກ້ໄຂສຳເລັດ");
          setEditing(null);
        }}
      />

      {/* Delete Member Confirmation */}
      <AlertDialog open={!!deletingMember} onOpenChange={(o) => { if (!o) setDeletingMember(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ຢືນຢັນການລຶບສະມາຊິກ</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingMember ? `ທ່ານກຳລັງລຶບ "${deletingMember.name}". ການກະທຳນີ້ບໍ່ສາມາດກັບຄືນໄດ້ ແລະ ຈະຕັດການເຊື່ອມຕໍ່ກັບລູກ-ພໍ່-ຄູ່ສົມລົດ.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ຍົກເລີກ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingMember) {
                  storeDeleteMember(deletingMember.id);
                  toast.success("ລຶບສະມາຊິກແລ້ວ");
                }
                setDeletingMember(null);
              }}
            >ລຶບ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Edit Member Modal ────────────────────────────────────────────────────────
function EditMemberModal({ open, onOpenChange, member, allMembers, onSave }) {
  const [form, setForm] = useState<any>(null);
  useEffect(() => {
    if (member) {
      // Prefer explicit village/district/province; fall back to parsing legacy address.
      const hasParts = member.village || member.district || member.province;
      const parsed = hasParts
        ? {
            village: member.village && member.village !== "-" ? member.village : "",
            district: member.district && member.district !== "-" ? member.district : "",
            province: member.province && member.province !== "-" ? member.province : "",
          }
        : parseAddress(member.address);
      setForm({
        name: member.name ?? "",
        nickname: member.nickname ?? "",
        gender: member.gender ?? "M",
        birthdate: member.birthdate ?? "",
        parent: member.parent ?? null,
        category: member.category ?? "ສະມາຊິກ",
        position: member.position ?? "",
        branch: member.branch ?? BRANCHES[0],
        village: parsed.village,
        district: parsed.district,
        province: parsed.province,
        phone: member.phone === "-" ? "" : (member.phone ?? ""),
        status: member.status ?? "alive",
        role: member.role ?? "",
      });
    }
  }, [member]);
  if (!open || !form) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const father = form.parent ? allMembers.find((m) => m.id === Number(form.parent)) : null;
  const computedGen = father ? Number(father.gen) + 1 : (member?.gen ?? 1);
  const positionOptions =
    form.category === "ຄະນະນຳ" ? LEADER_POSITIONS
    : form.category === "ຜູ້ອາວຸໂສ" ? ELDER_POSITIONS
    : [];
  const close = () => onOpenChange(false);
  const submit = (e) => {
    e?.preventDefault?.();
    if (!form.name.trim()) { toast.error("ກະລຸນາປ້ອນຊື່"); return; }
    const role = form.category === "ສະມາຊິກ" ? "ສະມາຊິກ" : (form.position || form.category);
    onSave({
      ...form,
      name: form.name.trim(),
      nickname: form.nickname.trim(),
      role,
      gen: computedGen,
      age: form.birthdate ? new Date().getFullYear() - new Date(form.birthdate).getFullYear() : member.age,
      parent: form.parent ? Number(form.parent) : undefined,
      village: form.village.trim() || "-",
      district: form.district.trim() || "-",
      province: form.province.trim() || "-",
      address: formatAddress({
        village: form.village,
        district: form.district,
        province: form.province,
      }),
      phone: form.phone.trim() || "-",
    });
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">ແກ້ໄຂສະມາຊິກ</h2>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm space-y-1 sm:col-span-2">
              <span className="font-medium text-foreground">ຊື່ <span className="text-destructive">*</span></span>
              <input className={INPUT_CLS} value={form.name} onChange={(e) => set("name", e.target.value)} />
            </label>
            <label className="text-sm space-y-1">
              <span className="font-medium text-foreground">ຊື່ຫຼີ້ນ</span>
              <input className={INPUT_CLS} value={form.nickname} onChange={(e) => set("nickname", e.target.value)} />
            </label>
            <label className="text-sm space-y-1">
              <span className="font-medium text-foreground">ເພດ</span>
              <select className={INPUT_CLS} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="M">ຊາຍ</option>
                <option value="F">ຍິງ</option>
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="font-medium text-foreground">ວັນເດືອນປີເກີດ</span>
              <input type="date" className={INPUT_CLS} value={form.birthdate} onChange={(e) => set("birthdate", e.target.value)} />
            </label>
            <label className="text-sm space-y-1">
              <span className="font-medium text-foreground">ສະຖານະ</span>
              <select className={INPUT_CLS} value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="alive">ມີຊີວິດ</option>
                <option value="deceased">ເສຍຊີວິດ</option>
              </select>
            </label>
            <div className="text-sm space-y-1 sm:col-span-2">
              <span className="font-medium text-foreground">ພໍ່</span>
              <SearchableMemberSelect value={form.parent} onChange={(id) => set("parent", id)} members={allMembers.filter((m) => m.id !== member.id)} placeholder="ເລືອກພໍ່..." allowNone />
            </div>
            <label className="text-sm space-y-1">
              <span className="font-medium text-foreground">ລຸ້ນ</span>
              <input className={INPUT_CLS} value={`ລຸ້ນ ${computedGen}`} readOnly disabled />
            </label>
            <label className="text-sm space-y-1">
              <span className="font-medium text-foreground">ກຸ່ມ</span>
              <select className={INPUT_CLS} value={form.branch} onChange={(e) => set("branch", e.target.value)}>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="font-medium text-foreground">ປະເພດ</span>
              <select className={INPUT_CLS} value={form.category} onChange={(e) => { set("category", e.target.value); set("position", ""); }}>
                <option value="ສະມາຊິກ">ສະມາຊິກ</option>
                <option value="ຄະນະນຳ">ຄະນະນຳ</option>
                <option value="ຜູ້ອາວຸໂສ">ຜູ້ອາວຸໂສ</option>
              </select>
            </label>
            {positionOptions.length > 0 && (
              <label className="text-sm space-y-1">
                <span className="font-medium text-foreground">ຕຳແໜ່ງ</span>
                <CreatableCombobox
                  className={INPUT_CLS}
                  value={form.position}
                  onChange={(v) => set("position", v)}
                  options={positionOptions}
                  placeholder="ເລືອກ ຫຼື ພິມຕຳແໜ່ງ..."
                />
              </label>
            )}
            <div className="text-sm space-y-1 sm:col-span-2">
              <span className="font-medium text-foreground">ທີ່ຢູ່</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  className={INPUT_CLS}
                  value={form.village}
                  onChange={(e) => set("village", e.target.value)}
                  placeholder="ບ້ານ"
                />
                <input
                  className={INPUT_CLS}
                  value={form.district}
                  onChange={(e) => set("district", e.target.value)}
                  placeholder="ເມືອງ"
                />
                <input
                  className={INPUT_CLS}
                  value={form.province}
                  onChange={(e) => set("province", e.target.value)}
                  placeholder="ແຂວງ"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                ປ້ອນແຕ່ຊື່ — ລະບົບຈະເພີ່ມຄຳວ່າ "ບ້ານ", "ເມືອງ", "ແຂວງ" ໃຫ້ອັດຕະໂນມັດ
              </p>
            </div>
            <label className="text-sm space-y-1 sm:col-span-2">
              <span className="font-medium text-foreground">ເບີໂທ</span>
              <input className={INPUT_CLS} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={close} className="flex-1 py-2.5 rounded-xl border border-border bg-background text-foreground font-semibold text-sm hover:bg-muted transition-colors">ຍົກເລີກ</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-1.5">
              <Pencil className="w-4 h-4" /> ບັນທຶກ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
