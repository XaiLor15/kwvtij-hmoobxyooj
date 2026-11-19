import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, Megaphone, Newspaper, Pencil, Pin, Plus, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  CheckboxField,
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
  StatusBadge,
} from "@/components/enterprise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PhotoField } from "@/components/roster/photo-field";
import {
  NEWS_CATEGORIES,
  addNews,
  deleteNews,
  recordNewsView,
  updateNews,
  useNewsState,
  useNewsSupportsDrafts,
  type NewsInput,
} from "@/lib/news-store";
import { usePermissions } from "@/lib/auth-context";
import { formatDateLao, formatNumber, todayISO } from "@/lib/domain/format";
import { cn, matchesSearchTokens } from "@/lib/utils";
import { optionalNumber, optionalString } from "@/lib/search-params";
import type { NewsItem } from "@/lib/domain/types";

export const Route = createFileRoute("/news")({
  validateSearch: (s: Record<string, unknown>): { news?: number; action?: string } => ({
    news: optionalNumber(s.news),
    action: optionalString(s.action),
  }),
  head: () => ({
    meta: [
      { title: "ຂ່າວສານ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ຂ່າວສານ ແລະ ປະກາດຂອງຕະກູນ" },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  const { items, loading, error, refresh } = useNewsState();
  const perms = usePermissions();
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/news" });

  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"latest" | "views">("latest");
  const [dialog, setDialog] = useState<{ open: boolean; item: NewsItem | null }>({
    open: false,
    item: null,
  });
  const [deleting, setDeleting] = useState<NewsItem | null>(null);

  const canEdit = perms.canEdit("news");
  // Drafts are only visible to signed-in members.
  const visibleItems = useMemo(
    () => items.filter((n) => n.published || perms.isAuthenticated),
    [items, perms.isAuthenticated],
  );
  const selected =
    params.news != null ? (visibleItems.find((n) => n.id === params.news) ?? null) : null;
  const open = (n: NewsItem | null) => navigate({ search: (p) => ({ ...p, news: n?.id }) });

  useEffect(() => {
    if (params.action === "add" && perms.canCreate("news")) {
      setDialog({ open: true, item: null });
      navigate({ search: (p) => ({ ...p, action: undefined }), replace: true });
    }
  }, [params.action, perms, navigate]);

  useEffect(() => {
    if (selected?.published) void recordNewsView(selected.id);
  }, [selected?.id, selected?.published]);

  const categories = useMemo(
    () => [...new Set([...NEWS_CATEGORIES, ...visibleItems.map((n) => n.category)])],
    [visibleItems],
  );
  const filtered = useMemo(() => {
    const list = visibleItems.filter(
      (n) =>
        (category === "all" || n.category === category) &&
        matchesSearchTokens(search, n.title, n.summary, n.author, n.category, ...n.tags),
    );
    return sort === "views" ? [...list].sort((a, b) => b.views - a.views) : list;
  }, [visibleItems, category, search, sort]);
  const featured =
    !search && category === "all" ? visibleItems.find((n) => n.featured && n.published) : undefined;
  const rest = featured ? filtered.filter((n) => n.id !== featured.id) : filtered;

  return (
    <PageContainer className="space-y-5">
      <PageHeader
        title="ຂ່າວສານ"
        description="ຂ່າວ, ປະກາດ ແລະ ກິດຈະກຳຂອງຕະກູນ"
        actions={
          perms.canCreate("news") && (
            <Button size="sm" onClick={() => setDialog({ open: true, item: null })}>
              <Plus className="h-4 w-4" /> ເພີ່ມຂ່າວ
            </Button>
          )
        }
      />

      <SectionCard bodyClassName="p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ຄົ້ນຫາຫົວຂໍ້, ແທັກ..."
              aria-label="ຄົ້ນຫາຂ່າວ"
              className="pl-9"
            />
          </div>
          <NativeSelect
            aria-label="ໝວດ"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="sm:w-40"
          >
            <option value="all">ທຸກໝວດ</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="ຈັດຮຽງ"
            value={sort}
            onChange={(e) => setSort(e.target.value as "latest" | "views")}
            className="sm:w-36"
          >
            <option value="latest">ລ່າສຸດ</option>
            <option value="views">ຍອດເບິ່ງ</option>
          </NativeSelect>
        </div>
      </SectionCard>

      {error ? (
        <ErrorState description={error} onRetry={() => void refresh()} />
      ) : loading && !items.length ? (
        <LoadingState variant="cards" rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="h-6 w-6" />}
          title={items.length ? "ບໍ່ພົບຂ່າວຕາມເງື່ອນໄຂ" : "ຍັງບໍ່ມີຂ່າວ"}
        />
      ) : (
        <>
          {featured && (
            <button
              type="button"
              onClick={() => open(featured)}
              className="grid w-full overflow-hidden rounded-lg border border-border bg-card text-left shadow-xs transition-colors hover:border-primary/40 md:grid-cols-2"
            >
              {featured.image ? (
                <img src={featured.image} alt="" className="h-48 w-full object-cover md:h-full" />
              ) : (
                <div className="flex h-32 items-center justify-center bg-primary-subtle text-primary md:h-full">
                  <Megaphone className="h-10 w-10" />
                </div>
              )}
              <div className="space-y-2 p-5">
                <StatusBadge tone="warning">
                  <Star className="h-3 w-3" /> ຂ່າວເດັ່ນ
                </StatusBadge>
                <h2 className="text-lg font-semibold leading-snug">{featured.title}</h2>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {featured.summary || featured.content}
                </p>
                <p className="text-xs text-muted-foreground">
                  {featured.category} · {formatDateLao(featured.date)}
                </p>
              </div>
            </button>
          )}
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rest.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => open(n)}
                  className={cn(
                    "flex h-full w-full flex-col overflow-hidden rounded-lg border bg-card text-left shadow-xs transition-colors hover:border-primary/40",
                    n.urgent ? "border-destructive/40" : "border-border",
                    !n.published && "border-dashed",
                  )}
                >
                  {n.image && (
                    <img src={n.image} alt="" loading="lazy" className="h-36 w-full object-cover" />
                  )}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge tone="primary">{n.category}</StatusBadge>
                      {n.pinned && (
                        <StatusBadge tone="info">
                          <Pin className="h-3 w-3" /> ປັກໝຸດ
                        </StatusBadge>
                      )}
                      {n.urgent && <StatusBadge tone="destructive">ດ່ວນ</StatusBadge>}
                      {!n.published && <StatusBadge tone="neutral">ສະບັບຮ່າງ</StatusBadge>}
                    </div>
                    <h3 className="line-clamp-2 text-sm font-semibold">{n.title}</h3>
                    {n.summary && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{n.summary}</p>
                    )}
                    <p className="mt-auto flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                      <span>{formatDateLao(n.date)}</span>
                      <span className="ml-auto inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {formatNumber(n.views)}
                      </span>
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Sheet open={!!selected} onOpenChange={(v) => !v && open(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
          {selected && (
            <article>
              {selected.image && (
                <img src={selected.image} alt="" className="max-h-72 w-full object-cover" />
              )}
              <SheetHeader className="space-y-2 p-5 text-left">
                <div className="flex flex-wrap gap-1 pr-6">
                  <StatusBadge tone="primary">{selected.category}</StatusBadge>
                  {!selected.published && <StatusBadge tone="neutral">ສະບັບຮ່າງ</StatusBadge>}
                </div>
                <SheetTitle className="text-xl leading-snug">{selected.title}</SheetTitle>
                <SheetDescription>
                  {formatDateLao(selected.date)}
                  {selected.author ? ` · ${selected.author}` : ""} · ເບິ່ງ{" "}
                  {formatNumber(selected.views)} ຄັ້ງ
                </SheetDescription>
                {canEdit && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => setDialog({ open: true, item: selected })}>
                      <Pencil className="h-4 w-4" /> ແກ້ໄຂ
                    </Button>
                    {perms.canDelete("news") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-destructive hover:bg-destructive-subtle hover:text-destructive"
                        onClick={() => setDeleting(selected)}
                      >
                        <Trash2 className="h-4 w-4" /> ລຶບ
                      </Button>
                    )}
                  </div>
                )}
              </SheetHeader>
              <div className="space-y-4 px-5 pb-8">
                {selected.summary && (
                  <p className="font-medium leading-relaxed">{selected.summary}</p>
                )}
                <div className="whitespace-pre-line text-sm leading-7 text-foreground/90">
                  {selected.content}
                </div>
                {selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map((t) => (
                      <StatusBadge key={t} tone="neutral">
                        #{t}
                      </StatusBadge>
                    ))}
                  </div>
                )}
              </div>
            </article>
          )}
        </SheetContent>
      </Sheet>

      <NewsDialog
        open={dialog.open}
        item={dialog.item}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="ລຶບຂ່າວ"
        description={deleting ? `ລຶບ "${deleting.title}"? ບໍ່ສາມາດກູ້ຄືນໄດ້.` : ""}
        confirmLabel="ລຶບ"
        destructive
        onConfirm={async () => {
          const n = deleting;
          setDeleting(null);
          if (n && (await deleteNews(n.id)).ok) {
            toast.success("ລຶບຂ່າວແລ້ວ");
            open(null);
          }
        }}
      />
    </PageContainer>
  );
}

function NewsDialog({
  open,
  item,
  onOpenChange,
}: {
  open: boolean;
  item: NewsItem | null;
  onOpenChange: (v: boolean) => void;
}) {
  const { session } = usePermissions();
  const supportsDrafts = useNewsSupportsDrafts();
  const [form, setForm] = useState<NewsInput>(() => empty(""));
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(item ? { ...item } : empty(session.name ?? ""));
    setTags(item?.tags.join(", ") ?? "");
    setError(null);
  }, [open, item, session.name]);

  const set = <K extends keyof NewsInput>(k: K, v: NewsInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.title.trim()) return setError("ກະລຸນາປ້ອນຫົວຂໍ້");
    if (!form.content.trim() && !form.summary.trim()) return setError("ກະລຸນາປ້ອນເນື້ອໃນ");
    if (!form.date) return setError("ກະລຸນາເລືອກວັນທີ");
    const input = {
      ...form,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    setPending(true);
    const res = item ? await updateNews(item.id, input) : await addNews(input);
    setPending(false);
    if (!res.ok) return setError(res.error);
    toast.success(item ? "ບັນທຶກແລ້ວ" : input.published ? "ເຜີຍແຜ່ຂ່າວແລ້ວ" : "ບັນທຶກສະບັບຮ່າງແລ້ວ");
    onOpenChange(false);
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "ແກ້ໄຂຂ່າວ" : "ເພີ່ມຂ່າວ"}
      icon={<Newspaper className="h-4 w-4" />}
      onSubmit={submit}
      pending={pending}
      error={error}
      submitLabel={form.published ? (item ? "ບັນທຶກ" : "ເຜີຍແຜ່") : "ບັນທຶກສະບັບຮ່າງ"}
      size="lg"
    >
      <FieldGrid>
        <Field label="ຫົວຂໍ້" required className="sm:col-span-2">
          {(id) => (
            <Input
              id={id}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              autoFocus
            />
          )}
        </Field>
        <Field label="ໝວດ" required>
          {(id) => (
            <NativeSelect
              id={id}
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {[...new Set([...NEWS_CATEGORIES, form.category])].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
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
        <Field label="ສະຫຼຸບ" className="sm:col-span-2">
          {(id) => (
            <Textarea
              id={id}
              rows={2}
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
            />
          )}
        </Field>
        <Field label="ເນື້ອໃນ" required className="sm:col-span-2">
          {(id) => (
            <Textarea
              id={id}
              rows={8}
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
            />
          )}
        </Field>
        <Field label="ແທັກ" hint="ຂັ້ນດ້ວຍຈຸດ (,)">
          {(id) => <Input id={id} value={tags} onChange={(e) => setTags(e.target.value)} />}
        </Field>
        <Field label="ຜູ້ຂຽນ">
          {(id) => (
            <Input id={id} value={form.author} onChange={(e) => set("author", e.target.value)} />
          )}
        </Field>
      </FieldGrid>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">ຮູບປະກອບ</span>
        <PhotoField name={form.title} value={form.image} onChange={(v) => set("image", v)} />
      </div>
      <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
        <CheckboxField
          label="ປັກໝຸດໄວ້ເທິງສຸດ"
          checked={form.pinned}
          onChange={(v) => set("pinned", v)}
        />
        <CheckboxField
          label="ຂ່າວເດັ່ນ"
          checked={form.featured}
          onChange={(v) => set("featured", v)}
        />
        <CheckboxField label="ຂ່າວດ່ວນ" checked={form.urgent} onChange={(v) => set("urgent", v)} />
        {supportsDrafts && (
          <CheckboxField
            label="ເຜີຍແຜ່"
            hint="ຍົກເລີກເພື່ອບັນທຶກເປັນສະບັບຮ່າງ (ເຫັນສະເພາະສະມາຊິກ)"
            checked={form.published}
            onChange={(v) => set("published", v)}
          />
        )}
      </div>
    </FormDialog>
  );
}

function empty(author: string): NewsInput {
  return {
    title: "",
    summary: "",
    content: "",
    category: NEWS_CATEGORIES[0],
    author,
    date: todayISO(),
    tags: [],
    pinned: false,
    featured: false,
    urgent: false,
    published: true,
    image: null,
  };
}
