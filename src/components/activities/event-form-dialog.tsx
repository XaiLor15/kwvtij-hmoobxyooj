import { useEffect, useState } from "react";
import { CalendarPlus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Field, FieldGrid, FormDialog, NativeSelect } from "@/components/enterprise";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableMemberSelect } from "@/components/searchable-member-select";
import { addEvent, updateEvent } from "@/lib/events-store";
import { getMembers } from "@/lib/members-data";
import {
  EVENT_CATEGORIES,
  formatTimeRange,
  parseTimeRange,
  validateEvent,
} from "@/lib/domain/events";
import type { ClanEvent } from "@/lib/domain/types";

interface FormState {
  title: string;
  category: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  location: string;
  organizer: string;
  organizerId: number | null;
  expectedPerMember: string;
  description: string;
}

function initial(e: ClanEvent | null): FormState {
  const t = parseTimeRange(e?.time);
  const org = e?.organizer ?? "";
  const match = org ? getMembers().find((m) => m.name === org) : undefined;
  return {
    title: e?.title ?? "",
    category: e?.category ?? EVENT_CATEGORIES[0],
    date: e?.date ?? "",
    timeStart: t.start,
    timeEnd: t.end,
    location: e?.location ?? "",
    organizer: org,
    organizerId: match?.id ?? null,
    expectedPerMember: e ? String(e.expectedPerMember || "") : "",
    description: e?.description ?? "",
  };
}

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: ClanEvent | null;
  onSaved?: (e: ClanEvent) => void;
}) {
  const [form, setForm] = useState<FormState>(() => initial(event));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial(event));
      setError(null);
    }
  }, [open, event]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const categories = EVENT_CATEGORIES.includes(form.category as never)
    ? [...EVENT_CATEGORIES]
    : [...EVENT_CATEGORIES, form.category];

  async function submit() {
    const msg = validateEvent(form);
    if (msg) return setError(msg);
    setPending(true);
    setError(null);
    const input = {
      title: form.title,
      category: form.category,
      date: form.date,
      time: formatTimeRange(form.timeStart, form.timeEnd),
      location: form.location,
      organizer: form.organizer,
      expectedPerMember: Number(form.expectedPerMember) || 0,
      description: form.description,
    };
    const res = event ? await updateEvent(event.id, input) : await addEvent(input);
    setPending(false);
    if (!res.ok) return setError(res.error);
    toast.success(event ? "ບັນທຶກການແກ້ໄຂແລ້ວ" : "ສ້າງກິດຈະກຳແລ້ວ");
    onOpenChange(false);
    onSaved?.(res.data);
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={event ? "ແກ້ໄຂກິດຈະກຳ" : "ສ້າງກິດຈະກຳໃໝ່"}
      icon={event ? <Pencil className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
      onSubmit={submit}
      pending={pending}
      error={error}
      size="lg"
    >
      <FieldGrid>
        <Field label="ຊື່ກິດຈະກຳ" required className="sm:col-span-2">
          {(id) => (
            <Input
              id={id}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="ເຊັ່ນ: ງານປະຊຸມຄອບຄົວປະຈຳປີ"
              autoFocus
            />
          )}
        </Field>
        <Field label="ປະເພດ">
          {(id) => (
            <NativeSelect
              id={id}
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="ຜູ້ຈັດງານ" hint="ເລືອກຈາກລາຍຊື່ສະມາຊິກ">
          {(id) => (
            <SearchableMemberSelect
              id={id}
              value={form.organizerId}
              onChange={(mid) => {
                set("organizerId", mid);
                set(
                  "organizer",
                  mid != null ? (getMembers().find((m) => m.id === mid)?.name ?? "") : "",
                );
              }}
              placeholder={form.organizer || "ເລືອກຜູ້ຈັດງານ..."}
              allowNone
            />
          )}
        </Field>
        <Field label="ວັນທີ" required>
          {(id) => (
            <Input
              id={id}
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="ເລີ່ມ" required>
            {(id) => (
              <Input
                id={id}
                type="time"
                value={form.timeStart}
                onChange={(e) => set("timeStart", e.target.value)}
              />
            )}
          </Field>
          <Field label="ສິ້ນສຸດ">
            {(id) => (
              <Input
                id={id}
                type="time"
                value={form.timeEnd}
                onChange={(e) => set("timeEnd", e.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label="ສະຖານທີ່" required className="sm:col-span-2">
          {(id) => (
            <Input
              id={id}
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          )}
        </Field>
        <Field
          label="ຈຳນວນເງິນຕໍ່ຄົນ (ກີບ)"
          hint="ໃຊ້ຄຳນວນຍອດທີ່ຄາດຫວັງໃນໜ້າຕິດຕາມການບໍລິຈາກ (0 = ບໍ່ກຳນົດ)"
          className="sm:col-span-2"
        >
          {(id) => (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              value={form.expectedPerMember}
              onChange={(e) => set("expectedPerMember", e.target.value)}
              placeholder="50000"
            />
          )}
        </Field>
        <Field label="ລາຍລະອຽດ" className="sm:col-span-2">
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          )}
        </Field>
      </FieldGrid>
    </FormDialog>
  );
}
