"use client";

import { useState, useEffect } from "react";
import {
  DEFAULT_RECITER_EDITIONS,
  fetchReciterEditions,
  mergeWithDefaults,
  validateReciterIdentifier,
} from "@/lib/audio-api";
import type { ReciterEdition } from "@/lib/types";

const CACHE_KEY = "tajweed-trainer-reciters";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CachedReciters {
  editions: ReciterEdition[];
  fetchedAt: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readCache(): CachedReciters | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { editions?: unknown; fetchedAt?: unknown };
    if (typeof parsed.fetchedAt !== "number") return null;
    if (!Array.isArray(parsed.editions)) return null;
    // Filter out any tampered entries that fail the identifier shape check.
    const editions = (parsed.editions as unknown[]).filter((e): e is ReciterEdition => {
      if (typeof e !== "object" || e === null) return false;
      const o = e as Record<string, unknown>;
      return (
        validateReciterIdentifier(o.identifier) &&
        typeof o.language === "string" &&
        typeof o.name === "string" &&
        typeof o.englishName === "string" &&
        o.format === "audio" &&
        o.type === "versebyverse"
      );
    });
    if (editions.length === 0) return null;
    return { editions, fetchedAt: parsed.fetchedAt };
  } catch {
    return null;
  }
}

function writeCache(editions: ReciterEdition[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ editions, fetchedAt: Date.now() }));
  } catch {
    // Storage full — silent.
  }
}

// Synchronous accessor used by storage.sanitizeSettings for validation. Falls
// back to DEFAULT_RECITER_EDITIONS when the cache is empty so identifiers can
// always be validated against a known list, never an empty one.
export function getCachedReciterEditions(): ReciterEdition[] {
  const cached = readCache();
  if (cached) return mergeWithDefaults(cached.editions);
  return DEFAULT_RECITER_EDITIONS;
}

// Lazy initial value to avoid SSR/CSR mismatch — start with the defaults on
// every initial render, then upgrade to the cached or freshly-fetched list
// after mount.
export function useReciters() {
  const [editions, setEditions] = useState<ReciterEdition[]>(DEFAULT_RECITER_EDITIONS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setEditions(mergeWithDefaults(cached.editions));
    }

    const isStale = !cached || Date.now() - cached.fetchedAt > CACHE_TTL_MS;
    if (!isStale) return;

    const ctrl = new AbortController();
    setLoading(true);
    fetchReciterEditions(ctrl.signal)
      .then((fetched) => {
        setEditions(fetched);
        writeCache(fetched);
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, []);

  return { editions, loading };
}
