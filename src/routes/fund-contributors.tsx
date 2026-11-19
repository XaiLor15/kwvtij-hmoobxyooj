import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Download,
  HandCoins,
  Pencil,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  DataTable,
  ErrorState,
  Field,
  FieldGrid,
  FormDialog,
  NativeSelect,
  PageContainer,
  PageHeader,
  PersonAvatar,
  RequireAuth,
  SectionCard,
  StatCard,
  StatusBadge,
  type Column,
} from "@/components/enterprise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableMemberSelect } from "@/components/searchable-member-select";
import { getMemberById, useMembers, type Member } from "@/lib/members-data";
import { useTransactions } from "@/lib/treasury-store";
import {
  addFundMember,
  removeFundMember,
  restoreFundMember,
  updateFundMember,
  useFundMembersState,
} from "@/lib/fund-members-store";
import { usePermissions } from "@/lib/auth-context";
import { lifetimeContributions } from "@/lib/domain/fund";
import { formatDateLao, formatKip, memberCode, todayISO } from "@/lib/domain/format";
import { downloadCSV } from "@/lib/download";
import { matchesSearchTokens } from "@/lib/utils";
import type { FundMember } from "@/lib/domain/types";

export const Route = createFileRoute("/fund-contributors")({
  head: () => ({
    meta: [
      { title: "ຜູ້ເຂົ້າຮ່ວມກອງທຶນ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ລາຍຊື່ຜູ້ເຂົ້າຮ່ວມກອງທຶນ ແລະ ຍອດປະກອບສ່ວນ" },
    ],
  }),
  component: () => (
    <PageContainer className="space-y-5">
      <PageHeader
        title="ຜູ້ເຂົ້າຮ່ວມກອງທຶນ"
        description="ສະມາຊິກທີ່ເຂົ້າຮ່ວມກອງທຶນ — ຍອດເງິນຄຳນວນຈາກລາຍຮັບໃນໜ້າການເງິນ"
      />
      <RequireAuth what="ຂໍ້ມູນກອງທຶນ">
        <FundContent />
      </RequireAuth>
    </PageContainer>
  ),
});

const STATUS_LABEL: Record<string, string> = { active: "ເຄື່ອນໄຫວ", inactive: "ຢຸດຊົ່ວຄາວ" };

interface Row {
  fm: FundMember;
  member: Member | undefined;
  total: number;
  count: number;
  last: string;
}

function FundContent() {
  const { items: fundMembers, loading, error, refresh } = useFundMembersState();
  const members = useMembers();
  const txns = useTransactions();
  const perms = usePermissions();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [province, setProvince] = useState("all");
  const [dialog, setDialog] = useState<{ open: boolean; fm: FundMember | null }>({
    open: false,
    fm: null,
  });
  const [removing, setRemoving] = useState<Row | null>(null);

  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const contributions = useMemo(
    () => lifetimeContributions(txns, fundMembers, membersById),
    [txns, fundMembers, membersById],
  );

  const rows: Row[] = useMemo(
    () =>
      fundMembers.map((fm) => {
        const c = contributions.get(fm.memberId);
        return {
          fm,
          member: membersById.get(fm.memberId),
          total: c?.total ?? 0,
          count: c?.count ?? 0,
          last: c?.last ?? "",
        };
      }),
    [fundMembers, contributions, membersById],
  );

  const provinces = useMemo(
    () => [...new Set(rows.map((r) => r.member?.province).filter((p): p is string => !!p))].sort(),
    [rows],
  );
  const filtered = rows.filter(
    (r) =>
      (status === "all" || r.fm.status === status) &&
      (province === "all" || r.member?.province === province) &&
      matchesSearchTokens(search, r.member?.name, r.member?.nickname, r.member?.village, r.fm.note),
  );

  const active = rows.filter((r) => r.fm.status === "active");
  const totalAll = rows.reduce((s, r) => s + r.total, 0);
  const enrolledIds = useMemo(() => new Set(fundMembers.map((f) => f.memberId)), [fundMembers]);

  const confirmRemove = async () => {
    const r = removing;
    if (!r) return;
    setRemoving(null);
    const res = await removeFundMember(r.fm.id);
    if (!res.ok) return;
    toast.success(`ເອົາ ${r.member?.name ?? "ສະມາຊິກ"} ອອກຈາກກອງທຶນແລ້ວ (ປະຫວັດການເງິນຍັງຄົງຢູ່)`, {
      action: {
        label: "ຍົກເລີກ",
        onClick: async () => {
          const back = await restoreFundMember(r.fm);
          if (back.ok) toast.success("ກູ້ຄືນແລ້ວ");
        },
      },
    });
  };

  const exportCsv = () =>
    downloadCSV(
      "fund-contributors",
      filtered.map((r) => ({
        ລະຫັດ: r.member ? memberCode(r.member.id) : "",
        ຊື່: r.member?.name ?? "(ສະມາຊິກຖືກລຶບ)",
        ແຂວງ: r.member?.province ?? "",
        ເມືອງ: r.member?.district ?? "",
        ບ້ານ: r.member?.village ?? "",
        ວັນເຂົ້າຮ່ວມ: r.fm.joinedAt,
        ສະຖານະ: STATUS_LABEL[r.fm.status] ?? r.fm.status,
        ຈຳນວນຄັ້ງ: r.count,
        ຍອດລວມ: r.total,
        ຈ່າຍຫຼ້າສຸດ: r.last,
        ໝາຍເຫດ: r.fm.note,
      })),
    ) || toast.error("ບໍ່ມີຂໍ້ມູນໃຫ້ສົ່ງອອກ");

  const columns: Column<Row>[] = [
    {
      key: "member",
      header: "ສະມາຊິກ",
      sortValue: (r) => r.member?.name ?? "",
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <PersonAvatar
            name={r.member?.name ?? "?"}
            photo={r.member?.photo}
            id={r.fm.memberId}
            size="sm"
          />
          <div className="min-w-0">
            {r.member ? (
              <Link
                to="/members"
                search={{ member: r.member.id }}
                className="block truncate font-medium hover:text-primary hover:underline"
              >
                {r.member.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">(ສະມາຊິກຖືກລຶບ)</span>
            )}
            <span className="block truncate text-xs text-muted-foreground">
              {[r.member?.village, r.member?.province].filter(Boolean).join(", ") || "—"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "joined",
      header: "ເຂົ້າຮ່ວມ",
      sortValue: (r) => r.fm.joinedAt,
      hideBelowLg: true,
      cell: (r) => formatDateLao(r.fm.joinedAt),
    },
    {
      key: "status",
      header: "ສະຖານະ",
      cell: (r) => (
        <StatusBadge tone={r.fm.status === "active" ? "success" : "neutral"} dot>
          {STATUS_LABEL[r.fm.status] ?? r.fm.status}
        </StatusBadge>
      ),
    },
    {
      key: "count",
      header: "ຄັ້ງ",
      align: "right",
      sortValue: (r) => r.count,
      cell: (r) => <span className="tabular-nums">{r.count}</span>,
    },
    {
      key: "total",
      header: "ຍອດປະກອບສ່ວນ",
      align: "right",
      sortValue: (r) => r.total,
      cell: (r) => <span className="font-medium tabular-nums">{formatKip(r.total)}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">ຈັດການ</span>,
      align: "right",
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs">
            <Link to="/donation-tracking" search={{ member: r.fm.memberId }}>
              ການຈ່າຍ
            </Link>
          </Button>
          {perms.canEdit("fund") && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label="ແກ້ໄຂ"
              onClick={() => setDialog({ open: true, fm: r.fm })}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {perms.canDelete("fund") && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              aria-label="ເອົາອອກຈາກກອງທຶນ"
              onClick={() => setRemoving(r)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (error) return <ErrorState description={error} onRetry={() => void refresh()} />;

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4" /> CSV
        </Button>
        {perms.canCreate("fund") && (
          <Button size="sm" onClick={() => setDialog({ open: true, fm: null })}>
            <UserPlus className="h-4 w-4" /> ເພີ່ມຜູ້ເຂົ້າຮ່ວມ
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="ລົງທະບຽນທັງໝົດ" value={rows.length} icon={<Users />} />
        <StatCard label="ເຄື່ອນໄຫວ" value={active.length} icon={<UserCheck />} tone="success" />
        <StatCard
          label="ຍອດປະກອບສ່ວນລວມ"
          value={formatKip(totalAll)}
          icon={<Wallet />}
          tone="warning"
        />
        <StatCard
          label="ສະເລ່ຍຕໍ່ຄົນ"
          value={formatKip(rows.length ? Math.round(totalAll / rows.length) : 0)}
          icon={<HandCoins />}
          tone="info"
        />
      </div>

      <SectionCard bodyClassName="p-0">
        <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ຄົ້ນຫາຊື່, ບ້ານ..."
              aria-label="ຄົ້ນຫາ"
              className="pl-9"
            />
          </div>
          <NativeSelect
            aria-label="ສະຖານະ"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="sm:w-40"
          >
            <option value="all">ທຸກສະຖານະ</option>
            <option value="active">ເຄື່ອນໄຫວ</option>
            <option value="inactive">ຢຸດຊົ່ວຄາວ</option>
          </NativeSelect>
          <NativeSelect
            aria-label="ແຂວງ"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="sm:w-48"
          >
            <option value="all">ທຸກແຂວງ</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </NativeSelect>
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading && !fundMembers.length}
          getRowKey={(r) => r.fm.id}
          initialSort={{ key: "total", dir: "desc" }}
          emptyIcon={<HandCoins className="h-6 w-6" />}
          emptyTitle={rows.length ? "ບໍ່ພົບຕາມເງື່ອນໄຂ" : "ຍັງບໍ່ມີຜູ້ເຂົ້າຮ່ວມກອງທຶນ"}
          mobileCard={(r) => (
            <div className="flex items-center gap-3">
              <PersonAvatar
                name={r.member?.name ?? "?"}
                photo={r.member?.photo}
                id={r.fm.memberId}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {r.member?.name ?? "(ສະມາຊິກຖືກລຶບ)"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {STATUS_LABEL[r.fm.status] ?? r.fm.status} · {r.count} ຄັ້ງ
                </div>
              </div>
              <span className="text-sm font-medium tabular-nums">{formatKip(r.total)}</span>
            </div>
          )}
        />
      </SectionCard>

      <FundMemberDialog
        open={dialog.open}
        fm={dialog.fm}
        enrolledIds={enrolledIds}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="ເອົາອອກຈາກກອງທຶນ"
        description={
          removing
            ? `ເອົາ "${removing.member?.name ?? "ສະມາຊິກ"}" ອອກຈາກກອງທຶນ? ປະຫວັດລາຍຮັບໃນໜ້າການເງິນຈະບໍ່ຖືກລຶບ. ຖ້າຕ້ອງການຢຸດຊົ່ວຄາວ ໃຫ້ປ່ຽນສະຖານະແທນ.`
            : ""
        }
        confirmLabel="ເອົາອອກ"
        destructive
        onConfirm={() => void confirmRemove()}
      />
    </>
  );
}

function FundMemberDialog({
  open,
  fm,
  enrolledIds,
  onOpenChange,
}: {
  open: boolean;
  fm: FundMember | null;
  enrolledIds: ReadonlySet<number>;
  onOpenChange: (v: boolean) => void;
}) {
  const [memberId, setMemberId] = useState<number | null>(null);
  const [joinedAt, setJoinedAt] = useState(todayISO());
  const [status, setStatus] = useState("active");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);

  // Reset fields each time the dialog opens.
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setMemberId(fm?.memberId ?? null);
      setJoinedAt(fm?.joinedAt || todayISO());
      setStatus(fm?.status ?? "active");
      setNote(fm?.note ?? "");
      setError(null);
    }
  }

  async function submit() {
    if (memberId == null) return setError("ກະລຸນາເລືອກສະມາຊິກ");
    if (!fm && enrolledIds.has(memberId)) return setError("ສະມາຊິກນີ້ຢູ່ໃນກອງທຶນແລ້ວ");
    if (!joinedAt) return setError("ກະລຸນາເລືອກວັນເຂົ້າຮ່ວມ");
    setPending(true);
    const input = { memberId, joinedAt, status, note };
    const res = fm ? await updateFundMember(fm.id, input) : await addFundMember(input);
    setPending(false);
    if (!res.ok) return setError(res.error);
    toast.success(fm ? "ບັນທຶກແລ້ວ" : "ເພີ່ມເຂົ້າກອງທຶນແລ້ວ");
    onOpenChange(false);
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={fm ? "ແກ້ໄຂຜູ້ເຂົ້າຮ່ວມກອງທຶນ" : "ເພີ່ມຜູ້ເຂົ້າຮ່ວມກອງທຶນ"}
      icon={<HandCoins className="h-4 w-4" />}
      onSubmit={submit}
      pending={pending}
      error={error}
      size="md"
    >
      <FieldGrid>
        <Field label="ສະມາຊິກ" required className="sm:col-span-2">
          {(id) =>
            fm ? (
              <Input
                id={id}
                value={getMemberById(fm.memberId)?.name ?? `#${fm.memberId}`}
                disabled
              />
            ) : (
              <SearchableMemberSelect
                id={id}
                value={memberId}
                onChange={setMemberId}
                disabledIds={enrolledIds}
                disabledReason="ຢູ່ໃນກອງທຶນແລ້ວ"
              />
            )
          }
        </Field>
        <Field label="ວັນເຂົ້າຮ່ວມ" required hint="ກິດຈະກຳກ່ອນວັນນີ້ຈະບໍ່ຖືກນັບເປັນໜີ້">
          {(id) => (
            <Input
              id={id}
              type="date"
              value={joinedAt}
              onChange={(e) => setJoinedAt(e.target.value)}
            />
          )}
        </Field>
        <Field label="ສະຖານະ">
          {(id) => (
            <NativeSelect id={id} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">ເຄື່ອນໄຫວ</option>
              <option value="inactive">ຢຸດຊົ່ວຄາວ</option>
            </NativeSelect>
          )}
        </Field>
        <Field label="ໝາຍເຫດ" className="sm:col-span-2">
          {(id) => (
            <Textarea id={id} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          )}
        </Field>
      </FieldGrid>
    </FormDialog>
  );
}
