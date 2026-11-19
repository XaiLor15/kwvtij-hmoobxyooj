// @ts-nocheck
// Files store — backed by Supabase (public.files).
import { useSyncExternalStore, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function inferType(name = "") {
  const ext = name.split(".").pop()?.toUpperCase() ?? "";
  if (["PDF"].includes(ext)) return "PDF";
  if (["XLSX", "XLS", "CSV"].includes(ext)) return "XLSX";
  if (["DOC", "DOCX"].includes(ext)) return "DOCX";
  if (["ZIP", "RAR", "7Z"].includes(ext)) return "ZIP";
  if (["JPG", "JPEG", "PNG", "GIF", "WEBP"].includes(ext)) return "IMG";
  if (["MP4", "MOV", "MKV", "WEBM"].includes(ext)) return "VIDEO";
  return ext || "FILE";
}
function humanSize(bytes) {
  if (!bytes || bytes <= 0) return "—";
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + " KB";
  return bytes + " B";
}
function fromRow(r) {
  return {
    id: r.id,
    name: r.name ?? "",
    type: r.type ?? "FILE",
    size: r.size ?? "—",
    date: r.date ?? "",
    uploader: r.uploader ?? "",
    downloads: r.downloads ?? 0,
    category: r.category ?? "ອື່ນໆ",
    url: r.url ?? null,
  };
}

let files = [];
let snapshot = [];
const listeners = new Set();
let initialized = false;
function emit() { snapshot = files.slice(); for (const l of listeners) l(); }
function subscribe(cb) { ensureInit(); listeners.add(cb); return () => listeners.delete(cb); }
function getSnapshot() { return snapshot; }

async function hydrate() {
  const { data, error } = await supabase.from("files").select("*").order("id", { ascending: false });
  if (error) { console.error("files hydrate", error); return; }
  files = (data ?? []).map(fromRow);
  emit();
}
function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  hydrate();
  supabase.channel("realtime:files")
    .on("postgres_changes", { event: "*", schema: "public", table: "files" }, (payload) => {
      const { eventType, new: nr, old: or } = payload;
      if (eventType === "INSERT") {
        const obj = fromRow(nr);
        if (!files.some((f) => f.id === obj.id)) files = [obj, ...files];
      } else if (eventType === "UPDATE") {
        files = files.map((f) => (f.id === nr.id ? fromRow(nr) : f));
      } else if (eventType === "DELETE") {
        files = files.filter((f) => f.id !== or.id);
      }
      emit();
    }).subscribe();
}

export async function setFiles(next) { files = Array.isArray(next) ? [...next] : []; emit(); }

export async function addFile(data) {
  const item = {
    name: data.name?.trim() || "ໄຟລ໌ໃໝ່",
    type: data.type || inferType(data.name),
    size: data.size || "—",
    date: data.date || new Date().toLocaleDateString("lo-LA"),
    uploader: data.uploader?.trim() || "ທ່ານ (ຂ້ອຍ)",
    downloads: 0,
    category: data.category || "ອື່ນໆ",
    // Blob URLs don't survive — persist as null and keep locally for the session
    url: typeof data.url === "string" && data.url.startsWith("blob:") ? null : (data.url ?? null),
  };
  const { data: inserted, error } = await supabase.from("files").insert(item).select("*").single();
  if (error) { console.error("addFile", error); toast.error("ບັນທຶກບໍ່ສຳເລັດ"); return null; }
  const obj = fromRow(inserted);
  // Preserve local blob for immediate download in this session
  if (typeof data.url === "string" && data.url.startsWith("blob:")) obj.url = data.url;
  if (!files.some((f) => f.id === obj.id)) files = [obj, ...files];
  emit();
  return obj;
}

export async function addFilesFromFileList(fileList, meta = {}) {
  const added = [];
  for (const file of Array.from(fileList ?? [])) {
    const item = await addFile({
      name: file.name,
      type: inferType(file.name),
      size: humanSize(file.size),
      url: typeof URL !== "undefined" ? URL.createObjectURL(file) : null,
      ...meta,
    });
    if (item) added.push(item);
  }
  return added;
}

export async function updateFile(id, patch) {
  files = files.map((f) => (f.id === id ? { ...f, ...patch } : f));
  emit();
  const row = { ...patch }; delete row.id;
  const { error } = await supabase.from("files").update(row).eq("id", id);
  if (error) { console.error("updateFile", error); toast.error("ອັບເດດບໍ່ສຳເລັດ"); }
}

export async function deleteFile(id) {
  const target = files.find((f) => f.id === id);
  if (target?.url?.startsWith?.("blob:")) { try { URL.revokeObjectURL(target.url); } catch {} }
  files = files.filter((f) => f.id !== id);
  emit();
  const { error } = await supabase.from("files").delete().eq("id", id);
  if (error) { console.error("deleteFile", error); toast.error("ລຶບບໍ່ສຳເລັດ"); }
}

export async function incrementFileDownloads(id) {
  const target = files.find((f) => f.id === id);
  const next = (target?.downloads ?? 0) + 1;
  files = files.map((f) => (f.id === id ? { ...f, downloads: next } : f));
  emit();
  await supabase.from("files").update({ downloads: next }).eq("id", id);
}

export function useFiles() {
  useEffect(() => { ensureInit(); }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
