"use client";

import { useState, useEffect, useCallback } from "react";
import { getProgress, setVerseNote } from "@/lib/storage";
import { subscribeProgressChanged } from "@/lib/progress-events";

// The learner's own private per-verse notes ("surah:ayah" -> text). Local-only,
// never transmitted, never religious content (the user's own words). Empty
// initial state for SSR/CSR parity; the effect seeds from storage on mount.
//
// Unlike the single-writer hooks (bookmarks, memorization), notes are written in
// the reading-depth panel but READ in two places at once, that panel's editor
// and the per-verse details control's "has a note" dot live in different
// component trees. So this hook subscribes to the progress change bus and
// re-reads the map on every write, keeping the dot and the editor in lockstep
// without prop-drilling.
export function useVerseNotes() {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setNotes(getProgress().verseNotes);
    setMounted(true);
    return subscribeProgressChanged(() => setNotes(getProgress().verseNotes));
  }, []);

  const getNote = useCallback((verseKey: string) => notes[verseKey] ?? "", [notes]);
  const hasNote = useCallback(
    (verseKey: string) => (notes[verseKey] ?? "").length > 0,
    [notes],
  );

  // Write through the storage funnel (validates the key, trims, caps, and drops
  // an empty note). The change bus then re-seeds `notes` for this hook and every
  // other mounted consumer, so no local optimistic update is needed.
  const setNote = useCallback((verseKey: string, text: string) => {
    setVerseNote(verseKey, text);
  }, []);

  return { notes, getNote, hasNote, setNote, mounted };
}
