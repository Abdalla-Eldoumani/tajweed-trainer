"use client";

import { useState, useEffect, useCallback } from "react";
import { getProgress, toggleVerseBookmark } from "@/lib/storage";

// Tracks bookmarked verseKeys ("surah:ayah") from the consolidated progress
// model. Empty initial state for SSR/CSR parity; the effect populates on mount.
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setBookmarks(new Set(getProgress().bookmarks));
    setMounted(true);
  }, []);

  const isBookmarked = useCallback((verseKey: string) => bookmarks.has(verseKey), [bookmarks]);

  const toggle = useCallback((verseKey: string) => {
    const now = toggleVerseBookmark(verseKey);
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (now) next.add(verseKey);
      else next.delete(verseKey);
      return next;
    });
    return now;
  }, []);

  return {
    bookmarks,
    isBookmarked,
    toggle,
    list: Array.from(bookmarks),
    count: bookmarks.size,
    mounted,
  };
}
