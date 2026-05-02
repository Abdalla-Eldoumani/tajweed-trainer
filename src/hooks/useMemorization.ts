"use client";

import { useState, useEffect, useCallback } from "react";
import { getProgress, toggleMemorizedVerse } from "@/lib/storage";

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

  const clear = useCallback(() => {
    // Iterate a copy so we don't mutate while toggling.
    const list = Array.from(memorized);
    for (const verseKey of list) toggleMemorizedVerse(verseKey);
    setMemorized(new Set());
  }, [memorized]);

  return {
    memorized,
    isMemorized,
    toggle,
    clear,
    count: memorized.size,
    mounted,
  };
}
