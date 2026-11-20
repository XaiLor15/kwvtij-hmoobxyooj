import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Clock, Download, MapPin, Plus, Search, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  ErrorState,
  LoadingState,
  NativeSelect,
  PageContainer,
  PageHeader,
  SectionCard,
  Segmented,
  StatCard,
  StatusBadge,
  EmptyState,
} from "@/components/enterprise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventFormDialog } from "@/components/activities/event-form-dialog";
import { EventDetailSheet } from "@/components/activities/event-detail-sheet";
import { deleteEvent, useEventsState } from "@/lib/events-store";
import { useAllParticipants } from "@/lib/participants-store";
import { useTransactions } from "@/lib/treasury-store";
import { usePermissions } from "@/lib/auth-context";
import {
  EVENT_CATEGORIES,
  EVENT_PHASE_LABEL,
  getEventPhase,
  type EventPhase,
} from "@/lib/domain/events";
import { totalsOf } from "@/lib/domain/finance";
import { formatDateLao, formatKip, LAO_MONTHS_SHORT } from "@/lib/domain/format";
import { downloadCSV } from "@/lib/download";
import { matchesSearchTokens } from "@/lib/utils";
import { optionalNumber, optionalString } from "@/lib/search-params";
import type { ClanEvent } from "@/lib/domain/types";

export const Route = createFileRoute("/activities")({
  validateSearch: (s: Record<string, unknown>): { event?: number; action?: string } => ({
    event: optionalNumber(s.event),
    action: optionalString(s.action),
  }),
  head: () => ({
    meta: [
      { title: "ກິດຈະກຳ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ຈັດການກິດຈະກຳ, ຜູ້ເຂົ້າຮ່ວມ, ຮູບພາບ ແລະ ການເງິນຂອງກິດຈະກຳ" },
    ],
  }),
  component: ActivitiesPage,
});

type PhaseFilter = "all" | EventPhase;

function ActivitiesPage() {
  const { items: events, loading, error, refresh } = useEventsState();
  const participants = useAllParticipants();
  const txns = useTransactions();
  const perms = usePermissions();
  const navigate = useNavigate({ from: "/activities" });
  const params = Route.useSearch();

  const [phase, setPhase] = useState<PhaseFilter>("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClanEvent | null>(null);
  const [deleting, setDeleting] = useState<ClanEvent | null>(null);

  const canCreate = perms.canCreate("activities");
  const selected =
    params.event != null ? (events.find((e) => e.id === params.event) ?? null) : null;
  const select = (e: ClanEvent | null) => navigate({ search: (p) => ({ ...p, event: e?.id }) });

  useEffect(() => {
    if (params.action === "add" && canCreate) {
      setEditing(null);
      setFormOpen(true);
      navigate({ search: (p) => ({ ...p, action: undefined }), replace: true });
    }
  }, [params.action, canCreate, navigate]);

  const now = useMemo(() => new Date(), []);
  const withPhase = useMemo(
    () => events.map((e) => ({ e, phase: getEventPhase(e, now) })),
    [events, now],
  );
  const categories = useMemo(
    () => [...new Set([...EVENT_CATEGORIES, ...events.map((e) => e.category).filter(Boolean)])],
    [events],
  );

  const filtered = useMemo(() => {
    const list = withPhase.filter(
      ({ e, phase: p }) =>
        (phase === "all" || p === phase) &&
        (category === "all" || e.category === category) &&
        matchesSearchTokens(search, e.title, e.location, e.organizer, e.category, e.description),
    );
    // Upcoming: soonest first. Past: most recent first.
    return list.sort((a, b) =>
      a.phase !== b.phase
        ? a.phase === "upcoming"
          ? -1
          : 1
        : a.phase === "upcoming"
          ? a.e.date.localeCompare(b.e.date)
          : b.e.date.localeCompare(a.e.date),
    );
  }, [withPhase, phase, category, search]);

  const counts = {
    all: events.length,
    upcoming: withPhase.filter((x) => x.phase === "upcoming").length,
    past: withPhase.filter((x) => x.phase === "past").length,
  };
  const totalParticipants = Object.values(participants).reduce((s, l) => s + l.length, 0);
  const eventFinance = totalsOf(txns.filter((t) => t.eventId != null));

  const confirmDelete = async () => {
    const e = deleting;
    if (!e) return;
    setDeleting(null);
    const res = await deleteEvent(e.id);
    if (res.ok) {
      toast.success(`ລຶບ "${e.title}" ແລ້ວ`);
      if (selected?.id === e.id) select(null);
    }
  };

  const exportCsv = () => {
    downloadCSV(
      "activities",
      filtered.map(({ e, phase: p }) => {
        const t = totalsOf(txns.filter((x) => x.eventId === e.id));
        return {
          ຊື່: e.title,
          ປະເພດ: e.category,
          ວັນທີ: e.date,
          ເວລາ: e.time,
          ສະຖານທີ່: e.location,
          ຜູ້ຈັດ: e.organizer,
          ສະຖານະ: EVENT_PHASE_LABEL[p],
          ຜູ້ເຂົ້າຮ່ວມ: participants[e.id]?.length ?? 0,
          ເງິນຕໍ່ຄົນ: e.expectedPerMember,
          ...(perms.isAuthenticated ? { ລາຍຮັບ: t.income, ລາຍຈ່າຍ: t.expense } : {}),
        };
      }),
    );
  };

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="ກິດຈະກຳຕະກູນ"
        description="ຈັດການງານ, ຜູ້ເຂົ້າຮ່ວມ, ຮູບພາບ ແລະ ການເງິນຂອງແຕ່ລະກິດຈະກຳ"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            {canCreate && (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> ສ້າງກິດຈະກຳ
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="ກິດຈະກຳທັງໝົດ" value={counts.all} icon={<CalendarDays />} />
        <StatCard label="ກຳລັງຈະຈັດ" value={counts.upcoming} icon={<Clock />} tone="info" />
        <StatCard
          label="ການເຂົ້າຮ່ວມລວມ"
          value={totalParticipants}
          icon={<Users />}
          tone="success"
          hint="ຄົນ-ຄັ້ງ"
        />
        {perms.isAuthenticated ? (
          <StatCard
            label="ລາຍຮັບຈາກກິດຈະກຳ"
            value={formatKip(eventFinance.income)}
            icon={<Wallet />}
            tone="warning"
            hint={`ລາຍຈ່າຍ ${formatKip(eventFinance.expense)}`}
          />
        ) : (
          <StatCard label="ຜ່ານມາແລ້ວ" value={counts.past} icon={<CalendarDays />} tone="neutral" />
        )}
      </div>

      <SectionCard bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-border p-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ຄົ້ນຫາຊື່, ສະຖານທີ່, ຜູ້ຈັດ..."
              aria-label="ຄົ້ນຫາກິດຈະກຳ"
              className="pl-9"
            />
          </div>
          <NativeSelect
            aria-label="ປະເພດ"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="lg:w-44"
          >
            <option value="all">ທຸກປະເພດ</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
          <Segmented<PhaseFilter>
            ariaLabel="ສະຖານະກິດຈະກຳ"
            value={phase}
            onChange={setPhase}
            options={[
              { value: "all", label: "ທັງໝົດ", count: counts.all },
              { value: "upcoming", label: EVENT_PHASE_LABEL.upcoming, count: counts.upcoming },
              { value: "past", label: EVENT_PHASE_LABEL.past, count: counts.past },
            ]}
          />
        </div>

        <div className="p-4">
          {error ? (
            <ErrorState description={error} onRetry={() => void refresh()} />
          ) : loading && !events.length ? (
            <LoadingState variant="cards" rows={6} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title={events.length ? "ບໍ່ພົບກິດຈະກຳຕາມເງື່ອນໄຂ" : "ຍັງບໍ່ມີກິດຈະກຳ"}
              action={
                canCreate && !events.length ? (
                  <Button size="sm" onClick={() => setFormOpen(true)}>
                    <Plus className="h-4 w-4" /> ສ້າງກິດຈະກຳທຳອິດ
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map(({ e, phase: p }) => {
                const t = perms.isAuthenticated
                  ? totalsOf(txns.filter((x) => x.eventId === e.id))
                  : null;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => select(e)}
                      className="depth-card flex h-full w-full gap-3 rounded-lg border border-border bg-card p-4 text-left shadow-xs hover:border-primary/40"
                    >
                      <span
                        className={
                          p === "upcoming"
                            ? "flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-primary text-primary-foreground"
                            : "flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-muted text-muted-foreground"
                        }
                      >
                        <span className="text-lg font-semibold leading-none">
                          {e.date.slice(8, 10) || "?"}
                        </span>
                        <span className="mt-0.5 text-[10px] leading-none">
                          {e.date
                            ? `${LAO_MONTHS_SHORT[Number(e.date.slice(5, 7)) - 1]} ${e.date.slice(2, 4)}`
                            : ""}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 space-y-1.5">
                        <span className="flex flex-wrap gap-1">
                          <StatusBadge tone={p === "upcoming" ? "primary" : "neutral"}>
                            {EVENT_PHASE_LABEL[p]}
                          </StatusBadge>
                          <StatusBadge tone="neutral">{e.category}</StatusBadge>
                        </span>
                        <span className="block line-clamp-2 text-sm font-semibold">{e.title}</span>
                        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" /> {e.location || "—"}
                          {e.time ? ` · ${e.time}` : ""}
                        </span>
                        <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            <Users className="mr-1 inline h-3 w-3" />
                            {participants[e.id]?.length ?? 0} ຄົນ
                          </span>
                          {e.expectedPerMember > 0 && (
                            <span>{formatKip(e.expectedPerMember)}/ຄົນ</span>
                          )}
                          {t && t.income > 0 && (
                            <span className="text-success">+{formatKip(t.income)}</span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SectionCard>

      <EventDetailSheet
        event={selected}
        onClose={() => select(null)}
        onEdit={
          perms.canEdit("activities")
            ? (e) => {
                setEditing(e);
                setFormOpen(true);
              }
            : undefined
        }
        onDelete={perms.canDelete("activities") ? setDeleting : undefined}
      />

      {(canCreate || perms.canEdit("activities")) && (
        <EventFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          event={editing}
          onSaved={(e) => !editing && select(e)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="ຢືນຢັນການລຶບກິດຈະກຳ"
        description={
          deleting
            ? `ລຶບ "${deleting.title}" (${formatDateLao(deleting.date)})? ລາຍຊື່ຜູ້ເຂົ້າຮ່ວມ ແລະ ຮູບພາບຂອງກິດຈະກຳນີ້ຈະຖືກລຶບນຳ. ທຸລະກຳການເງິນຍັງຄົງຢູ່ ແຕ່ຈະບໍ່ເຊື່ອມກັບກິດຈະກຳນີ້ອີກ.`
            : ""
        }
        confirmLabel="ລຶບ"
        destructive
        onConfirm={() => void confirmDelete()}
      />
    </PageContainer>
  );
}
