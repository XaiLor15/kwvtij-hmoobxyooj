// News store — public.news.
// `published` (draft support) is added by migration 20261119000100; until
// then every row counts as published and the draft option is hidden.
import { useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typedClient } from "@/integrations/supabase/client";
import { createRealtimeStore, num, str, strArray, type Result } from "@/lib/store/realtime-store";
import type { NewsItem } from "@/lib/domain/types";

export const NEWS_CATEGORIES = ["ປະກາດ", "ກິດຈະກຳ", "ປະຊຸມ", "ການເງິນ", "ລຳລຶກ", "ດ່ວນ"];

let supportsDrafts = false;
const draftListeners = new Set<() => void>();
function markDraftSupport() {
  if (supportsDrafts) return;
  supportsDrafts = true;
  draftListeners.forEach((l) => l());
}

function fromRow(r: Record<string, unknown>): NewsItem {
  if ("published" in r) markDraftSupport();
  return {
    id: num(r.id),
    title: str(r.title, "ບໍ່ມີຫົວຂໍ້"),
    summary: str(r.summary),
    content: str(r.content),
    category: str(r.category, NEWS_CATEGORIES[0]),
    author: str(r.author),
    date: str(r.date),
    tags: strArray(r.tags),
    views: num(r.views),
    comments: num(r.comments),
    pinned: !!r.pinned,
    featured: !!r.featured,
    urgent: !!r.urgent,
    published: r.published !== false,
    image: r.image ? str(r.image) : null,
  };
}

const store = createRealtimeStore<NewsItem>({
  table: "news",
  module: "news",
  label: "ຂ່າວ",
  fromRow,
  getId: (n) => n.id,
  order: [{ column: "date", ascending: false }],
  // Pinned first, then newest.
  sort: (a, b) =>
    Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date) || b.id - a.id,
});

export const useNews = store.useItems;
export const useNewsState = store.useStore;

/** Whether the database has the `published` column (draft support). */
export function useNewsSupportsDrafts(): boolean {
  return useSyncExternalStore(
    (cb) => {
      draftListeners.add(cb);
      return () => draftListeners.delete(cb);
    },
    () => supportsDrafts,
    () => false,
  );
}

export interface NewsInput {
  title: string;
  summary: string;
  content: string;
  category: string;
  author: string;
  date: string;
  tags: string[];
  pinned: boolean;
  featured: boolean;
  urgent: boolean;
  published: boolean;
  image: string | null;
}

function toRow(n: NewsInput) {
  const row: Record<string, unknown> = {
    title: n.title.trim(),
    summary: n.summary.trim(),
    content: n.content.trim(),
    category: n.category,
    author: n.author.trim() || null,
    date: n.date,
    tags: n.tags,
    pinned: n.pinned,
    featured: n.featured,
    urgent: n.urgent,
    image: n.image,
  };
  if (supportsDrafts) row.published = n.published;
  return row;
}

export function addNews(n: NewsInput): Promise<Result<NewsItem>> {
  return store.insert({ ...toRow(n), views: 0, comments: 0 });
}

export function updateNews(id: number, n: NewsInput): Promise<Result<NewsItem>> {
  return store.update(id, toRow(n));
}

export function deleteNews(id: number): Promise<Result<null>> {
  return store.remove(id);
}

const viewed = new Set<number>();
/**
 * Count a view once per page-load. Uses the `increment_news_views` RPC
 * (atomic, works for guests). Silently does nothing if the RPC is missing.
 */
export async function recordNewsView(id: number): Promise<void> {
  if (viewed.has(id)) return;
  viewed.add(id);
  const client = typedClient as unknown as SupabaseClient;
  const { error } = await client.rpc("increment_news_views", { news_id: id });
  if (error && error.code !== "PGRST202" && error.code !== "42883") {
    console.warn("increment_news_views failed", error.message);
  }
}
