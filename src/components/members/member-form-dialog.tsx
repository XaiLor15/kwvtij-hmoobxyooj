import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Field, FieldGrid, FormDialog, NativeSelect } from "@/components/enterprise";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CreatableCombobox } from "@/components/creatable-combobox";
import { SearchableMemberSelect } from "@/components/searchable-member-select";
import { addMember, updateMember, type Member, type MemberInput } from "@/lib/members-data";
import { BRANCHES } from "@/lib/utils";
import { ageFromBirthdate, genLabel, todayISO } from "@/lib/domain/format";
import { descendantIds, findPossibleDuplicates, generationFor } from "@/lib/domain/family";
import { LEADER_POSITIONS } from "@/lib/leadership-store";
import { ELDER_POSITIONS } from "@/lib/elders-store";

const CATEGORIES = ["ສະມາຊິກ", "ຄະນະນຳ", "ຜູ້ອາວຸໂສ"] as const;

interface FormState {
  name: string;
  nickname: string;
  gender: "M" | "F";
  birthdate: string;
  status: "alive" | "deceased";
  parent: number | null;
  branch: string;
  category: string;
  position: string;
  village: string;
  district: string;
  province: string;
  phone: string;
  note: string;
}

function initialState(m: Member | null): FormState {
  return {
    name: m?.name ?? "",
    nickname: m?.nickname ?? "",
    gender: m?.gender ?? "M",
    birthdate: m?.birthdate ?? "",
    status: m?.status ?? "alive",
    parent: m?.parent ?? null,
    branch: m?.branch || BRANCHES[0],
    category: m?.category && CATEGORIES.includes(m.category as never) ? m.category : "ສະມາຊິກ",
    position: m?.position ?? "",
    village: m?.village ?? "",
    district: m?.district ?? "",
    province: m?.province ?? "",
    phone: m?.phone ?? "",
    note: m?.note ?? "",
  };
}

/**
 * Create / edit a member. Enforces: required name, valid birthdate (not in the
 * future), parent cannot be self or a descendant, generation follows parent,
 * and warns about likely duplicates before saving.
 */
export function MemberFormDialog({
  open,
  onOpenChange,
  member,
  members,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  member: Member | null;
  members: Member[];
  onSaved?: (m: Member) => void;
}) {
  const [form, setForm] = useState<FormState>(() => initialState(member));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dupAck, setDupAck] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialState(member));
      setErrors({});
      setFormError(null);
      setDupAck(false);
    }
  }, [open, member]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    if (k === "name" || k === "birthdate" || k === "parent") setDupAck(false);
  };

  const blocked = useMemo(() => {
    if (!member) return new Set<number>();
    const s = descendantIds(member.id, members);
    s.add(member.id);
    return s;
  }, [member, members]);

  const gen = generationFor(form.parent, members);
  const age = ageFromBirthdate(form.birthdate);
  const duplicates = useMemo(
    () =>
      findPossibleDuplicates(
        {
          id: member?.id,
          name: form.name,
          birthdate: form.birthdate || undefined,
          parent: form.parent,
        },
        members,
      ),
    [form.name, form.birthdate, form.parent, member?.id, members],
  );
  const positions =
    form.category === "ຄະນະນຳ"
      ? LEADER_POSITIONS
      : form.category === "ຜູ້ອາວຸໂສ"
        ? ELDER_POSITIONS
        : [];

  async function submit() {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "ກະລຸນາປ້ອນຊື່";
    if (form.birthdate && form.birthdate > todayISO()) e.birthdate = "ວັນເກີດຢູ່ໃນອະນາຄົດບໍ່ໄດ້";
    if (form.parent != null && blocked.has(form.parent))
      e.parent = "ບໍ່ສາມາດເລືອກຕົນເອງ ຫຼື ລູກຫຼານເປັນພໍ່/ແມ່";
    if (form.phone && !/^[\d\s+()-]{6,20}$/.test(form.phone.trim())) e.phone = "ເບີໂທບໍ່ຖືກຮູບແບບ";
    setErrors(e);
    if (Object.keys(e).length) return;
    if (duplicates.length && !dupAck) {
      setDupAck(true);
      setFormError("ພົບສະມາຊິກທີ່ອາດຊ້ຳກັນ — ກວດສອບລາຍຊື່ດ້ານລຸ່ມ ແລ້ວກົດບັນທຶກອີກຄັ້ງເພື່ອຢືນຢັນ.");
      return;
    }

    const input: MemberInput = {
      ...form,
      category: form.category,
      position: form.category === "ສະມາຊິກ" ? "" : form.position,
      birthdate: form.birthdate || undefined,
    };
    const storedAge = age ?? member?.age ?? 0;
    setPending(true);
    setFormError(null);
    const res = member
      ? await updateMember(member.id, input, storedAge)
      : await addMember(input, storedAge);
    setPending(false);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    toast.success(member ? "ບັນທຶກການແກ້ໄຂແລ້ວ" : `ເພີ່ມ "${res.data.name}" ແລ້ວ`);
    onOpenChange(false);
    onSaved?.(res.data);
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={member ? "ແກ້ໄຂຂໍ້ມູນສະມາຊິກ" : "ເພີ່ມສະມາຊິກໃໝ່"}
      icon={member ? <Pencil className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      onSubmit={submit}
      pending={pending}
      error={formError}
      submitLabel={duplicates.length && dupAck ? "ບັນທຶກຢ່າງໃດກໍ່ຕາມ" : "ບັນທຶກ"}
      size="lg"
    >
      {duplicates.length > 0 && (
        <div className="flex gap-2 rounded-md border border-warning/40 bg-warning-subtle px-3 py-2 text-sm text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">ອາດມີຂໍ້ມູນຊ້ຳ:</p>
            <ul className="mt-0.5 list-disc pl-4 text-xs">
              {duplicates.slice(0, 3).map((d) => (
                <li key={d.id}>
                  {d.name} {d.birthdate ? `(${d.birthdate})` : ""} — {genLabel(d.gen)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <FieldGrid>
        <Field label="ຊື່ ແລະ ນາມສະກຸນ" required error={errors.name} className="sm:col-span-2">
          {(id) => (
            <Input
              id={id}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="ທ້າວ/ນາງ ..."
              autoFocus
              aria-invalid={!!errors.name}
            />
          )}
        </Field>
        <Field label="ຊື່ຫຼິ້ນ">
          {(id) => (
            <Input
              id={id}
              value={form.nickname}
              onChange={(e) => set("nickname", e.target.value)}
            />
          )}
        </Field>
        <Field label="ເພດ">
          {(id) => (
            <NativeSelect
              id={id}
              value={form.gender}
              onChange={(e) => set("gender", e.target.value as "M" | "F")}
            >
              <option value="M">ຊາຍ</option>
              <option value="F">ຍິງ</option>
            </NativeSelect>
          )}
        </Field>
        <Field
          label="ວັນເດືອນປີເກີດ"
          error={errors.birthdate}
          hint={age != null ? `ອາຍຸ ${age} ປີ (ຄຳນວນອັດຕະໂນມັດ)` : undefined}
        >
          {(id) => (
            <Input
              id={id}
              type="date"
              max={todayISO()}
              value={form.birthdate}
              onChange={(e) => set("birthdate", e.target.value)}
            />
          )}
        </Field>
        <Field label="ສະຖານະ">
          {(id) => (
            <NativeSelect
              id={id}
              value={form.status}
              onChange={(e) => set("status", e.target.value as "alive" | "deceased")}
            >
              <option value="alive">ມີຊີວິດ</option>
              <option value="deceased">ເສຍຊີວິດ</option>
            </NativeSelect>
          )}
        </Field>
        <Field
          label="ພໍ່ / ແມ່"
          error={errors.parent}
          hint={`ລຸ້ນ: ${genLabel(gen)} — ຄຳນວນຈາກພໍ່/ແມ່${member ? " (ລູກຫຼານຈະຖືກປັບລຸ້ນຕາມ)" : ""}`}
          className="sm:col-span-2"
        >
          {(id) => (
            <SearchableMemberSelect
              id={id}
              value={form.parent}
              onChange={(v) => set("parent", v)}
              disabledIds={blocked}
              disabledReason="ເປັນລູກຫຼານ"
              placeholder="ບໍ່ມີ (ເປັນຕົ້ນສາຍ)"
              allowNone
              invalid={!!errors.parent}
            />
          )}
        </Field>
        <Field label="ກຸ່ມ (Pawg)">
          {(id) => (
            <NativeSelect
              id={id}
              value={form.branch}
              onChange={(e) => set("branch", e.target.value)}
            >
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              {!BRANCHES.includes(form.branch) && form.branch && (
                <option value={form.branch}>{form.branch}</option>
              )}
            </NativeSelect>
          )}
        </Field>
        <Field label="ປະເພດ">
          {(id) => (
            <NativeSelect
              id={id}
              value={form.category}
              onChange={(e) => {
                set("category", e.target.value);
                set("position", "");
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        {positions.length > 0 && (
          <Field label="ຕຳແໜ່ງ" className="sm:col-span-2" hint="ເລືອກຈາກລາຍການ ຫຼື ພິມເອງ">
            {(id) => (
              <CreatableCombobox
                id={id}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                value={form.position}
                onChange={(v) => set("position", v)}
                options={positions}
                placeholder="ເລືອກ ຫຼື ພິມຕຳແໜ່ງ..."
              />
            )}
          </Field>
        )}
        <Field label="ບ້ານ">
          {(id) => (
            <Input
              id={id}
              value={form.village}
              onChange={(e) => set("village", e.target.value)}
              placeholder="ເຊັ່ນ: ໂນນສະຫວ່າງ"
            />
          )}
        </Field>
        <Field label="ເມືອງ">
          {(id) => (
            <Input
              id={id}
              value={form.district}
              onChange={(e) => set("district", e.target.value)}
              placeholder="ເຊັ່ນ: ໄຊເສດຖາ"
            />
          )}
        </Field>
        <Field label="ແຂວງ" hint='ປ້ອນແຕ່ຊື່ — ລະບົບເພີ່ມ "ບ້ານ/ເມືອງ/ແຂວງ" ໃຫ້'>
          {(id) => (
            <Input
              id={id}
              value={form.province}
              onChange={(e) => set("province", e.target.value)}
              placeholder="ເຊັ່ນ: ນະຄອນຫຼວງວຽງຈັນ"
            />
          )}
        </Field>
        <Field label="ເບີໂທ" error={errors.phone}>
          {(id) => (
            <Input
              id={id}
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="020 ..."
            />
          )}
        </Field>
        <Field label="ໝາຍເຫດ" className="sm:col-span-2">
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
