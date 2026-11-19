// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/finance")({
  validateSearch: (search: Record<string, unknown>) => ({
    event: search.event != null ? Number(search.event) : undefined,
    action: typeof search.action === "string" ? search.action : undefined,
  }),
  head: () => ({
    meta: [
      { title: "ການເງິນ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ການເງິນ — ລະບົບຄຸ້ມຄອງຂໍ້ມູນຕະກູນ" },
      { property: "og:title", content: "ການເງິນ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { property: "og:description", content: "ການເງິນ — ລະບົບຄຸ້ມຄອງຂໍ້ມູນຕະກູນ" },
    ],
  }),
  component: FinancePage,
});

import { useState, useEffect } from "react";

import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Users,
  Gem,
  Search,
  Plus,
  Eye,
  Pencil,
  X,
  Banknote,
  Receipt,
  AlertTriangle,
  ArrowDownLeft,
  CircleDollarSign,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EventCombobox } from "@/components/event-combobox";
import { EVENT_STATUS } from "@/lib/events-data";
import { useTransactions, addTransaction, updateTransaction, deleteTransaction, eventTotals } from "@/lib/treasury-store";
import { useEvents } from "@/lib/events-store";
import { useAllParticipants } from "@/lib/participants-store";
import { MEMBERS, useMembers, getMemberById } from "@/lib/members-data";
import { SearchableMemberSelect } from "@/components/searchable-member-select";
import { usePermissions } from "@/lib/permissions";

import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

const LAO_MONTH_ABBR = ["ມ.ກ","ກ.ພ","ມ.ນ","ເ.ມ","ພ.ພ","ມິ.ຖ","ກ.ລ","ສ.ຫ","ກ.ຍ","ຕ.ລ","ພ.ຈ","ທ.ວ"];

function formatLAK(amount) {
  const abs = Math.abs(amount);
  if (abs >= 1000000) return (abs / 1000000).toFixed(1) + "M ₭";
  if (abs >= 1000) return (abs / 1000).toFixed(0) + "K ₭";
  return abs.toLocaleString() + " ₭";
}

function CountUp({ target, duration = 1500 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <span>{val.toLocaleString()}</span>;
}

const typeLabel = { contribution: "ຄ່າທຳນຽມ", donation: "ບໍລິຈາກ", expense: "ລາຍຈ່າຍ", emergency: "ສຸກເສີນ", "treasury withdrawal": "ຖອນ" };
const statusLabel = { completed: "ສຳເລັດ", pending: "ລໍຖ້າ", cancelled: "ຍົກເລີກ", refunded: "ຄືນເງິນ" };

function typeBadgeClass(type) {
  if (type === "contribution" || type === "donation") return "bg-emerald-600/10 text-emerald-700 border-emerald-600/20";
  if (type === "emergency") return "bg-amber-600/10 text-amber-700 border-amber-600/20";
  return "bg-rose-600/10 text-rose-700 border-rose-600/20";
}

function statusBadgeClass(status) {
  if (status === "completed") return "bg-emerald-600/10 text-emerald-700 border-emerald-600/20";
  if (status === "pending") return "bg-amber-600/10 text-amber-700 border-amber-600/20";
  if (status === "refunded") return "bg-sky-600/10 text-sky-700 border-sky-600/20";
  return "bg-rose-600/10 text-rose-700 border-rose-600/20";
}

function FinancePage() {
  const navigate = useNavigate();
  const perms = usePermissions();
  const canManageFinance = perms.canCreate("finance");

  const { event: deepLinkEventId, action: deepLinkAction } = Route.useSearch();
  // Reactive subscriptions so KPIs recompute when stores change.
  useMembers();
  const EVENTS = useEvents();
  const allParticipants = useAllParticipants();
  const getEventById = (id) => EVENTS.find((e) => e.id === id) ?? null;
  const [activeFilter, setActiveFilter] = useState("ທັງໝົດ");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("ທັງໝົດ");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("income");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [chartHover, setChartHover] = useState(null);
  const [viewTxn, setViewTxn] = useState<any>(null);
  const [editTxn, setEditTxn] = useState<any>(null);
  const [deleteTxn, setDeleteTxn] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({ amount: "", method: "", category: "", note: "", contributor: "" });
  useEffect(() => {
    if (editTxn) setEditForm({
      amount: String(Math.abs(editTxn.amount ?? editTxn.amount_raw ?? 0)),
      method: editTxn.method ?? "",
      category: editTxn.category ?? "",
      note: editTxn.note ?? "",
      contributor: editTxn.contributor ?? "",
    });
  }, [editTxn]);
  const setEF = (k, v) => setEditForm((f) => ({ ...f, [k]: v }));
  const handleSaveEdit = () => {
    if (!editTxn) return;
    const amt = Number(editForm.amount);
    if (!amt || amt <= 0) { toast.error("ກະລຸນາປ້ອນຈຳນວນເງິນທີ່ຖືກຕ້ອງ"); return; }
    updateTransaction(editTxn.id, {
      amount: amt,
      method: editForm.method,
      category: editForm.category,
      note: editForm.note,
      contributor: editForm.contributor,
    });
    toast.success("ບັນທຶກການແກ້ໄຂສຳເລັດ");
    setEditTxn(null);
  };

  // ── Event-linked transactions (realtime store) ──────────────────────────
  const storeTxns = useTransactions();
  const emptyForm = { type: "", eventId: null, memberId: null, party: "", amount: "", method: "", category: "", note: "" };
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  function openModal(type, presetEventId = null) {
    setModalType(type);
    setForm({ ...emptyForm, type: type === "expense" ? "ລາຍຈ່າຍ" : "ຄ່າທຳນຽມ", eventId: presetEventId });
    setFormError("");
    setShowModal(true);
  }

  // Deep-link: ?event=<id>&action=income|expense pre-opens the add modal
  useEffect(() => {
    if (deepLinkEventId != null && EVENTS.some((e) => e.id === deepLinkEventId)) {
      openModal(deepLinkAction === "expense" ? "expense" : "income", deepLinkEventId);
      navigate({ to: "/finance", search: {}, replace: true } as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkEventId, deepLinkAction]);

  function handleSave() {
    setFormError("");
    if (!form.type) { setFormError("ກະລຸນາເລືອກປະເພດທຸລະກຳ"); return; }
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { setFormError("ກະລຸນາປ້ອນຈຳນວນເງິນທີ່ຖືກຕ້ອງ"); return; }
    let contributorName = form.party?.trim() || "";
    if (form.memberId) {
      const m = getMemberById(form.memberId);
      if (m) contributorName = m.name;
    }
    const ev = form.eventId ? getEventById(form.eventId) : null;
    const res = addTransaction({
      direction: modalType === "income" ? "income" : "expense",
      type: form.type,
      eventId: form.eventId ?? null,
      eventTitle: ev?.title ?? "",
      memberId: form.memberId ?? null,
      contributor: contributorName,
      amount: amt,
      method: form.method || "ເງິນສົດ",
      category: form.category || (modalType === "income" ? "ບໍລິຈາກ" : "ລາຍຈ່າຍ"),
      note: form.note,
      description: form.note || "",
    });
    Promise.resolve(res).then((id) => {
      if (id) {
        toast.success(modalType === "income" ? "ບັນທຶກລາຍຮັບສຳເລັດ" : "ບັນທຶກລາຍຈ່າຍສຳເລັດ");
        setShowModal(false);
      }
    });
  }


  // Map store transactions to the table/summary shape, then merge with legacy data.
  const linkedTxns = storeTxns.map(t => ({
    id: t.id,
    date: t.date,
    type: t.direction === "expense" ? "expense" : (t.type === "ບໍລິຈາກ" ? "donation" : t.type === "ສຸກເສີນ" ? "emergency" : "contribution"),
    event: t.eventTitle,
    eventId: t.eventId,
    memberId: t.memberId ?? null,
    contributor: t.contributor,
    category: t.category,
    amount: t.direction === "expense" ? -Math.abs(t.amount) : Math.abs(t.amount),
    method: t.method,
    status: "completed",
    note: t.note,
  }));
  const allTransactions = linkedTxns;

  const filters = ["ທັງໝົດ", "ລາຍຮັບ", "ລາຍຈ່າຍ", "ບໍລິຈາກ", "ກິດຈະກຳ", "ຄ່າໃຊ້ຈ່າຍສຸກເສີນ"];
  const dateFilters = ["ມື້ນີ້", "ເດືອນນີ້", "ປີນີ້", "ທັງໝົດ"];

  const totalIncome = allTransactions.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0);
  const totalExpense = allTransactions.filter(t => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0);
  const balance = totalIncome - totalExpense;

  // Derive monthly income/expense from the live transaction store.
  const monthlyData = (() => {
    const buckets = LAO_MONTH_ABBR.map((m) => ({ month: m, income: 0, expense: 0 }));
    for (const t of allTransactions) {
      const d = t.date ? new Date(t.date) : null;
      if (!d || isNaN(d.getTime())) continue;
      const idx = d.getMonth();
      if (t.amount > 0) buckets[idx].income += t.amount;
      else buckets[idx].expense += Math.abs(t.amount);
    }
    return buckets;
  })();
  const maxBar = Math.max(1, ...monthlyData.map(d => Math.max(d.income, d.expense)));

  // Derive top contributors from the live transaction store.
  const topContributors = (() => {
    const totals = new Map();
    for (const t of allTransactions) {
      if (t.amount <= 0 || t.memberId == null) continue;
      const cur = totals.get(t.memberId) ?? { amount: 0, count: 0 };
      totals.set(t.memberId, { amount: cur.amount + t.amount, count: cur.count + 1 });
    }
    return Array.from(totals.entries())
      .map(([memberId, v]) => {
        const m = getMemberById(memberId);
        return m ? { memberId, name: m.name, amount: v.amount, count: v.count } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  })();

  // Derive expense categories from the live transaction store.
  const expenseCategories = (() => {
    const palette = ["bg-emerald-500","bg-sky-500","bg-amber-500","bg-rose-500","bg-violet-500","bg-teal-500"];
    const sums = new Map();
    let total = 0;
    for (const t of allTransactions) {
      if (t.amount >= 0) continue;
      const key = t.category || "ອື່ນໆ";
      const abs = Math.abs(t.amount);
      sums.set(key, (sums.get(key) ?? 0) + abs);
      total += abs;
    }
    if (total === 0) return [];
    return Array.from(sums.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value], i) => ({
        label,
        pct: Math.round((value / total) * 100),
        barClass: palette[i % palette.length],
      }));
  })();

  // Derive event finance breakdown from the live event + transaction stores.
  const eventFinances = EVENTS.map((ev) => {
    const totals = eventTotals(storeTxns, ev.id);
    const contributors = new Set(
      storeTxns
        .filter((t) => t.eventId === ev.id && t.direction !== "expense" && t.memberId != null)
        .map((t) => t.memberId),
    ).size;
    return {
      id: ev.id,
      title: ev.title,
      category: ev.category,
      collected: totals.income,
      expenses: totals.expense,
      contributors,
      attendees: Number(ev.attendees) || 0,
    };
  });

  // Live totals for the event currently chosen in the form
  const formEvent = form.eventId ? getEventById(form.eventId) : null;
  const formEventTotals = form.eventId ? eventTotals(storeTxns, form.eventId) : null;

  const filteredTxn = allTransactions.filter(t => {
    const matchSearch = search === "" ||
      t.contributor.toLowerCase().includes(search.toLowerCase()) ||
      (t.event || "").toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === "ທັງໝົດ" ||
      (activeFilter === "ລາຍຮັບ" && t.amount > 0) ||
      (activeFilter === "ລາຍຈ່າຍ" && t.amount < 0 && t.type !== "emergency") ||
      (activeFilter === "ບໍລິຈາກ" && t.type === "donation") ||
      (activeFilter === "ກິດຈະກຳ" && t.type === "contribution") ||
      (activeFilter === "ຄ່າໃຊ້ຈ່າຍສຸກເສີນ" && t.type === "emergency");
    return matchSearch && matchFilter;
  });

  const uniqueDonors = new Set(
    allTransactions
      .filter((t) => t.amount > 0 && (t.contributor || "").trim())
      .map((t) => t.contributor.trim()),
  ).size;
  const txnCount = allTransactions.length;
  const summaryCards = [
    { icon: Wallet, label: "ຍອດຄົງເຫຼືອ", value: balance, trend: "", isCount: false, colorClass: "text-emerald-600", bgClass: "bg-emerald-600/10" },
    { icon: TrendingUp, label: "ລາຍຮັບລວມ", value: totalIncome, trend: "", isCount: false, colorClass: "text-sky-600", bgClass: "bg-sky-600/10" },
    { icon: TrendingDown, label: "ລາຍຈ່າຍລວມ", value: totalExpense, trend: "", isCount: false, colorClass: "text-rose-600", bgClass: "bg-rose-600/10" },
    { icon: CalendarDays, label: "ຈຳນວນກິດຈະກຳ", value: EVENTS.length, trend: "", isCount: true, colorClass: "text-violet-600", bgClass: "bg-violet-600/10" },
    { icon: Users, label: "ຜູ້ບໍລິຈາກ", value: uniqueDonors, trend: "", isCount: true, colorClass: "text-amber-600", bgClass: "bg-amber-600/10" },
    { icon: Gem, label: "ຈຳນວນທຸລະກຳ", value: txnCount, trend: "", isCount: true, colorClass: "text-teal-600", bgClass: "bg-teal-600/10" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            ຄັງເງິນຕະກູນ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ຈັດການລາຍຮັບ, ລາຍຈ່າຍ, ເງິນຊ່ວຍເຫຼືອ ແລະ ການເງິນຂອງກິດຈະກຳ
          </p>
        </div>
        {canManageFinance && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => openModal("income")} className="gap-1.5">
              <Plus className="h-4 w-4" /> ເພີ່ມລາຍຮັບ
            </Button>
            <Button size="sm" variant="outline" onClick={() => openModal("expense")} className="gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50">
              <Plus className="h-4 w-4" /> ເພີ່ມລາຍຈ່າຍ
            </Button>
          </div>
        )}
      </div>


      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className="rounded-xl border bg-card shadow-sm">
              <CardContent className="p-4">
                <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${card.bgClass}`}>
                  <Icon className={`h-4 w-4 ${card.colorClass}`} />
                </div>
                <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                <p className={`text-base font-bold ${card.colorClass}`}>
                  {card.isCount
                    ? <CountUp target={card.value} />
                    : <><CountUp target={Math.abs(Math.round(card.value / 1000))} /> K ₭</>}
                </p>
                {card.trend ? (
                  <span className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${card.bgClass} ${card.colorClass}`}>
                    {card.trend}
                  </span>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Income vs Expense bar chart */}
        <Card className="rounded-xl border bg-card shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">ລາຍຮັບ vs ລາຍຈ່າຍ</CardTitle>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-primary" />ລາຍຮັບ</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-destructive" />ລາຍຈ່າຍ</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex h-28 items-end gap-1.5">
              {monthlyData.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1"
                  onMouseEnter={() => setChartHover(i)} onMouseLeave={() => setChartHover(null)}>
                  <div className="flex w-full gap-0.5 items-end" style={{ height: 96 }}>
                    <div
                      className={`flex-1 rounded-t transition-all duration-300 ${chartHover === i ? "bg-primary" : "bg-primary/50"}`}
                      style={{ height: `${(d.income / maxBar) * 100}%` }}
                    />
                    <div
                      className={`flex-1 rounded-t transition-all duration-300 ${chartHover === i ? "bg-destructive" : "bg-destructive/50"}`}
                      style={{ height: `${(d.expense / maxBar) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{d.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top contributors */}
        <Card className="rounded-xl border bg-card shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">ຜູ້ບໍລິຈາກອັນດັບຕົ້ນ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topContributors.length === 0 && (
              <p className="text-xs text-muted-foreground italic">ຍັງບໍ່ມີຂໍ້ມູນ</p>
            )}
            {topContributors.map((c, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <button
                    type="button"
                    onClick={() => c.memberId != null && navigate({ to: "/members", search: { member: c.memberId } })}
                    className="flex items-center gap-2 min-w-0 text-left hover:text-emerald-600 transition-colors"
                  >
                    <span className="text-xs font-bold text-emerald-600 w-5">#{i + 1}</span>
                    <span className="text-xs text-foreground hover:underline break-words">{c.name}</span>
                  </button>
                  <span className="text-xs font-semibold text-emerald-600">{formatLAK(c.amount)}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${(c.amount / (topContributors[0]?.amount || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Expense categories */}
        <Card className="rounded-xl border bg-card shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">ໝວດລາຍຈ່າຍ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expenseCategories.length === 0 && (
              <p className="text-xs text-muted-foreground italic">ຍັງບໍ່ມີຂໍ້ມູນ</p>
            )}
            {expenseCategories.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${item.barClass}`} />
                <span className="text-xs text-muted-foreground flex-1">{item.label}</span>
                <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${item.barClass}`} style={{ width: `${item.pct}%` }} />
                </div>
                <span className="text-xs font-medium text-foreground w-7 text-right">{item.pct}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="rounded-xl border bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ຄົ້ນຫາລາຍການ..."
                className="pl-8 text-sm h-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    activeFilter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >{f}</button>
              ))}
            </div>
            <div className="flex gap-1">
              {dateFilters.map(d => (
                <button
                  key={d}
                  onClick={() => setDateRange(d)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-all border ${
                    dateRange === d
                      ? "border-primary/40 bg-primary/10 text-primary font-medium"
                      : "border-border bg-transparent text-muted-foreground hover:bg-muted"
                  }`}
                >{d}</button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions — table on md+, cards on mobile */}
      <Card className="rounded-xl border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">ລາຍການທຸລະກຳ</CardTitle>
            <span className="text-xs text-muted-foreground">{filteredTxn.length} ລາຍການ</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  {["ID", "ວັນທີ", "ປະເພດ", "ກິດຈະກຳ", "ຜູ້ກ່ຽວຂ້ອງ", "ໝວດ", "ຈຳນວນ", "ວິທີຊຳລະ", "ສະຖານະ", ""].map(h => (
                    <TableHead key={h} className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTxn.map(t => (
                  <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">{t.id}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{t.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${typeBadgeClass(t.type)}`}>
                        {typeLabel[t.type] || t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs break-words">{t.event}</TableCell>
                    <TableCell className="text-xs">
                      {(() => {
                        const m = t.memberId ? getMemberById(t.memberId) : null;
                        if (!m) return <span className="block break-words">{t.contributor}</span>;
                        const addr = m.village + (m.province && m.province !== "-" ? `, ${m.province}` : "");
                        return (
                          <button
                            type="button"
                            onClick={() => navigate({ to: "/members", search: { member: m.id } })}
                            className="text-left hover:text-emerald-700"
                          >
                            <div className="break-words">
                              <span className="font-medium hover:underline">{m.name}</span>
                              <span className="text-muted-foreground"> · {addr}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground">Phaj {m.gen}</div>
                          </button>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.category}</TableCell>
                    <TableCell className={`text-xs font-bold whitespace-nowrap ${t.amount > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {t.amount > 0 ? "+" : ""}{formatLAK(t.amount)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.method}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${statusBadgeClass(t.status)}`}>
                        {statusLabel[t.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="ເບິ່ງລາຍລະອຽດ" onClick={() => setViewTxn(t)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="ແກ້ໄຂ" onClick={() => setEditTxn(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50" title="ລຶບ" onClick={() => setDeleteTxn(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile stacked cards */}
          <div className="sm:hidden divide-y divide-border">
            {filteredTxn.map(t => (
              <div key={t.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    {(() => {
                      const m = t.memberId ? getMemberById(t.memberId) : null;
                      if (!m) return (
                        <>
                          <p className="text-sm font-medium leading-tight">{t.contributor}</p>
                          <p className="text-xs text-muted-foreground">{t.event}</p>
                        </>
                      );
                      const addr = m.village + (m.province && m.province !== "-" ? `, ${m.province}` : "");
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => navigate({ to: "/members", search: { member: m.id } })}
                            className="text-sm font-medium leading-tight text-left hover:text-emerald-700"
                          >
                            <span className="hover:underline">{m.name}</span>
                            <span className="text-muted-foreground"> · {addr}</span>
                          </button>
                          <p className="text-[11px] text-muted-foreground">Phaj {m.gen} · {t.event}</p>
                        </>
                      );
                    })()}
                  </div>
                  <span className={`text-sm font-bold whitespace-nowrap ${t.amount > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {t.amount > 0 ? "+" : ""}{formatLAK(t.amount)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className={`text-[10px] ${typeBadgeClass(t.type)}`}>{typeLabel[t.type] || t.type}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${statusBadgeClass(t.status)}`}>{statusLabel[t.status]}</Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">{t.id}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{t.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{t.method} · {t.category}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="ເບິ່ງລາຍລະອຽດ" onClick={() => setViewTxn(t)}><Eye className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="ແກ້ໄຂ" onClick={() => setEditTxn(t)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50" title="ລຶບ" onClick={() => setDeleteTxn(t)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Event finance cards */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">ການເງິນກິດຈະກຳ</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {eventFinances.map(ev => {
            const pct = Math.min((ev.expenses / ev.collected) * 100, 100);
            const remaining = ev.collected - ev.expenses;
            return (
              <Card
                key={ev.id}
                className="rounded-xl border bg-card shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => setSelectedEvent(ev)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold leading-tight">{ev.title}</p>
                      <Badge variant="outline" className="mt-1 text-[10px] bg-emerald-600/10 text-emerald-700 border-emerald-600/20">{ev.category}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-0.5">ຮັບແລ້ວ</p>
                      <p className="font-bold text-emerald-600">{formatLAK(ev.collected)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">ໃຊ້ຈ່າຍ</p>
                      <p className="font-bold text-rose-600">{formatLAK(ev.expenses)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">ຜູ້ບໍລິຈາກ</p>
                      <p className="text-foreground">{ev.contributors} ຄົນ</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">ຜູ້ເຂົ້າຮ່ວມ</p>
                      <p className="text-foreground">{ev.attendees} ຄົນ</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Progress
                      value={pct}
                      className={`h-1.5 ${pct > 80 ? "[&>div]:bg-rose-500" : "[&>div]:bg-emerald-500"}`}
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">ໃຊ້ {pct.toFixed(0)}% ຂອງງົບ</span>
                      <span className={`font-semibold ${remaining >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {remaining >= 0 ? "+" : ""}{formatLAK(remaining)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add Transaction Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalType === "income"
                ? <><TrendingUp className="h-4 w-4 text-emerald-600" /> ເພີ່ມລາຍຮັບ</>
                : <><TrendingDown className="h-4 w-4 text-rose-600" /> ເພີ່ມລາຍຈ່າຍ</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            {/* ປະເພດທຸລະກຳ */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ປະເພດທຸລະກຳ*</label>
              <select
                value={form.type}
                onChange={e => setField("type", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">ເລືອກ...</option>
                {["ຄ່າທຳນຽມ", "ບໍລິຈາກ", "ລາຍຈ່າຍ", "ສຸກເສີນ"].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* ກິດຈະກຳ — searchable select linked to Activities */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ກິດຈະກຳ (ບໍ່ບັງຄັບ)</label>
              <EventCombobox
                events={EVENTS}
                value={form.eventId}
                onChange={(id) => { setField("eventId", id); setFormError(""); }}
                onCreate={() => { setShowModal(false); navigate({ to: "/activities" }); }}
              />
              {EVENTS.length === 0 && (
                <p className="text-[11px] text-amber-600">ຍັງບໍ່ມີກິດຈະກຳໃນລະບົບ — ກະລຸນາສ້າງກິດຈະກຳກ່ອນ</p>
              )}
              {/* Live linked-event summary */}
              {formEvent && formEventTotals && (
                <div className="mt-1.5 rounded-lg border bg-muted/40 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span className="truncate text-xs font-medium text-foreground">{formEvent.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowModal(false); navigate({ to: "/activities" }); }}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:underline shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" /> ເບິ່ງ
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">ລາຍຮັບ</p>
                      <p className="text-xs font-bold text-emerald-600">{formatLAK(formEventTotals.income)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">ລາຍຈ່າຍ</p>
                      <p className="text-xs font-bold text-rose-600">{formatLAK(formEventTotals.expense)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">ຍອດເຫຼືອ</p>
                      <p className="text-xs font-bold text-sky-600">{formatLAK(formEventTotals.balance)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ຜູ້ກ່ຽວຂ້ອງ */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{modalType === "income" ? "ຜູ້ບໍລິຈາກ (ບໍ່ບັງຄັບ)" : "ຜູ້ຮັບ (ບໍ່ບັງຄັບ)"}</label>
              {modalType === "income" ? (
                <>
                  <SearchableMemberSelect
                    value={form.memberId ?? ""}
                    onChange={(id) => { setField("memberId", id); setFormError(""); }}
                    placeholder="ເລືອກຜູ້ບໍລິຈາກຈາກລາຍຊື່ສະມາຊິກ..."
                  />
                  {form.memberId && (() => {
                    const m = getMemberById(form.memberId);
                    return m ? (
                      <p className="text-[11px] text-muted-foreground pl-1">
                        Phaj {m.gen} · {m.village}{m.province && m.province !== "-" ? `, ${m.province}` : ""}
                      </p>
                    ) : null;
                  })()}
                </>
              ) : (
                <>
                  <SearchableMemberSelect
                    value={form.memberId ?? ""}
                    onChange={(id) => { setField("memberId", id); setFormError(""); }}
                    placeholder="ເລືອກຜູ້ຮັບຈາກລາຍຊື່ສະມາຊິກ..."
                  />
                  {form.memberId && (() => {
                    const m = getMemberById(form.memberId);
                    return m ? (
                      <p className="text-[11px] text-muted-foreground pl-1">
                        Phaj {m.gen} · {m.village}{m.province && m.province !== "-" ? `, ${m.province}` : ""}
                      </p>
                    ) : null;
                  })()}
                </>
              )}
            </div>

            {/* ຈຳນວນເງິນ */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ຈຳນວນເງິນ* (₭)</label>
              <Input type="number" value={form.amount} onChange={e => setField("amount", e.target.value)} placeholder="0" className="h-9 text-sm" />
            </div>

            {/* ວິທີຊຳລະ */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ວິທີຊຳລະ</label>
              <select
                value={form.method}
                onChange={e => setField("method", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">ເລືອກ...</option>
                {["ເງິນສົດ", "ໂອນເງິນ", "PromptPay", "ອື່ນໆ"].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* ໝວດໝູ່ */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ໝວດໝູ່</label>
              <select
                value={form.category}
                onChange={e => setField("category", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">ເລືອກ...</option>
                {["ງານຕະກູນ", "ງານດອງ", "ຊ່ວຍເຫຼືອຜ່າຕັດ", "ງານສົບ", "ງານບຸນ", "ປະຊຸມ", "ສຸກເສີນ", "ອື່ນໆ"].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* ໝາຍເຫດ */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ໝາຍເຫດ</label>
              <textarea
                value={form.note}
                onChange={e => setField("note", e.target.value)}
                placeholder="ບັນທຶກເພີ່ມເຕີມ..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-vertical"
              />
            </div>

            {formError && (
              <div className="flex items-center gap-1.5 rounded-md bg-rose-600/10 px-3 py-2 text-xs font-medium text-rose-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {formError}
              </div>
            )}

            <Separator />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>ຍົກເລີກ</Button>
              <Button className="flex-[2]" onClick={handleSave}>ບັນທຶກ</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={open => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedEvent && (() => {
            const evId = selectedEvent.id;
            const evTxns = storeTxns.filter(t => t.eventId === evId);
            const donations = evTxns
              .filter(t => t.direction !== "expense")
              .sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.createdAt || 0) - (a.createdAt || 0));
            const expensesList = evTxns
              .filter(t => t.direction === "expense")
              .sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.createdAt || 0) - (a.createdAt || 0));
            const history = [...evTxns]
              .sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.createdAt || 0) - (a.createdAt || 0));
            // Recipients (ຜູ້ຮັບ) — aggregated from expenses for this event
            const recipientMap = new Map();
            for (const x of expensesList) {
              const name = (x.contributor || "").trim() || "(ບໍ່ລະບຸ)";
              const cur = recipientMap.get(name) ?? { name, amount: 0, count: 0 };
              cur.amount += Math.abs(x.amount || 0);
              cur.count += 1;
              recipientMap.set(name, cur);
            }
            const recipients = [...recipientMap.values()].sort((a, b) => b.amount - a.amount);
            const attendeesLive = new Set(allParticipants?.[evId] ?? []).size;
            const donorsLive = new Set(
              donations.map(t => t.memberId != null ? `m:${t.memberId}` : `n:${(t.contributor || "").trim()}`)
                .filter(k => k !== "n:")
            ).size;

            const personLabel = (t) => {
              const m = t.memberId ? getMemberById(t.memberId) : null;
              return (m?.name || t.contributor || "(ບໍ່ລະບຸ)");
            };

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="break-words">{selectedEvent.title}</DialogTitle>
                  <Badge variant="outline" className="w-fit text-xs bg-emerald-600/10 text-emerald-700 border-emerald-600/20">{selectedEvent.category}</Badge>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-3 my-2">
                  {[
                    { label: "ລາຍຮັບລວມ", value: formatLAK(selectedEvent.collected), cls: "text-emerald-600" },
                    { label: "ລາຍຈ່າຍລວມ", value: formatLAK(selectedEvent.expenses), cls: "text-rose-600" },
                    { label: "ຍອດເຫຼືອ", value: formatLAK(selectedEvent.collected - selectedEvent.expenses), cls: "text-sky-600" },
                    { label: "ຜູ້ບໍລິຈາກ", value: donorsLive + " ຄົນ", cls: "text-amber-600" },
                    { label: "ຜູ້ເຂົ້າຮ່ວມ", value: attendeesLive + " ຄົນ", cls: "text-violet-600" },
                    { label: "ລາຍການ", value: evTxns.length + " ລາຍການ", cls: "text-teal-600" },
                  ].map((s, i) => (
                    <div key={i} className="rounded-lg border bg-muted/30 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">{s.label}</p>
                      <p className={`text-sm font-bold ${s.cls}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* ── ຜູ້ບໍລິຈາກ — donations linked to this event only ── */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 border-b pb-1.5">
                    <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ຜູ້ບໍລິຈາກ ({donations.length})</h4>
                  </div>
                  {donations.length === 0 ? (
                    <p className="text-[11px] italic text-muted-foreground py-1">ຍັງບໍ່ມີລາຍການບໍລິຈາກສຳລັບກິດຈະກຳນີ້</p>
                  ) : donations.map((t) => (
                    <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground break-words">{personLabel(t)}</p>
                        <p className="text-[10px] text-muted-foreground">{t.date} · {t.method || "—"}{t.category ? ` · ${t.category}` : ""}</p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 whitespace-nowrap">+{formatLAK(t.amount)}</span>
                    </div>
                  ))}
                </div>

                {/* ── ລາຍຈ່າຍ — expenses for this event only ── */}
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2 border-b pb-1.5">
                    <Receipt className="h-3.5 w-3.5 text-rose-600" />
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ລາຍຈ່າຍ ({expensesList.length})</h4>
                  </div>
                  {expensesList.length === 0 ? (
                    <p className="text-[11px] italic text-muted-foreground py-1">ຍັງບໍ່ມີລາຍຈ່າຍສຳລັບກິດຈະກຳນີ້</p>
                  ) : expensesList.map((t) => (
                    <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground break-words">{(t.contributor || "(ບໍ່ລະບຸ)")}</p>
                        <p className="text-[10px] text-muted-foreground">{t.date} · {t.method || "—"}{t.category ? ` · ${t.category}` : ""}{t.note ? ` · ${t.note}` : ""}</p>
                      </div>
                      <span className="text-xs font-semibold text-rose-600 whitespace-nowrap">-{formatLAK(t.amount)}</span>
                    </div>
                  ))}
                </div>

                {/* ── ຜູ້ຮັບ — recipients aggregated from expenses ── */}
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2 border-b pb-1.5">
                    <ArrowDownLeft className="h-3.5 w-3.5 text-sky-600" />
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ຜູ້ຮັບ ({recipients.length})</h4>
                  </div>
                  {recipients.length === 0 ? (
                    <p className="text-[11px] italic text-muted-foreground py-1">ຍັງບໍ່ມີຜູ້ຮັບສຳລັບກິດຈະກຳນີ້</p>
                  ) : recipients.map((r) => (
                    <div key={r.name} className="flex items-start justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground break-words">{r.name}</p>
                        <p className="text-[10px] text-muted-foreground">{r.count} ຄັ້ງ</p>
                      </div>
                      <span className="text-xs font-semibold text-sky-600 whitespace-nowrap">{formatLAK(r.amount)}</span>
                    </div>
                  ))}
                </div>

                {/* ── ປະຫວັດ — every transaction (income + expense) newest first ── */}
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2 border-b pb-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ປະຫວັດ ({history.length})</h4>
                  </div>
                  {history.length === 0 ? (
                    <p className="text-[11px] italic text-muted-foreground py-1">ຍັງບໍ່ມີທຸລະກຳສຳລັບກິດຈະກຳນີ້</p>
                  ) : history.map((t) => {
                    const isExpense = t.direction === "expense";
                    return (
                      <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className={`text-[9px] ${isExpense ? "bg-rose-600/10 text-rose-700 border-rose-600/20" : "bg-emerald-600/10 text-emerald-700 border-emerald-600/20"}`}>
                              {isExpense ? "ລາຍຈ່າຍ" : "ລາຍຮັບ"}
                            </Badge>
                            <p className="text-xs font-medium text-foreground break-words">{personLabel(t)}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{t.date} · {t.method || "—"}{t.category ? ` · ${t.category}` : ""}</p>
                        </div>
                        <span className={`text-xs font-semibold whitespace-nowrap ${isExpense ? "text-rose-600" : "text-emerald-600"}`}>
                          {isExpense ? "-" : "+"}{formatLAK(t.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* View Transaction Detail */}
      <Dialog open={!!viewTxn} onOpenChange={(o) => !o && setViewTxn(null)}>
        <DialogContent className="max-w-md">
          {viewTxn && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" /> ລາຍລະອຽດທຸລະກຳ
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {[
                  ["ລະຫັດ", viewTxn.id],
                  ["ວັນທີ", viewTxn.date],
                  ["ປະເພດ", typeLabel[viewTxn.type] || viewTxn.type],
                  ["ກິດຈະກຳ", viewTxn.event || "-"],
                  ["ຜູ້ກ່ຽວຂ້ອງ", viewTxn.contributor || "-"],
                  ["ໝວດ", viewTxn.category || "-"],
                  ["ວິທີຊຳລະ", viewTxn.method || "-"],
                  ["ສະຖານະ", statusLabel[viewTxn.status] || viewTxn.status],
                  ["ບັນທຶກ", viewTxn.note || "-"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-border/50 pb-1.5">
                    <span className="text-xs text-muted-foreground">{k}</span>
                    <span className="text-xs font-medium text-foreground text-right">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2">
                  <span className="text-xs text-muted-foreground">ຈຳນວນ</span>
                  <span className={`text-lg font-bold ${viewTxn.amount > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {viewTxn.amount > 0 ? "+" : ""}{formatLAK(viewTxn.amount)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setViewTxn(null)}>ປິດ</Button>
                <Button className="flex-1 gap-1.5" onClick={() => { setEditTxn(viewTxn); setViewTxn(null); }}>
                  <Pencil className="h-4 w-4" /> ແກ້ໄຂ
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Transaction */}
      <Dialog open={!!editTxn} onOpenChange={(o) => !o && setEditTxn(null)}>
        <DialogContent className="max-w-md">
          {editTxn && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-primary" /> ແກ້ໄຂທຸລະກຳ
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">ຜູ້ກ່ຽວຂ້ອງ</label>
                  <Input value={editForm.contributor} onChange={(e) => setEF("contributor", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">ຈຳນວນເງິນ (₭)</label>
                  <Input type="number" value={editForm.amount} onChange={(e) => setEF("amount", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">ໝວດ</label>
                  <Input value={editForm.category} onChange={(e) => setEF("category", e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">ວິທີຊຳລະ</label>
                  <select value={editForm.method} onChange={(e) => setEF("method", e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">— ເລືອກ —</option>
                    {["ເງິນສົດ","ໂອນເງິນ","ບັດ"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">ບັນທຶກ</label>
                  <textarea value={editForm.note} onChange={(e) => setEF("note", e.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                {!String(editTxn.id).startsWith("TXN-0") || true ? null : (
                  <p className="text-[10px] text-muted-foreground">ໝາຍເຫດ: ທຸລະກຳເລີ່ມຕົ້ນແມ່ນຂໍ້ມູນຕົວຢ່າງ — ການແກ້ໄຂຈະຖືກບັນທຶກໃນລະບົບແບບເຊດຊັນ.</p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditTxn(null)}>ຍົກເລີກ</Button>
                <Button className="flex-1" onClick={handleSaveEdit}>ບັນທຶກ</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Transaction Confirmation */}
      <AlertDialog open={!!deleteTxn} onOpenChange={(o) => { if (!o) setDeleteTxn(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ຢືນຢັນການລຶບທຸລະກຳ</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTxn ? `ທ່ານກຳລັງລຶບ ${deleteTxn.id} (${deleteTxn.contributor || "-"}). ການກະທຳນີ້ບໍ່ສາມາດກັບຄືນໄດ້.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ຍົກເລີກ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTxn) {
                  deleteTransaction(deleteTxn.id);
                  toast.success("ລຶບທຸລະກຳແລ້ວ");
                }
                setDeleteTxn(null);
              }}
            >ລຶບ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
