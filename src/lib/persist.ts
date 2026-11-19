// Tiny localStorage wrapper used by every reactive store so data
// survives page refresh. SSR-safe (no-ops on the server).

const PREFIX = "clan_";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadStore<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch (err) {
    console.error("loadStore failed for", key, err);
    return fallback;
  }
}

export function saveStore<T>(key: string, data: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch (err) {
    console.error("saveStore failed for", key, err);
  }
}

// Strip blob: URLs that can't survive a refresh.
export function stripBlobs<T extends { url?: string | null }>(items: T[]): T[] {
  return items.filter((i) => !(typeof i?.url === "string" && i.url.startsWith("blob:")));
}
