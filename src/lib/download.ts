import { toCSV } from "@/lib/domain/csv";
import { todayISO } from "@/lib/domain/format";

/** Download rows as a UTF-8 CSV (with BOM so Excel shows Lao text correctly). */
export function downloadCSV(baseName: string, rows: readonly Record<string, unknown>[]): boolean {
  if (!rows.length || typeof document === "undefined") return false;
  const blob = new Blob(["﻿" + toCSV(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}-${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
