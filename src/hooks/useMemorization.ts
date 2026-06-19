"use client";

import { useState, useEffect, useCallback } from "react";
import { getProgress, toggleMemorizedVerse, setMemorizedVerses } from "@/lib/storage";

// Tracks which verseKeys ("surah:ayah") the user has marked memorized.
// Empty initial state for SSR/CSR parity; effect populates on mount.
export function useMemorization() {
  const [memorized, setMemorized] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMemorized(new Set(getProgress().memorizedVerses));
    setMounted(true);
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
