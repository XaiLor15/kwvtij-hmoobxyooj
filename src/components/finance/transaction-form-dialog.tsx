import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Field, FieldGrid, FormDialog, NativeSelect, Segmented } from "@/components/enterprise";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableMemberSelect } from "@/components/searchable-member-select";
import { addTransaction, updateTransaction } from "@/lib/treasury-store";
import { useEvents } from "@/lib/events-store";
import { getMembers } from "@/lib/members-data";
import { validateTransaction } from "@/lib/domain/finance";
import { formatKip, todayISO } from "@/lib/domain/format";
import type { Transaction, TxDirection } from "@/lib/domain/types";

const INCOME_TYPES = ["ຄ່າທຳນຽມ", "ບໍລິຈາກ", "ສຸກເສີນ", "ອື່ນໆ"];
const EXPENSE_CATEGORIES = [
  "ງານຕະກູນ",
  "ງານບຸນ",
  "ງານສົບ",
  "ງານດອງ",
  "ປະຊຸມ",
  "ອາຫານ",
  "ຊ່ວຍເຫຼືອຜ່າຕັດ",
  "ການສຶກສາ",
  "ບຳລຸງຮັກສາ",
  "ສຸກເສີນ",
  "ອື່ນໆ",
];
const METHODS = ["ເງິນສົດ", "ໂອນເງິນ", "ອື່ນໆ"];

interface FormState {
  direction: TxDirection;
  date: string;
  type: string;
  category: string;
  amount: string;
  eventId: string;
  memberId: number | null;
  contributor: string;
  method: string;
  note: string;
}

function initial(
  t: Transaction | null,
  preset?: { direction?: TxDirection; eventId?: number },
): FormState {
  const direction = t?.direction ?? preset?.direction ?? "income";
  return {
    direction,
    date: t?.date || todayISO(),
    type: t?.type || (direction === "income" ? "ຄ່າທຳນຽມ" : "ລາຍຈ່າຍ"),
    category: t?.category ?? "",
    amount: t ? String(t.amount) : "",
    eventId:
      t?.eventId != null
        ? String(t.eventId)
        : preset?.eventId != null
          ? String(preset.eventId)
          : "",
    memberId: t?.memberId ?? null,
    contributor: t?.memberId != null ? "" : (t?.contributor ?? ""),
    method: t?.method || "ເງິນສົດ",
    note: t?.note ?? "",
  };
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  preset,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transaction: Transaction | null;
  preset?: { direction?: TxDirection; eventId?: number };
}) {
  const events = useEvents();
  const [form, setForm] = useState<FormState>(() => initial(transaction, preset));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial(transaction, preset));
      setError(null);
    }
    // preset is a fresh object each render; only re-init on open/transaction change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const income = form.direction === "income";

  async function submit() {
    const msg = validateTransaction(form);
    if (msg) return setError(msg);
    const ev = form.eventId ? events.find((e) => e.id === Number(form.eventId)) : undefined;
    const member =
      form.memberId != null ? getMembers().find((m) => m.id === form.memberId) : undefined;
    const input = {
      direction: form.direction,
      date: form.date,
      amount: Number(form.amount),
      type: income ? form.type : "ລາຍຈ່າຍ",
      category: income ? form.type : form.category || "ອື່ນໆ",
      eventId: ev?.id ?? null,
      eventTitle: ev?.title ?? "",
      memberId: member?.id ?? null,
      contributor: member?.name ?? form.contributor,
      method: form.method,
      note: form.note,
    };
    setPending(true);
    setError(null);
    const res = transaction
      ? await updateTransaction(transaction.id, input)
      : await addTransaction(input);
    setPending(false);
    if (!res.ok) return setError(res.error);
    toast.success(
      transaction
        ? "ບັນທຶກການແກ້ໄຂແລ້ວ"
        : `ບັນທຶກ${income ? "ລາຍຮັບ" : "ລາຍຈ່າຍ"} ${formatKip(input.amount)} ແລ້ວ`,
    );
    onOpenChange(false);
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={transaction ? `ແກ້ໄຂທຸລະກຳ ${transaction.id}` : income ? "ບັນທຶກລາຍຮັບ" : "ບັນທຶກລາຍຈ່າຍ"}
      icon={income ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
      onSubmit={submit}
      pending={pending}
      error={error}
      size="lg"
    >
      <Segmented<TxDirection>
        ariaLabel="ປະເພດທຸລະກຳ"
        value={form.direction}
        onChange={(d) => {
          set("direction", d);
          set("type", d === "income" ? "ຄ່າທຳນຽມ" : "ລາຍຈ່າຍ");
        }}
        options={[
          { value: "income", label: "ລາຍຮັບ" },
          { value: "expense", label: "ລາຍຈ່າຍ" },
        ]}
      />
      <FieldGrid>
        <Field
          label="ຈຳນວນເງິນ (ກີບ)"
          required
          hint={Number(form.amount) > 0 ? formatKip(Number(form.amount)) : undefined}
        >
          {(id) => (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={1}
              step={1000}
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              autoFocus
            />
          )}
        </Field>
        <Field label="ວັນທີ" required>
          {(id) => (
            <Input
              id={id}
              type="date"
              max={todayISO()}
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          )}
        </Field>
        {income ? (
          <Field label="ປະເພດລາຍຮັບ" required>
            {(id) => (
              <NativeSelect id={id} value={form.type} onChange={(e) => set("type", e.target.value)}>
                {[...new Set([...INCOME_TYPES, form.type])].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
        ) : (
          <Field label="ໝວດລາຍຈ່າຍ">
            {(id) => (
              <NativeSelect
                id={id}
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                <option value="">— ເລືອກ —</option>
                {[...new Set([...EXPENSE_CATEGORIES, form.category].filter(Boolean))].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
        )}
        <Field label="ວິທີຊຳລະ">
          {(id) => (
            <NativeSelect
              id={id}
              value={form.method}
              onChange={(e) => set("method", e.target.value)}
            >
              {[...new Set([...METHODS, form.method])].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field
          label="ເຊື່ອມກັບກິດຈະກຳ"
          className="sm:col-span-2"
          hint="ລາຍຮັບທີ່ເຊື່ອມກິດຈະກຳຈະນັບໃນໜ້າຕິດຕາມການບໍລິຈາກ"
        >
          {(id) => (
            <NativeSelect
              id={id}
              value={form.eventId}
              onChange={(e) => set("eventId", e.target.value)}
            >
              <option value="">— ບໍ່ເຊື່ອມ (ທົ່ວໄປ) —</option>
              {events.map((e) => (
                <option key={e.id} value={String(e.id)}>
                  {e.title} {e.date ? `(${e.date})` : ""}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label={income ? "ຜູ້ຈ່າຍ (ສະມາຊິກ)" : "ຜູ້ຮັບ (ສະມາຊິກ)"}>
          {(id) => (
            <SearchableMemberSelect
              id={id}
              value={form.memberId}
              onChange={(v) => {
                set("memberId", v);
                if (v != null) set("contributor", "");
              }}
              placeholder="ເລືອກສະມາຊິກ (ຖ້າມີ)"
              allowNone
            />
          )}
        </Field>
        <Field label="ຫຼື ພິມຊື່ (ບໍ່ແມ່ນສະມາຊິກ)">
          {(id) => (
            <Input
              id={id}
              value={form.contributor}
              disabled={form.memberId != null}
              onChange={(e) => set("contributor", e.target.value)}
              placeholder="ຊື່ບຸກຄົນ / ຮ້ານ"
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
