import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  DataTable,
  ErrorState,
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
import { TransactionFormDialog } from "@/components/finance/transaction-form-dialog";
import { deleteTransaction, useTransactionsState } from "@/lib/treasury-store";
import { useEvents } from "@/lib/events-store";
import { useMembers } from "@/lib/members-data";
import { usePermissions } from "@/lib/auth-context";
import {
  DATE_RANGE_LABEL,
  categoryBreakdown,
  inDateRange,
  monthlySeries,
  topContributors,
  totalsOf,
  uniqueDonorCount,
  yearsWithData,
  type DateRange,
} from "@/lib/domain/finance";
import { formatKip, formatKipCompact, LAO_MONTHS_SHORT } from "@/lib/domain/format";
import { downloadCSV } from "@/lib/download";
import { cn, matchesSearchTokens } from "@/lib/utils";
import { optionalNumber, optionalString } from "@/lib/search-params";
import type { Transaction, TxDirection } from "@/lib/domain/types";

export const Route = createFileRoute("/finance")({
  validateSearch: (s: Record<string, unknown>): { event?: number; action?: string } => ({
    event: optionalNumber(s.event),
    action: optionalString(s.action),
  }),
  head: () => ({
    meta: [
      { title: "ການເງິນ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ລາຍຮັບ, ລາຍຈ່າຍ ແລະ ຍອດຄົງເຫຼືອຂອງຄັງເງິນຕະກູນ" },
    ],
  }),
  component: () => (
    <PageContainer className="space-y-5">
      <PageHeader title="ຄັງເງິນຕະກູນ" description="ລາຍຮັບ, ລາຍຈ່າຍ ແລະ ຍອດຄົງເຫຼືອ" />
      <RequireAuth what="ຂໍ້ມູນການເງິນ">
        <FinanceContent />
      </RequireAuth>
    </PageContainer>
  ),
});

type DirFilter = "all" | TxDirection;

function FinanceContent() {
  const { items: txns, loading, error, refresh } = useTransactionsState();
  const events = useEvents();
  const members = useMembers();
  const perms = usePermissions();
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/finance" });

  const [range, setRange] = useState<DateRange>("all");
  const [dir, setDir] = useState<DirFilter>("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [preset, setPreset] = useState<{ direction?: TxDirection; eventId?: number }>({});
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const canCreate = perms.canCreate("finance");
  const memberName = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);
  const eventName = useMemo(() => new Map(events.map((e) => [e.id, e.title])), [events]);
  const party = (t: Transaction) =>
    (t.memberId != null ? memberName.get(t.memberId) : undefined) || t.contributor || "—";
  const eventLabel = (t: Transaction) =>
    t.eventId != null ? eventName.get(t.eventId) || t.eventTitle : "";

  const openNew = (direction: TxDirection, eventId?: number) => {
    setEditing(null);
    setPreset({ direction, eventId });
    setFormOpen(true);
  };

  // Deep link from Activities / Dashboard: ?action=income|expense[&event=id]
  useEffect(() => {
    if ((params.action === "income" || params.action === "expense") && canCreate) {
      setEditing(null);
      setPreset({ direction: params.action, eventId: params.event });
      setFormOpen(true);
      navigate({ search: {}, replace: true });
    } else if (params.event != null && !params.action) {
      setEventFilter(String(params.event));
    }
  }, [params.action, params.event, canCreate, navigate]);

  const filtered = useMemo(
    () =>
      txns.filter(
        (t) =>
          inDateRange(t.date, range) &&
          (dir === "all" || t.direction === dir) &&
          (eventFilter === "all" ||
            (eventFilter === "none" ? t.eventId == null : String(t.eventId) === eventFilter)) &&
          matchesSearchTokens(search, t.id, party(t), eventLabel(t), t.category, t.type, t.note),
      ),
    // party/eventLabel depend only on the maps below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [txns, range, dir, eventFilter, search, memberName, eventName],
  );

  const totals = totalsOf(filtered);
  const years = yearsWithData(txns);
  const series = monthlySeries(txns, chartYear);
  const seriesMax = Math.max(0, ...series.map((m) => Math.max(m.income, m.expense)));
  const expenseCats = categoryBreakdown(filtered, "expense").slice(0, 6);
  const top = topContributors(filtered, 5);

  const perEvent = useMemo(
    () =>
      events
        .map((e) => ({ e, ...totalsOf(txns.filter((t) => t.eventId === e.id)) }))
        .filter((x) => x.count > 0)
        .sort((a, b) => b.e.date.localeCompare(a.e.date)),
    [events, txns],
  );

  const confirmDelete = async () => {
    const t = deleting;
    if (!t) return;
    setDeleting(null);
    const res = await deleteTransaction(t.id);
    if (res.ok) toast.success("ລຶບທຸລະກຳແລ້ວ");
  };

  const exportCsv = () =>
    downloadCSV(
      "finance",
      filtered.map((t) => ({
        ລະຫັດ: t.id,
        ວັນທີ: t.date,
        ປະເພດ: t.direction === "income" ? "ລາຍຮັບ" : "ລາຍຈ່າຍ",
        ໝວດ: t.type === "ລາຍຈ່າຍ" ? t.category : t.type,
        ຈຳນວນ: t.direction === "expense" ? -t.amount : t.amount,
        ຜູ້ກ່ຽວຂ້ອງ: party(t),
        ກິດຈະກຳ: eventLabel(t),
        ວິທີຊຳລະ: t.method,
        ໝາຍເຫດ: t.note,
      })),
    ) || toast.error("ບໍ່ມີຂໍ້ມູນໃຫ້ສົ່ງອອກ");

  const amountCell = (t: Transaction) => (
    <span
      className={cn(
        "font-medium tabular-nums",
        t.direction === "expense" ? "text-destructive" : "text-success",
      )}
    >
      {t.direction === "expense" ? "−" : "+"}
      {formatKip(t.amount)}
    </span>
  );

  const actions = (t: Transaction) =>
    perms.canEdit("finance") ? (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label="ແກ້ໄຂ"
          onClick={() => {
            setEditing(t);
            setFormOpen(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {perms.canDelete("finance") && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label="ລຶບ"
            onClick={() => setDeleting(t)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    ) : null;

  const columns: Column<Transaction>[] = [
    {
      key: "date",
      header: "ວັນທີ",
      sortValue: (t) => t.date,
      cell: (t) => <span className="whitespace-nowrap tabular-nums">{t.date}</span>,
    },
    {
      key: "type",
      header: "ປະເພດ",
      cell: (t) => (
        <StatusBadge tone={t.direction === "income" ? "success" : "destructive"}>
          {t.direction === "income" ? t.type || "ລາຍຮັບ" : t.category || "ລາຍຈ່າຍ"}
        </StatusBadge>
      ),
    },
    {
      key: "party",
      header: "ຜູ້ກ່ຽວຂ້ອງ",
      sortValue: party,
      cell: (t) => <span className="line-clamp-1">{party(t)}</span>,
    },
    {
      key: "event",
      header: "ກິດຈະກຳ",
      hideBelowLg: true,
      cell: (t) => (
        <span className="line-clamp-1 text-xs text-muted-foreground">{eventLabel(t) || "—"}</span>
      ),
    },
    {
      key: "method",
      header: "ວິທີ",
      hideBelowLg: true,
      cell: (t) => <span className="text-xs">{t.method || "—"}</span>,
    },
    {
      key: "amount",
      header: "ຈຳນວນ",
      align: "right",
      sortValue: (t) => (t.direction === "expense" ? -t.amount : t.amount),
      cell: amountCell,
    },
    {
      key: "actions",
      header: <span className="sr-only">ຈັດການ</span>,
      align: "right",
      cell: actions,
    },
  ];

  if (error) return <ErrorState description={error} onRetry={() => void refresh()} />;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented<DateRange>
          ariaLabel="ຊ່ວງເວລາ"
          value={range}
          onChange={setRange}
          options={(["all", "year", "month", "today"] as DateRange[]).map((r) => ({
            value: r,
            label: DATE_RANGE_LABEL[r],
          }))}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          {canCreate && (
            <>
              <Button size="sm" variant="outline" onClick={() => openNew("expense")}>
                <ArrowUpRight className="h-4 w-4 text-destructive" /> ລາຍຈ່າຍ
              </Button>
              <Button size="sm" onClick={() => openNew("income")}>
                <Plus className="h-4 w-4" /> ລາຍຮັບ
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={`ຍອດຄົງເຫຼືອ (${DATE_RANGE_LABEL[range]})`}
          value={formatKip(totals.balance)}
          icon={<Wallet />}
          tone={totals.balance < 0 ? "destructive" : "success"}
          colorValue
        />
        <StatCard
          label="ລາຍຮັບ"
          value={formatKip(totals.income)}
          icon={<TrendingUp />}
          tone="success"
        />
        <StatCard
          label="ລາຍຈ່າຍ"
          value={formatKip(totals.expense)}
          icon={<TrendingDown />}
          tone="destructive"
        />
        <StatCard
          label="ທຸລະກຳ / ຜູ້ບໍລິຈາກ"
          value={`${totals.count} / ${uniqueDonorCount(filtered)}`}
          icon={<Users />}
          tone="info"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="ລາຍຮັບ ແລະ ລາຍຈ່າຍລາຍເດືອນ"
          actions={
            <NativeSelect
              aria-label="ປີ"
              value={String(chartYear)}
              onChange={(e) => setChartYear(Number(e.target.value))}
              className="h-8 w-24 text-xs"
            >
              {[...new Set([new Date().getFullYear(), ...years])]
                .sort((a, b) => b - a)
                .map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
            </NativeSelect>
          }
        >
          <div
            className="flex h-44 items-end gap-1 sm:gap-2"
            role="img"
            aria-label={`ກຣາຟລາຍເດືອນ ປີ ${chartYear}`}
          >
            {series.map((m, i) => (
              <div
                key={m.month}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
              >
                <div className="flex h-full w-full items-end justify-center gap-0.5">
                  <span
                    className="w-1/2 max-w-3 rounded-t-sm bg-success"
                    style={{ height: seriesMax ? `${(m.income / seriesMax) * 100}%` : 0 }}
                    title={`ລາຍຮັບ ${formatKip(m.income)}`}
                  />
                  <span
                    className="w-1/2 max-w-3 rounded-t-sm bg-destructive/80"
                    style={{ height: seriesMax ? `${(m.expense / seriesMax) * 100}%` : 0 }}
                    title={`ລາຍຈ່າຍ ${formatKip(m.expense)}`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{LAO_MONTHS_SHORT[i]}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-success" /> ລາຍຮັບ
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-destructive/80" /> ລາຍຈ່າຍ
            </span>
            {seriesMax === 0 && <span>ບໍ່ມີທຸລະກຳໃນປີ {chartYear}</span>}
          </div>
        </SectionCard>

        <SectionCard title="ລາຍຈ່າຍຕາມໝວດ">
          {expenseCats.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">ບໍ່ມີລາຍຈ່າຍໃນຊ່ວງນີ້</p>
          ) : (
            <ul className="space-y-3">
              {expenseCats.map((c) => (
                <li key={c.label} className="space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="truncate">{c.label}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatKipCompact(c.amount)} · {c.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-destructive/70"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {top.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">ຜູ້ບໍລິຈາກສູງສຸດ</p>
              <ol className="space-y-1.5 text-sm">
                {top.map((c, i) => (
                  <li key={c.key} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">
                      <span className="mr-1.5 text-xs text-muted-foreground">{i + 1}.</span>
                      {c.memberId != null ? (
                        <Link
                          to="/members"
                          search={{ member: c.memberId }}
                          className="hover:text-primary hover:underline"
                        >
                          {memberName.get(c.memberId) ?? c.name}
                        </Link>
                      ) : (
                        c.name
                      )}
                    </span>
                    <span className="shrink-0 text-xs font-medium tabular-nums">
                      {formatKipCompact(c.amount)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard bodyClassName="p-0">
        <div className="flex flex-col gap-2 border-b border-border p-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ຄົ້ນຫາຜູ້ກ່ຽວຂ້ອງ, ລະຫັດ, ໝວດ, ໝາຍເຫດ..."
              aria-label="ຄົ້ນຫາທຸລະກຳ"
              className="pl-9"
            />
          </div>
          <NativeSelect
            aria-label="ກິດຈະກຳ"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="lg:w-56"
          >
            <option value="all">ທຸກກິດຈະກຳ</option>
            <option value="none">ບໍ່ເຊື່ອມກິດຈະກຳ</option>
            {events.map((e) => (
              <option key={e.id} value={String(e.id)}>
                {e.title}
              </option>
            ))}
          </NativeSelect>
          <Segmented<DirFilter>
            ariaLabel="ທິດທາງ"
            value={dir}
            onChange={setDir}
            options={[
              { value: "all", label: "ທັງໝົດ" },
              {
                value: "income",
                label: (
                  <>
                    <ArrowDownLeft className="h-3.5 w-3.5" /> ລາຍຮັບ
                  </>
                ),
              },
              {
                value: "expense",
                label: (
                  <>
                    <ArrowUpRight className="h-3.5 w-3.5" /> ລາຍຈ່າຍ
                  </>
                ),
              },
            ]}
          />
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading && !txns.length}
          getRowKey={(t) => t.id}
          initialSort={{ key: "date", dir: "desc" }}
          emptyIcon={<Receipt className="h-6 w-6" />}
          emptyTitle={txns.length ? "ບໍ່ພົບທຸລະກຳຕາມເງື່ອນໄຂ" : "ຍັງບໍ່ມີທຸລະກຳ"}
          mobileCard={(t) => (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{party(t)}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {t.date} · {t.direction === "income" ? t.type : t.category}
                  {eventLabel(t) ? ` · ${eventLabel(t)}` : ""}
                </div>
              </div>
              {amountCell(t)}
              {actions(t)}
            </div>
          )}
        />
      </SectionCard>

      {perEvent.length > 0 && (
        <SectionCard title="ສະຫຼຸບການເງິນຕາມກິດຈະກຳ" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {perEvent.map(({ e, income, expense, balance }) => (
              <li
                key={e.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <Link
                  to="/activities"
                  search={{ event: e.id }}
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary hover:underline"
                >
                  {e.title}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{e.date}</span>
                </Link>
                <span className="flex gap-4 text-xs tabular-nums">
                  <span className="text-success">+{formatKip(income)}</span>
                  <span className="text-destructive">−{formatKip(expense)}</span>
                  <span className={cn("font-semibold", balance < 0 && "text-destructive")}>
                    = {formatKip(balance)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {(canCreate || perms.canEdit("finance")) && (
        <TransactionFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          transaction={editing}
          preset={preset}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="ຢືນຢັນການລຶບທຸລະກຳ"
        description={
          deleting
            ? `ລຶບ ${deleting.direction === "income" ? "ລາຍຮັບ" : "ລາຍຈ່າຍ"} ${formatKip(deleting.amount)} (${deleting.date}, ${party(deleting)})? ຍອດຄົງເຫຼືອ ແລະ ການຕິດຕາມການບໍລິຈາກຈະຖືກຄຳນວນໃໝ່. ບໍ່ສາມາດກູ້ຄືນໄດ້.`
            : ""
        }
        confirmLabel="ລຶບ"
        destructive
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
