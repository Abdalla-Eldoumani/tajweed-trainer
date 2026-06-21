"use client";

import { useState, useEffect, useCallback } from "react";
import { getProgress, toggleVerseBookmark } from "@/lib/storage";
import { subscribeProgressChanged } from "@/lib/progress-events";

// Tracks bookmarked verseKeys ("surah:ayah") from the consolidated progress
// model. Empty initial state for SSR/CSR parity; the effect populates on mount.
//
// Subscribes to the progress change bus so a toggle in any instance re-renders
// every mounted consumer, keeping the in-reader bookmark control and the
// bookmarks view (separate component trees) in lockstep with no manual refresh.
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setBookmarks(new Set(getProgress().bookmarks));
    setMounted(true);
    return subscribeProgressChanged(() =>
      setBookmarks(new Set(getProgress().bookmarks)),
    );
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
