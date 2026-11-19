import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Crown, Download, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  FieldGrid,
  FormDialog,
  LoadingState,
  NativeSelect,
  PageContainer,
  PageHeader,
  SectionCard,
  Segmented,
  StatusBadge,
} from "@/components/enterprise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CreatableCombobox } from "@/components/creatable-combobox";
import { SearchableMemberSelect } from "@/components/searchable-member-select";
import { PhotoField } from "@/components/roster/photo-field";
import { RosterCard } from "@/components/roster/roster-card";
import {
  LEADER_POSITIONS,
  LEADER_STATUS_LABEL,
  addLeader,
  deleteLeader,
  moveLeader,
  setLeaderActive,
  updateLeader,
  useLeadersState,
  type LeaderInput,
} from "@/lib/leadership-store";
import { getMembers } from "@/lib/members-data";
import { usePermissions } from "@/lib/auth-context";
import { downloadCSV } from "@/lib/download";
import { matchesSearchTokens } from "@/lib/utils";
import { optionalNumber } from "@/lib/search-params";
import type { Leader, LeaderStatus } from "@/lib/domain/types";

export const Route = createFileRoute("/leadership")({
  validateSearch: (s: Record<string, unknown>): { add?: number } => ({
    add: optionalNumber(s.add),
  }),
  head: () => ({
    meta: [
      { title: "ຄະນະນຳ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ຄະນະນຳ ແລະ ຜູ້ບໍລິຫານຕະກູນ" },
    ],
  }),
  component: LeadershipPage,
});

type StatusFilter = "all" | LeaderStatus;

function LeadershipPage() {
  const { items: leaders, loading, error, refresh } = useLeadersState();
  const perms = usePermissions();
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/leadership" });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [showHidden, setShowHidden] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; leader: Leader | null; memberId?: number }>(
    {
      open: false,
      leader: null,
    },
  );
  const [deleting, setDeleting] = useState<Leader | null>(null);

  const canEdit = perms.canEdit("leadership");

  useEffect(() => {
    if (params.add != null && perms.canCreate("leadership")) {
      setDialog({ open: true, leader: null, memberId: params.add });
      navigate({ search: {}, replace: true });
    }
  }, [params.add, perms, navigate]);

  const visible = useMemo(
    () =>
      leaders.filter(
        (l) =>
          (showHidden || l.active) &&
          (status === "all" || l.status === status) &&
          matchesSearchTokens(search, l.name, l.position, l.department, l.branch),
      ),
    [leaders, showHidden, status, search],
  );
  const counts = (s: LeaderStatus) => leaders.filter((l) => l.active && l.status === s).length;

  const exportCsv = () =>
    downloadCSV(
      "leadership",
      visible.map((l) => ({
        ລຳດັບ: l.displayOrder,
        ຊື່: l.name,
        ຕຳແໜ່ງ: l.position,
        ພາກສ່ວນ: l.department,
        ສະຖານະ: LEADER_STATUS_LABEL[l.status],
        ເລີ່ມ: l.startYear ?? "",
        ສິ້ນສຸດ: l.endYear ?? "",
        ...(perms.isAuthenticated ? { ເບີໂທ: l.phone } : {}),
      })),
    ) || toast.error("ບໍ່ມີຂໍ້ມູນໃຫ້ສົ່ງອອກ");

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        className="mb-0"
        title="ຄະນະນຳ"
        description="ຄະນະບໍລິຫານ ແລະ ທີ່ປຶກສາຕະກູນ — ລຳດັບນີ້ໃຊ້ສະແດງໃນໜ້າຫຼັກ"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            {perms.canCreate("leadership") && (
              <Button size="sm" onClick={() => setDialog({ open: true, leader: null })}>
                <UserPlus className="h-4 w-4" /> ເພີ່ມຄະນະນຳ
              </Button>
            )}
          </>
        }
      />

      <SectionCard bodyClassName="p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ຄົ້ນຫາຊື່, ຕຳແໜ່ງ, ພາກສ່ວນ..."
              aria-label="ຄົ້ນຫາ"
              className="pl-9"
            />
          </div>
          <Segmented<StatusFilter>
            ariaLabel="ສະຖານະ"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "ທັງໝົດ" },
              { value: "active", label: LEADER_STATUS_LABEL.active, count: counts("active") },
              { value: "advisor", label: LEADER_STATUS_LABEL.advisor, count: counts("advisor") },
              { value: "former", label: LEADER_STATUS_LABEL.former, count: counts("former") },
            ]}
          />
          {canEdit && (
            <Button
              variant={showHidden ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowHidden((v) => !v)}
            >
              {showHidden ? "ເຊື່ອງລາຍການທີ່ປິດ" : "ສະແດງລາຍການທີ່ປິດ"}
            </Button>
          )}
        </div>
      </SectionCard>

      {error ? (
        <ErrorState description={error} onRetry={() => void refresh()} />
      ) : loading && !leaders.length ? (
        <LoadingState variant="cards" rows={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Crown className="h-6 w-6" />}
          title={leaders.length ? "ບໍ່ພົບຕາມເງື່ອນໄຂ" : "ຍັງບໍ່ມີຂໍ້ມູນຄະນະນຳ"}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((l) => {
            const idx = leaders.findIndex((x) => x.id === l.id);
            return (
              <li key={l.id}>
                <RosterCard
                  name={l.name}
                  photo={l.photo}
                  id={l.id}
                  memberId={l.memberId}
                  title={l.position || "—"}
                  subtitle={[l.department, l.branch].filter(Boolean).join(" · ")}
                  active={l.active}
                  muted={l.status === "former"}
                  badges={
                    <>
                      <StatusBadge
                        tone={
                          l.status === "active"
                            ? "success"
                            : l.status === "advisor"
                              ? "warning"
                              : "neutral"
                        }
                        dot
                      >
                        {LEADER_STATUS_LABEL[l.status]}
                      </StatusBadge>
                      {(l.startYear || l.endYear) && (
                        <StatusBadge tone="neutral">
                          {l.startYear ?? "?"}–{l.endYear ?? "ປັດຈຸບັນ"}
                        </StatusBadge>
                      )}
                      {!l.active && <StatusBadge tone="neutral">ເຊື່ອງ</StatusBadge>}
                    </>
                  }
                  body={
                    (l.bio || l.achievements.length > 0) && (
                      <>
                        {l.bio && <p className="line-clamp-3">{l.bio}</p>}
                        {l.achievements.length > 0 && (
                          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs">
                            {l.achievements.slice(0, 3).map((a) => (
                              <li key={a}>{a}</li>
                            ))}
                          </ul>
                        )}
                      </>
                    )
                  }
                  actions={{
                    onEdit: canEdit ? () => setDialog({ open: true, leader: l }) : undefined,
                    onMove: canEdit ? (d) => void moveLeader(l.id, d) : undefined,
                    onToggleActive: canEdit
                      ? () => void setLeaderActive(l.id, !l.active)
                      : undefined,
                    onDelete: perms.canDelete("leadership") ? () => setDeleting(l) : undefined,
                    isFirst: idx === 0,
                    isLast: idx === leaders.length - 1,
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}

      <LeaderDialog
        open={dialog.open}
        leader={dialog.leader}
        presetMemberId={dialog.memberId}
        existing={leaders}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="ລຶບຈາກຄະນະນຳ"
        description={
          deleting
            ? `ລຶບ "${deleting.name}" ອອກຈາກລາຍຊື່ຄະນະນຳ? (ຂໍ້ມູນສະມາຊິກບໍ່ຖືກລຶບ. ຖ້າຢາກເກັບປະຫວັດ ໃຫ້ປ່ຽນສະຖານະເປັນ «ອະດີດ» ແທນ)`
            : ""
        }
        confirmLabel="ລຶບ"
        destructive
        onConfirm={async () => {
          const l = deleting;
          setDeleting(null);
          if (l && (await deleteLeader(l.id)).ok) toast.success("ລຶບແລ້ວ");
        }}
      />
    </PageContainer>
  );
}

function blank(memberId?: number): LeaderInput {
  const m = memberId != null ? getMembers().find((x) => x.id === memberId) : undefined;
  return {
    memberId: m?.id,
    name: m?.name ?? "",
    position: m?.position ?? "",
    department: "",
    branch: m?.branch ?? "",
    phone: m?.phone ?? "",
    bio: "",
    photo: m?.photo ?? null,
    status: "active",
    startYear: new Date().getFullYear(),
    achievements: [],
  };
}

function LeaderDialog({
  open,
  leader,
  presetMemberId,
  existing,
  onOpenChange,
}: {
  open: boolean;
  leader: Leader | null;
  presetMemberId?: number;
  existing: Leader[];
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState<LeaderInput>(() => blank());
  const [achievements, setAchievements] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(leader ? { ...leader } : blank(presetMemberId));
    setAchievements(leader?.achievements.join("\n") ?? "");
    setError(null);
  }, [open, leader, presetMemberId]);

  const set = <K extends keyof LeaderInput>(k: K, v: LeaderInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const linked = new Set(
    existing.filter((l) => l.id !== leader?.id && l.memberId != null).map((l) => l.memberId!),
  );

  async function submit() {
    if (!form.name.trim()) return setError("ກະລຸນາເລືອກສະມາຊິກ ຫຼື ປ້ອນຊື່");
    if (!form.position.trim()) return setError("ກະລຸນາປ້ອນຕຳແໜ່ງ");
    if (form.memberId != null && linked.has(form.memberId)) return setError("ສະມາຊິກນີ້ຢູ່ໃນຄະນະນຳແລ້ວ");
    if (form.startYear && form.endYear && form.endYear < form.startYear)
      return setError("ປີສິ້ນສຸດຕ້ອງບໍ່ກ່ອນປີເລີ່ມ");
    const input = {
      ...form,
      achievements: achievements
        .split(/\n|,/)
        .map((a) => a.trim())
        .filter(Boolean),
    };
    setPending(true);
    const res = leader ? await updateLeader(leader.id, input) : await addLeader(input);
    setPending(false);
    if (!res.ok) return setError(res.error);
    toast.success(leader ? "ບັນທຶກແລ້ວ" : "ເພີ່ມຄະນະນຳແລ້ວ");
    onOpenChange(false);
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={leader ? "ແກ້ໄຂຄະນະນຳ" : "ເພີ່ມຄະນະນຳ"}
      icon={<Crown className="h-4 w-4" />}
      onSubmit={submit}
      pending={pending}
      error={error}
      size="lg"
    >
      <PhotoField name={form.name} value={form.photo} onChange={(v) => set("photo", v)} />
      <FieldGrid>
        <Field label="ສະມາຊິກ" hint="ເຊື່ອມກັບຂໍ້ມູນສະມາຊິກ (ແນະນຳ)" className="sm:col-span-2">
          {(id) => (
            <SearchableMemberSelect
              id={id}
              value={form.memberId ?? null}
              disabledIds={linked}
              disabledReason="ຢູ່ໃນຄະນະນຳແລ້ວ"
              allowNone
              onChange={(mid) => {
                const m = mid != null ? getMembers().find((x) => x.id === mid) : undefined;
                setForm((f) => ({
                  ...f,
                  memberId: m?.id,
                  name: m?.name ?? f.name,
                  branch: m?.branch ?? f.branch,
                  phone: f.phone || m?.phone || "",
                  photo: f.photo ?? m?.photo ?? null,
                }));
              }}
            />
          )}
        </Field>
        <Field label="ຊື່" required>
          {(id) => (
            <Input id={id} value={form.name} onChange={(e) => set("name", e.target.value)} />
          )}
        </Field>
        <Field label="ຕຳແໜ່ງ" required>
          {(id) => (
            <CreatableCombobox
              id={id}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm md:text-sm"
              value={form.position}
              onChange={(v) => set("position", v)}
              options={LEADER_POSITIONS}
              placeholder="ເລືອກ ຫຼື ພິມ..."
            />
          )}
        </Field>
        <Field label="ພາກສ່ວນ">
          {(id) => (
            <Input
              id={id}
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
            />
          )}
        </Field>
        <Field label="ສະຖານະ">
          {(id) => (
            <NativeSelect
              id={id}
              value={form.status}
              onChange={(e) => set("status", e.target.value as LeaderStatus)}
            >
              {(Object.keys(LEADER_STATUS_LABEL) as LeaderStatus[]).map((s) => (
                <option key={s} value={s}>
                  {LEADER_STATUS_LABEL[s]}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="ປີເລີ່ມ">
          {(id) => (
            <Input
              id={id}
              type="number"
              min={1900}
              max={2100}
              value={form.startYear ?? ""}
              onChange={(e) =>
                set("startYear", e.target.value ? Number(e.target.value) : undefined)
              }
            />
          )}
        </Field>
        <Field label="ປີສິ້ນສຸດ">
          {(id) => (
            <Input
              id={id}
              type="number"
              min={1900}
              max={2100}
              value={form.endYear ?? ""}
              onChange={(e) => set("endYear", e.target.value ? Number(e.target.value) : undefined)}
            />
          )}
        </Field>
        <Field label="ເບີໂທ" hint="ເຫັນສະເພາະສະມາຊິກທີ່ເຂົ້າລະບົບ">
          {(id) => (
            <Input
              id={id}
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          )}
        </Field>
        <Field label="ກຸ່ມ">
          {(id) => (
            <Input id={id} value={form.branch} onChange={(e) => set("branch", e.target.value)} />
          )}
        </Field>
        <Field label="ປະຫວັດຫຍໍ້" className="sm:col-span-2">
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
            />
          )}
        </Field>
        <Field label="ຜົນງານ" hint="ແຖວລະ 1 ລາຍການ" className="sm:col-span-2">
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
            />
          )}
        </Field>
      </FieldGrid>
    </FormDialog>
  );
}
