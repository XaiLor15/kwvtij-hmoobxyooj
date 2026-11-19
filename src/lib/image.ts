// Client-side image validation + compression for uploads.
// Photos are stored as data URLs in the database (no Storage bucket exists in
// this project yet), so every image is resized and re-encoded first.
import type { Result } from "@/lib/store/realtime-store";

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("read failed"));
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode failed"));
    img.src = src;
  });
}

/**
 * Validate and shrink an image to fit within `maxSize` px (longest side),
 * re-encoded as JPEG. Returns a data URL.
 */
export async function compressImage(
  file: File,
  maxSize = 1280,
  quality = 0.82,
): Promise<Result<string>> {
  if (!file.type.startsWith("image/") || (file.type && !ALLOWED.includes(file.type)))
    return { ok: false, error: "ຮອງຮັບສະເພາະໄຟລ໌ຮູບ (JPG, PNG, WEBP, GIF)" };
  if (file.size > MAX_INPUT_BYTES) return { ok: false, error: "ໄຟລ໌ໃຫຍ່ເກີນ 15MB" };
  try {
    const src = await readAsDataUrl(file);
    const img = await loadImage(src);
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    if (scale === 1 && file.size < 300 * 1024 && file.type !== "image/png") {
      return { ok: true, data: src };
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: true, data: src };
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { ok: true, data: canvas.toDataURL("image/jpeg", quality) };
  } catch {
    return { ok: false, error: "ອ່ານໄຟລ໌ຮູບບໍ່ໄດ້" };
  }
}
