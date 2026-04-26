"use client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "mynook_recently_viewed";
const MAX_ITEMS = 12;

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_ITEMS)));
  } catch {
    // quota exceeded — ignore
  }
}

/** Read-only access to the recently-viewed venue IDs (most recent first). */
export function useRecentlyViewedIds(): string[] {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(readIds());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setIds(readIds());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return ids;
}

/** Push a venue ID to the front of the recently-viewed list. */
export function useTrackRecentlyViewed(venueId: string | null | undefined) {
  useEffect(() => {
    if (!venueId) return;
    const current = readIds().filter((id) => id !== venueId);
    writeIds([venueId, ...current]);
  }, [venueId]);
}

/** Imperative pusher (for callbacks). */
export function pushRecentlyViewed(venueId: string) {
  const current = readIds().filter((id) => id !== venueId);
  writeIds([venueId, ...current]);
}

export const RECENTLY_VIEWED_LIMIT = MAX_ITEMS;
