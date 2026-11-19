// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search, CheckCircle2, Clock, AlertCircle, Calendar, Download, Printer, Filter, TrendingUp, Users, Wallet, Percent, Banknote,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  PageContainer, PageHeader, StatCard, SectionCard, StatusBadge, EmptyState,
} from "@/components/enterprise";
import { useMembers } from "@/lib/members-data";
import { useTransactions } from "@/lib/treasury-store";
import { useEvents } from "@/lib/events-store";
import { useFundMembers } from "@/lib/fund-members-store";
import { activityParticipantStats, STATUS_META } from "@/lib/fund-finance";

export const Route = createFileRoute("/donation-tracking")({
  head: () => ({
    meta: [
      { title: "ຕິດຕາມການບໍລິຈາກ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ຕິດຕາມສະຖານະຈ່າຍແລ້ວ / ຍັງບໍ່ຈ່າຍ / ຄ້າງຈ່າຍ ຂອງທຸກກິດຈະກຳ" },
    ],
  }),
  component: DonationTrackingPage,
});

const ALL = "__ALL__";
const fmt = (n) => new Intl.NumberFormat("lo-LA").format(n || 0) + " ₭";

// Map the store's colour keys onto the shared design-system tones.
const TONE_BY_COLOR = { emerald: "success", amber: "warning", rose: "destructive", slate: "neutral" };

function DonationStatus({ status }) {
  const s = STATUS_META[status] || STATUS_META.pending;
  const Icon = status === "paid" ? CheckCircle2 : status === "overdue" ? AlertCircle : Clock;
  return (
    <StatusBadge tone={TONE_BY_COLOR[s.color] || "neutral"}>
      <Icon className="h-3 w-3" /> {s.label}
    </StatusBadge>
  );
}

function exportCSV(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function DonationTrackingPage() {
  const members = useMembers();
  const transactions = useTransactions();
  const events = useEvents();
  const fundMembers = useFundMembers();

  const [search, setSearch] = useState("");
  const [eventId, setEventId] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [tab, setTab] = useState("byActivity");

  const activeFund = useMemo(() => fundMembers.filter((f) => f.status === "active"), [fundMembers]);
  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const activityViews = useMemo(() => {
    const list = eventId === ALL ? events : events.filter((e) => e.id === Number(eventId) || e.id === eventId);
    return list.map((ev) => ({
      event: ev,
      ...activityParticipantStats({ event: ev, activeFundMembers: activeFund, membersById, transactions, ignoreJoinDate: true }),
    }));
  }, [events, eventId, activeFund, membersById, transactions]);

  const totals = useMemo(() => {
    let paid = 0, pending = 0, overdue = 0, collected = 0, expected = 0, perMemberSum = 0;
    for (const v of activityViews) {
      paid += v.paid; pending += v.pending; overdue += v.overdue;
      collected += v.collected;
      // ຄາດຫວັງ = ຈຳນວນສະມາຊິກກອງທຶນ × ຈຳນວນເງິນຕໍ່ຄົນ (ຄຳນວນອັດຕະໂນມັດ)
      expected += activeFund.length * (v.perMember || 0);
      perMemberSum += v.perMember || 0;
    }
    const totalRows = paid + pending + overdue;
    return { paid, pending, overdue, collected, expected, perMemberSum, totalRows,
      remaining: Math.max(0, expected - collected),
      progress: expected > 0 ? Math.round((collected / expected) * 100) : 0,
      rate: totalRows ? Math.round((paid / totalRows) * 100) : 0 };
  }, [activityViews, activeFund.length]);

  // Flatten for byMember table
  const memberRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = [];
    for (const v of activityViews) {
      for (const row of v.rows) {
        if (statusFilter !== ALL && row.status !== statusFilter) continue;
        if (q) {
          const hay = [row.member.name, row.member.nickname].filter(Boolean).join(" ").toLowerCase();
          if (!hay.includes(q)) continue;
        }
        out.push({
          eventId: v.event.id, eventTitle: v.event.title, eventDate: v.event.date,
          member: row.member, donation: row.donation, status: row.status, expected: row.expected,
        });
      }
    }
    return out;
  }, [activityViews, search, statusFilter]);

  const doExport = () => {
    exportCSV("donation-tracking.csv", memberRows.map((r) => ({
      ກິດຈະກຳ: r.eventTitle,
      ວັນທີ: r.eventDate,
      ຊື່: r.member.name,
      ຊື່ຫຍໍ້: r.member.nickname || "",
      ຈຳນວນຄາດຫວັງ: r.expected,
      ຈຳນວນຈ່າຍ: r.donation?.amount || 0,
      ວັນຈ່າຍ: r.donation?.date || "",
      ຈ່າຍຜ່ານ: r.donation?.method || "",
      ໃບຮັບ: r.donation?.receiptNo || r.donation?.id || "",
      ສະຖານະ: STATUS_META[r.status]?.label,
    })));
  };

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        icon={<TrendingUp className="h-5 w-5" />}
        title="ຕິດຕາມການບໍລິຈາກ"
        description="Dashboard ຕິດຕາມສະຖານະການຈ່າຍຂອງຜູ້ເຂົ້າຮ່ວມກອງທຶນທຸກກິດຈະກຳ (Real-time)"
        
        actions={
          <>
            <Button variant="outline" size="sm" onClick={doExport}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="ສະມາຊິກກອງທຶນ" value={`${activeFund.length} ຄົນ`} />
        <StatCard icon={<Banknote className="h-4 w-4" />} label="ເງິນຕໍ່ຄົນ" value={fmt(totals.perMemberSum)} hint={activityViews.length > 1 ? `ລວມ ${activityViews.length} ກິດຈະກຳ` : undefined} />
        <StatCard icon={<Wallet className="h-4 w-4" />} label="ຄາດຫວັງ" value={fmt(totals.expected)} hint={`${activeFund.length} × ${fmt(totals.perMemberSum)}`} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="ບໍລິຈາກແລ້ວ" value={fmt(totals.collected)} hint={`${totals.paid} ຄົນ`} trend="up" delta="Paid" />
        <StatCard icon={<AlertCircle className="h-4 w-4" />} label="ຍັງຂາດ" value={fmt(totals.remaining)} trend={totals.remaining ? "down" : "neutral"} />
        <StatCard icon={<Percent className="h-4 w-4" />} label="ຄວາມຄືບໜ້າ" value={totals.progress + "%"} hint={`${totals.paid}/${totals.totalRows} ຄົນ`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="ຈ່າຍແລ້ວ" value={totals.paid} />
        <StatCard icon={<Clock className="h-4 w-4" />} label="ຍັງບໍ່ທັນຈ່າຍ" value={totals.pending} />
        <StatCard icon={<AlertCircle className="h-4 w-4" />} label="ຄ້າງຈ່າຍ" value={totals.overdue} />
      </div>

      <SectionCard bodyClassName="p-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          <div className="md:col-span-4 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input className="pl-8" placeholder="ຄົ້ນຫາຊື່ສະມາຊິກ..." aria-label="ຄົ້ນຫາຊື່ສະມາຊິກ" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="md:col-span-4">
            <Select value={String(eventId)} onValueChange={(v) => setEventId(v === ALL ? ALL : v)}>
              <SelectTrigger aria-label="ເລືອກກິດຈະກຳ"><Calendar className="h-4 w-4 mr-1" /><SelectValue placeholder="ທຸກກິດຈະກຳ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>ທຸກກິດຈະກຳ</SelectItem>
                {events.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.title} {e.date && `— ${e.date}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="ກັ່ນຕອງສະຖານະ"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>ທຸກສະຖານະ</SelectItem>
                <SelectItem value="paid">ຈ່າຍແລ້ວ</SelectItem>
                <SelectItem value="pending">ຍັງບໍ່ທັນຈ່າຍ</SelectItem>
                <SelectItem value="overdue">ຄ້າງຈ່າຍ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="byActivity"><Calendar className="h-4 w-4 mr-1" /> ຕາມກິດຈະກຳ</TabsTrigger>
          <TabsTrigger value="byMember"><Users className="h-4 w-4 mr-1" /> ຕາມສະມາຊິກ</TabsTrigger>
        </TabsList>

        <TabsContent value="byActivity" className="space-y-4">
          {activityViews.length === 0 ? (
            <EmptyState icon={<Calendar className="h-6 w-6" />} title="ບໍ່ພົບກິດຈະກຳ" description="ຍັງບໍ່ມີກິດຈະກຳໃນລະບົບ ຫຼື ບໍ່ກົງກັບຕົວກອງ" />
          ) : activityViews.map((v) => {
            const rows = v.rows
              .filter((r) => statusFilter === ALL || r.status === statusFilter)
              .filter((r) => {
                const q = search.trim().toLowerCase();
                if (!q) return true;
                return [r.member.name, r.member.nickname].filter(Boolean).join(" ").toLowerCase().includes(q);
              });
            return (
              <SectionCard
                key={v.event.id}
                bodyClassName="p-0"
                title={v.event.title}
                description={`${v.event.date || "—"} · ຄາດຫວັງ ${fmt(v.expectedTotal)} · ເກັບໄດ້ ${fmt(v.collected)}`}
                actions={
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge tone="success">ຈ່າຍ {v.paid}</StatusBadge>
                    <StatusBadge tone="warning">ຍັງບໍ່ຈ່າຍ {v.pending}</StatusBadge>
                    <StatusBadge tone="destructive">ຄ້າງ {v.overdue}</StatusBadge>
                    <StatusBadge tone="primary">{v.rate}%</StatusBadge>
                  </div>
                }
              >
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ຊື່</TableHead>
                        <TableHead className="text-right">ຄາດຫວັງ</TableHead>
                        <TableHead className="text-right">ຈຳນວນຈ່າຍ</TableHead>
                        <TableHead>ວັນຈ່າຍ</TableHead>
                        <TableHead>ຈ່າຍຜ່ານ</TableHead>
                        <TableHead>ໃບຮັບ</TableHead>
                        <TableHead>ສະຖານະ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.member.id}>
                          <TableCell>
                            <div className="font-medium">{r.member.name}</div>
                            {r.member.nickname && <div className="text-xs text-muted-foreground">{r.member.nickname}</div>}
                          </TableCell>
                          <TableCell className="text-right">{fmt(r.expected)}</TableCell>
                          <TableCell className="text-right font-semibold">{r.donation ? fmt(r.donation.amount) : "—"}</TableCell>
                          <TableCell className="text-sm">{r.donation?.date || "—"}</TableCell>
                          <TableCell className="text-sm">{r.donation?.method || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.donation?.receiptNo || r.donation?.id || "—"}</TableCell>
                          <TableCell><DonationStatus status={r.status} /></TableCell>
                        </TableRow>
                      ))}
                      {rows.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">ບໍ່ມີສະມາຊິກທີ່ຢູ່ໃນເງື່ອນໄຂ</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile: stacked cards */}
                <div className="md:hidden divide-y divide-border/70">
                  {rows.map((r) => (
                    <div key={r.member.id} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{r.member.name}</div>
                          {r.member.nickname && (
                            <div className="truncate text-xs text-muted-foreground">{r.member.nickname}</div>
                          )}
                        </div>
                        <div className="shrink-0"><DonationStatus status={r.status} /></div>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">ຄາດຫວັງ</dt>
                          <dd className="tabular-nums">{fmt(r.expected)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">ຈ່າຍ</dt>
                          <dd className="font-semibold tabular-nums">{r.donation ? fmt(r.donation.amount) : "—"}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">ວັນຈ່າຍ</dt>
                          <dd>{r.donation?.date || "—"}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">ຈ່າຍຜ່ານ</dt>
                          <dd className="truncate">{r.donation?.method || "—"}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                  {rows.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">ບໍ່ມີສະມາຊິກທີ່ຢູ່ໃນເງື່ອນໄຂ</div>
                  )}
                </div>

              </SectionCard>
            );
          })}
        </TabsContent>

        <TabsContent value="byMember">
          <SectionCard bodyClassName="p-0">
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ຊື່</TableHead>
                    <TableHead>ກິດຈະກຳ</TableHead>
                    <TableHead>ວັນຄົບກຳນົດ</TableHead>
                    <TableHead className="text-right">ຄາດຫວັງ</TableHead>
                    <TableHead className="text-right">ຈຳນວນຈ່າຍ</TableHead>
                    <TableHead>ວັນຈ່າຍ</TableHead>
                    <TableHead>ຈ່າຍຜ່ານ</TableHead>
                    <TableHead>ສະຖານະ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberRows.map((r, i) => (
                    <TableRow key={`${r.eventId}-${r.member.id}-${i}`}>
                      <TableCell className="font-medium">{r.member.name}</TableCell>
                      <TableCell className="text-sm">{r.eventTitle}</TableCell>
                      <TableCell className="text-sm">{r.eventDate || "—"}</TableCell>
                      <TableCell className="text-right">{fmt(r.expected)}</TableCell>
                      <TableCell className="text-right font-semibold">{r.donation ? fmt(r.donation.amount) : "—"}</TableCell>
                      <TableCell className="text-sm">{r.donation?.date || "—"}</TableCell>
                      <TableCell className="text-sm">{r.donation?.method || "—"}</TableCell>
                      <TableCell><DonationStatus status={r.status} /></TableCell>
                    </TableRow>
                  ))}
                  {memberRows.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="p-0">
                      <EmptyState icon={<Search className="h-6 w-6" />} title="ບໍ່ພົບຂໍ້ມູນຕາມຕົວກອງ" description="ລອງປັບຄຳຄົ້ນຫາ ຫຼື ຕົວກອງສະຖານະ" className="border-0" />
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: stacked cards */}
            <div className="md:hidden divide-y divide-border/70">
              {memberRows.map((r, i) => (
                <div key={`m-${r.eventId}-${r.member.id}-${i}`} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{r.member.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.eventTitle}{r.eventDate ? ` · ${r.eventDate}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0"><DonationStatus status={r.status} /></div>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">ຄາດຫວັງ</dt>
                      <dd className="tabular-nums">{fmt(r.expected)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">ຈ່າຍ</dt>
                      <dd className="font-semibold tabular-nums">{r.donation ? fmt(r.donation.amount) : "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">ວັນຈ່າຍ</dt>
                      <dd>{r.donation?.date || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">ຈ່າຍຜ່ານ</dt>
                      <dd className="truncate">{r.donation?.method || "—"}</dd>
                    </div>
                  </dl>
                </div>
              ))}
              {memberRows.length === 0 && (
                <EmptyState icon={<Search className="h-6 w-6" />} title="ບໍ່ພົບຂໍ້ມູນຕາມຕົວກອງ" description="ລອງປັບຄຳຄົ້ນຫາ ຫຼື ຕົວກອງສະຖານະ" className="border-0" />
              )}
            </div>

          </SectionCard>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
