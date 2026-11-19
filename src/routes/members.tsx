import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, List, Network, Plus, Search, Users, UserCheck, UserX, X } from "lucide-react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  DataTable,
  ErrorState,
  LoadingState,
  NativeSelect,
  PageContainer,
  PageHeader,
  PersonAvatar,
  SectionCard,
  Segmented,
  StatCard,
  StatusBadge,
  type Column,
} from "@/components/enterprise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberFormDialog } from "@/components/members/member-form-dialog";
import { MemberDetailSheet } from "@/components/members/member-detail-sheet";
import { FamilyTree } from "@/components/members/family-tree";
import { deleteMember, useMembersState, type Member } from "@/lib/members-data";
import { useLeaders } from "@/lib/leadership-store";
import { useElders } from "@/lib/elders-store";
import { usePermissions } from "@/lib/auth-context";
import { ancestorIds } from "@/lib/domain/family";
import { ageFromBirthdate, genLabel, memberCode } from "@/lib/domain/format";
import { downloadCSV } from "@/lib/download";
import { matchesSearchTokens } from "@/lib/utils";
import { optionalNumber, optionalString } from "@/lib/search-params";

export const Route = createFileRoute("/members")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { member?: number; edit?: number; action?: string } => ({
    member: optionalNumber(s.member),
    edit: optionalNumber(s.edit),
    action: optionalString(s.action),
  }),
  head: () => ({
    meta: [
      { title: "ສະມາຊິກ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ຄົ້ນຫາ ແລະ ຈັດການຂໍ້ມູນສະມາຊິກ ແລະ ສາຍຕະກູນ" },
    ],
  }),
  component: MembersPage,
});

const ALL = "all";
type View = "table" | "tree";

function ageOf(m: Member): number | null {
  return ageFromBirthdate(m.birthdate) ?? (m.age > 0 ? m.age : null);
}

function MembersPage() {
  const { items: members, loading, error, refresh } = useMembersState();
  const leaders = useLeaders();
  const elders = useElders();
  const perms = usePermissions();
  const navigate = useNavigate({ from: "/members" });
  const params = Route.useSearch();

  const [view, setView] = useState<View>("table");
  const [search, setSearch] = useState("");
  const [gen, setGen] = useState(ALL);
  const [gender, setGender] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [branch, setBranch] = useState(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);

  const canCreate = perms.canCreate("members");
  const canEdit = perms.canEdit("members");
  const canDelete = perms.canDelete("members");

  const selected =
    params.member != null ? (members.find((m) => m.id === params.member) ?? null) : null;
  const select = (m: Member | null) =>
    navigate({ search: (p) => ({ ...p, member: m?.id }), replace: !!selected });

  // Deep links: ?action=add, ?edit=<id> (dashboard quick actions etc.)
  useEffect(() => {
    if (params.action === "add" && canCreate) {
      setEditing(null);
      setFormOpen(true);
      navigate({ search: (p) => ({ ...p, action: undefined }), replace: true });
    }
  }, [params.action, canCreate, navigate]);
  useEffect(() => {
    if (params.edit == null || !canEdit) return;
    const m = members.find((x) => x.id === params.edit);
    if (m) {
      setEditing(m);
      setFormOpen(true);
      navigate({ search: (p) => ({ ...p, edit: undefined }), replace: true });
    }
  }, [params.edit, members, canEdit, navigate]);

  const gens = useMemo(
    () => [...new Set(members.map((m) => m.gen))].sort((a, b) => a - b),
    [members],
  );
  const branches = useMemo(
    () => [...new Set(members.map((m) => m.branch).filter(Boolean))].sort(),
    [members],
  );

  const filtered = useMemo(
    () =>
      members.filter(
        (m) =>
          (gen === ALL || String(m.gen) === gen) &&
          (gender === ALL || m.gender === gender) &&
          (status === ALL || m.status === status) &&
          (branch === ALL || m.branch === branch) &&
          matchesSearchTokens(
            search,
            m.name,
            m.nickname,
            m.role,
            m.position,
            m.village,
            m.district,
            m.province,
            memberCode(m.id),
          ),
      ),
    [members, gen, gender, status, branch, search],
  );
  const filtering =
    search.trim() !== "" || gen !== ALL || gender !== ALL || status !== ALL || branch !== ALL;

  // Tree: show matches plus their ancestors so the path stays visible.
  const tree = useMemo(() => {
    if (!filtering) return { matched: new Set<number>(), visible: null };
    const matched = new Set(filtered.map((m) => m.id));
    const visible = new Set(matched);
    for (const id of matched) for (const a of ancestorIds(id, members)) visible.add(a);
    return { matched, visible };
  }, [filtering, filtered, members]);

  const stats = useMemo(() => {
    const alive = members.filter((m) => m.status === "alive").length;
    return {
      total: members.length,
      alive,
      deceased: members.length - alive,
      male: members.filter((m) => m.gender === "M").length,
      female: members.filter((m) => m.gender === "F").length,
      gens: gens.length,
    };
  }, [members, gens]);

  const resetFilters = () => {
    setSearch("");
    setGen(ALL);
    setGender(ALL);
    setStatus(ALL);
    setBranch(ALL);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (m: Member) => {
    setEditing(m);
    setFormOpen(true);
  };

  const afterSave = (m: Member) => {
    // Keep Leadership / Elders consistent: offer to add the member to that roster.
    if (m.category === "ຄະນະນຳ" && !leaders.some((l) => l.memberId === m.id)) {
      toast.info(`${m.name} ຍັງບໍ່ຢູ່ໃນລາຍຊື່ຄະນະນຳ`, {
        action: {
          label: "ເພີ່ມ",
          onClick: () => navigate({ to: "/leadership", search: { add: m.id } }),
        },
      });
    } else if (m.category === "ຜູ້ອາວຸໂສ" && !elders.some((e) => e.memberId === m.id)) {
      toast.info(`${m.name} ຍັງບໍ່ຢູ່ໃນລາຍຊື່ຜູ້ອາວຸໂສ`, {
        action: {
          label: "ເພີ່ມ",
          onClick: () => navigate({ to: "/elders", search: { add: m.id } }),
        },
      });
    }
  };

  const confirmDelete = async () => {
    const m = deleting;
    if (!m) return;
    setDeleting(null);
    const res = await deleteMember(m.id);
    if (res.ok) {
      toast.success(`ລຶບ "${m.name}" ແລ້ວ`);
      if (selected?.id === m.id) select(null);
    }
  };

  const exportCsv = () => {
    const ok = downloadCSV(
      "members",
      filtered.map((m) => ({
        ລະຫັດ: memberCode(m.id),
        ຊື່: m.name,
        ຊື່ຫຼິ້ນ: m.nickname,
        ເພດ: m.gender === "M" ? "ຊາຍ" : "ຍິງ",
        ວັນເກີດ: m.birthdate ?? "",
        ອາຍຸ: ageOf(m) ?? "",
        ລຸ້ນ: m.gen,
        ກຸ່ມ: m.branch,
        ຕຳແໜ່ງ: m.role,
        ທີ່ຢູ່: m.address,
        ...(perms.isAuthenticated ? { ເບີໂທ: m.phone } : {}),
        ສະຖານະ: m.status === "alive" ? "ມີຊີວິດ" : "ເສຍຊີວິດ",
      })),
    );
    if (!ok) toast.error("ບໍ່ມີຂໍ້ມູນໃຫ້ສົ່ງອອກ");
  };

  const statusBadge = (m: Member) => (
    <StatusBadge tone={m.status === "alive" ? "success" : "neutral"} dot>
      {m.status === "alive" ? "ມີຊີວິດ" : "ເສຍຊີວິດ"}
    </StatusBadge>
  );

  const columns: Column<Member>[] = [
    {
      key: "name",
      header: "ສະມາຊິກ",
      sortValue: (m) => m.name,
      cell: (m) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <PersonAvatar
            name={m.name}
            photo={m.photo}
            id={m.id}
            size="sm"
            muted={m.status === "deceased"}
          />
          <div className="min-w-0">
            <div className="truncate font-medium">{m.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {memberCode(m.id)}
              {m.nickname ? ` · ${m.nickname}` : ""}
            </div>
          </div>
        </div>
      ),
    },
    { key: "gender", header: "ເພດ", cell: (m) => (m.gender === "M" ? "ຊາຍ" : "ຍິງ") },
    {
      key: "age",
      header: "ອາຍຸ",
      align: "right",
      sortValue: (m) => ageOf(m) ?? -1,
      cell: (m) => <span className="tabular-nums">{ageOf(m) ?? "—"}</span>,
    },
    { key: "gen", header: "ລຸ້ນ", sortValue: (m) => m.gen, cell: (m) => `Phaj ${m.gen}` },
    {
      key: "role",
      header: "ຕຳແໜ່ງ",
      hideBelowLg: true,
      cell: (m) => <span className="text-sm">{m.role}</span>,
    },
    {
      key: "address",
      header: "ທີ່ຢູ່",
      hideBelowLg: true,
      cell: (m) => (
        <span className="line-clamp-1 max-w-[220px] text-xs text-muted-foreground">
          {m.address || "—"}
        </span>
      ),
    },
    { key: "status", header: "ສະຖານະ", cell: statusBadge },
  ];

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        className="mb-0"
        title="ສະມາຊິກຕະກູນ"
        description="ຄົ້ນຫາ, ຈັດການ ແລະ ເບິ່ງສາຍຕະກູນຂອງສະມາຊິກ"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            {canCreate && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" /> ເພີ່ມສະມາຊິກ
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="ສະມາຊິກທັງໝົດ"
          value={stats.total}
          icon={<Users />}
          hint={`${stats.gens} ລຸ້ນ`}
        />
        <StatCard label="ມີຊີວິດ" value={stats.alive} icon={<UserCheck />} tone="success" />
        <StatCard label="ເສຍຊີວິດ" value={stats.deceased} icon={<UserX />} tone="neutral" />
        <StatCard
          label="ຊາຍ / ຍິງ"
          value={`${stats.male} / ${stats.female}`}
          icon={<Users />}
          tone="info"
        />
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
              placeholder="ຄົ້ນຫາຊື່, ຊື່ຫຼິ້ນ, ບ້ານ, ລະຫັດ (M0001)..."
              aria-label="ຄົ້ນຫາສະມາຊິກ"
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
            <NativeSelect
              aria-label="ລຸ້ນ"
              value={gen}
              onChange={(e) => setGen(e.target.value)}
              className="lg:w-36"
            >
              <option value={ALL}>ທຸກລຸ້ນ</option>
              {gens.map((g) => (
                <option key={g} value={String(g)}>
                  {genLabel(g)}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="ເພດ"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="lg:w-28"
            >
              <option value={ALL}>ທຸກເພດ</option>
              <option value="M">ຊາຍ</option>
              <option value="F">ຍິງ</option>
            </NativeSelect>
            <NativeSelect
              aria-label="ສະຖານະ"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="lg:w-32"
            >
              <option value={ALL}>ທຸກສະຖານະ</option>
              <option value="alive">ມີຊີວິດ</option>
              <option value="deceased">ເສຍຊີວິດ</option>
            </NativeSelect>
            <NativeSelect
              aria-label="ກຸ່ມ"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="lg:w-44"
            >
              <option value={ALL}>ທຸກກຸ່ມ</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Segmented<View>
            ariaLabel="ຮູບແບບການສະແດງ"
            value={view}
            onChange={setView}
            options={[
              {
                value: "table",
                label: (
                  <>
                    <List className="h-3.5 w-3.5" /> ຕາຕະລາງ
                  </>
                ),
              },
              {
                value: "tree",
                label: (
                  <>
                    <Network className="h-3.5 w-3.5" /> ສາຍຕະກູນ
                  </>
                ),
              },
            ]}
          />
        </div>
        <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
          <span>
            ສະແດງ <strong className="text-foreground">{filtered.length}</strong> ຈາກ{" "}
            {members.length} ຄົນ
          </span>
          {filtering && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <X className="h-3 w-3" /> ລ້າງຕົວກອງ
            </button>
          )}
        </div>

        {error ? (
          <ErrorState className="m-4" description={error} onRetry={() => void refresh()} />
        ) : loading && members.length === 0 ? (
          <LoadingState variant="table" className="p-4" />
        ) : view === "table" ? (
          <DataTable
            columns={columns}
            rows={filtered}
            getRowKey={(m) => m.id}
            onRowClick={(m) => select(m)}
            emptyIcon={<Users className="h-6 w-6" />}
            emptyTitle={filtering ? "ບໍ່ພົບສະມາຊິກຕາມເງື່ອນໄຂ" : "ຍັງບໍ່ມີສະມາຊິກ"}
            emptyDescription={filtering ? "ລອງປ່ຽນຄຳຄົ້ນຫາ ຫຼື ລ້າງຕົວກອງ" : undefined}
            emptyAction={
              filtering ? (
                <Button size="sm" variant="outline" onClick={resetFilters}>
                  ລ້າງຕົວກອງ
                </Button>
              ) : canCreate ? (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> ເພີ່ມສະມາຊິກ
                </Button>
              ) : undefined
            }
            mobileCard={(m) => (
              <div className="flex items-center gap-3">
                <PersonAvatar
                  name={m.name}
                  photo={m.photo}
                  id={m.id}
                  muted={m.status === "deceased"}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {memberCode(m.id)} · Phaj {m.gen}
                    {ageOf(m) != null ? ` · ${ageOf(m)} ປີ` : ""}
                  </div>
                </div>
                {statusBadge(m)}
              </div>
            )}
          />
        ) : (
          <div className="overflow-x-auto p-4">
            {tree.visible && tree.visible.size === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">ບໍ່ພົບສະມາຊິກຕາມເງື່ອນໄຂ</p>
            ) : (
              <FamilyTree
                members={members}
                matched={tree.matched}
                visible={tree.visible}
                onSelect={select}
              />
            )}
          </div>
        )}
      </SectionCard>

      <MemberDetailSheet
        member={selected}
        members={members}
        onClose={() => select(null)}
        onSelect={select}
        onEdit={canEdit ? openEdit : undefined}
        onDelete={canDelete ? setDeleting : undefined}
        showContact={perms.isAuthenticated}
      />

      {(canCreate || canEdit) && (
        <MemberFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          member={editing}
          members={members}
          onSaved={afterSave}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="ຢືນຢັນການລຶບສະມາຊິກ"
        description={
          deleting
            ? `ລຶບ "${deleting.name}" ອອກຈາກລະບົບ? ລູກຂອງສະມາຊິກນີ້ຈະກາຍເປັນຕົ້ນສາຍ, ການເຂົ້າຮ່ວມກອງທຶນ ແລະ ກິດຈະກຳຈະຖືກລຶບ. ປະຫວັດການເງິນຍັງຄົງຢູ່. ບໍ່ສາມາດກູ້ຄືນໄດ້.`
            : ""
        }
        confirmLabel="ລຶບ"
        destructive
        onConfirm={() => void confirmDelete()}
      />
    </PageContainer>
  );
}
