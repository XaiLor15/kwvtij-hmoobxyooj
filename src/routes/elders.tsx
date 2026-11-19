import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Award, Download, Search, UserPlus } from "lucide-react";
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
  ELDER_POSITIONS,
  ELDER_STATUS_LABEL,
  addElder,
  deleteElder,
  moveElder,
  setElderActive,
  updateElder,
  useEldersState,
  type ElderInput,
} from "@/lib/elders-store";
import { getMembers, useMembers } from "@/lib/members-data";
import { usePermissions } from "@/lib/auth-context";
import { ageFromBirthdate, genLabel } from "@/lib/domain/format";
import { downloadCSV } from "@/lib/download";
import { matchesSearchTokens } from "@/lib/utils";
import { optionalNumber } from "@/lib/search-params";
import type { Elder, ElderStatus } from "@/lib/domain/types";

export const Route = createFileRoute("/elders")({
  validateSearch: (s: Record<string, unknown>): { add?: number } => ({
    add: optionalNumber(s.add),
  }),
  head: () => ({
    meta: [
      { title: "ຜູ້ອາວຸໂສ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ຜູ້ອາວຸໂສ ແລະ ຜູ້ມີບົດບາດສຳຄັນໃນຕະກູນ" },
    ],
  }),
  component: EldersPage,
});

type StatusFilter = "all" | ElderStatus;

function EldersPage() {
  const { items: elders, loading, error, refresh } = useEldersState();
  const members = useMembers();
  const perms = usePermissions();
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/elders" });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [showHidden, setShowHidden] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; elder: Elder | null; memberId?: number }>({
    open: false,
    elder: null,
  });
  const [deleting, setDeleting] = useState<Elder | null>(null);
  const canEdit = perms.canEdit("elders");
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  useEffect(() => {
    if (params.add != null && perms.canCreate("elders")) {
      setDialog({ open: true, elder: null, memberId: params.add });
      navigate({ search: {}, replace: true });
    }
  }, [params.add, perms, navigate]);

  /** Age from the linked member's birthdate (always current), else stored age. */
  const ageOf = (e: Elder) => {
    const m = e.memberId != null ? memberById.get(e.memberId) : undefined;
    return ageFromBirthdate(m?.birthdate) ?? e.age ?? null;
  };

  const visible = elders.filter(
    (e) =>
      (showHidden || e.active) &&
      (status === "all" || e.status === status) &&
      matchesSearchTokens(search, e.name, e.position, e.branch, e.bio),
  );
  const count = (s: ElderStatus) => elders.filter((e) => e.active && e.status === s).length;

  const exportCsv = () =>
    downloadCSV(
      "elders",
      visible.map((e) => ({
        ລຳດັບ: e.displayOrder,
        ຊື່: e.name,
        ບົດບາດ: e.position,
        ອາຍຸ: ageOf(e) ?? "",
        ສະຖານະ: ELDER_STATUS_LABEL[e.status],
        ກຸ່ມ: e.branch,
        ຜົນງານ: e.contributions,
        ກຽດຕິຍົດ: e.honors,
      })),
    ) || toast.error("ບໍ່ມີຂໍ້ມູນໃຫ້ສົ່ງອອກ");

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        className="mb-0"
        title="ຜູ້ອາວຸໂສ"
        description="ຜູ້ໃຫຍ່ ແລະ ຜູ້ມີບົດບາດສຳຄັນໃນຕະກູນ — ລຳດັບນີ້ໃຊ້ສະແດງໃນໜ້າຫຼັກ"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            {perms.canCreate("elders") && (
              <Button size="sm" onClick={() => setDialog({ open: true, elder: null })}>
                <UserPlus className="h-4 w-4" /> ເພີ່ມຜູ້ອາວຸໂສ
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
              placeholder="ຄົ້ນຫາຊື່, ບົດບາດ..."
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
              { value: "living", label: ELDER_STATUS_LABEL.living, count: count("living") },
              { value: "advisor", label: ELDER_STATUS_LABEL.advisor, count: count("advisor") },
              { value: "deceased", label: ELDER_STATUS_LABEL.deceased, count: count("deceased") },
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
      ) : loading && !elders.length ? (
        <LoadingState variant="cards" rows={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Award className="h-6 w-6" />}
          title={elders.length ? "ບໍ່ພົບຕາມເງື່ອນໄຂ" : "ຍັງບໍ່ມີຂໍ້ມູນຜູ້ອາວຸໂສ"}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((e) => {
            const idx = elders.findIndex((x) => x.id === e.id);
            const m = e.memberId != null ? memberById.get(e.memberId) : undefined;
            const age = ageOf(e);
            return (
              <li key={e.id}>
                <RosterCard
                  name={e.name}
                  photo={e.photo}
                  id={e.id}
                  memberId={e.memberId}
                  title={e.position || "ຜູ້ອາວຸໂສ"}
                  subtitle={[m ? genLabel(m.gen) : "", age != null ? `${age} ປີ` : "", e.branch]
                    .filter(Boolean)
                    .join(" · ")}
                  active={e.active}
                  muted={e.status === "deceased"}
                  badges={
                    <>
                      <StatusBadge
                        tone={
                          e.status === "living"
                            ? "success"
                            : e.status === "advisor"
                              ? "warning"
                              : "neutral"
                        }
                        dot
                      >
                        {ELDER_STATUS_LABEL[e.status]}
                      </StatusBadge>
                      {!e.active && <StatusBadge tone="neutral">ເຊື່ອງ</StatusBadge>}
                    </>
                  }
                  body={
                    (e.bio || e.contributions || e.honors) && (
                      <div className="space-y-1.5">
                        {e.bio && <p className="line-clamp-3">{e.bio}</p>}
                        {e.contributions && (
                          <p className="text-xs">
                            <span className="font-medium text-foreground">ຜົນງານ: </span>
                            {e.contributions}
                          </p>
                        )}
                        {e.honors && (
                          <p className="text-xs">
                            <span className="font-medium text-foreground">ກຽດຕິຍົດ: </span>
                            {e.honors}
                          </p>
                        )}
                      </div>
                    )
                  }
                  actions={{
                    onEdit: canEdit ? () => setDialog({ open: true, elder: e }) : undefined,
                    onMove: canEdit ? (d) => void moveElder(e.id, d) : undefined,
                    onToggleActive: canEdit
                      ? () => void setElderActive(e.id, !e.active)
                      : undefined,
                    onDelete: perms.canDelete("elders") ? () => setDeleting(e) : undefined,
                    isFirst: idx === 0,
                    isLast: idx === elders.length - 1,
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}

      <ElderDialog
        open={dialog.open}
        elder={dialog.elder}
        presetMemberId={dialog.memberId}
        existing={elders}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="ລຶບຈາກລາຍຊື່ຜູ້ອາວຸໂສ"
        description={deleting ? `ລຶບ "${deleting.name}" ອອກຈາກລາຍຊື່ຜູ້ອາວຸໂສ? (ຂໍ້ມູນສະມາຊິກບໍ່ຖືກລຶບ)` : ""}
        confirmLabel="ລຶບ"
        destructive
        onConfirm={async () => {
          const e = deleting;
          setDeleting(null);
          if (e && (await deleteElder(e.id)).ok) toast.success("ລຶບແລ້ວ");
        }}
      />
    </PageContainer>
  );
}

function blank(memberId?: number): ElderInput {
  const m = memberId != null ? getMembers().find((x) => x.id === memberId) : undefined;
  return {
    memberId: m?.id,
    name: m?.name ?? "",
    position: m?.position ?? "",
    branch: m?.branch ?? "",
    phone: m?.phone ?? "",
    bio: "",
    note: "",
    photo: m?.photo ?? null,
    status: m?.status === "deceased" ? "deceased" : "living",
    contributions: "",
    honors: "",
  };
}

function ElderDialog({
  open,
  elder,
  presetMemberId,
  existing,
  onOpenChange,
}: {
  open: boolean;
  elder: Elder | null;
  presetMemberId?: number;
  existing: Elder[];
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState<ElderInput>(() => blank());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(elder ? { ...elder } : blank(presetMemberId));
    setError(null);
  }, [open, elder, presetMemberId]);

  const set = <K extends keyof ElderInput>(k: K, v: ElderInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const linked = new Set(
    existing.filter((e) => e.id !== elder?.id && e.memberId != null).map((e) => e.memberId!),
  );

  async function submit() {
    if (!form.name.trim()) return setError("ກະລຸນາເລືອກສະມາຊິກ ຫຼື ປ້ອນຊື່");
    if (form.memberId != null && linked.has(form.memberId)) return setError("ສະມາຊິກນີ້ຢູ່ໃນລາຍຊື່ແລ້ວ");
    setPending(true);
    const res = elder ? await updateElder(elder.id, form) : await addElder(form);
    setPending(false);
    if (!res.ok) return setError(res.error);
    toast.success(elder ? "ບັນທຶກແລ້ວ" : "ເພີ່ມຜູ້ອາວຸໂສແລ້ວ");
    onOpenChange(false);
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={elder ? "ແກ້ໄຂຜູ້ອາວຸໂສ" : "ເພີ່ມຜູ້ອາວຸໂສ"}
      icon={<Award className="h-4 w-4" />}
      onSubmit={submit}
      pending={pending}
      error={error}
      size="lg"
    >
      <PhotoField name={form.name} value={form.photo} onChange={(v) => set("photo", v)} />
      <FieldGrid>
        <Field label="ສະມາຊິກ" hint="ເຊື່ອມເພື່ອຄຳນວນອາຍຸ ແລະ ລຸ້ນອັດຕະໂນມັດ" className="sm:col-span-2">
          {(id) => (
            <SearchableMemberSelect
              id={id}
              value={form.memberId ?? null}
              disabledIds={linked}
              disabledReason="ຢູ່ໃນລາຍຊື່ແລ້ວ"
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
                  status: m?.status === "deceased" ? "deceased" : f.status,
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
        <Field label="ບົດບາດ">
          {(id) => (
            <CreatableCombobox
              id={id}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm md:text-sm"
              value={form.position}
              onChange={(v) => set("position", v)}
              options={ELDER_POSITIONS}
              placeholder="ເລືອກ ຫຼື ພິມ..."
            />
          )}
        </Field>
        <Field label="ສະຖານະ">
          {(id) => (
            <NativeSelect
              id={id}
              value={form.status}
              onChange={(e) => set("status", e.target.value as ElderStatus)}
            >
              {(Object.keys(ELDER_STATUS_LABEL) as ElderStatus[]).map((s) => (
                <option key={s} value={s}>
                  {ELDER_STATUS_LABEL[s]}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="ກຸ່ມ">
          {(id) => (
            <Input id={id} value={form.branch} onChange={(e) => set("branch", e.target.value)} />
          )}
        </Field>
        <Field label="ເບີໂທ" hint="ເຫັນສະເພາະສະມາຊິກທີ່ເຂົ້າລະບົບ" className="sm:col-span-2">
          {(id) => (
            <Input
              id={id}
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
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
        <Field label="ຜົນງານ / ການປະກອບສ່ວນ">
          {(id) => (
            <Textarea
              id={id}
              rows={2}
              value={form.contributions}
              onChange={(e) => set("contributions", e.target.value)}
            />
          )}
        </Field>
        <Field label="ກຽດຕິຍົດ">
          {(id) => (
            <Textarea
              id={id}
              rows={2}
              value={form.honors}
              onChange={(e) => set("honors", e.target.value)}
            />
          )}
        </Field>
        <Field label="ໝາຍເຫດພາຍໃນ" hint="ເຫັນສະເພາະສະມາຊິກທີ່ເຂົ້າລະບົບ" className="sm:col-span-2">
          {(id) => (
            <Textarea
              id={id}
              rows={2}
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
            />
          )}
        </Field>
      </FieldGrid>
    </FormDialog>
  );
}
