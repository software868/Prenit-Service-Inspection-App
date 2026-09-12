import type { DraftReport } from "@/lib/types";

const DRAFTS_KEY = "prenit-offline-drafts";
const HIERARCHY_KEY = "prenit-offline-hierarchy";

export function getOfflineDrafts(): DraftReport[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(DRAFTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveOfflineDraft(draft: DraftReport) {
  const drafts = getOfflineDrafts();
  const existingIndex = drafts.findIndex(
    (d) =>
      d.breadcrumb === draft.breadcrumb &&
      d.engineerName === draft.engineerName &&
      (d.id ? d.id === draft.id : true)
  );

  const updated = { ...draft, updatedAt: new Date().toISOString() };

  if (existingIndex >= 0) {
    drafts[existingIndex] = updated;
  } else {
    drafts.unshift(updated);
  }

  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  return updated;
}

export function removeOfflineDraft(breadcrumb: string, engineerName: string) {
  const drafts = getOfflineDrafts().filter(
    (d) => !(d.breadcrumb === breadcrumb && d.engineerName === engineerName)
  );
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function cacheHierarchy(data: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HIERARCHY_KEY, JSON.stringify({ data, cachedAt: Date.now() }));
}

export function getCachedHierarchy<T>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(HIERARCHY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data as T;
  } catch {
    return null;
  }
}

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export async function fetchWithOffline<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  if (isOnline()) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }
  throw new Error("You are offline");
}
