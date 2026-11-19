import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Download,
  Percent,
  Scale,
  Search,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  CheckboxField,
  DataTable,
  EmptyState,
  NativeSelect,
  PageContainer,
  PageHeader,
  RequireAuth,
  SectionCard,
  Segmented,
  StatCard,
  StatusBadge,
  type Column,
} from "@/components/enterprise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useMembers } from "@/lib/members-data";
import { useTransactions } from "@/lib/treasury-store";
import { useEvents } from "@/lib/events-store";
import { useFundMembers } from "@/lib/fund-members-store";
import {
  PAYMENT_STATUS_META,
  activityStats,
  type ActivityStats,
  type ParticipantRow,
  type PaymentStatus,
} from "@/lib/domain/fund";
import { formatDateLao, formatKip } from "@/lib/domain/format";
import { downloadCSV } from "@/lib/download";
import { matchesSearchTokens } from "@/lib/utils";
import { optionalNumber } from "@/lib/search-params";

export const Route = createFileRoute("/donation-tracking")({
  validateSearch: (s: Record<string, unknown>): { event?: number; member?: number } => ({
    event: optionalNumber(s.event),
    member: optionalNumber(s.member),
  }),
  head: () => ({
    meta: [
      { title: "ຕິດຕາມການບໍລິຈາກ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ສະຖານະການຈ່າຍຂອງຜູ້ເຂົ້າຮ່ວມກອງທຶນໃນແຕ່ລະກິດຈະກຳ" },
    ],
  }),
  component: () => (
    <PageContainer className="space-y-5">
      <PageHeader
        className="mb-0"
        title="ຕິດຕາມການບໍລິຈາກ"
        description="ຍອດທີ່ຕ້ອງຈ່າຍ ທຽບກັບຍອດທີ່ຈ່າຍແລ້ວ ຂອງຜູ້ເຂົ້າຮ່ວມກອງທຶນ ໃນແຕ່ລະກິດຈະກຳ"
      />
      <RequireAuth what="ຂໍ້ມູນການບໍລິຈາກ">
        <TrackingContent />
      </RequireAuth>
    </PageContainer>
  ),
});

type View = "activity" | "member";
const STATUS_FILTERS: (PaymentStatus | "all")[] = ["all", "paid", "partial", "pending", "overdue"];

interface FlatRow extends ParticipantRow {
  stats: ActivityStats;
}

function Status({ s }: { s: PaymentStatus }) {
  const meta = PAYMENT_STATUS_META[s];
  return (
    <StatusBadge tone={meta.tone} dot>
      {meta.label}
    </StatusBadge>
  );
}

function TrackingContent() {
  const members = useMembers();
  const txns = useTransactions();
  const events = useEvents();
  const fundMembers = useFundMembers();
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/donation-tracking" });

  const [view, setView] = useState<View>(params.member != null ? "member" : "activity");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [respectJoin, setRespectJoin] = useState(true);
  const eventId = params.event;

  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const trackedEvents = useMemo(
    () => events.filter((e) => eventId == null || e.id === eventId),
    [events, eventId],
  );

  const stats = useMemo(
    () =>
      trackedEvents.map((event) =>
        activityStats({
          event,
          fundMembers,
          membersById,
          transactions: txns,
          respectJoinDate: respectJoin,
        }),
      ),
    [trackedEvents, fundMembers, membersById, txns, respectJoin],
  );

  const totals = useMemo(() => {
    const t = { expected: 0, collected: 0, financeIncome: 0, unattributed: 0, paid: 0, due: 0 };
    for (const s of stats) {
      t.expected += s.expectedTotal;
      t.collected += s.collected;
      t.financeIncome += s.financeIncome;
      t.unattributed += s.unattributed;
      t.paid += s.counts.paid;
      t.due += s.counts.paid + s.counts.partial + s.counts.pending + s.counts.overdue;
    }
    return { ...t, remaining: Math.max(0, t.expected - t.collected) };
  }, [stats]);

  const rowMatches = (r: ParticipantRow) =>
    (statusFilter === "all" ? r.status !== "none" : r.status === statusFilter) &&
    (params.member == null || r.member.id === params.member) &&
    matchesSearchTokens(search, r.member.name, r.member.nickname);

  const flat: FlatRow[] = useMemo(
    () => stats.flatMap((s) => s.rows.filter(rowMatches).map((r) => ({ ...r, stats: s }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats, statusFilter, search, params.member],
  );

  const setEvent = (v: string) =>
    navigate({ search: (p) => ({ ...p, event: v === "all" ? undefined : Number(v) }) });
  const filteredMember = params.member != null ? membersById.get(params.member) : undefined;

  const exportCsv = () =>
    downloadCSV(
      "donation-tracking",
      flat.map((r) => ({
        ກິດຈະກຳ: r.stats.event.title,
        ວັນທີກິດຈະກຳ: r.stats.event.date,
        ຊື່: r.member.name,
        ຕ້ອງຈ່າຍ: r.expected,
        ຈ່າຍແລ້ວ: r.paid,
        ຍັງຂາດ: Math.max(0, r.expected - r.paid),
        ຈ່າຍຫຼ້າສຸດ: r.lastPaymentDate,
        ສະຖານະ: PAYMENT_STATUS_META[r.status].label,
      })),
    ) || toast.error("ບໍ່ມີຂໍ້ມູນໃຫ້ສົ່ງອອກ");

  const columns: Column<FlatRow>[] = [
    {
      key: "member",
      header: "ສະມາຊິກ",
      sortValue: (r) => r.member.name,
      cell: (r) => (
        <Link
          to="/members"
          search={{ member: r.member.id }}
          className="font-medium hover:text-primary hover:underline"
        >
          {r.member.name}
        </Link>
      ),
    },
    ...(view === "member"
      ? [
          {
            key: "event",
            header: "ກິດຈະກຳ",
            sortValue: (r: FlatRow) => r.stats.event.date,
            cell: (r: FlatRow) => (
              <span className="text-sm">
                {r.stats.event.title}
                <span className="block text-xs text-muted-foreground">
                  {formatDateLao(r.stats.event.date)}
                </span>
              </span>
            ),
          } satisfies Column<FlatRow>,
        ]
      : []),
    {
      key: "expected",
      header: "ຕ້ອງຈ່າຍ",
      align: "right",
      cell: (r) => <span className="tabular-nums">{formatKip(r.expected)}</span>,
    },
    {
      key: "paid",
      header: "ຈ່າຍແລ້ວ",
      align: "right",
      sortValue: (r) => r.paid,
      cell: (r) => (
        <span className="tabular-nums">
          <span className="font-medium">{formatKip(r.paid)}</span>
          {r.payments.length > 1 && (
            <span className="block text-[11px] text-muted-foreground">{r.payments.length} ງວດ</span>
          )}
        </span>
      ),
    },
    { key: "last", header: "ວັນຈ່າຍ", hideBelowLg: true, cell: (r) => r.lastPaymentDate || "—" },
    {
      key: "status",
      header: "ສະຖານະ",
      sortValue: (r) => r.status,
      cell: (r) => <Status s={r.status} />,
    },
  ];

  const mobileCard = (r: FlatRow) => (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{r.member.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {view === "member" ? `${r.stats.event.title} · ` : ""}
          {formatKip(r.paid)} / {formatKip(r.expected)}
        </div>
      </div>
      <Status s={r.status} />
    </div>
  );

  const progress =
    totals.expected > 0 ? Math.min(100, Math.round((totals.collected / totals.expected) * 100)) : 0;

  return (
    <>
      <SectionCard bodyClassName="p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <NativeSelect
            aria-label="ກິດຈະກຳ"
            value={eventId != null ? String(eventId) : "all"}
            onChange={(e) => setEvent(e.target.value)}
            className="lg:w-72"
          >
            <option value="all">ທຸກກິດຈະກຳ ({events.length})</option>
            {events.map((e) => (
              <option key={e.id} value={String(e.id)}>
                {e.title} {e.date ? `— ${e.date}` : ""}
              </option>
            ))}
          </NativeSelect>
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ຄົ້ນຫາຊື່ສະມາຊິກ..."
              aria-label="ຄົ້ນຫາຊື່"
              className="pl-9"
            />
          </div>
          <NativeSelect
            aria-label="ສະຖານະການຈ່າຍ"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | "all")}
            className="lg:w-44"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "ທຸກສະຖານະ" : PAYMENT_STATUS_META[s].label}
              </option>
            ))}
          </NativeSelect>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <CheckboxField
            label="ບໍ່ນັບກິດຈະກຳກ່ອນວັນເຂົ້າຮ່ວມກອງທຶນ"
            checked={respectJoin}
            onChange={setRespectJoin}
          />
          {filteredMember && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => navigate({ search: (p) => ({ ...p, member: undefined }) })}
            >
              ສະແດງສະເພາະ: {filteredMember.name} ✕
            </button>
          )}
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="ຍອດທີ່ຕ້ອງເກັບ" value={formatKip(totals.expected)} icon={<Wallet />} />
        <StatCard
          label="ເກັບໄດ້ແລ້ວ (ສະມາຊິກກອງທຶນ)"
          value={formatKip(totals.collected)}
          icon={<CheckCircle2 />}
          tone="success"
        />
        <StatCard
          label="ຍັງຂາດ"
          value={formatKip(totals.remaining)}
          icon={<AlertCircle />}
          tone={totals.remaining > 0 ? "destructive" : "success"}
          colorValue
        />
        <StatCard
          label="ຈ່າຍຄົບ"
          value={`${totals.paid} / ${totals.due}`}
          icon={<Percent />}
          tone="info"
          hint={`ຍອດ ${progress}%`}
        />
      </div>

      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" /> ກວດສອບກັບໜ້າການເງິນ
          </span>
        }
      >
        <div className="space-y-3">
          <Progress value={progress} aria-label="ຄວາມຄືບໜ້າການເກັບເງິນ" />
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">ລາຍຮັບທີ່ເຊື່ອມກິດຈະກຳ (ການເງິນ)</dt>
              <dd className="font-semibold tabular-nums">{formatKip(totals.financeIncome)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">ນັບໃຫ້ສະມາຊິກກອງທຶນ</dt>
              <dd className="font-semibold tabular-nums text-success">
                {formatKip(totals.collected)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">ຜູ້ບໍລິຈາກອື່ນ / ບໍ່ລະບຸສະມາຊິກ</dt>
              <dd className="font-semibold tabular-nums">{formatKip(totals.unattributed)}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            ລາຍຮັບແຕ່ລະລາຍການຖືກນັບໃຫ້ສະມາຊິກໄດ້ພຽງຄົນດຽວ (ບໍ່ນັບຊ້ຳ). ຍອດ «ຜູ້ບໍລິຈາກອື່ນ» ລວມຜູ້ທີ່ບໍ່ຢູ່ໃນກອງທຶນ ແລະ
            ລາຍການທີ່ພິມຊື່ໂດຍບໍ່ເລືອກສະມາຊິກ — ເລືອກສະມາຊິກໃນໜ້າ{" "}
            <Link to="/finance" className="text-primary hover:underline">
              ການເງິນ
            </Link>{" "}
            ເພື່ອໃຫ້ນັບຖືກຕ້ອງ.
          </p>
        </div>
      </SectionCard>

      <Segmented<View>
        ariaLabel="ມຸມມອງ"
        value={view}
        onChange={setView}
        options={[
          {
            value: "activity",
            label: (
              <>
                <CalendarDays className="h-3.5 w-3.5" /> ຕາມກິດຈະກຳ
              </>
            ),
          },
          { value: "member", label: "ລາຍການທັງໝົດ" },
        ]}
      />

      {fundMembers.length === 0 ? (
        <EmptyState
          title="ຍັງບໍ່ມີຜູ້ເຂົ້າຮ່ວມກອງທຶນ"
          description="ເພີ່ມສະມາຊິກເຂົ້າກອງທຶນກ່ອນ ເພື່ອຕິດຕາມການຈ່າຍ"
          action={
            <Button asChild size="sm">
              <Link to="/fund-contributors">ໄປໜ້າຜູ້ເຂົ້າຮ່ວມກອງທຶນ</Link>
            </Button>
          }
        />
      ) : view === "member" ? (
        <SectionCard bodyClassName="p-0">
          <DataTable
            columns={columns}
            rows={flat}
            getRowKey={(r) => `${r.stats.event.id}-${r.member.id}`}
            mobileCard={mobileCard}
            emptyTitle="ບໍ່ພົບຂໍ້ມູນຕາມເງື່ອນໄຂ"
          />
        </SectionCard>
      ) : stats.length === 0 ? (
        <EmptyState title="ບໍ່ມີກິດຈະກຳ" />
      ) : (
        stats.map((s) => {
          const rows = flat.filter((r) => r.stats.event.id === s.event.id);
          return (
            <SectionCard
              key={s.event.id}
              bodyClassName="p-0"
              title={
                <Link
                  to="/activities"
                  search={{ event: s.event.id }}
                  className="hover:text-primary hover:underline"
                >
                  {s.event.title}
                </Link>
              }
              description={`${formatDateLao(s.event.date)} · ${s.perMember ? `${formatKip(s.perMember)}/ຄົນ` : "ບໍ່ໄດ້ກຳນົດເງິນຕໍ່ຄົນ"} · ເກັບໄດ້ ${formatKip(s.collected)} / ${formatKip(s.expectedTotal)}`}
              actions={
                <div className="flex flex-wrap gap-1">
                  <StatusBadge tone="success">{s.counts.paid}</StatusBadge>
                  <StatusBadge tone="info">{s.counts.partial}</StatusBadge>
                  <StatusBadge tone="warning">{s.counts.pending}</StatusBadge>
                  <StatusBadge tone="destructive">{s.counts.overdue}</StatusBadge>
                </div>
              }
            >
              <DataTable
                columns={columns}
                rows={rows}
                getRowKey={(r) => r.member.id}
                pageSize={10}
                mobileCard={mobileCard}
                emptyTitle="ບໍ່ມີສະມາຊິກຕາມເງື່ອນໄຂ"
              />
            </SectionCard>
          );
        })
      )}
    </>
  );
}
