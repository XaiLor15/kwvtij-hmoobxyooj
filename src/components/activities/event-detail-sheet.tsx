import { useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  ImagePlus,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PersonAvatar, StatusBadge } from "@/components/enterprise";
import { SearchableMemberSelect } from "@/components/searchable-member-select";
import { useMediaLightbox } from "@/components/media-lightbox";
import { useMembers } from "@/lib/members-data";
import { addParticipant, removeParticipant, useParticipants } from "@/lib/participants-store";
import { addImages, removeImage, useGallery } from "@/lib/gallery-store";
import { useTransactions } from "@/lib/treasury-store";
import { usePermissions } from "@/lib/auth-context";
import { eventTotals } from "@/lib/domain/finance";
import { EVENT_PHASE_LABEL, getEventPhase } from "@/lib/domain/events";
import { formatDateLao, formatKip } from "@/lib/domain/format";
import { cn } from "@/lib/utils";
import type { ClanEvent } from "@/lib/domain/types";

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
        {icon}
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

export function EventDetailSheet({
  event,
  onClose,
  onEdit,
  onDelete,
}: {
  event: ClanEvent | null;
  onClose: () => void;
  onEdit?: (e: ClanEvent) => void;
  onDelete?: (e: ClanEvent) => void;
}) {
  return (
    <Sheet open={!!event} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl"
      >
        {event && <Body event={event} onEdit={onEdit} onDelete={onDelete} />}
      </SheetContent>
    </Sheet>
  );
}

function Body({
  event,
  onEdit,
  onDelete,
}: {
  event: ClanEvent;
  onEdit?: (e: ClanEvent) => void;
  onDelete?: (e: ClanEvent) => void;
}) {
  const perms = usePermissions();
  const phase = getEventPhase(event);
  const participants = useParticipants(event.id);
  const gallery = useGallery(event.id);
  const members = useMembers();
  const txns = useTransactions();
  const totals = eventTotals(txns, event.id);
  const eventTxns = txns.filter((t) => t.eventId === event.id);
  const byId = new Map(members.map((m) => [m.id, m]));
  const people = participants.map((id) => byId.get(id)).filter((m) => !!m);
  const canEdit = perms.canEdit("activities");
  const { open: openMedia } = useMediaLightbox();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const res = await addImages(event.id, Array.from(files));
    setUploading(false);
    if (res.skipped.length) toast.warning(`ຂ້າມ ${res.skipped.length} ໄຟລ໌: ${res.skipped[0]}`);
    if (res.ok && res.data.length) toast.success(`ອັບໂຫຼດ ${res.data.length} ຮູບແລ້ວ`);
  }

  return (
    <>
      <SheetHeader className="space-y-3 border-b border-border p-5 text-left">
        <div className="flex flex-wrap gap-1.5 pr-6">
          <StatusBadge tone={phase === "upcoming" ? "primary" : "neutral"} dot>
            {EVENT_PHASE_LABEL[phase]}
          </StatusBadge>
          <StatusBadge tone="info">{event.category}</StatusBadge>
        </div>
        <SheetTitle className="text-lg leading-snug">{event.title}</SheetTitle>
        <SheetDescription>{formatDateLao(event.date)}</SheetDescription>
        {(onEdit || onDelete) && (
          <div className="flex gap-2">
            {onEdit && (
              <Button size="sm" onClick={() => onEdit(event)}>
                <Pencil className="h-4 w-4" /> ແກ້ໄຂ
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-destructive hover:bg-destructive-subtle hover:text-destructive"
                onClick={() => onDelete(event)}
              >
                <Trash2 className="h-4 w-4" /> ລຶບ
              </Button>
            )}
          </div>
        )}
      </SheetHeader>

      <Tabs defaultValue="info" className="flex-1 p-5">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">ຂໍ້ມູນ</TabsTrigger>
          <TabsTrigger value="people">ຜູ້ຮ່ວມ ({people.length})</TabsTrigger>
          <TabsTrigger value="money">ການເງິນ</TabsTrigger>
          <TabsTrigger value="photos">ຮູບ ({gallery.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Info icon={<CalendarDays />} label="ວັນທີ" value={formatDateLao(event.date)} />
            <Info icon={<Clock />} label="ເວລາ" value={event.time} />
            <Info icon={<MapPin />} label="ສະຖານທີ່" value={event.location} />
            <Info icon={<UserRound />} label="ຜູ້ຈັດງານ" value={event.organizer} />
            <Info
              icon={<Wallet />}
              label="ເງິນຕໍ່ຄົນ"
              value={event.expectedPerMember ? formatKip(event.expectedPerMember) : "ບໍ່ກຳນົດ"}
            />
          </div>
          {event.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {event.description}
            </p>
          )}
        </TabsContent>

        <TabsContent value="people" className="mt-4 space-y-3">
          {canEdit && (
            <SearchableMemberSelect
              value={null}
              excludeIds={participants}
              placeholder="+ ເພີ່ມຜູ້ເຂົ້າຮ່ວມ..."
              onChange={async (id) => {
                if (id == null) return;
                const res = await addParticipant(event.id, id);
                if (res.ok) toast.success("ເພີ່ມຜູ້ເຂົ້າຮ່ວມແລ້ວ");
              }}
            />
          )}
          {people.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">ຍັງບໍ່ມີຜູ້ເຂົ້າຮ່ວມ</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {people.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-3 py-2">
                  <PersonAvatar name={m.name} photo={m.photo} id={m.id} size="sm" />
                  <Link
                    to="/members"
                    search={{ member: m.id }}
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary hover:underline"
                  >
                    {m.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">Phaj {m.gen}</span>
                  {canEdit && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`ເອົາ ${m.name} ອອກ`}
                      onClick={async () => {
                        const res = await removeParticipant(event.id, m.id);
                        if (res.ok) toast.success("ເອົາອອກແລ້ວ");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="money" className="mt-4 space-y-4">
          {!perms.isAuthenticated ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              ຂໍ້ມູນການເງິນສະເພາະສະມາຊິກທີ່ເຂົ້າລະບົບ
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Info
                  icon={null}
                  label="ລາຍຮັບ"
                  value={<span className="text-success">{formatKip(totals.income)}</span>}
                />
                <Info
                  icon={null}
                  label="ລາຍຈ່າຍ"
                  value={<span className="text-destructive">{formatKip(totals.expense)}</span>}
                />
                <Info
                  icon={null}
                  label="ຄົງເຫຼືອ"
                  value={
                    <span className={cn(totals.balance < 0 && "text-destructive")}>
                      {formatKip(totals.balance)}
                    </span>
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {perms.canCreate("finance") && (
                  <>
                    <Button asChild size="sm">
                      <Link to="/finance" search={{ event: event.id, action: "income" }}>
                        <Plus className="h-4 w-4" /> ບັນທຶກລາຍຮັບ
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/finance" search={{ event: event.id, action: "expense" }}>
                        <Plus className="h-4 w-4" /> ບັນທຶກລາຍຈ່າຍ
                      </Link>
                    </Button>
                  </>
                )}
                <Button asChild size="sm" variant="ghost">
                  <Link to="/donation-tracking" search={{ event: event.id }}>
                    ຕິດຕາມການບໍລິຈາກ →
                  </Link>
                </Button>
              </div>
              {eventTxns.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  ຍັງບໍ່ມີທຸລະກຳທີ່ເຊື່ອມກັບກິດຈະກຳນີ້
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {eventTxns.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block truncate">
                          {(t.memberId != null ? byId.get(t.memberId)?.name : null) ||
                            t.contributor ||
                            t.category ||
                            "—"}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {t.date} · {t.type || t.category}
                        </span>
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
            </>
          )}
        </TabsContent>

        <TabsContent value="photos" className="mt-4 space-y-3">
          {canEdit && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  void onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                ອັບໂຫຼດຮູບ
              </Button>
            </>
          )}
          {gallery.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">ຍັງບໍ່ມີຮູບພາບ</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((img) => (
                <div
                  key={img.id}
                  className="group relative aspect-square overflow-hidden rounded-md border border-border"
                >
                  <button
                    type="button"
                    className="h-full w-full"
                    onClick={() => openMedia({ type: "image", src: img.url, alt: img.name })}
                    aria-label={`ເບິ່ງ ${img.name}`}
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await removeImage(img.id);
                        if (res.ok) toast.success("ລຶບຮູບແລ້ວ");
                      }}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white opacity-100 transition-opacity hover:bg-destructive sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label={`ລຶບ ${img.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
