import { useMemo, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  CalendarDays,
  CalendarPlus,
  Crown,
  Lock,
  MapPin,
  Newspaper,
  Pin,
  Receipt,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  PageContainer,
  PageHeader,
  PersonAvatar,
  SectionCard,
  StatCard,
  StatusBadge,
  ViewAllButton,
} from "@/components/enterprise";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMembersState } from "@/lib/members-data";
import { useEventsState } from "@/lib/events-store";
import { useTransactionsState } from "@/lib/treasury-store";
import { useLeaders, LEADER_STATUS_LABEL } from "@/lib/leadership-store";
import { useElders } from "@/lib/elders-store";
import { useNews } from "@/lib/news-store";
import { usePermissions } from "@/lib/auth-context";
import { getEventPhase, EVENT_PHASE_LABEL } from "@/lib/domain/events";
import { monthlySeries, totalsOf } from "@/lib/domain/finance";
import {
  formatDateLao,
  formatKip,
  formatKipCompact,
  genLabel,
  LAO_MONTHS_SHORT,
} from "@/lib/domain/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "ໜ້າຫຼັກ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ພາບລວມສະມາຊິກ, ກິດຈະກຳ, ຄະນະນຳ, ຂ່າວສານ ແລະ ການເງິນຂອງຕະກູນ" },
    ],
  }),
  component: DashboardPage,
});

/** Horizontal bar list — readable at any width, safe with zero values. */
function BarList({ data }: { data: { label: string; value: number; display?: string }[] }) {
  const max = Math.max(0, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[88px_1fr_auto] items-center gap-2 text-xs">
          <span className="truncate text-muted-foreground">{d.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: max > 0 ? `${(d.value / max) * 100}%` : "0%" }}
            />
          </span>
          <span className="w-16 text-right font-medium tabular-nums">{d.display ?? d.value}</span>
        </li>
      ))}
    </ul>
  );
}

function ListRow({
  to,
  search,
  children,
}: {
  to: string;
  search?: Record<string, unknown>;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      search={search as never}
      className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/60"
    >
      {children}
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

function DashboardPage() {
  const perms = usePermissions();
  const { items: members, loading: membersLoading } = useMembersState();
  const { items: events } = useEventsState();
  const { items: txns, loading: txLoading } = useTransactionsState();
  const leaders = useLeaders();
  const elders = useElders();
  const news = useNews();

  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();

  const memberStats = useMemo(() => {
    const alive = members.filter((m) => m.status === "alive").length;
    const byGen = new Map<number, number>();
    for (const m of members) byGen.set(m.gen, (byGen.get(m.gen) ?? 0) + 1);
    return {
      total: members.length,
      alive,
      deceased: members.length - alive,
      male: members.filter((m) => m.gender === "M").length,
      female: members.filter((m) => m.gender === "F").length,
      byGen: [...byGen.entries()].sort((a, b) => a[0] - b[0]),
      recent: [...members].sort((a, b) => b.id - a.id).slice(0, 5),
    };
  }, [members]);

  const eventStats = useMemo(() => {
    const withPhase = events.map((e) => ({ e, phase: getEventPhase(e, now) }));
    const upcoming = withPhase
      .filter((x) => x.phase === "upcoming")
      .map((x) => x.e)
      .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
    const past = withPhase.filter((x) => x.phase === "past").map((x) => x.e);
    return { upcoming, past, total: events.length };
  }, [events, now]);

  const finance = useMemo(() => {
    const t = totalsOf(txns);
    const months = monthlySeries(txns, year);
    const thisMonth = months[now.getMonth()];
    return { ...t, thisMonth, recent: txns.slice(0, 5) };
  }, [txns, year, now]);

  const activeLeaders = leaders.filter((l) => l.active && l.status !== "former").slice(0, 4);
  const activeElders = elders.filter((e) => e.active && e.status !== "deceased").slice(0, 4);
  const publishedNews = news.filter((n) => n.published).slice(0, 4);

  const quickActions = [
    perms.canCreate("members") && {
      label: "ເພີ່ມສະມາຊິກ",
      icon: <UserPlus className="h-4 w-4" />,
      to: "/members",
      search: { action: "add" },
    },
    perms.canCreate("activities") && {
      label: "ສ້າງກິດຈະກຳ",
      icon: <CalendarPlus className="h-4 w-4" />,
      to: "/activities",
      search: { action: "add" },
    },
    perms.canCreate("finance") && {
      label: "ບັນທຶກລາຍຮັບ/ຈ່າຍ",
      icon: <Receipt className="h-4 w-4" />,
      to: "/finance",
      search: { action: "income" },
    },
    perms.canCreate("news") && {
      label: "ເພີ່ມຂ່າວ",
      icon: <Newspaper className="h-4 w-4" />,
      to: "/news",
      search: { action: "add" },
    },
  ].filter(Boolean) as { label: string; icon: ReactNode; to: string; search: object }[];

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        className="mb-0"
        title="Kwv Tij Hmoob Xyooj"
        description={`ພາບລວມຂໍ້ມູນຕະກູນ · ${formatDateLao(now.toISOString().slice(0, 10))}`}
        actions={quickActions.map((a) => (
          <Button key={a.label} asChild size="sm" variant="outline">
            <Link to={a.to} search={a.search as never}>
              {a.icon} {a.label}
            </Link>
          </Button>
        ))}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          to="/members"
          label="ສະມາຊິກ"
          icon={<Users />}
          value={
            membersLoading && !members.length ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              memberStats.total
            )
          }
          hint={`${memberStats.alive} ມີຊີວິດ · ${memberStats.byGen.length} ລຸ້ນ`}
        />
        <StatCard
          to="/activities"
          label="ກິດຈະກຳ"
          icon={<CalendarDays />}
          tone="info"
          value={eventStats.total}
          hint={`${eventStats.upcoming.length} ກຳລັງຈະຈັດ · ${eventStats.past.length} ຜ່ານມາ`}
        />
        <StatCard
          to="/leadership"
          label="ຄະນະນຳ / ຜູ້ອາວຸໂສ"
          icon={<Crown />}
          tone="warning"
          value={`${leaders.filter((l) => l.active).length} / ${elders.filter((e) => e.active).length}`}
          hint="ທີ່ສະແດງຢູ່ປັດຈຸບັນ"
        />
        {perms.isAuthenticated ? (
          <StatCard
            to="/finance"
            label="ຍອດຄົງເຫຼືອ"
            icon={<Wallet />}
            tone={finance.balance < 0 ? "destructive" : "success"}
            colorValue
            value={
              txLoading && !txns.length ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                formatKipCompact(finance.balance)
              )
            }
            hint={`${finance.count} ທຸລະກຳ`}
          />
        ) : (
          <StatCard
            to="/login"
            label="ການເງິນ"
            icon={<Lock />}
            tone="neutral"
            value="—"
            hint="ເຂົ້າລະບົບເພື່ອເບິ່ງ"
          />
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="ກິດຈະກຳທີ່ກຳລັງຈະມາ"
          actions={<ViewAllButton to="/activities" />}
          bodyClassName="p-2"
        >
          {eventStats.upcoming.length === 0 ? (
            <Empty text="ບໍ່ມີກິດຈະກຳທີ່ກຳລັງຈະມາ" />
          ) : (
            eventStats.upcoming.slice(0, 5).map((e) => (
              <ListRow key={e.id} to="/activities" search={{ event: e.id }}>
                <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-primary-subtle text-primary">
                  <span className="text-sm font-semibold leading-none">
                    {e.date.slice(8, 10) || "?"}
                  </span>
                  <span className="text-[10px] leading-none">
                    {e.date ? LAO_MONTHS_SHORT[Number(e.date.slice(5, 7)) - 1] : ""}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{e.title}</span>
                  <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {e.location || "—"}
                    {e.time ? ` · ${e.time}` : ""}
                  </span>
                </span>
                <StatusBadge tone="primary" className="hidden sm:inline-flex">
                  {e.category}
                </StatusBadge>
              </ListRow>
            ))
          )}
        </SectionCard>

        <SectionCard
          title="ສະມາຊິກໃໝ່ລ່າສຸດ"
          actions={<ViewAllButton to="/members" />}
          bodyClassName="p-2"
        >
          {memberStats.recent.length === 0 ? (
            <Empty text="ຍັງບໍ່ມີສະມາຊິກ" />
          ) : (
            memberStats.recent.map((m) => (
              <ListRow key={m.id} to="/members" search={{ member: m.id }}>
                <PersonAvatar name={m.name} photo={m.photo} id={m.id} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{m.name}</span>
                  <span className="block text-xs text-muted-foreground">{genLabel(m.gen)}</span>
                </span>
              </ListRow>
            ))
          )}
        </SectionCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard
          title={`ການເງິນ ປີ ${year}`}
          actions={perms.isAuthenticated ? <ViewAllButton to="/finance" /> : undefined}
          className="lg:col-span-2"
        >
          {!perms.isAuthenticated ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">ຂໍ້ມູນການເງິນສະເພາະສະມາຊິກທີ່ເຂົ້າລະບົບ</p>
              <Button asChild size="sm" variant="outline">
                <Link to="/login">ເຂົ້າລະບົບ</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              <dl className="grid grid-cols-2 gap-3">
                {[
                  { k: "ລາຍຮັບທັງໝົດ", v: finance.income, cls: "text-success" },
                  { k: "ລາຍຈ່າຍທັງໝົດ", v: finance.expense, cls: "text-destructive" },
                  { k: "ລາຍຮັບເດືອນນີ້", v: finance.thisMonth.income, cls: "" },
                  { k: "ລາຍຈ່າຍເດືອນນີ້", v: finance.thisMonth.expense, cls: "" },
                ].map((x) => (
                  <div key={x.k} className="rounded-md border border-border p-3">
                    <dt className="text-xs text-muted-foreground">{x.k}</dt>
                    <dd className={cn("mt-1 truncate text-sm font-semibold tabular-nums", x.cls)}>
                      {formatKip(x.v)}
                    </dd>
                  </div>
                ))}
              </dl>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">ທຸລະກຳລ່າສຸດ</p>
                {finance.recent.length === 0 ? (
                  <Empty text="ຍັງບໍ່ມີທຸລະກຳ" />
                ) : (
                  <ul className="divide-y divide-border">
                    {finance.recent.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-2 py-2 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="block truncate">
                            {t.contributor || t.category || t.type || "ທຸລະກຳ"}
                          </span>
                          <span className="block text-xs text-muted-foreground">{t.date}</span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 font-medium tabular-nums",
                            t.direction === "expense" ? "text-destructive" : "text-success",
                          )}
                        >
                          {t.direction === "expense" ? "−" : "+"}
                          {formatKip(t.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="ສະມາຊິກຕາມລຸ້ນ">
          {memberStats.byGen.length === 0 ? (
            <Empty text="ຍັງບໍ່ມີຂໍ້ມູນ" />
          ) : (
            <div className="space-y-4">
              <BarList
                data={memberStats.byGen.map(([g, n]) => ({ label: `Phaj ${g}`, value: n }))}
              />
              <div className="flex justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span>ຊາຍ {memberStats.male}</span>
                <span>ຍິງ {memberStats.female}</span>
                <span>ເສຍຊີວິດ {memberStats.deceased}</span>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard
          title="ຄະນະນຳ"
          actions={<ViewAllButton to="/leadership" />}
          bodyClassName="p-2"
        >
          {activeLeaders.length === 0 ? (
            <Empty text="ຍັງບໍ່ມີຂໍ້ມູນຄະນະນຳ" />
          ) : (
            activeLeaders.map((l) => (
              <ListRow
                key={l.id}
                to={l.memberId ? "/members" : "/leadership"}
                search={l.memberId ? { member: l.memberId } : undefined}
              >
                <PersonAvatar name={l.name} photo={l.photo} id={l.id} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{l.name}</span>
                  <span className="block truncate text-xs text-primary">
                    {l.position || LEADER_STATUS_LABEL[l.status]}
                  </span>
                </span>
              </ListRow>
            ))
          )}
        </SectionCard>

        <SectionCard title="ຜູ້ອາວຸໂສ" actions={<ViewAllButton to="/elders" />} bodyClassName="p-2">
          {activeElders.length === 0 ? (
            <Empty text="ຍັງບໍ່ມີຂໍ້ມູນຜູ້ອາວຸໂສ" />
          ) : (
            activeElders.map((e) => (
              <ListRow
                key={e.id}
                to={e.memberId ? "/members" : "/elders"}
                search={e.memberId ? { member: e.memberId } : undefined}
              >
                <PersonAvatar name={e.name} photo={e.photo} id={e.id} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{e.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    <Award className="mr-1 inline h-3 w-3" />
                    {e.position || "ຜູ້ອາວຸໂສ"}
                  </span>
                </span>
              </ListRow>
            ))
          )}
        </SectionCard>

        <SectionCard title="ຂ່າວສານລ່າສຸດ" actions={<ViewAllButton to="/news" />} bodyClassName="p-2">
          {publishedNews.length === 0 ? (
            <Empty text="ຍັງບໍ່ມີຂ່າວ" />
          ) : (
            publishedNews.map((n) => (
              <ListRow key={n.id} to="/news" search={{ news: n.id }}>
                {n.image ? (
                  <img
                    src={n.image}
                    alt=""
                    loading="lazy"
                    className="h-10 w-10 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Newspaper className="h-4 w-4" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate text-sm font-medium">
                    {n.pinned && (
                      <Pin className="h-3 w-3 shrink-0 text-primary" aria-label="ປັກໝຸດ" />
                    )}
                    <span className="truncate">{n.title}</span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {n.category} · {formatDateLao(n.date)}
                  </span>
                </span>
              </ListRow>
            ))
          )}
        </SectionCard>
      </div>

      {eventStats.past.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {EVENT_PHASE_LABEL.past}: {eventStats.past.length} ກິດຈະກຳ ·{" "}
          <Link to="/activities" className="text-primary hover:underline">
            ເບິ່ງປະຫວັດ
          </Link>
        </p>
      )}
    </PageContainer>
  );
}
