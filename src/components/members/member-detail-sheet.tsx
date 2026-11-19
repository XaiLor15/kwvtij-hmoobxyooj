import type { ReactNode } from "react";
import {
  Calendar,
  ChevronRight,
  Link2,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PersonAvatar, StatusBadge } from "@/components/enterprise";
import { childrenOf, lineagePath } from "@/lib/domain/family";
import {
  ageFromBirthdate,
  formatDateLao,
  genLabel,
  memberCode,
  shortName,
} from "@/lib/domain/format";
import { formatAddress } from "@/lib/utils";
import type { Member } from "@/lib/members-data";

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 text-sm">
      <span className="mt-0.5 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words font-medium">{value || "—"}</span>
    </div>
  );
}

function RelationButton({
  m,
  label,
  onSelect,
}: {
  m: Member;
  label: string;
  onSelect: (m: Member) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(m)}
      className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2 text-left transition-colors hover:bg-muted"
    >
      <PersonAvatar
        name={m.name}
        photo={m.photo}
        id={m.id}
        size="sm"
        muted={m.status === "deceased"}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {m.name}
          {m.status === "deceased" && <span className="ml-1 text-muted-foreground">†</span>}
        </span>
        <span className="block text-xs text-muted-foreground">
          {label} · Phaj {m.gen}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function MemberDetailSheet({
  member,
  members,
  onClose,
  onSelect,
  onEdit,
  onDelete,
  showContact,
}: {
  member: Member | null;
  members: Member[];
  onClose: () => void;
  onSelect: (m: Member) => void;
  onEdit?: (m: Member) => void;
  onDelete?: (m: Member) => void;
  showContact: boolean;
}) {
  const m = member;
  const byId = new Map(members.map((x) => [x.id, x]));
  const parent = m?.parent != null ? byId.get(m.parent) : undefined;
  const kids = m ? childrenOf(m.id, members) : [];
  const siblings =
    m && m.parent != null ? childrenOf(m.parent, members).filter((s) => s.id !== m.id) : [];
  const spouses = m ? m.spouse.map((id) => byId.get(id)).filter((x): x is Member => !!x) : [];
  const path = m ? lineagePath(m.id, members) : [];
  const age = m ? (ageFromBirthdate(m.birthdate) ?? (m.age || null)) : null;

  const share = async () => {
    if (!m) return;
    const url = `${window.location.origin}/members?member=${m.id}`;
    try {
      if (navigator.share) await navigator.share({ title: m.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("ສຳເນົາລິ້ງແລ້ວ");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <Sheet open={!!m} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        {m && (
          <>
            <SheetHeader className="space-y-3 border-b border-border p-5 text-left">
              <div className="flex items-center gap-3 pr-6">
                <PersonAvatar
                  name={m.name}
                  photo={m.photo}
                  id={m.id}
                  size="xl"
                  muted={m.status === "deceased"}
                />
                <div className="min-w-0">
                  <SheetTitle className="text-lg leading-snug">{m.name}</SheetTitle>
                  <SheetDescription className="text-xs">
                    {memberCode(m.id)}
                    {m.nickname ? ` · ${m.nickname}` : ""}
                  </SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge tone="primary">{genLabel(m.gen)}</StatusBadge>
                {m.role && m.role !== "ສະມາຊິກ" && <StatusBadge tone="info">{m.role}</StatusBadge>}
                <StatusBadge tone={m.status === "alive" ? "success" : "neutral"} dot>
                  {m.status === "alive" ? "ມີຊີວິດ" : "ເສຍຊີວິດ"}
                </StatusBadge>
              </div>
              <div className="flex gap-2">
                {onEdit && (
                  <Button size="sm" onClick={() => onEdit(m)}>
                    <Pencil className="h-4 w-4" /> ແກ້ໄຂ
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={share}>
                  <Link2 className="h-4 w-4" /> ແບ່ງປັນ
                </Button>
                {onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-destructive hover:bg-destructive-subtle hover:text-destructive"
                    onClick={() => onDelete(m)}
                  >
                    <Trash2 className="h-4 w-4" /> ລຶບ
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 p-5">
              <Section title="ຂໍ້ມູນສ່ວນຕົວ">
                <div>
                  <Row icon={<UserRound />} label="ເພດ" value={m.gender === "M" ? "ຊາຍ" : "ຍິງ"} />
                  <Row
                    icon={<Calendar />}
                    label="ວັນເກີດ"
                    value={
                      m.birthdate
                        ? `${formatDateLao(m.birthdate)}${age != null ? ` (${age} ປີ)` : ""}`
                        : age
                          ? `${age} ປີ`
                          : ""
                    }
                  />
                  <Row icon={<MapPin />} label="ທີ່ຢູ່" value={m.address || formatAddress(m)} />
                  <Row
                    icon={<Phone />}
                    label="ເບີໂທ"
                    value={
                      showContact ? (
                        m.phone
                      ) : (
                        <span className="font-normal text-muted-foreground">ເຂົ້າລະບົບເພື່ອເບິ່ງ</span>
                      )
                    }
                  />
                  {m.branch && <Row icon={<UserRound />} label="ກຸ່ມ" value={m.branch} />}
                </div>
                {showContact && m.note && (
                  <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                    {m.note}
                  </p>
                )}
              </Section>

              {path.length > 1 && (
                <Section title="ສາຍຕະກູນ">
                  <nav aria-label="ສາຍຕະກູນ" className="flex flex-wrap items-center gap-1">
                    {path.map((p, i) => (
                      <span key={p.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={p.id === m.id}
                          onClick={() => onSelect(p)}
                          className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary-subtle hover:text-primary disabled:bg-primary disabled:text-primary-foreground"
                        >
                          {shortName(p.name)}
                        </button>
                        {i < path.length - 1 && (
                          <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden />
                        )}
                      </span>
                    ))}
                  </nav>
                </Section>
              )}

              <Section title="ຄອບຄົວ">
                <div className="space-y-2">
                  {parent && (
                    <RelationButton
                      m={parent}
                      label={parent.gender === "F" ? "ແມ່" : "ພໍ່"}
                      onSelect={onSelect}
                    />
                  )}
                  {spouses.map((s) => (
                    <RelationButton key={s.id} m={s} label="ຄູ່ສົມລົດ" onSelect={onSelect} />
                  ))}
                  {kids.map((c) => (
                    <RelationButton
                      key={c.id}
                      m={c}
                      label={c.gender === "F" ? "ລູກສາວ" : "ລູກຊາຍ"}
                      onSelect={onSelect}
                    />
                  ))}
                  {siblings.map((s) => (
                    <RelationButton key={s.id} m={s} label="ອ້າຍເອື້ອຍນ້ອງ" onSelect={onSelect} />
                  ))}
                  {!parent && !spouses.length && !kids.length && !siblings.length && (
                    <p className="text-sm text-muted-foreground">ຍັງບໍ່ມີຂໍ້ມູນຄອບຄົວ</p>
                  )}
                </div>
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
