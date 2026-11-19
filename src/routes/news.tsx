// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/news")({
  validateSearch: (search: Record<string, unknown>) => ({
    action: typeof search.action === "string" ? search.action : undefined,
  }),
  head: () => ({
    meta: [
      { title: "ຂ່າວສານ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { name: "description", content: "ຂ່າວສານ — ລະບົບຄຸ້ມຄອງຂໍ້ມູນຕະກູນ" },
      { property: "og:title", content: "ຂ່າວສານ — ລະບົບຄຸ້ມຄອງຕະກູນ" },
      { property: "og:description", content: "ຂ່າວສານ — ລະບົບຄຸ້ມຄອງຂໍ້ມູນຕະກູນ" },
    ],
  }),
  component: NewsPage,
});

import { useState, useRef, useEffect } from "react";
import {
  Pin,
  Bookmark,
  Eye,
  MessageSquare,
  Share2,
  Calendar,
  Newspaper,
  Megaphone,
  PartyPopper,
  Users,
  Wallet,
  Flame,
  Heart,
  Search,
  Plus,
  ArrowRight,
  X,
  Save,
  Send,
  Star,
  Zap,
  Image,
  Video,
  Film,
  Upload,
  Trash2,
  Play,
  Link2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useMediaLightbox } from "@/components/media-lightbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil } from "lucide-react";
import {
  useNews,
  addNews,
  updateNews,
  deleteNews,
  NEWS_CATEGORIES,
} from "@/lib/news-store";
import { fileToDataUrl } from "@/lib/file-to-data-url";

// ─── Data ────────────────────────────────────────────────────────────────────

const categories = [
  "ທັງໝົດ",
  ...NEWS_CATEGORIES,
];

// Tailwind palette classes per category (bg/10 + text-700)
const catStyle: Record<string, { badge: string; icon: any }> = {
  ປະກາດ: { badge: "bg-sky-100 text-sky-700 border-sky-200", icon: Megaphone },
  ກິດຈະກຳ: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: PartyPopper,
  },
  ປະຊຸມ: {
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    icon: Users,
  },
  ການເງິນ: {
    badge: "bg-teal-100 text-teal-700 border-teal-200",
    icon: Wallet,
  },
  ລຳລຶກ: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Heart,
  },
  ດ່ວນ: { badge: "bg-rose-100 text-rose-700 border-rose-200", icon: Flame },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function CategoryBadge({ cat }: { cat: string }) {
  const s = catStyle[cat];
  if (!s) return <Badge variant="outline">{cat}</Badge>;
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${s.badge}`}
    >
      <Icon className="h-3 w-3" />
      {cat}
    </span>
  );
}

function NewsCard({
  news,
  onClick,
  onEdit,
  onDelete,
}: {
  news: any;
  onClick: (n: any) => void;
  onEdit?: (n: any) => void;
  onDelete?: (n: any) => void;
}) {
  return (
    <Card
      className="group cursor-pointer rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 overflow-hidden flex flex-col"
      onClick={() => onClick(news)}
    >
      {/* Coloured header strip */}
      <div
        className={`h-28 flex items-center justify-center relative ${
          catStyle[news.category]
            ? catStyle[news.category].badge.replace("text-", "bg-").split(" ")[0]
            : "bg-muted"
        } bg-opacity-30`}
      >
        {(() => {
          const s = catStyle[news.category];
          if (!s) return <Newspaper className="h-10 w-10 text-muted-foreground/20" />;
          const Icon = s.icon;
          return <Icon className="h-10 w-10 opacity-10 text-foreground" />;
        })()}
        {/* overlay badges */}
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          <CategoryBadge cat={news.category} />
          {news.pinned && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
              <Pin className="h-3 w-3" /> ປັກໝຸດ
            </span>
          )}
          {news.urgent && (
            <span className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 animate-pulse">
              <Zap className="h-3 w-3" /> ດ່ວນ
            </span>
          )}
        </div>
        <div className="absolute bottom-2 right-2 flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" /> {news.views}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> {news.comments}
          </span>
        </div>
      </div>

      <CardContent className="flex flex-col flex-1 p-4 gap-3">
        <h3 className="text-sm font-bold leading-snug text-foreground line-clamp-2">
          {news.title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">
          {news.summary}
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {news.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5"
            >
              #{tag}
            </span>
          ))}
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">{news.author}</p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="h-2.5 w-2.5" /> {news.date}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="secondary" className="h-7 text-xs px-3">
              ອ່ານ
            </Button>
            {onEdit && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="ແກ້ໄຂ" onClick={(e) => { e.stopPropagation(); onEdit(news); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50" title="ລຶບ" onClick={(e) => { e.stopPropagation(); onDelete(news); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function NewsPage() {
  const { open: openMedia } = useMediaLightbox();
  const { action: actionParam } = Route.useSearch() as { action?: string };
  const [activeCategory, setActiveCategory] = useState("ທັງໝົດ");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [showModal, setShowModal] = useState(false);
  const [editingNews, setEditingNews] = useState<any>(null);
  const [deletingNews, setDeletingNews] = useState<any>(null);
  const newsList = useNews();
  const emptyNewsForm = { title: "", summary: "", tags: "", date: new Date().toISOString().slice(0,10), category: "", content: "", pinned: false, featured: false, urgent: false };
  const [newsForm, setNewsForm] = useState(emptyNewsForm);
  useEffect(() => { if (actionParam === "add") setShowModal(true); }, [actionParam]);
  const setNF = (k, v) => setNewsForm((f) => ({ ...f, [k]: v }));
  const openCreateNews = () => { setEditingNews(null); setNewsForm(emptyNewsForm); setShowModal(true); };
  const openEditNews = (n) => {
    setEditingNews(n);
    setNewsForm({
      title: n.title ?? "",
      summary: n.summary ?? "",
      tags: (n.tags ?? []).join(", "),
      date: n.date ?? "",
      category: n.category ?? "",
      content: n.content ?? "",
      pinned: !!n.pinned,
      featured: !!n.featured,
      urgent: !!n.urgent,
    });
    setShowModal(true);
  };
  const saveNews = () => {
    if (!newsForm.title.trim()) { toast.error("ກະລຸນາປ້ອນຫົວຂໍ້"); return; }
    if (!newsForm.category) { toast.error("ກະລຸນາເລືອກໝວດໝູ່"); return; }
    const tags = newsForm.tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (editingNews) {
      updateNews(editingNews.id, { ...newsForm, tags });
      toast.success("ບັນທຶກການແກ້ໄຂແລ້ວ");
    } else {
      addNews({ ...newsForm, tags, author: "ທ່ານ (ຂ້ອຍ)" });
      toast.success("ເຜີຍແຜ່ຂ່າວສຳເລັດ");
    }
    setShowModal(false);
    setEditingNews(null);
    setNewsForm(emptyNewsForm);
  };
  const confirmDelete = () => {
    if (!deletingNews) return;
    deleteNews(deletingNews.id);
    toast.success(`ລຶບ "${deletingNews.title}" ແລ້ວ`);
    setDeletingNews(null);
  };
  const [selectedNews, setSelectedNews] =
    useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("content");

  // ── Per-news interactive content (frontend-only) ──
  // Comments feature not yet backed by a schema; start empty until wired up.
  const defaultComments: { name: string; text: string; time: string }[] = [];
  const [commentsByNews, setCommentsByNews] = useState<
    Record<number, { name: string; text: string; time: string }[]>
  >({});
  const [imagesByNews, setImagesByNews] = useState<
    Record<number, { id: string; url: string; name: string }[]>
  >({});
  const [videosByNews, setVideosByNews] = useState<
    Record<number, { id: string; url: string; name: string }[]>
  >({});
  const [commentDraft, setCommentDraft] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const getComments = (id: number) => commentsByNews[id] ?? defaultComments;

  function addComment() {
    if (!selectedNews) return;
    const text = commentDraft.trim();
    if (!text) {
      toast.error("ກະລຸນາຂຽນຄຳເຫັນກ່ອນ");
      return;
    }
    setCommentsByNews((prev) => {
      const list = prev[selectedNews.id] ?? defaultComments;
      return {
        ...prev,
        [selectedNews.id]: [
          { name: "ທ່ານ (ຂ້ອຍ)", text, time: "ດຽວນີ້" },
          ...list,
        ],
      };
    });
    setCommentDraft("");
    toast.success("ສົ່ງຄຳເຫັນແລ້ວ");
  }

  async function addImages(files: FileList | null) {
    if (!selectedNews || !files?.length) return;
    const next: { id: string; url: string; name: string }[] = [];
    for (const file of Array.from(files)) {
      if (!file.type?.startsWith("image/")) continue;
      try {
        const url = await fileToDataUrl(file);
        next.push({
          id: `IMG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          url,
          name: file.name,
        });
      } catch {
        toast.error(`ອ່ານໄຟລ໌ ${file.name} ບໍ່ສຳເລັດ`);
      }
    }
    if (!next.length) {
      toast.error("ກະລຸນາເລືອກໄຟລ໌ຮູບພາບ");
      return;
    }
    setImagesByNews((prev) => ({
      ...prev,
      [selectedNews.id]: [...(prev[selectedNews.id] ?? []), ...next],
    }));
    toast.success(`ອັບໂຫລດ ${next.length} ຮູບແລ້ວ`);
  }

  function removeImage(imgId: string) {
    if (!selectedNews) return;
    setImagesByNews((prev) => ({
      ...prev,
      [selectedNews.id]: (prev[selectedNews.id] ?? []).filter((i) => i.id !== imgId),
    }));
  }

  async function addVideos(files: FileList | null) {
    if (!selectedNews || !files?.length) return;
    const next: { id: string; url: string; name: string }[] = [];
    for (const file of Array.from(files)) {
      if (!file.type?.startsWith("video/")) continue;
      try {
        const url = await fileToDataUrl(file);
        next.push({
          id: `VID-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          url,
          name: file.name,
        });
      } catch {
        toast.error(`ອ່ານໄຟລ໌ ${file.name} ບໍ່ສຳເລັດ`);
      }
    }
    if (!next.length) {
      toast.error("ກະລຸນາເລືອກໄຟລ໌ວິດີໂອ");
      return;
    }
    setVideosByNews((prev) => ({
      ...prev,
      [selectedNews.id]: [...(prev[selectedNews.id] ?? []), ...next],
    }));
    toast.success(`ອັບໂຫລດ ${next.length} ວິດີໂອແລ້ວ`);
  }

  function removeVideo(vidId: string) {
    if (!selectedNews) return;
    setVideosByNews((prev) => ({
      ...prev,
      [selectedNews.id]: (prev[selectedNews.id] ?? []).filter((v) => v.id !== vidId),
    }));
  }

  const q = search.trim().toLowerCase().replace(/\s+/g, " ");
  const filtered = newsList
    .filter((n) => {
      const matchCat =
        activeCategory === "ທັງໝົດ" || n.category === activeCategory;
      if (!q) return matchCat;
      const hay = [n.title, n.summary, n.author, n.category, ...(n.tags || [])]
        .filter(Boolean).join(" ").toLowerCase();
      return matchCat && hay.includes(q);
    })

    .sort((a, b) => {
      if (sortBy === "views") return b.views - a.views;
      if (sortBy === "comments") return b.comments - a.comments;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  const pinned = newsList.filter((n) => n.pinned);
  const featured = newsList.find((n) => n.featured);

  const totalNews = newsList.length;
  const publishedNews = newsList.filter((n) => !n.draft).length;
  const draftNews = newsList.filter((n) => n.draft).length;
  const pinnedCount = newsList.filter((n) => n.pinned).length;
  const totalViews = newsList.reduce((s, n) => s + (Number(n.views) || 0), 0);
  const categoriesCount = new Set(newsList.map((n) => n.category).filter(Boolean)).size;
  const stats = [
    { icon: Newspaper, label: "ຂ່າວທັງໝົດ", value: String(totalNews), sub: "ລາຍການ", color: "text-emerald-600 bg-emerald-50" },
    { icon: Star, label: "ເຜີຍແຜ່ແລ້ວ", value: String(publishedNews), sub: "ຂ່າວ", color: "text-sky-600 bg-sky-50" },
    { icon: Pencil, label: "ສະບັບຮ່າງ", value: String(draftNews), sub: "ຮ່າງ", color: "text-slate-600 bg-slate-100" },
    { icon: Pin, label: "ປະກາດສຳຄັນ", value: String(pinnedCount), sub: "ປັກໝຸດ", color: "text-amber-600 bg-amber-50" },
    { icon: Eye, label: "ຜູ້ອ່ານ", value: totalViews ? totalViews.toLocaleString() : "0", sub: "ທັງໝົດ", color: "text-orange-600 bg-orange-50" },
    { icon: Megaphone, label: "ໝວດຂ່າວ", value: String(categoriesCount), sub: "ໝວດ", color: "text-violet-600 bg-violet-50" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      {/* ── Page Title ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Newspaper className="h-7 w-7 text-primary" />
            ຂ່າວ ແລະ ປະກາດຕະກູນ
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            ຕິດຕາມຂ່າວສານ, ປະກາດ, ການເຄື່ອນໄຫວ ແລະ ຂໍ້ມູນສຳຄັນຂອງຕະກູນ
          </p>
        </div>
        <Button onClick={openCreateNews} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" /> ສ້າງຂ່າວ
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <CardContent className="p-4">
                <div className={`inline-flex items-center justify-center rounded-lg p-2 mb-3 ${s.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs text-muted-foreground mb-0.5">{s.label}</p>
                <p className="text-2xl font-extrabold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Pinned Announcements ── */}
      {pinned.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Pin className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-amber-600">
              ປະກາດສຳຄັນ
            </h3>
            <Separator className="flex-1" />
          </div>
          <div className="flex flex-col gap-2">
            {pinned.map((n) => (
              <Card
                key={n.id}
                className={`rounded-xl border cursor-pointer transition-all duration-200 hover:translate-x-1 hover:shadow-md ${n.urgent ? "border-rose-200 bg-rose-50/40" : "border-amber-200 bg-amber-50/30"}`}
                onClick={() => {
                  setSelectedNews(n);
                  setActiveTab("content");
                }}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`rounded-lg p-2 shrink-0 ${n.urgent ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"}`}>
                    {n.urgent ? <Zap className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {n.urgent && (
                        <span className="inline-flex items-center gap-1 rounded border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 animate-pulse">
                          <Zap className="h-2.5 w-2.5" /> ດ່ວນ
                        </span>
                      )}
                      <CategoryBadge cat={n.category} />
                    </div>
                    <p className="text-sm font-bold text-foreground truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {n.summary.substring(0, 80)}...
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {n.date}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {n.views}
                    </span>
                    <Button size="sm" variant={n.urgent ? "destructive" : "secondary"} className="h-6 text-xs px-2">
                      ອ່ານ <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Featured Hero ── */}
      {featured && (
        <Card
          className="rounded-xl border bg-primary/5 border-primary/20 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-pointer overflow-hidden"
          onClick={() => {
            setSelectedNews(featured);
            setActiveTab("content");
          }}
        >
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-2.5 py-0.5 text-xs font-bold">
                    <Star className="h-3 w-3" /> ເດັ່ນ
                  </span>
                  <CategoryBadge cat={featured.category} />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground leading-snug">
                  {featured.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{featured.summary}</p>
                <div className="flex items-center gap-5 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-primary">{featured.author}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" /> {featured.date}
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {featured.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" /> {featured.comments}
                    </span>
                  </div>
                  <Button className="ml-auto gap-1.5">
                    ອ່ານຂ່າວ <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Toolbar ── */}
      <div className="rounded-xl border bg-card p-3 md:p-4 flex flex-col gap-3">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ຄົ້ນຫາຂ່າວ..."
              className="pl-8 h-9 text-sm"
            />
          </div>
          <div className="flex gap-1 ml-auto">
            {(
              [
                ["latest", "ໃໝ່ສຸດ"],
                ["views", "ຍອດວ່ວ"],
                ["comments", "ຄຳເຫັນ"],
              ] as const
            ).map(([val, label]) => (
              <Button
                key={val}
                size="sm"
                variant={sortBy === val ? "secondary" : "ghost"}
                className="h-8 text-xs"
                onClick={() => setSortBy(val)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={activeCategory === c ? "default" : "ghost"}
              className="h-7 rounded-full text-xs px-3"
              onClick={() => setActiveCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      {/* ── News Grid ── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((n) => (
            <NewsCard
              key={n.id}
              news={n}
              onClick={(item) => {
                setSelectedNews(item);
                setActiveTab("content");
              }}
              onEdit={openEditNews}
              onDelete={setDeletingNews}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Newspaper className="h-16 w-16 text-muted-foreground/20" />
          <p className="text-muted-foreground text-base">ຍັງບໍ່ມີຂ່າວ</p>
          <Button onClick={openCreateNews} className="gap-2">
            <Plus className="h-4 w-4" /> ສ້າງຂ່າວທຳອິດ
          </Button>
        </div>
      )}

      {/* ── News Detail Dialog ── */}
      <Dialog
        open={!!selectedNews}
        onOpenChange={(open) => {
          if (!open) setSelectedNews(null);
        }}
      >
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0">
          {selectedNews && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CategoryBadge cat={selectedNews.category} />
                      {selectedNews.urgent && (
                        <span className="inline-flex items-center gap-1 rounded border border-rose-300 bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                          <Zap className="h-3 w-3" /> ດ່ວນ
                        </span>
                      )}
                    </div>
                    <DialogTitle className="text-lg font-bold leading-snug text-left">
                      {selectedNews.title}
                    </DialogTitle>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="font-semibold text-primary">{selectedNews.author}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {selectedNews.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {selectedNews.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> {selectedNews.comments}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Bookmark className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-col flex-1 overflow-hidden"
              >
                <TabsList className="mx-6 mt-2 shrink-0 justify-start bg-transparent border-b rounded-none h-auto p-0 gap-1">
                  {[
                    ["content", Newspaper, "ເນື້ອຫາ"],
                    ["related", Link2, "ກ່ຽວຂ້ອງ"],
                    ["comments", MessageSquare, "ຄຳເຫັນ"],
                    ["gallery", Image, "ຮູບພາບ"],
                    ["video", Video, "ວິດີໂອ"],
                  ].map(([tab, Icon, label]) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 pb-2 text-xs"
                    >
                      <Icon className="h-3 w-3" /> {label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <TabsContent value="content" className="mt-0 space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedNews.summary}</p>
                    <p className="text-sm text-foreground leading-loose">
                      {selectedNews.content}
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {selectedNews.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-primary/10 text-primary rounded-md px-2 py-0.5 border border-primary/20">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="related" className="mt-0 space-y-3">
                    <p className="text-sm font-semibold text-foreground">ຂ່າວ ແລະ ກິດຈະກຳທີ່ກ່ຽວຂ້ອງ</p>
                    {newsList
                      .filter((n) => n.id !== selectedNews.id)
                      .slice(0, 3)
                      .map((n) => (
                        <Card
                          key={n.id}
                          className="rounded-lg cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => setSelectedNews(n)}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className={`rounded-md p-1.5 shrink-0 ${catStyle[n.category]?.badge.replace("text-", "bg-").split(" ")[0] ?? "bg-muted"} bg-opacity-30`}>
                              {(() => {
                                const s = catStyle[n.category];
                                if (!s) return <Newspaper className="h-4 w-4 text-muted-foreground" />;
                                const Icon = s.icon;
                                return <Icon className="h-4 w-4" />;
                              })()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{n.title}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{n.date}</span>
                                <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{n.views}</span>
                              </p>
                            </div>
                            <CategoryBadge cat={n.category} />
                          </CardContent>
                        </Card>
                      ))}
                  </TabsContent>

                  <TabsContent value="comments" className="mt-0 space-y-4">
                    <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                      <textarea
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            addComment();
                          }
                        }}
                        placeholder="ຂຽນຄຳເຫັນ..."
                        rows={3}
                        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
                      />
                      <div className="flex justify-end">
                        <Button size="sm" className="gap-1.5" onClick={addComment}>
                          <Send className="h-3 w-3" /> ສົ່ງ
                        </Button>
                      </div>
                    </div>
                    {getComments(selectedNews.id).map((c, i) => (
                      <div key={i} className="flex gap-3 py-3 border-b last:border-0">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                          {c.name.replace(/^ທ່ານ(ນາງ)?\s*/, "").charAt(0) || c.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-primary">{c.name}</span>
                            <span className="text-[10px] text-muted-foreground">{c.time}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{c.text}</p>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="gallery" className="mt-0 space-y-3">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addImages(e.target.files);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5" /> ອັບໂຫລດຮູບພາບ
                    </Button>
                    {(imagesByNews[selectedNews.id]?.length ?? 0) > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {imagesByNews[selectedNews.id].map((img) => (
                          <div
                            key={img.id}
                            className="group relative aspect-[4/3] rounded-lg border bg-muted overflow-hidden"
                          >
                            <img
                              src={img.url}
                              alt={img.name}
                              className="h-full w-full object-cover cursor-zoom-in"
                              onClick={() => openMedia({ type: "image", src: img.url, alt: img.name })}
                            />
                            <button
                              onClick={() => removeImage(img.id)}
                              className="absolute top-1 right-1 rounded-md bg-background/80 p-1 text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
                        <Image className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">ຍັງບໍ່ມີຮູບພາບ — ກົດອັບໂຫລດເພື່ອເພີ່ມ</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="video" className="mt-0 space-y-3">
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addVideos(e.target.files);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5" /> ອັບໂຫລດວິດີໂອ
                    </Button>
                    {(videosByNews[selectedNews.id]?.length ?? 0) > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {videosByNews[selectedNews.id].map((vid) => (
                          <div
                            key={vid.id}
                            className="group relative rounded-lg border bg-muted overflow-hidden"
                          >
                            <div className="relative w-full aspect-video bg-black">
                              <video
                                src={vid.url}
                                controls
                                className="w-full h-full"
                              />
                              <button
                                type="button"
                                onClick={() => openMedia({ type: "video", src: vid.url })}
                                className="absolute top-1.5 right-1.5 rounded-md bg-black/60 text-white p-1.5 hover:bg-black/80 transition-colors"
                                aria-label="ເບິ່ງເຕັມຈໍ"
                                title="ເບິ່ງເຕັມຈໍ"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                  <path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>
                                </svg>
                              </button>
                            </div>
                            <div className="flex items-center justify-between gap-2 p-2">
                              <span className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                                <Film className="h-3.5 w-3.5 shrink-0" /> {vid.name}
                              </span>
                              <button
                                onClick={() => removeVideo(vid.id)}
                                className="rounded-md p-1 text-rose-600 hover:bg-background"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
                        <Play className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">ຍັງບໍ່ມີວິດີໂອ — ກົດອັບໂຫລດເພື່ອລົງຄຣິບ</p>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit News Dialog ── */}
      <Dialog open={showModal} onOpenChange={(o) => { setShowModal(o); if (!o) { setEditingNews(null); } }}>
        <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" /> {editingNews ? "ແກ້ໄຂຂ່າວ" : "ສ້າງຂ່າວໃໝ່"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ຫົວຂໍ້ຂ່າວ*</label>
              <Input value={newsForm.title} onChange={(e) => setNF("title", e.target.value)} placeholder="ຫົວຂໍ້..." className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ຄຳອະທິບາຍສັ້ນ</label>
              <Input value={newsForm.summary} onChange={(e) => setNF("summary", e.target.value)} placeholder="ສະຫຼຸບຂ່າວ..." className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ແທັກ</label>
              <Input value={newsForm.tags} onChange={(e) => setNF("tags", e.target.value)} placeholder="ແທັກ, ຂັ້ນດ້ວຍ comma" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ວັນທີເຜີຍແຜ່</label>
              <Input type="date" value={newsForm.date} onChange={(e) => setNF("date", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ໝວດໝູ່*</label>
              <select value={newsForm.category} onChange={(e) => setNF("category", e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">ເລືອກໝວດ...</option>
                {["ປະກາດ", "ກິດຈະກຳ", "ປະຊຸມ", "ການເງິນ", "ລຳລຶກ", "ດ່ວນ"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ເນື້ອຫາ*</label>
              <textarea
                value={newsForm.content}
                onChange={(e) => setNF("content", e.target.value)}
                placeholder="ຂຽນເນື້ອຫາຂ່າວ..."
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              />
            </div>
            <div className="flex gap-4 flex-wrap">
              {[
                ["pinned", Pin, "ປັກໝຸດ"],
                ["featured", Star, "ເດັ່ນ"],
                ["urgent", Zap, "ດ່ວນ"],
              ].map(([key, Icon, label]: any) => (
                <label key={key} className="flex items-center gap-1.5 cursor-pointer text-sm text-muted-foreground">
                  <input type="checkbox" className="accent-primary" checked={!!newsForm[key]} onChange={(e) => setNF(key, e.target.checked)} />
                  <Icon className="h-3.5 w-3.5" /> {label}
                </label>
              ))}
            </div>
            <Separator />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setShowModal(false); setEditingNews(null); }}>
                ຍົກເລີກ
              </Button>
              <Button className="flex-1 gap-1.5" onClick={saveNews}>
                {editingNews ? (<><Save className="h-4 w-4" /> ບັນທຶກ</>) : (<><Send className="h-4 w-4" /> ເຜີຍແຜ່</>)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingNews} onOpenChange={(o) => { if (!o) setDeletingNews(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ຢືນຢັນການລຶບຂ່າວ</AlertDialogTitle>
            <AlertDialogDescription>
              ທ່ານແນ່ໃຈບໍ່ວ່າຈະລຶບຂ່າວ "<span className="font-semibold">{deletingNews?.title}</span>"? ການກະທຳນີ້ບໍ່ສາມາດກັບຄືນໄດ້.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ຍົກເລີກ</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">ລຶບ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
