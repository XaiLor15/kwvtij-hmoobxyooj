// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/activities")({
  validateSearch: (search: Record<string, unknown>) => ({
    action: typeof search.action === "string" ? search.action : undefined,
  }),
  head: () => ({
    meta: [
      { title: "ກິດຈະກຳ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ກິດຈະກຳ — ລະບົບຄຸ້ມຄອງຂໍ້ມູນຕະກູນ" },
      { property: "og:title", content: "ກິດຈະກຳ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { property: "og:description", content: "ກິດຈະກຳ — ລະບົບຄຸ້ມຄອງຂໍ້ມູນຕະກູນ" },
    ],
  }),
  component: ActivitiesPage,
});

import { useState, useRef, useEffect } from "react";
import {
  Users, Flame, ClipboardList, Star, Home,
  CalendarDays, Clock, MapPin, User, Search, LayoutGrid,
  List, Plus, Calendar, CreditCard, DollarSign, Banknote,
  Upload, Edit, Share2, Printer, Archive, CheckCircle2,
  Hourglass, Image as ImageIcon, ChevronRight, X, Trash2, Save,
  ExternalLink, Wallet,
} from "lucide-react";

// ── Shared data & reactive stores ───────────────────────────────────────────
import { EVENT_STATUS, getEventStatus } from "@/lib/events-data";
import { useEvents, updateEvent, addEvent, deleteEvent } from "@/lib/events-store";
import { MEMBERS, getMemberById } from "@/lib/members-data";
import { useParticipants, addParticipant, removeParticipant, useAllParticipants } from "@/lib/participants-store";
import { useGallery, addImages, removeImage } from "@/lib/gallery-store";
import { useTransactions, eventTotals } from "@/lib/treasury-store";
import { MemberCombobox } from "@/components/member-combobox";
import { SearchableMemberSelect } from "@/components/searchable-member-select";
import { toast } from "sonner";
import { useMediaLightbox } from "@/components/media-lightbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EVENT_CATEGORIES = ["ງານຕະກູນ", "ງານສົບ", "ປະຊຸມ", "ງານບຸນ", "ງານດອງ", "ຊ່ວຍເຫຼືອຜ່າຕັດ"];

const CATEGORIES = ["ທັງໝົດ", "ກຳລັງຈະຈັດ", "ຜ່ານມາ", "ປະຊຸມ", "ງານບຸນ", "ງານສົບ", "ງານຕະກູນ"];

const CAT_COLORS = {
  "ງານຕະກູນ": { bg: "#dcfce7", text: "#166534" },
  "ງານສົບ":   { bg: "#f1f5f9", text: "#334155" },
  "ປະຊຸມ":    { bg: "#dbeafe", text: "#1e40af" },
  "ງານບຸນ":   { bg: "#fef3c7", text: "#92400e" },
};

const eventStatus = (e) => EVENT_STATUS[getEventStatus(e)];

const fmt = (n) =>
  n >= 1000000 ? (n / 1000000).toFixed(1) + "M" : Number(n || 0).toLocaleString();
// Full Kip formatter (no K/M abbreviation): 1,000 / 1,500,000 / 10,000,000
const fmtKip = (n) => Number(n || 0).toLocaleString();

// Category → lucide icon
const CATEGORY_ICON = {
  "ງານຕະກູນ": Home,
  "ງານສົບ":   Flame,
  "ປະຊຸມ":    ClipboardList,
  "ງານບຸນ":   Star,
};

// Category → accent classes for the card cover band
const CATEGORY_BAND = {
  "ງານຕະກູນ": "from-emerald-800 to-emerald-500",
  "ງານສົບ":   "from-slate-700  to-slate-500",
  "ປະຊຸມ":    "from-sky-800    to-sky-500",
  "ງານບຸນ":   "from-amber-800  to-amber-500",
};

function CategoryIcon({ category, className = "" }) {
  const Icon = CATEGORY_ICON[category] ?? CalendarDays;
  return <Icon className={className} />;
}

// ── Main Component ──────────────────────────────────────────────────────────
function ActivitiesPage() {
  const { action: actionParam } = Route.useSearch();
  const navigate = useNavigate();
  const events = useEvents();
  const allTxns = useTransactions();
  const allParticipants = useAllParticipants();
  const [filter,    setFilter]    = useState("ທັງໝົດ");
  const [search,    setSearch]    = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const [deleteId,  setDeleteId]  = useState(null);

  // ── Live per-event stats from stores (single pass) ────────────────────
  const statsByEvent = (() => {
    const map = new Map();
    for (const t of allTxns) {
      const id = t.eventId;
      if (id == null) continue;
      let s = map.get(id);
      if (!s) { s = { income: 0, expense: 0, donorKeys: new Set() }; map.set(id, s); }
      if (t.direction === "expense") s.expense += Math.abs(t.amount || 0);
      else {
        s.income += Math.abs(t.amount || 0);
        const key = t.memberId != null ? `m:${t.memberId}` : `n:${(t.contributor || "").trim()}`;
        if (key !== "n:") s.donorKeys.add(key);
      }
    }
    const getStats = (eventId) => {
      const s = map.get(eventId) ?? { income: 0, expense: 0, donorKeys: new Set() };
      const participants = allParticipants?.[eventId] ?? [];
      const uniqueAttendees = new Set(participants).size;
      return {
        attendees: uniqueAttendees,
        donors: s.donorKeys.size,
        collected: s.income,
        spent: s.expense,
      };
    };
    return getStats;
  })();
  useEffect(() => { if (actionParam === "add") setShowAdd(true); }, [actionParam]);
  const [calView,   setCalView]   = useState("grid");
  const emptyEventForm = {
    title: "", organizerId: "", organizer: "", category: "ງານຕະກູນ",
    date: "", timeStart: "", timeEnd: "", location: "",
    expectedPerMember: "", description: "",
  };
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const setEventField = (k, v) => setEventForm(p => ({ ...p, [k]: v }));

  function handleCreateEvent() {
    if (!eventForm.title.trim()) { toast.error("ກະລຸນາປ້ອນຊື່ກິດຈະກຳ"); return; }
    if (!eventForm.organizer.trim()) { toast.error("ກະລຸນາເລືອກຜູ້ຈັດງານ"); return; }
    if (!eventForm.date) { toast.error("ກະລຸນາເລືອກວັນທີຈັດງານ"); return; }
    if (!eventForm.timeStart || !eventForm.timeEnd) { toast.error("ກະລຸນາປ້ອນເວລາຈັດງານ"); return; }
    if (!eventForm.location.trim()) { toast.error("ກະລຸນາປ້ອນສະຖານທີ່"); return; }
    if (!Number(eventForm.expectedPerMember)) { toast.error("ກະລຸນາປ້ອນຈຳນວນເງິນຕໍ່ຄົນ"); return; }
    addEvent({
      title: eventForm.title.trim(),
      organizer: eventForm.organizer.trim(),
      category: eventForm.category,
      date: eventForm.date,
      time: `${eventForm.timeStart} – ${eventForm.timeEnd}`,
      location: eventForm.location.trim(),
      expectedPerMember: Number(eventForm.expectedPerMember) || 0,
      description: eventForm.description.trim(),
    });
    toast.success("ສ້າງກິດຈະກຳໃໝ່ສຳເລັດ");
    setEventForm(emptyEventForm);
    setShowAdd(false);
  }

  const q = search.trim().toLowerCase().replace(/\s+/g, " ");
  const filtered = events.filter(e => {
    const status = getEventStatus(e);
    const matchFilter =
      filter === "ທັງໝົດ"      ? true :
      filter === "ກຳລັງຈະຈັດ" ? status === "upcoming" :
      filter === "ຜ່ານມາ"      ? status === "past" :
      e.category === filter;
    if (!q) return matchFilter;
    const hay = [e.title, e.location, e.organizer, e.category, status, e.description]
      .filter(Boolean).join(" ").toLowerCase();
    return matchFilter && hay.includes(q);
  });


  const totalAttendees = events.reduce((s, e) => s + statsByEvent(e.id).attendees, 0);
  const upcoming       = events.filter(e => getEventStatus(e) === "upcoming").length;
  const past           = events.filter(e => getEventStatus(e) === "past").length;

  const summaryCards = [
    { Icon: CalendarDays, label: "ກິດຈະກຳທັງໝົດ", value: events.length,   sub: "ກິດຈະກຳ" },
    { Icon: Hourglass,    label: "ກຳລັງດຳເນີນ",   value: upcoming,        sub: "ກິດຈະກຳ" },
    { Icon: Banknote,     label: "ສິ້ນສຸດແລ້ວ",   value: past,            sub: "ກິດຈະກຳ" },
    { Icon: Users,        label: "ຜູ້ເຂົ້າຮ່ວມລວມ", value: totalAttendees, sub: "ທ່ານ"     },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            ກິດຈະກຳຕະກູນ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ຈັດການງານ, ການຮ່ວມງານ, ຮູບພາບ ແລະ ຂໍ້ມູນການໃຊ້ຈ່າຍ
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition"
          >
            <Plus className="h-4 w-4" /> ສ້າງກິດຈະກຳ
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition">
            <Calendar className="h-4 w-4" /> ປະຕິທິນ
          </button>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryCards.map(({ Icon, label, value, sub }) => (
          <div
            key={label}
            className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <Icon className="h-4 w-4 text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
            <p className="text-[11px] text-primary mt-0.5 font-semibold">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            placeholder="ຄົ້ນຫາກິດຈະກຳ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-1.5 rounded-full text-xs transition font-medium border ${
                filter === c
                  ? "bg-primary text-primary-foreground border-transparent font-bold"
                  : "bg-background text-foreground border-border hover:border-primary/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex border border-border rounded-lg overflow-hidden shrink-0">
          <button
            onClick={() => setCalView("grid")}
            className={`p-2 transition ${calView === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCalView("list")}
            className={`p-2 transition ${calView === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="space-y-6">
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <CalendarDays className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">ຍັງບໍ່ມີກິດຈະກຳ</h2>
            <p className="text-muted-foreground mb-6 text-sm">ລອງປ່ຽນຕົວກັ່ນຕອງ ຫຼື ສ້າງກິດຈະກຳໃໝ່</p>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-800 text-white font-bold hover:bg-emerald-700 transition"
            >
              <Plus className="w-4 h-4" /> ສ້າງກິດຈະກຳທຳອິດ
            </button>
          </div>
        ) : calView === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((ev, idx) => (
              <EventCard key={ev.id} ev={ev} idx={idx} stats={statsByEvent(ev.id)} onOpen={() => setSelectedId(ev.id)} onDelete={() => setDeleteId(ev.id)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(ev => (
              <EventRow key={ev.id} ev={ev} stats={statsByEvent(ev.id)} onOpen={() => setSelectedId(ev.id)} onDelete={() => setDeleteId(ev.id)} />
            ))}
          </div>
        )}
      </div>

      {/* ── EVENT DETAIL MODAL ── */}
      {selectedId != null && (
        <EventDetailModal
          eventId={selectedId}
          onClose={() => setSelectedId(null)}
          onOpenFinance={(evId, action) => { setSelectedId(null); navigate({ to: "/finance", search: evId != null ? { event: evId, ...(action ? { action } : {}) } : {} } as any); }}
          onRequestDelete={() => { setDeleteId(selectedId); setSelectedId(null); }}
        />
      )}

      {/* ── ADD EVENT MODAL ── */}
      {showAdd && (
        <div
          className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="bg-background rounded-2xl w-full max-w-md max-h-[90vh] overflow-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-250"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-1.5 bg-gradient-to-r from-emerald-800 to-emerald-400 rounded-t-2xl" />
            <div className="p-6 space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-emerald-600" /> ສ້າງກິດຈະກຳໃໝ່
                </h3>
                <button
                  onClick={() => setShowAdd(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-600 mb-1">ຊື່ກິດຈະກຳ *</label>
                  <input
                    type="text"
                    placeholder="ຕົວຢ່າງ: ງານປະຊຸມຄອບຄົວປະຈຳປີ"
                    value={eventForm.title}
                    onChange={e => setEventField("title", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-600 mb-1">ຜູ້ຈັດງານ *</label>
                  <SearchableMemberSelect
                    value={eventForm.organizerId}
                    onChange={(id) => setEventForm(p => ({ ...p, organizerId: id ?? "", organizer: getMemberById(id)?.name ?? "" }))}
                    placeholder="ເລືອກຜູ້ຈັດງານ..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-600 mb-1">ປະເພດກິດຈະກຳ</label>
                  <select
                    value={eventForm.category}
                    onChange={e => setEventField("category", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition text-foreground"
                  >
                    {EVENT_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-600 mb-1">ວັນທີຈັດງານ *</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={e => setEventField("date", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-600 mb-1">ເວລາຈັດງານ *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="time"
                        value={eventForm.timeStart}
                        onChange={e => setEventField("timeStart", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition"
                      />
                      <span className="mt-1 block text-[11px] text-muted-foreground">ເວລາເລີ່ມ</span>
                    </div>
                    <div>
                      <input
                        type="time"
                        value={eventForm.timeEnd}
                        onChange={e => setEventField("timeEnd", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition"
                      />
                      <span className="mt-1 block text-[11px] text-muted-foreground">ເວລາສິ້ນສຸດ</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-600 mb-1">ສະຖານທີ່ *</label>
                  <input
                    type="text"
                    placeholder="ບ້ານ, ຮ້ານອາຫານ, ຫ້ອງປະຊຸມ ຫຼື ສະຖານທີ່ອື່ນ"
                    value={eventForm.location}
                    onChange={e => setEventField("location", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-600 mb-1">ຈຳນວນເງິນຕໍ່ຄົນ (ກີບ) *</label>
                  <input
                    type="number"
                    placeholder="ຕົວຢ່າງ: 50000"
                    value={eventForm.expectedPerMember}
                    onChange={e => setEventField("expectedPerMember", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-600 mb-1">ລາຍລະອຽດ</label>
                  <textarea
                    rows={3}
                    placeholder="ລາຍລະອຽດ ຫຼື ໝາຍເຫດຂອງກິດຈະກຳ"
                    value={eventForm.description}
                    onChange={e => setEventField("description", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition resize-vertical"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCreateEvent}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-800 text-white font-bold text-sm hover:bg-emerald-700 transition"
                >
                  <CheckCircle2 className="w-4 h-4" /> ບັນທຶກ
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-5 py-3 rounded-xl bg-muted text-foreground text-sm hover:bg-muted/70 transition"
                >
                  ຍົກເລີກ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE EVENT CONFIRMATION ── */}
      <AlertDialog open={deleteId != null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ຢືນຢັນການລຶບກິດຈະກຳ</AlertDialogTitle>
            <AlertDialogDescription>
              ການລຶບກິດຈະກຳຈະບໍ່ສາມາດກັບຄືນໄດ້. ຂໍ້ມູນທີ່ກ່ຽວຂ້ອງ (ບໍລິຈາກ, ຮູບພາບ, ຜູ້ເຂົ້າຮ່ວມ) ຍັງຄົງຢູ່ໃນຄັງເງິນແຕ່ຈະບໍ່ເຊື່ອມຕໍ່ກັບກິດຈະກຳນີ້ອີກ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ຍົກເລີກ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId != null) {
                  deleteEvent(deleteId);
                  toast.success("ລຶບກິດຈະກຳແລ້ວ");
                }
                setDeleteId(null);
              }}
            >ລຶບ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Event Detail Modal (5 interactive sections) ──────────────────────────────
function EventDetailModal({ eventId, onClose, onOpenFinance, onRequestDelete }) {
  const events = useEvents();
  const selected = events.find(e => e.id === eventId) ?? null;
  const [detailTab, setDetailTab] = useState("info");

  const participants = useParticipants(eventId);
  const gallery = useGallery(eventId);
  const txns = useTransactions();

  if (!selected) return null;

  const donations = txns.filter(t => t.eventId === eventId && t.direction !== "expense");
  const expenses  = txns.filter(t => t.eventId === eventId && t.direction === "expense");
  const totals = eventTotals(txns, eventId);
  const spent = totals.expense || selected.spent || 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-250"
        onClick={e => e.stopPropagation()}
      >
        {/* Hero band */}
        <div className={`bg-gradient-to-br ${CATEGORY_BAND[selected.category] ?? "from-emerald-800 to-emerald-500"} p-8 relative`}>
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {onRequestDelete && (
              <button
                onClick={onRequestDelete}
                className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-rose-500/80 transition"
                title="ລຶບກິດຈະກຳ"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
            <CategoryIcon category={selected.category} className="w-8 h-8 text-white" />
          </div>

          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="bg-white/25 text-white rounded-full px-3 py-0.5 text-xs font-bold">{selected.category}</span>
            <span
              className="rounded-full px-3 py-0.5 text-xs font-bold"
              style={{ background: eventStatus(selected).bg, color: eventStatus(selected).text }}
            >
              {eventStatus(selected).label}
            </span>
          </div>

          <h2 className="text-white text-xl font-bold mb-3 leading-snug">{selected.title}</h2>

          <div className="flex flex-wrap gap-4 text-white/80 text-sm">
            <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{selected.date}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{selected.location}</span>
            <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{selected.organizer}</span>
          </div>

          {/* Quick stats — live */}
          <div className="flex flex-wrap gap-3 mt-5">
            {[
              { Icon: Users,      val: participants.length + " ຄົນ",     lbl: "ເຂົ້າຮ່ວມ"  },
              { Icon: CreditCard, val: donations.length + " ລາຍການ",     lbl: "ບໍລິຈາກ"   },
              { Icon: Banknote,   val: fmt(totals.income) + " ກີບ",      lbl: "ຍອດບໍລິຈາກ" },
              { Icon: DollarSign, val: fmt(spent) + " ກີບ",              lbl: "ໃຊ້ໄປ"      },
            ].map(({ Icon, val, lbl }) => (
              <div key={lbl} className="bg-white/20 rounded-xl px-4 py-2 text-center min-w-[80px]">
                <Icon className="w-4 h-4 text-white/80 mx-auto mb-1" />
                <div className="text-white font-bold text-sm">{val}</div>
                <div className="text-white/65 text-xs">{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail tabs */}
        <div className="border-b border-border flex px-6 overflow-x-auto">
          {[
            ["info",          <ClipboardList className="w-3.5 h-3.5" />, "ຂໍ້ມູນ"],
            ["attendees",     <Users className="w-3.5 h-3.5" />,         "ຜູ້ຮ່ວມ"],
            ["contributions", <CreditCard className="w-3.5 h-3.5" />,    "ບໍລິຈາກ"],
            ["expenses",      <DollarSign className="w-3.5 h-3.5" />,    "ຄ່າໃຊ້ຈ່າຍ"],
            ["gallery",       <ImageIcon className="w-3.5 h-3.5" />,     "ຮູບພາບ"],
          ].map(([id, icon, label]) => (
            <button
              key={id}
              onClick={() => setDetailTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 border-b-2 text-xs whitespace-nowrap transition ${
                detailTab === id
                  ? "border-emerald-700 text-emerald-800 font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-emerald-300"
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {detailTab === "info" && <InfoTab event={selected} />}
          {detailTab === "attendees" && <ParticipantsTab eventId={eventId} participants={participants} />}
          {detailTab === "contributions" && (
            <DonationsTab donations={donations} total={totals.income} onOpenFinance={() => onOpenFinance?.(eventId, "income")} />
          )}
          {detailTab === "expenses" && (
            <ExpensesTab expenses={expenses} spent={spent} onOpenFinance={() => onOpenFinance?.(eventId, "expense")} />
          )}
          {detailTab === "gallery" && <GalleryTab eventId={eventId} gallery={gallery} />}

        </div>

      </div>
    </div>
  );
}

// ── Tab: Info (editable) ─────────────────────────────────────────────────────
function InfoTab({ event }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(event);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function startEdit() { setForm(event); setEditing(true); }
  function save() {
    updateEvent(event.id, {
      title: form.title,
      organizer: form.organizer,
      category: form.category,
      date: form.date,
      time: form.time,
      location: form.location,
      expectedPerMember: Number(form.expectedPerMember) || 0,
      description: form.description,
    });
    setEditing(false);
    toast.success("ບັນທຶກຂໍ້ມູນກິດຈະກຳແລ້ວ");
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-foreground">ແກ້ໄຂຂໍ້ມູນ</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-emerald-600 mb-1">ຊື່ກິດຈະກຳ *</label>
            <input
              type="text"
              value={form.title ?? ""}
              onChange={e => set("title", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-emerald-600 mb-1">ຜູ້ຈັດງານ *</label>
            <SearchableMemberSelect
              value={MEMBERS.find(m => m.name === form.organizer)?.id ?? ""}
              onChange={(id) => set("organizer", getMemberById(id)?.name ?? "")}
              placeholder="ເລືອກຜູ້ຈັດງານ..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-emerald-600 mb-1">ປະເພດກິດຈະກຳ</label>
            <select
              value={form.category}
              onChange={e => set("category", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition text-foreground"
            >
              {EVENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-emerald-600 mb-1">ວັນທີຈັດງານ *</label>
            <input
              type="date"
              value={form.date ?? ""}
              onChange={e => set("date", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-emerald-600 mb-1">ເວລາຈັດງານ *</label>
            <input
              type="text"
              placeholder="08:00 – 16:00"
              value={form.time ?? ""}
              onChange={e => set("time", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-emerald-600 mb-1">ສະຖານທີ່ *</label>
            <input
              type="text"
              value={form.location ?? ""}
              onChange={e => set("location", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-emerald-600 mb-1">ຈຳນວນເງິນຕໍ່ຄົນ (ກີບ) *</label>
            <input
              type="number"
              placeholder="50000"
              value={form.expectedPerMember ?? ""}
              onChange={e => set("expectedPerMember", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-emerald-600 mb-1">ລາຍລະອຽດ</label>
          <textarea
            rows={3}
            value={form.description ?? ""}
            onChange={e => set("description", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition resize-vertical"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-800 text-white text-sm font-semibold hover:bg-emerald-700 transition">
            <Save className="w-3.5 h-3.5" /> ບັນທຶກ
          </button>
          <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm hover:bg-muted/70 transition">
            ຍົກເລີກ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start gap-2">
        <h4 className="font-bold text-foreground">ລາຍລະອຽດ</h4>
        <button onClick={startEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition shrink-0">
          <Edit className="w-3 h-3" /> ແກ້ໄຂ
        </button>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">{event.description}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          [<CalendarDays className="w-3.5 h-3.5" />, "ວັນທີ",    event.date],
          [<Clock className="w-3.5 h-3.5" />,        "ເວລາ",     event.time],
          [<MapPin className="w-3.5 h-3.5" />,       "ສະຖານທີ", event.location],
          [<User className="w-3.5 h-3.5" />,         "ຜູ້ຈັດງານ",  event.organizer],
          [<Banknote className="w-3.5 h-3.5" />,     "ຈຳນວນເງິນຕໍ່ຄົນ", fmtKip(event.expectedPerMember) + " ກີບ"],
          [<Star className="w-3.5 h-3.5" />,         "ປະເພດກິດຈະກຳ",  event.category],
        ].map(([icon, k, v]) => (
          <div key={k} className="bg-muted/50 rounded-xl p-3 border border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">{icon}{k}</div>
            <div className="text-sm text-foreground font-semibold">{v}</div>
          </div>
        ))}
      </div>
      {Array.isArray(event.tags) && (
        <div className="flex flex-wrap gap-2">
          {event.tags.map(t => (
            <span key={t} className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-0.5 text-xs">#{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Participants (pull from members) ────────────────────────────────────
function ParticipantsTab({ eventId, participants }) {
  const members = participants.map(getMemberById).filter(Boolean);
  const navigate = useNavigate();
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center gap-2">
        <h4 className="font-bold text-foreground">ຜູ້ເຂົ້າຮ່ວມ ({members.length})</h4>
        <MemberCombobox
          excludeIds={participants}
          onSelect={(id) => {
            addParticipant(eventId, id);
            toast.success("ເພີ່ມຜູ້ຮ່ວມແລ້ວ");
          }}
        />
      </div>
      {members.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          ຍັງບໍ່ມີຜູ້ຮ່ວມ — ກົດ “ເພີ່ມຜູ້ຮ່ວມ” ເພື່ອດຶງຈາກສະມາຊິກຕະກູນ
        </div>
      ) : (
        members.map(m => (
          <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => navigate({ to: "/members", search: { member: m.id } })}
                className="font-semibold text-sm text-foreground hover:text-emerald-700 hover:underline text-left break-words"
              >
                {m.name} <span className="text-xs text-muted-foreground font-normal">· {m.village}{m.province && m.province !== "-" ? `, ${m.province}` : ""}</span>
              </button>
              <div className="text-xs text-muted-foreground">Phaj {m.gen} · {m.branch}</div>
            </div>
            <button
              onClick={() => { removeParticipant(eventId, m.id); toast.success("ລຶບຜູ້ຮ່ວມແລ້ວ"); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 transition shrink-0"
              aria-label="ລຶບ"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

// ── Tab: Donations (pull from treasury) ──────────────────────────────────────
function DonationsTab({ donations, total, onOpenFinance }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center gap-2">
        <h4 className="font-bold text-foreground">ລາຍການບໍລິຈາກ ({donations.length})</h4>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs text-emerald-700 font-bold">
          ລວມ: {fmt(total)} ກີບ
        </div>
      </div>
      {donations.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground space-y-3">
          <Wallet className="w-10 h-10 mx-auto opacity-30" />
          <p>ຍັງບໍ່ມີການບໍລິຈາກທີ່ເຊື່ອມກັບງານນີ້</p>
          <button onClick={onOpenFinance} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-600 transition">
            <ExternalLink className="w-3.5 h-3.5" /> ເພີ່ມລາຍຮັບໃນຄັງເງິນ
          </button>
        </div>
      ) : (
        donations.map((c) => {
          const m = c.memberId ? getMemberById(c.memberId) : null;
          return (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
              <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 text-sky-600" />
              </div>
              <div className="flex-1 min-w-0">
                {m ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/members", search: { member: m.id } })}
                      className="font-semibold text-sm text-foreground hover:text-emerald-700 hover:underline text-left break-words"
                    >
                      {m.name}
                      <span className="text-xs text-muted-foreground font-normal"> · {m.village}{m.province && m.province !== "-" ? `, ${m.province}` : ""}</span>
                    </button>
                    <div className="text-xs text-muted-foreground">
                      Phaj {m.gen} · {c.date} · {c.method}{c.category ? ` · ${c.category}` : ""}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold text-sm text-foreground break-words">{c.contributor}</div>
                    <div className="text-xs text-muted-foreground">{c.date} · {c.method}{c.category ? ` · ${c.category}` : ""}</div>
                  </>
                )}
              </div>
              <div className="text-emerald-700 font-bold text-sm shrink-0">{fmt(Math.abs(c.amount))} ກີບ</div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Tab: Expenses (pull from treasury) ───────────────────────────────────────
function ExpensesTab({ expenses, spent, onOpenFinance }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center gap-2">
        <h4 className="font-bold text-foreground">ຄ່າໃຊ້ຈ່າຍ ({expenses.length})</h4>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-700 font-bold">
          ໃຊ້ໄປ: {fmtKip(spent)} ກີບ
        </div>
      </div>
      {expenses.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground space-y-3">
          <DollarSign className="w-10 h-10 mx-auto opacity-30" />
          <p>ຍັງບໍ່ມີຄ່າໃຊ້ຈ່າຍທີ່ເຊື່ອມກັບງານນີ້</p>
          <button onClick={onOpenFinance} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-600 transition">
            <ExternalLink className="w-3.5 h-3.5" /> ເພີ່ມລາຍຈ່າຍໃນຄັງເງິນ
          </button>
        </div>
      ) : (
        expenses.map((x) => (
          <div key={x.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition">
            <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-rose-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground break-words">{x.category || x.contributor}</div>
              <div className="text-xs text-muted-foreground">{x.date} · {x.contributor}</div>
            </div>
            <div className="text-rose-600 font-bold text-sm shrink-0">{fmt(Math.abs(x.amount))} ກີບ</div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Tab: Gallery (upload / manage) ───────────────────────────────────────────
function GalleryTab({ eventId, gallery }) {
  const { open: openMedia } = useMediaLightbox();
  const inputRef = useRef(null);

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      addImages(eventId, files);
      toast.success(`ອັບໂຫຼດ ${files.length} ຮູບແລ້ວ`);
    }
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center gap-2">
        <h4 className="font-bold text-foreground">ອັລບ້ຳຮູບ ({gallery.length})</h4>
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-700 transition"
        >
          <Upload className="w-3 h-3" /> ອັບໂຫຼດ
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {gallery.map((img) => (
          <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden border border-border">
            <img
              src={img.url}
              alt={img.name}
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={() => openMedia({ type: "image", src: img.url, alt: img.name })}
            />
            <button
              onClick={() => { removeImage(eventId, img.id); toast.success("ລຶບຮູບແລ້ວ"); }}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-rose-600"
              aria-label="ລຶບຮູບ"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          className="aspect-square border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition text-muted-foreground"
        >
          <Plus className="w-6 h-6" />
          <span className="text-[10px]">ເພີ່ມ</span>
        </button>
      </div>
      {gallery.length === 0 && (
        <p className="text-center text-xs text-muted-foreground pt-1">ກົດ “ອັບໂຫຼດ” ເພື່ອເພີ່ມຮູບກິດຈະກຳ</p>
      )}
    </div>
  );
}

// ── Event Card (grid) ───────────────────────────────────────────────────────
function EventCard({ ev, idx, stats, onOpen, onDelete }) {
  const st  = eventStatus(ev);
  const bandClass = CATEGORY_BAND[ev.category] ?? "from-emerald-800 to-emerald-500";

  return (
    <div
      className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group"
      onClick={onOpen}
    >
      {/* Cover band */}
      <div className={`h-28 bg-gradient-to-br ${bandClass} flex items-center justify-center relative`}>
        <CategoryIcon category={ev.category} className="w-14 h-14 text-white/80" />

        <div className="absolute top-2.5 left-2.5">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold flex items-center gap-1"
            style={{ background: st.bg, color: st.text }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: st.dot }}
            />
            {st.label}
          </span>
        </div>

        <span
          className="absolute top-2.5 right-2.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
          style={{
            background: (CAT_COLORS[ev.category] || {}).bg || "#f0f7f4",
            color:      (CAT_COLORS[ev.category] || {}).text || "#2d6a4f",
          }}
        >
          {ev.category}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">{ev.title}</h3>

        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
            {ev.date}
            <span className="mx-1 text-border">·</span>
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {ev.time}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{ev.location}</span>
          </div>
        </div>

        {/* Meta row — live from stores */}
        <div className="flex gap-4">
          <div className="text-center">
            <div className="font-bold text-emerald-700 text-base">{stats?.attendees ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">ຄົນ</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-sky-600 text-base">{stats?.donors ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">ຜູ້ບໍລິຈາກ</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-amber-600 text-base">{fmtKip(stats?.collected ?? 0)}</div>
            <div className="text-[10px] text-muted-foreground">ກີບ</div>
          </div>
        </div>

        {/* Contribution per member */}
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs">
          <span className="text-emerald-700">ຈຳນວນເງິນຕໍ່ຄົນ</span>
          <span className="font-bold text-emerald-800">{fmtKip(ev.expectedPerMember)} ກີບ</span>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 text-center py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition"
            onClick={e => { e.stopPropagation(); onOpen(); }}
          >
            ເບິ່ງລາຍລະອຽດ
          </button>
          <button
            className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
            onClick={e => e.stopPropagation()}
          >
            <Banknote className="w-3.5 h-3.5" />
          </button>
          <button
            className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
            onClick={e => { e.stopPropagation(); onDelete?.(); }}
            title="ລຶບກິດຈະກຳ"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Event Row (list) ────────────────────────────────────────────────────────
function EventRow({ ev, stats, onOpen, onDelete }) {
  const st        = eventStatus(ev);
  const bandClass = CATEGORY_BAND[ev.category] ?? "from-emerald-800 to-emerald-500";

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card shadow-sm hover:shadow-md cursor-pointer transition-shadow"
      onClick={onOpen}
    >
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${bandClass} flex items-center justify-center shrink-0`}>
        <CategoryIcon category={ev.category} className="w-7 h-7 text-white/80" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex gap-2 flex-wrap">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={{ background: st.bg, color: st.text }}
          >
            {st.label}
          </span>
          <span className="rounded-full px-2.5 py-0.5 text-xs bg-muted text-emerald-600">
            {ev.category}
          </span>
        </div>
        <h3 className="text-sm font-bold text-foreground truncate">{ev.title}</h3>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{ev.date}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{stats?.attendees ?? 0} ຄົນ</span>
        </div>
      </div>

      <div className="text-right shrink-0 hidden sm:block">
        <div className="font-bold text-emerald-700 text-sm">{fmtKip(ev.expectedPerMember)} ກີບ</div>
        <div className="text-xs text-muted-foreground">ຕໍ່ຄົນ</div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 transition shrink-0"
        title="ລຶບກິດຈະກຳ"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </div>
  );
}
