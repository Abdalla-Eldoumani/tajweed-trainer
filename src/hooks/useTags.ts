"use client";

import { useState, useEffect, useCallback } from "react";
import { getProgress, setTags as setStoredTags } from "@/lib/storage";
import { subscribeProgressChanged } from "@/lib/progress-events";

// The learner's own short tags per verse ("surah:ayah" -> string[]). Local-only,
// never transmitted, never religious content (the user's own labels). Empty
// initial state for SSR/CSR parity; the effect seeds from storage on mount.
//
// Mirrors useVerseNotes: tags are written from the per-verse note panel AND the
// bookmark rows and read in both the note panel and the bookmarks filter (all
// different component trees), so this hook subscribes to the progress change bus
// and re-reads the map on every write, keeping every consumer in lockstep
// without prop-drilling.
export function useTags() {
  const [tags, setTags] = useState<Record<string, string[]>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTags(getProgress().entryTags ?? {});
    setMounted(true);
    return subscribeProgressChanged(() => setTags(getProgress().entryTags ?? {}));
  }, []);

  const getTags = useCallback((verseKey: string) => tags[verseKey] ?? [], [tags]);

  // Write through the storage funnel (validates the key, trims, dedupes, and
  // caps; an empty list deletes the entry). The change bus then re-seeds `tags`
  // for this hook and every other mounted consumer, so no local optimistic
  // update is needed.
  const setTagsFor = useCallback((verseKey: string, next: string[]) => {
    setStoredTags(verseKey, next);
  }, []);

  return { tags, getTags, setTags: setTagsFor, mounted };
}
