// Event photo gallery — public.gallery.
// Images are resized/compressed in the browser before saving (see lib/image.ts),
// which keeps rows ~100–300 KB instead of multi-MB camera originals.
import { useMemo } from "react";
import { createRealtimeStore, num, str, type Result } from "@/lib/store/realtime-store";
import { compressImage } from "@/lib/image";
import type { GalleryImage } from "@/lib/domain/types";

const store = createRealtimeStore<GalleryImage>({
  table: "gallery",
  module: "activities",
  label: "ຮູບພາບ",
  fromRow: (r) => ({
    id: num(r.id),
    eventId: num(r.event_id),
    url: str(r.url),
    name: str(r.name),
  }),
  getId: (g) => g.id,
  order: [{ column: "id", ascending: true }],
  sort: (a, b) => a.id - b.id,
});

export function useGallery(eventId: number): GalleryImage[] {
  const items = store.useItems();
  return useMemo(() => items.filter((g) => g.eventId === eventId), [items, eventId]);
}

export async function addImages(
  eventId: number,
  files: File[],
): Promise<Result<GalleryImage[]> & { skipped: string[] }> {
  const rows: Record<string, unknown>[] = [];
  const skipped: string[] = [];
  for (const file of files) {
    const res = await compressImage(file);
    if (res.ok) rows.push({ event_id: eventId, url: res.data, name: file.name });
    else skipped.push(`${file.name}: ${res.error}`);
  }
  const out = await store.insertMany(rows);
  return { ...out, skipped };
}

export function removeImage(id: number): Promise<Result<null>> {
  return store.remove(id);
}
