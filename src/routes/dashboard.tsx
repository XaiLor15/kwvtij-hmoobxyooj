// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "ພາບລວມ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ພາບລວມ — ລະບົບຄຸ້ມຄອງຂໍ້ມູນຕະກູນ" },
      { property: "og:title", content: "ພາບລວມ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { property: "og:description", content: "ພາບລວມ — ລະບົບຄຸ້ມຄອງຂໍ້ມູນຕະກູນ" },
    ],
  }),
  component: DashboardPage,
});

import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Crown, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useMembers } from "@/lib/members-data";
import { getEventStatus, EVENT_STATUS } from "@/lib/events-data";
import { useEvents } from "@/lib/events-store";
import { useTransactions } from "@/lib/treasury-store";
import { useLeaders } from "@/lib/leadership-store";
import { useElders } from "@/lib/elders-store";
import { useNews } from "@/lib/news-store";
import { ViewAllButton } from "@/components/enterprise/view-all-button";


// Derive avatar initials from a member's Lao name (skip the ທ້າວ/ນາງ prefix).
const deriveInitials = (name) => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const pick = parts.length >= 3 ? parts.slice(1) : parts;
  return pick.slice(0, 2).map((w) => w[0]).join("");
};

const roleColorFor = (role = "") =>
  role.includes("ຫົວໜ້າ") || role.includes("ຮອງ") || role.includes("ປະທານ") || role.includes("ເລຂາ")
    ? "text-amber-600 bg-amber-500/10"
    : role.includes("ປຶກສາ") || role.includes("ບັນພະ") || role.includes("ອາວຸໂສ")
      ? "text-violet-600 bg-violet-500/10"
      : "text-emerald-600 bg-emerald-500/10";

const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  members: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  leadership: (
    <Crown className="h-full w-full" strokeWidth={1.8} />
  ),
  elders: (
    <Award className="h-full w-full" strokeWidth={1.8} />
  ),
  activities: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  finance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  news: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
      <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
    </svg>
  ),
  trend_up: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  tree: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="5" rx="1"/>
      <rect x="2" y="17" width="6" height="5" rx="1"/>
      <rect x="9" y="17" width="6" height="5" rx="1"/>
      <rect x="16" y="17" width="6" height="5" rx="1"/>
      <path d="M12 7v4"/>
      <path d="M5 17v-3h14v3"/>
      <path d="M12 14v3"/>
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  location: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  check_circle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
};

const quickActions = [
  { label: "ເພີ່ມສະມາຊິກ", icon: "members", colorClass: "text-emerald-600", bgClass: "bg-emerald-500/10", to: "/members", search: { action: "add" } },
  { label: "ສ້າງກິດຈະກຳ", icon: "activities", colorClass: "text-amber-600", bgClass: "bg-amber-500/10", to: "/activities", search: { action: "add" } },
  { label: "ເພີ່ມຂ່າວ", icon: "news", colorClass: "text-pink-600", bgClass: "bg-pink-500/10", to: "/news", search: { action: "add" } },
  { label: "ຈັດການຄະນະນຳ", icon: "leadership", colorClass: "text-orange-600", bgClass: "bg-orange-500/10", to: "/leadership" },
  { label: "ຈັດການຄັງເງິນ", icon: "finance", colorClass: "text-emerald-600", bgClass: "bg-emerald-500/10", to: "/finance" },
];

// News preview is now read live from the news store inside the component.

// Simple bar chart component
function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2 px-1" style={{ height: "80px" }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm transition-all duration-300"
            style={{
              height: `${(d.value / max) * 64}px`,
              backgroundColor: i === data.length - 1 ? "var(--color-emerald-500, #10b981)" : "var(--color-emerald-200, #a7f3d0)",
            }}
          />
          <span className="text-[10px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// Donut chart
function DonutChart({ segments }) {
  const total = segments.reduce((a, b) => a + b.value, 0);
  let offset = 0;
  const r = 36, cx = 44, cy = 44, circ = 2 * Math.PI * r;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * circ;
        const gap = circ - dash;
        const el = (
          <circle
            key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth="12"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset * circ + circ / 4}
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        );
        offset += pct;
        return el;
      })}
      <circle cx={cx} cy={cy} r="24" fill="white" />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600">{total}</text>
    </svg>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const MEMBERS = useMembers();
  const eventsAll = useEvents();
  const txns = useTransactions();
  const leadersStore = useLeaders();
  const eldersStore = useElders();
  const newsStore = useNews();
  const [today, setToday] = useState<{ weekday: string; full: string }>({ weekday: "", full: "" });
  useEffect(() => {
    const d = new Date();
    setToday({
      weekday: d.toLocaleDateString("lo-LA", { weekday: "long" }),
      full: d.toLocaleDateString("lo-LA", { year: "numeric", month: "long", day: "numeric" }),
    });
  }, []);

  // ----- Member stats -----
  const totalMembers = MEMBERS.length;
  const aliveCount = MEMBERS.filter((m: any) => m.status === "alive").length;
  const deceasedCount = totalMembers - aliveCount;
  const generations = new Set(MEMBERS.map((m: any) => m.gen));
  const totalGens = generations.size;
  const branches = new Set(MEMBERS.map((m: any) => m.branch));
  const totalBranches = branches.size;

  // ----- Live leadership & elders: prefer page-store; fall back to member-derived counts
  // so the numbers show immediately on first load (before user visits those pages).
  const leadersAll = leadersStore.filter((l: any) => l.active !== false);
  const eldersAll = eldersStore.filter((e: any) => e.active !== false);
  const leadersCount = leadersAll.length;
  const eldersCount = eldersAll.length;

  // ----- Event stats (computed from date/time) -----
  const eventsUpcoming = eventsAll.filter((e: any) => getEventStatus(e) === "upcoming").length;
  const eventsPast = eventsAll.filter((e: any) => getEventStatus(e) === "past").length;

  // ----- Finance stats from transactions store -----
  const income = txns.filter((t: any) => t.direction !== "expense").reduce((a: number, t: any) => a + Math.abs(t.amount || 0), 0);
  const expense = txns.filter((t: any) => t.direction === "expense").reduce((a: number, t: any) => a + Math.abs(t.amount || 0), 0);
  const balance = income - expense;
  const donors = new Set(txns.filter((t: any) => t.direction !== "expense").map((t: any) => t.donor || t.from || t.note)).size;

  const fmtKip = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `₭ ${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `₭ ${(n / 1_000).toFixed(0)}K`;
    return `₭ ${n.toLocaleString()}`;
  };

  const latestGen = generations.size ? Math.max(...Array.from(generations as Set<number>).map(Number).filter((n) => !Number.isNaN(n))) : 0;
  const latestNewsCount = newsStore.length;

  const stats = [
    { label: "ສະມາຊິກທັງໝົດ", value: String(totalMembers), growth: `${aliveCount} ເຄື່ອນໄຫວ · ${deceasedCount} ລ່ວງລັບ`, icon: "members", colorClass: "text-primary", bgClass: "bg-primary/8", to: "/members" },
    { label: "ຄະນະນຳ", value: String(leadersCount), growth: "ຄະນະນຳປັດຈຸບັນ", icon: "leadership", colorClass: "text-primary", bgClass: "bg-primary/8", to: "/leadership" },
    { label: "ຜູ້ອາວຸໂສ", value: String(eldersCount), growth: "ລາຍຊື່ຜູ້ອາວຸໂສ", icon: "elders", colorClass: "text-primary", bgClass: "bg-primary/8", to: "/elders" },
    { label: "ຈຳນວນລຸ້ນ", value: String(totalGens), growth: latestGen ? `ລຸ້ນລ່າສຸດ: ລຸ້ນທີ ${latestGen} (Phaj ${latestGen})` : `${totalBranches} ກຸ່ມ`, icon: "tree", colorClass: "text-primary", bgClass: "bg-primary/8", to: "/members" },
    { label: "ກິດຈະກຳ", value: String(eventsAll.length), growth: `${eventsUpcoming} ກຳລັງຈະຈັດ · ${eventsPast} ຜ່ານມາແລ້ວ`, icon: "activities", colorClass: "text-primary", bgClass: "bg-primary/8", to: "/activities" },
    { label: "ຂ່າວສານ", value: String(latestNewsCount), growth: latestNewsCount ? "ຂ່າວທັງໝົດ" : "ຍັງບໍ່ມີຂ່າວ", icon: "news", colorClass: "text-primary", bgClass: "bg-primary/8", to: "/news" },
  ];

  // ----- Recent members (highest id = newest) -----
  const recentMembers = [...MEMBERS]
    .sort((a: any, b: any) => b.id - a.id)
    .slice(0, 5)
    .map((m: any) => ({
      id: m.id, name: m.name, gen: `ລຸ້ນທີ ${m.gen} (Phaj ${m.gen})`, role: m.role,
      initials: deriveInitials(m.name), roleColor: roleColorFor(m.role),
    }));

  // ----- Top leaders preview (store first, fallback to derived list from members)
  const leadersSource = leadersStore;
  const leadersDisplay = leadersSource.slice(0, 3).map((l: any) => ({
    id: l.memberId ?? l.id,
    name: l.name,
    position: l.position || l.role || "—",
    gen: l.generation || (l.gen ? `ລຸ້ນທີ ${l.gen} (Phaj ${l.gen})` : ""),
    branch: l.lineage || l.branch || "",
    initials: l.initials || deriveInitials(l.name || ""),
  }));

  // ----- News preview (from news store) -----
  const newsPreview = [...newsStore]
    .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 4)
    .map((n: any) => ({
      id: n.id,
      title: n.title,
      cat: n.category,
      date: n.date,
      author: n.author,
      pinned: !!n.pinned,
      summary: n.summary,
      image: n.image,
    }));

  // ----- Events preview (upcoming first, then past) -----
  const eventsPreview = [...eventsAll]
    .map((e: any) => ({ ...e, _status: getEventStatus(e) }))
    .sort((a: any, b: any) => (a._status === "upcoming" ? -1 : 1) - (b._status === "upcoming" ? -1 : 1))
    .slice(0, 3)
    .map((e: any) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      location: e.location,
      count: e.attendees ?? 0,
      status: e._status,
    }));

  // ----- Recent transactions for finance card -----
  const recentTxns = txns.slice(0, 4).map((t: any) => ({
    desc: t.desc || t.note || t.description || t.title || "ທຸລະກຳ",
    amount: (t.direction === "expense" ? "-" : "+") + Math.abs(t.amount || 0).toLocaleString(),
    type: t.direction === "expense" ? "out" : "in",
    date: t.date,
  }));

  // ----- Members per generation (bar chart) -----
  const genCounts: Record<number, number> = {};
  for (const m of MEMBERS) genCounts[m.gen] = (genCounts[m.gen] || 0) + 1;
  const monthData = Object.keys(genCounts)
    .map((g) => Number(g))
    .sort((a, b) => a - b)
    .map((g) => ({ label: `Phaj ${g}`, value: genCounts[g] }));

  // ----- Gender split -----
  const maleCount = MEMBERS.filter((m: any) => m.gender === "M").length;
  const femaleCount = MEMBERS.filter((m: any) => m.gender === "F").length;
  const otherCount = totalMembers - maleCount - femaleCount;
  const genderData = [
    { label: "ຊາຍ", value: maleCount, color: "#1e3a5f" },
    { label: "ຍິງ", value: femaleCount, color: "#8b5cf6" },
    ...(otherCount > 0 ? [{ label: "ອື່ນໆ", value: otherCount, color: "#f59e0b" }] : []),
  ];

  // ----- Elders preview (store first, fallback to derived list from members)
  const eldersSource = eldersAll;
  const eldersPreview = [...eldersSource]
    .slice(0, 4)
    .map((e: any) => ({
      id: e.id,
      name: e.name || "—",
      role: e.role || e.position || "ຜູ້ອາວຸໂສ",
      gen: e.generation || (e.gen ? `ລຸ້ນທີ ${e.gen} (Phaj ${e.gen})` : ""),
      initials: e.initials || deriveInitials(e.name || ""),
    }));

  // ----- Upcoming activities -----
  const upcomingEvents = eventsAll
    .filter((e: any) => getEventStatus(e) === "upcoming")
    .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 4);

  // ----- Income vs Expense bar -----
  const finBarMax = Math.max(income, expense, 1);
  const finBars = [
    { label: "ລາຍຮັບ", value: income, color: "#10b981" },
    { label: "ລາຍຈ່າຍ", value: expense, color: "#f43f5e" },
    { label: "ຄົງເຫຼືອ", value: Math.max(balance, 0), color: "#1e3a5f" },
  ];

  // ----- Monthly activities (last 6 months) -----
  const now = new Date();
  const monthsArr: { key: string; label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthsArr.push({ key, label: `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`, value: 0 });
  }
  for (const e of eventsAll as any[]) {
    const k = String(e.date || "").slice(0, 7);
    const m = monthsArr.find((x) => x.key === k);
    if (m) m.value += 1;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">

      {/* Page header — clean, professional */}
      <div className="flex flex-col gap-3 pb-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Kwv Tij Hmoob Xyooj
          </h1>
          <p className="text-sm text-muted-foreground">
            ພາບລວມຂໍ້ມູນຂອງສະມາຊິກ, ຄະນະນຳ, ຜູ້ອາວຸໂສ ແລະ ກິດຈະກຳ
          </p>
        </div>
        <div className="text-left sm:text-right sm:pt-1">
          <p className="text-sm font-semibold text-foreground">
            {today.weekday}
          </p>
          <p className="text-xs text-muted-foreground">
            {today.full}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s, i) => (
          <Card
            key={i}
            onClick={() => navigate({ to: s.to })}
            className="group cursor-pointer rounded-lg border border-border bg-card shadow-none transition-all duration-150 hover:border-primary/30 hover:shadow-sm"
          >
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-md ${s.bgClass} ${s.colorClass}`}>
                  <span className="h-[18px] w-[18px]">{icons[s.icon] || icons.members}</span>
                </div>
              </div>
              <div>
                <p className="text-[22px] font-semibold tracking-tight text-foreground">{s.value}</p>
                <p className="mt-0.5 text-[11.5px] font-medium text-muted-foreground">{s.label}</p>
                <p className="mt-1.5 text-[10.5px] text-muted-foreground/80">{s.growth}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="quick-actions rounded-lg border border-border bg-card shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">ການດຳເນີນການດ່ວນ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {quickActions.map((a, i) => (
              <button
                key={i}
                onClick={() => navigate({ to: a.to, search: (a as any).search } as any)}
                className="group flex cursor-pointer flex-col items-center gap-2 rounded-md border border-border bg-background p-3 text-center transition-colors hover:border-primary/30 hover:bg-muted/50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/8 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <span className="h-[16px] w-[16px]">{icons[a.icon] || icons.plus}</span>
                </div>
                <span className="text-[11px] font-medium leading-tight text-muted-foreground group-hover:text-foreground">{a.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Row: Recent Members + Finance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Members */}
        <Card className="rounded-lg border border-border bg-card shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">ສະມາຊິກໃໝ່</CardTitle>
            <ViewAllButton to="/members" />

          </CardHeader>
          <CardContent className="space-y-1">
            {recentMembers.map((m, i) => (
              <div key={i} onClick={() => navigate({ to: "/members", search: { member: m.id } })} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/60">
                <Avatar className="h-9 w-9 shrink-0 rounded-md">
                  <AvatarFallback className="rounded-md bg-primary/8 text-xs font-semibold text-primary">
                    {m.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.gen}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 border-0 bg-muted text-[10px] font-medium text-muted-foreground">
                  {m.role}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Finance */}
        <Card className="rounded-lg border border-border bg-card shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">ສະຫຼຸບການເງິນ</CardTitle>
            <ViewAllButton to="/finance" />

          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "ຍອດຄົງເຫຼືອ", value: fmtKip(balance), colorClass: "text-foreground", bgClass: "bg-muted/60" },
                { label: "ລາຍຮັບ", value: fmtKip(income), colorClass: "text-emerald-700 dark:text-emerald-400", bgClass: "bg-muted/60" },
                { label: "ລາຍຈ່າຍ", value: fmtKip(expense), colorClass: "text-rose-700 dark:text-rose-400", bgClass: "bg-muted/60" },
                { label: "ທຸລະກຳ", value: String(txns.length), colorClass: "text-foreground", bgClass: "bg-muted/60" },
              ].map((f, i) => (
                <div key={i} className={`rounded-md border border-border p-3 ${f.bgClass}`}>
                  <p className="text-[11px] font-medium text-muted-foreground">{f.label}</p>
                  <p className={`mt-0.5 text-base font-semibold ${f.colorClass}`}>{f.value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">ທຸລະກຳລ່າສຸດ</p>
              <div className="space-y-0">
                {recentTxns.length === 0 && (
                  <p className="text-xs text-muted-foreground py-3">ຍັງບໍ່ມີທຸລະກຳ</p>
                )}
                {recentTxns.map((t, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm">{t.desc}</p>
                        <p className="text-xs text-muted-foreground">{t.date}</p>
                      </div>
                      <span className={`text-sm font-semibold ${t.type === "in" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                        {t.amount}
                      </span>
                    </div>
                    {i < recentTxns.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row: Leadership + Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Leadership */}
        <Card className="rounded-lg border border-border bg-card shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">ຄະນະນຳ</CardTitle>
            <ViewAllButton to="/leadership" />
          </CardHeader>

          <CardContent className="space-y-2">
            {leadersDisplay.map((l, i) => (
              <div
                key={i}
                onClick={() => navigate({ to: "/members", search: { member: l.id } })}
                className="group flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
              >
                <Avatar className="h-10 w-10 shrink-0 rounded-md">
                  <AvatarFallback className="rounded-md bg-primary/8 text-sm font-semibold text-primary">
                    {l.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.name}</p>
                  <p className="truncate text-xs font-medium text-primary">{l.position}</p>
                  <p className="text-xs text-muted-foreground">{l.gen} · {l.branch}</p>
                </div>
                <span className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground">{icons.chevron}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Events */}
        <Card className="rounded-lg border border-border bg-card shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">ກິດຈະກຳ</CardTitle>
            <ViewAllButton to="/activities" />
          </CardHeader>

          <CardContent className="space-y-2">
            {eventsPreview.length === 0 && (
              <p className="text-xs text-muted-foreground py-3">ຍັງບໍ່ມີກິດຈະກຳ</p>
            )}
            {eventsPreview.map((e, i) => (
              <div
                key={i}
                onClick={() => navigate({ to: "/activities" })}
                className="cursor-pointer space-y-2 rounded-md border border-border p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug">{e.title}</p>
                  <Badge
                    variant="secondary"
                    className={`shrink-0 border-0 text-[10px] font-medium ${e.status === "upcoming" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                  >
                    {EVENT_STATUS[e.status]?.label ?? e.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3">{icons.calendar}</span>
                    {e.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3">{icons.location}</span>
                    {e.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3">{icons.users}</span>
                    {e.count}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Row: News + Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* News */}
        <Card className="rounded-lg border border-border bg-card shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">ຂ່າວສານ</CardTitle>
            <ViewAllButton to="/news" />

          </CardHeader>
          <CardContent className="space-y-2">
            {newsPreview.length === 0 && (
              <p className="py-3 text-xs text-muted-foreground">ຍັງບໍ່ມີຂ່າວສານ</p>
            )}
            {newsPreview.map((n) => (
              <div
                key={n.id}
                onClick={() => navigate({ to: "/news" })}
                className="cursor-pointer space-y-1.5 rounded-md border border-border p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
              >
                <div className="flex items-start gap-3">
                  {n.image && (
                    <img
                      src={n.image}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug">{n.title}</p>
                      {n.pinned && (
                        <Badge variant="secondary" className="flex shrink-0 items-center gap-1 border-0 bg-primary/10 text-[10px] font-medium text-primary">
                          <span className="h-3 w-3">{icons.pin}</span>
                          ປັກໝຸດ
                        </Badge>
                      )}
                    </div>
                    {n.summary && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{n.summary}</p>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{n.cat}</span>
                      <span>·</span>
                      <span>{n.date}</span>
                      {n.author && (
                        <>
                          <span>·</span>
                          <span>{n.author}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card className="rounded-lg border border-border bg-card shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">ສະຖິຕິ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">ສະມາຊິກຕາມລຸ້ນ</p>
              <BarChart data={monthData} />
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">ລາຍຮັບ ທຽບ ລາຍຈ່າຍ</p>
              <div className="space-y-2">
                {finBars.map((b, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{b.label}</span>
                      <span className="font-semibold text-foreground">{fmtKip(b.value)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(b.value / finBarMax) * 100}%`, backgroundColor: b.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">ສັດສ່ວນເພດ</p>
              <div className="flex items-center gap-5">
                <DonutChart segments={genderData} />
                <div className="space-y-2">
                  {genderData.map((g, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                      <span className="text-xs text-muted-foreground">{g.label}</span>
                      <span className="text-xs font-semibold">{g.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">ກິດຈະກຳ 6 ເດືອນຍ້ອນຫຼັງ</p>
              <BarChart data={monthsArr.map(({ label, value }) => ({ label, value: value || 0 }))} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row: Elders + Upcoming Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-lg border border-border bg-card shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">ຜູ້ອາວຸໂສ</CardTitle>
            <ViewAllButton to="/elders" />

          </CardHeader>
          <CardContent className="space-y-2">
            {eldersPreview.length === 0 && (
              <p className="py-3 text-xs text-muted-foreground">ຍັງບໍ່ມີຂໍ້ມູນຜູ້ອາວຸໂສ</p>
            )}
            {eldersPreview.map((e) => (
              <div
                key={e.id}
                onClick={() => navigate({ to: "/elders" })}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
              >
                <Avatar className="h-10 w-10 shrink-0 rounded-md">
                  <AvatarFallback className="rounded-md bg-violet-500/10 text-sm font-semibold text-violet-700">
                    {e.initials || "ຜ"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{e.role}{e.gen ? ` · ${e.gen}` : ""}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-border bg-card shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">ກິດຈະກຳທີ່ກຳລັງຈະມາ</CardTitle>
            <ViewAllButton to="/activities" />

          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingEvents.length === 0 && (
              <p className="py-3 text-xs text-muted-foreground">ຍັງບໍ່ມີກິດຈະກຳທີ່ກຳລັງຈະມາ</p>
            )}
            {upcomingEvents.map((e: any) => (
              <div
                key={e.id}
                onClick={() => navigate({ to: "/activities" })}
                className="cursor-pointer space-y-2 rounded-md border border-border p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug">{e.title}</p>
                  <Badge variant="secondary" className="shrink-0 border-0 bg-primary/10 text-[10px] font-medium text-primary">
                    ກຳລັງຈະມາ
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-3 w-3">{icons.calendar}</span>{e.date}{e.time ? ` · ${e.time}` : ""}</span>
                  {e.location && <span className="flex items-center gap-1"><span className="h-3 w-3">{icons.location}</span>{e.location}</span>}
                  <span className="flex items-center gap-1"><span className="h-3 w-3">{icons.users}</span>{e.attendees ?? 0}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
