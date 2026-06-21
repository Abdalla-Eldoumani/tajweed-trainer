"use client";

import { useState, useEffect, useCallback } from "react";
import { getProgress, toggleMemorizedVerse, setMemorizedVerses } from "@/lib/storage";
import { subscribeProgressChanged } from "@/lib/progress-events";

// Tracks which verseKeys ("surah:ayah") the user has marked memorized.
// Empty initial state for SSR/CSR parity; effect populates on mount.
//
// Subscribes to the progress change bus so a write in any instance re-renders
// them all: the bulk-entry control and the /progress tracker, breakdown, and
// review entry are different component trees, so the bulk write has to reach the
// /progress instances through the bus, not an in-instance optimistic update.
export function useMemorization() {
  const [memorized, setMemorized] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMemorized(new Set(getProgress().memorizedVerses));
    setMounted(true);
    return subscribeProgressChanged(() =>
      setMemorized(new Set(getProgress().memorizedVerses)),
    );
  }, []);

  const isMemorized = useCallback(
    (verseKey: string) => memorized.has(verseKey),
    [memorized],
  );

  const toggle = useCallback((verseKey: string) => {
    const nowMemorized = toggleMemorizedVerse(verseKey);
    setMemorized((prev) => {
      const next = new Set(prev);
      if (nowMemorized) next.add(verseKey);
      else next.delete(verseKey);
      return next;
    });
    return nowMemorized;
  }, []);

  // Bulk mark or unmark a list of verseKeys through the single batched store
  // write (one localStorage write, one change-bus emit), then re-seed the local
  // Set from the store in one update so it reflects exactly what was persisted
  // (the store applies key validation and the 6236 cap), never a per-verse loop.
  const setMany = useCallback((verseKeys: string[], memorize: boolean) => {
    const count = setMemorizedVerses(verseKeys, memorize);
    setMemorized(new Set(getProgress().memorizedVerses));
    return count;
  }, []);

  const clear = useCallback(() => {
    // Route the full clear through the one batched write instead of toggling
    // each verse (which would be one write and one emit per verse).
    setMemorizedVerses(Array.from(memorized), false);
    setMemorized(new Set());
  }, [memorized]);

  return {
    memorized,
    isMemorized,
    toggle,
    setMany,
    clear,
    count: memorized.size,
    mounted,
  };
}
