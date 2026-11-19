// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  HandCoins,
  Users,
  Building2,
  Home,
  Calendar,
  Filter,
  MapPin,
  Tag,
  Plus,
  Trash2,
  Download,
  Printer,
  Eye,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableMemberSelect } from "@/components/searchable-member-select";

import {
  PageContainer,
  PageHeader,
  StatCard,
  SectionCard,
  Toolbar,
  DataTable,
  StatusBadge,
  EmptyState,
  ConfirmDialog,
} from "@/components/enterprise";

import { useMembers, getMemberById } from "@/lib/members-data";
import { useTransactions } from "@/lib/treasury-store";
import {
  addFundMember,
  removeFundMember,
  restoreFundMembers,
  useFundMembers,
} from "@/lib/fund-members-store";
import { usePermissions } from "@/lib/permissions";
import { txMatchesMember } from "@/lib/fund-finance";

export const Route = createFileRoute("/fund-contributors")({
  head: () => ({
    meta: [
      { title: "ຜູ້ເຂົ້າຮ່ວມກອງທຶນ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ຜູ້ເຂົ້າຮ່ວມກອງທຶນ — ສະຫຼຸບຍອດບໍລິຈາກ" },
    ],
  }),
  component: FundContributorsPage,
});

const ALL = "__ALL__";
const fmt = (n: number) => new Intl.NumberFormat("lo-LA").format(n || 0) + " ₭";

function initials(name: string) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  const last = parts[parts.length - 1] || "";
  const first = parts[parts.length - 2] || parts[0] || "";
  return (first[0] || "") + (last[0] || "");
}

function FundContributorsPage() {
  const perms = usePermissions();
  const canCreate = perms.canCreate("fund");
  const canDelete = perms.canDelete("fund");

  const members = useMembers();
  const transactions = useTransactions();
  const fundMembers = useFundMembers();

  const [search, setSearch] = useState("");
  const [province, setProvince] = useState<string>(ALL);
  const [district, setDistrict] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addMemberId, setAddMemberId] = useState<number | null>(null);
  const [addStatus, setAddStatus] = useState("active");
  const [addNote, setAddNote] = useState("");
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [cascade, setCascade] = useState(false);

  // ── Derived data ────────────────────────────────────────────────────────
  const donations = useMemo(
    () => transactions.filter((t: any) => t.direction === "income"),
    [transactions],
  );

  const membersById = useMemo(() => new Map(members.map((m: any) => [m.id, m])), [members]);

  /**
   * Rows: one row per enrolled fund member. Financial figures are DERIVED
   * from income transactions in Finance — both "ຄ່າທຳນຽມ" and "ບໍລິຈາກ"
   * types count. A transaction is credited to a fund member either by
   * explicit memberId link, or (fallback) by contributor name match.
   */
  const rows = useMemo(() => {
    return fundMembers.map((fm: any) => {
      const member = membersById.get(fm.memberId);
      let total = 0;
      let count = 0;
      for (const t of donations) {
        if (txMatchesMember(t, member)) {
          total += Math.abs(t.amount);
          count += 1;
        }
      }
      return {
        id: fm.id,
        fundMemberId: fm.id,
        memberId: fm.memberId,
        member,
        joinedAt: fm.joinedAt,
        status: fm.status,
        note: fm.note,
        total,
        count,
      };
    });
  }, [fundMembers, donations, membersById]);

  const provinces = useMemo(
    () => Array.from(new Set(rows.map((r) => r.member?.province).filter(Boolean))).sort(),
    [rows],
  );
  const districts = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .filter((r) => province === ALL || r.member?.province === province)
            .map((r) => r.member?.district)
            .filter(Boolean),
        ),
      ).sort(),
    [rows, province],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (province !== ALL && r.member?.province !== province) return false;
      if (district !== ALL && r.member?.district !== district) return false;
      if (status !== ALL && r.status !== status) return false;
      if (q) {
        const hay = [r.member?.name, r.member?.nickname].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, province, district, status]);

  const totals = useMemo(() => {
    const active = filtered.filter((r) => r.status === "active").length;
    const total = filtered.reduce((s, r) => s + r.total, 0);
    const provincesCount = new Set(filtered.map((r) => r.member?.province).filter(Boolean)).size;
    const villagesCount = new Set(filtered.map((r) => r.member?.village).filter(Boolean)).size;
    return { active, total, provincesCount, villagesCount };
  }, [filtered]);

  // ── Add participant ─────────────────────────────────────────────────────
  const submitAdd = () => {
    if (!canCreate) {
      toast.error("ທ່ານບໍ່ມີສິດເພີ່ມຜູ້ເຂົ້າຮ່ວມ");
      return;
    }
    if (!addMemberId) {
      toast.error("ກະລຸນາເລືອກສະມາຊິກ");
      return;
    }
    // Duplicate detection — the store already updates in place, but warn the user.
    const existing = fundMembers.find((f: any) => f.memberId === addMemberId);
    const result = addFundMember({
      memberId: addMemberId,
      joinedAt: addDate,
      status: addStatus,
      note: addNote?.trim() || "",
    });
    if (!result) return; // permission rejected
    const m = getMemberById(addMemberId);
    toast.success(
      existing
        ? `ອັບເດດຂໍ້ມູນ ${m?.name || "ສະມາຊິກ"} ໃນກອງທຶນແລ້ວ`
        : `ເພີ່ມ ${m?.name || "ສະມາຊິກ"} ເຂົ້າກອງທຶນແລ້ວ`,
    );
    setAddOpen(false);
    setAddMemberId(null);
    setAddStatus("active");
    setAddNote("");
    setAddDate(new Date().toISOString().slice(0, 10));
  };

  // ── Delete participant ──────────────────────────────────────────────────
  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (!canDelete) {
      toast.error("ທ່ານບໍ່ມີສິດລຶບ");
      setDeleteTarget(null);
      return;
    }
    const target = deleteTarget;
    const useCascade = cascade;
    try {
      const { ok, snapshot } = removeFundMember(target.memberId, { cascade: useCascade });
      if (!ok) {
        toast.error("ບໍ່ສາມາດລຶບໄດ້");
        return;
      }
      toast.success(
        useCascade
          ? `ລຶບ ${target.member?.name || "ຜູ້ເຂົ້າຮ່ວມ"} ແລະຂໍ້ມູນການບໍລິຈາກທັງໝົດແລ້ວ`
          : `ລຶບ ${target.member?.name || "ຜູ້ເຂົ້າຮ່ວມ"} ອອກຈາກກອງທຶນແລ້ວ (ຮັກສາປະຫວັດການບໍລິຈາກ)`,
        {
          action: {
            label: "ຍົກເລີກ",
            onClick: () => {
              restoreFundMembers(snapshot);
              toast.info("ຍົກເລີກແລ້ວ");
            },
          },
        },
      );
    } catch (err) {
      console.error(err);
      toast.error("ເກີດຂໍ້ຜິດພາດ — ຂໍ້ມູນຖືກຟື້ນຄືນ");
    } finally {
      setDeleteTarget(null);
      setCascade(false);
    }
  };

  // ── Export ──────────────────────────────────────────────────────────────
  const doExport = () => {
    if (!filtered.length) return;
    const rowsCsv = filtered.map((r) => ({
      ຊື່: r.member?.name || "",
      ຊື່ຫຍໍ້: r.member?.nickname || "",
      ແຂວງ: r.member?.province || "",
      ເມືອງ: r.member?.district || "",
      ບ້ານ: r.member?.village || "",
      ວັນເຂົ້າຮ່ວມ: r.joinedAt || "",
      ສະຖານະ: r.status,
      ຈຳນວນຄັ້ງ: r.count,
      ຍອດລວມ: r.total,
      ໝາຍເຫດ: r.note || "",
    }));
    const headers = Object.keys(rowsCsv[0]);
    const csv = [
      headers.join(","),
      ...rowsCsv.map((r: any) =>
        headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fund-contributors.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Columns ─────────────────────────────────────────────────────────────
  const columns = [
    {
      key: "member",
      header: "ສະມາຊິກ",
      sortValue: (r: any) => r.member?.name || "",
      cell: (r: any) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(r.member?.name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">
              {r.member?.name || "—"}
            </div>
            {r.member?.nickname && (
              <div className="truncate text-xs text-muted-foreground">{r.member.nickname}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: "ພື້ນທີ່",
      sortValue: (r: any) => `${r.member?.province || ""} ${r.member?.district || ""}`,
      cell: (r: any) => (
        <div className="text-xs leading-tight">
          <div className="text-foreground">{r.member?.province || "—"}</div>
          <div className="text-muted-foreground">
            {[r.member?.district, r.member?.village].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
      ),
    },
    {
      key: "joinedAt",
      header: "ວັນເຂົ້າຮ່ວມ",
      sortValue: (r: any) => r.joinedAt || "",
      cell: (r: any) => (
        <span className="tabular-nums text-xs text-muted-foreground">{r.joinedAt || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "ສະຖານະ",
      sortValue: (r: any) => r.status,
      cell: (r: any) => (
        <StatusBadge
          tone={r.status === "active" ? "success" : r.status === "inactive" ? "neutral" : "warning"}
        >
          {r.status === "active" ? "ໃຊ້ງານ" : r.status === "inactive" ? "ຢຸດຊົ່ວຄາວ" : r.status}
        </StatusBadge>
      ),
    },
    {
      key: "count",
      header: "ຄັ້ງ",
      align: "right" as const,
      sortValue: (r: any) => r.count,
      cell: (r: any) => <span className="tabular-nums text-sm">{r.count}</span>,
    },
    {
      key: "total",
      header: "ຍອດລວມ",
      align: "right" as const,
      sortValue: (r: any) => r.total,
      cell: (r: any) => (
        <span className="tabular-nums text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {fmt(r.total)}
        </span>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right" as const,
      cell: (r: any) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="ເບິ່ງລາຍລະອຽດ"
            onClick={() => {
              if (r.member?.id) {
                window.location.href = `/members?member=${r.member.id}`;
              }
            }}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="ລຶບຜູ້ເຂົ້າຮ່ວມ"
              onClick={() => setDeleteTarget(r)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        icon={<HandCoins className="h-5 w-5" />}
        title="ຜູ້ເຂົ້າຮ່ວມກອງທຶນ"
        description="ລາຍຊື່ຜູ້ເຂົ້າຮ່ວມກອງທຶນຕະກູນ ພ້ອມສະຫຼຸບການບໍລິຈາກ (Real-time)"

        actions={
          <>
            <Button variant="outline" size="sm" onClick={doExport}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
            {canCreate && (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> ເພີ່ມຜູ້ເຂົ້າຮ່ວມ
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="ຜູ້ເຂົ້າຮ່ວມທັງໝົດ"
          value={filtered.length}
          hint={`${totals.active} Active`}
        />
        <StatCard
          icon={<HandCoins className="h-4 w-4" />}
          label="ຍອດບໍລິຈາກລວມ"
          value={fmt(totals.total)}
          trend="up"
        />
        <StatCard
          icon={<Building2 className="h-4 w-4" />}
          label="ແຂວງທີ່ຮ່ວມ"
          value={totals.provincesCount}
        />
        <StatCard
          icon={<Home className="h-4 w-4" />}
          label="ບ້ານທີ່ຮ່ວມ"
          value={totals.villagesCount}
        />
      </div>

      <SectionCard bodyClassName="p-3">
        <Toolbar search={search} onSearchChange={setSearch} searchPlaceholder="ຄົ້ນຫາຊື່, ຊື່ຫຍໍ້...">
          <Select
            value={province}
            onValueChange={(v) => {
              setProvince(v);
              setDistrict(ALL);
            }}
          >
            <SelectTrigger className="w-[160px]" aria-label="ແຂວງ">
              <MapPin className="h-4 w-4 mr-1" />
              <SelectValue placeholder="ທຸກແຂວງ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>ທຸກແຂວງ</SelectItem>
              {provinces.map((p: any) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={district} onValueChange={setDistrict}>
            <SelectTrigger className="w-[160px]" aria-label="ເມືອງ">
              <Building2 className="h-4 w-4 mr-1" />
              <SelectValue placeholder="ທຸກເມືອງ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>ທຸກເມືອງ</SelectItem>
              {districts.map((d: any) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px]" aria-label="ສະຖານະ">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue placeholder="ທຸກສະຖານະ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>ທຸກສະຖານະ</SelectItem>
              <SelectItem value="active">ໃຊ້ງານ</SelectItem>
              <SelectItem value="inactive">ຢຸດຊົ່ວຄາວ</SelectItem>
            </SelectContent>
          </Select>
        </Toolbar>
      </SectionCard>

      <SectionCard bodyClassName="p-3" className={filtered.length === 0 ? "" : "hidden md:block"}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<HandCoins className="h-6 w-6" />}
            title="ບໍ່ພົບຜູ້ເຂົ້າຮ່ວມກອງທຶນ"
            description={
              rows.length === 0
                ? "ຍັງບໍ່ມີສະມາຊິກກອງທຶນ ກົດ 'ເພີ່ມຜູ້ເຂົ້າຮ່ວມ' ເພື່ອເລີ່ມຕົ້ນ"
                : "ບໍ່ພົບຕາມເງື່ອນໄຂການຄົ້ນຫາ ລອງລ້າງຕົວກອງ"
            }
            action={
              canCreate ? (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-1" /> ເພີ່ມຜູ້ເຂົ້າຮ່ວມ
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable
            columns={columns as any}
            rows={filtered}
            getRowKey={(r: any) => r.id}
            pageSize={15}
            emptyTitle="ບໍ່ພົບຜູ້ເຂົ້າຮ່ວມ"
          />
        )}
      </SectionCard>

      {/* Mobile card view (visible below md, mirrors table content) */}
      <div className="md:hidden space-y-2">
        {filtered.map((r: any) => (
          <SectionCard key={r.id} bodyClassName="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials(r.member?.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.member?.name || "—"}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[r.member?.province, r.member?.district].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
              <StatusBadge tone={r.status === "active" ? "success" : "neutral"}>
                {r.status === "active" ? "ໃຊ້ງານ" : "ຢຸດຊົ່ວຄາວ"}
              </StatusBadge>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {r.count} ຄັ້ງ · {r.joinedAt || "—"}
              </span>
              <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {fmt(r.total)}
              </span>
            </div>
            {canDelete && (
              <div className="mt-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setDeleteTarget(r)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> ລຶບ
                </Button>
              </div>
            )}
          </SectionCard>
        ))}
      </div>

      {/* Add dialog — enrollment only. NO money fields. */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ເພີ່ມຜູ້ເຂົ້າຮ່ວມກອງທຶນ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>ສະມາຊິກ</Label>
              <SearchableMemberSelect
                value={addMemberId}
                onChange={setAddMemberId}
                placeholder="ຄົ້ນຫາສະມາຊິກ..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>ວັນເຂົ້າຮ່ວມ</Label>
                <Input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ສະຖານະ</Label>
                <Select value={addStatus} onValueChange={setAddStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">ໃຊ້ງານ</SelectItem>
                    <SelectItem value="inactive">ຢຸດຊົ່ວຄາວ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ໝາຍເຫດ (ທາງເລືອກ)</Label>
              <Textarea
                rows={2}
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
                placeholder="ໝາຍເຫດ..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              ຍົກເລີກ
            </Button>
            <Button onClick={submitAdd}>ບັນທຶກ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm — cascade opt-in */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteTarget(null);
            setCascade(false);
          }
        }}
        title={`ລຶບ "${deleteTarget?.member?.name || "ຜູ້ເຂົ້າຮ່ວມ"}" ອອກຈາກກອງທຶນ?`}
        description={
          <div className="space-y-3">
            <p>
              ໂດຍຄ່າເລີ່ມຕົ້ນ ຂໍ້ມູນການບໍລິຈາກ ແລະ ບັນທຶກການເງິນ ຈະ
              <strong> ຖືກຮັກສາໄວ້ </strong>
              ເພື່ອຄວາມສົມບູນຂອງລາຍງານ.
            </p>
            {deleteTarget && deleteTarget.count > 0 && (
              <label className="flex items-start gap-2 text-xs text-foreground">
                <Checkbox
                  checked={cascade}
                  onCheckedChange={(v) => setCascade(!!v)}
                  className="mt-0.5"
                />
                <span>
                  ລຶບແບບ Cascade — ລົບ {deleteTarget.count} ລາຍການບໍລິຈາກອອກນຳ (ຈະມີຜົນຕໍ່ດັດຊະນີການເງິນ ແລະ
                  Dashboard)
                </span>
              </label>
            )}
          </div>
        }
        confirmLabel="ຢືນຢັນລຶບ"
        onConfirm={confirmDelete}
        destructive
      />
    </PageContainer>
  );
}
