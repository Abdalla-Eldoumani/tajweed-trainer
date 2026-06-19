"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { QueueItem } from "@/hooks/usePlayer";

// Multi-verse selection state for the reader. It holds two independent ways to
// build one playback queue:
//   - a hand-picked SET: an order-stable, de-duped list of verseKeys the user
//     adds one verse at a time (PLAY-04);
//   - a contiguous RANGE within one surah: a { surah, from, to } picked as a
//     start + end, normalized when reversed (PLAY-03).
// Both resolve to a QueueItem[] the surface hands to the engine (playSet /
// playRange). This hook owns ZERO audio: it never constructs `new Audio()` and
// never touches PlayerHost; playback only ever happens by the surface calling a
// usePlayer action with the resolved items.
//
// Persistence: the selection is IN-MEMORY only. It survives in-reader
// navigation because MushafReader (which provides it) stays mounted across the
// page-to-page transitions inside the reader, but it is intentionally NOT
// persisted across a full reload. If reload persistence is ever wanted it must
// go through the consolidated storage.ts sanitizer (verseKey regex + caps) with
// export/import, never an ad-hoc localStorage key (UI-SPEC B8, threat T-05-10).

const VERSE_KEY_RE = /^\d{1,3}:\d{1,3}$/;

export interface SelectionRange {
  surah: number;
  from: number;
  to: number;
}

export interface VerseSelection {
  // The hand-picked set, in the order verses were added (de-duped).
  set: string[];
  // The contiguous range, or null when none is picked.
  range: SelectionRange | null;
  // True when either a set or a range exists (drives the surface's empty fold).
  hasSelection: boolean;
  // The exact number of distinct selected verses across whichever mode is
  // active. Always exact even when the chip list is capped (UI-SPEC B5).
  count: number;
  // The keys to mark in the page: the set keys, or the range expanded to keys.
  // A Set for O(1) isSelected lookups while rendering every verse on a page.
  markedKeys: Set<string>;

  isSelected: (verseKey: string) => boolean;
  // Toggle a verse in the hand-picked set. Adding the first set verse clears any
  // active range (the two modes are mutually exclusive — one queue at a time).
  toggle: (verseKey: string) => void;
  add: (verseKey: string) => void;
  remove: (verseKey: string) => void;
  // Pick a contiguous range start + end; normalizes when end precedes start
  // (B1). A one-verse range (from === to) is kept as-is and plays like single
  // play (B2). Setting a range clears the hand-picked set.
  setRange: (surah: number, start: number, end: number) => void;
  clear: () => void;
  // The resolved queue for the engine: the set mapped to {surah,ayah}, or the
  // range expanded. Empty when nothing is selected.
  resolvedItems: () => QueueItem[];
}

function keyToItem(verseKey: string): QueueItem | null {
  if (!VERSE_KEY_RE.test(verseKey)) return null;
  const [surah, ayah] = verseKey.split(":").map(Number);
  return { surah, ayah };
}

function rangeToItems(range: SelectionRange): QueueItem[] {
  // from/to are already normalized at setRange time, but guard again so a
  // resolved queue is never empty or reversed regardless of how state was set.
  const lo = Math.min(range.from, range.to);
  const hi = Math.max(range.from, range.to);
  const items: QueueItem[] = [];
  for (let a = lo; a <= hi; a++) items.push({ surah: range.surah, ayah: a });
  return items;
}

function rangeToKeys(range: SelectionRange): string[] {
  return rangeToItems(range).map((it) => `${it.surah}:${it.ayah}`);
}

// The selection hook. Used directly by the provider in MushafReader; consumers
// (MushafPage, PlaybackSurface) read it through the context below so the page
// markers and the surface chips share one source.
export function useVerseSelectionState(): VerseSelection {
  const [set, setSet] = useState<string[]>([]);
  const [range, setRangeState] = useState<SelectionRange | null>(null);

  const add = useCallback((verseKey: string) => {
    if (!VERSE_KEY_RE.test(verseKey)) return;
    // Adding to the hand-picked set clears a range: one queue source at a time.
    setRangeState(null);
    setSet((prev) => (prev.includes(verseKey) ? prev : [...prev, verseKey]));
  }, []);

  const remove = useCallback((verseKey: string) => {
    setSet((prev) => prev.filter((k) => k !== verseKey));
  }, []);

  const toggle = useCallback((verseKey: string) => {
    if (!VERSE_KEY_RE.test(verseKey)) return;
    setRangeState(null);
    setSet((prev) => (prev.includes(verseKey) ? prev.filter((k) => k !== verseKey) : [...prev, verseKey]));
  }, []);

  const setRange = useCallback((surah: number, start: number, end: number) => {
    const s = Math.max(1, Math.floor(surah));
    const a = Math.max(1, Math.floor(start));
    const b = Math.max(1, Math.floor(end));
    const from = Math.min(a, b);
    const to = Math.max(a, b);
    // A range supersedes the hand-picked set (mutually exclusive queue source).
    setSet([]);
    setRangeState({ surah: s, from, to });
  }, []);

  const clear = useCallback(() => {
    setSet([]);
    setRangeState(null);
  }, []);

  const markedKeys = useMemo(() => {
    if (range) return new Set(rangeToKeys(range));
    return new Set(set);
  }, [set, range]);

  const isSelected = useCallback((verseKey: string) => markedKeys.has(verseKey), [markedKeys]);

  const resolvedItems = useCallback((): QueueItem[] => {
    if (range) return rangeToItems(range);
    return set.map(keyToItem).filter((it): it is QueueItem => it !== null);
  }, [set, range]);

  const hasSelection = set.length > 0 || range !== null;
  const count = markedKeys.size;

  return {
    set,
    range,
    hasSelection,
    count,
    markedKeys,
    isSelected,
    toggle,
    add,
    remove,
    setRange,
    clear,
    resolvedItems,
  };
}

// Shared context so MushafPage (markers + add control) and PlaybackSurface
// (chips + transport) read one selection. MushafReader provides it; below the
// provider every consumer sees the same state and a remove from a chip and a
// toggle from a verse marker stay in lockstep.
const VerseSelectionContext = createContext<VerseSelection | null>(null);

export const VerseSelectionProvider = VerseSelectionContext.Provider;

export function useVerseSelection(): VerseSelection {
  const ctx = useContext(VerseSelectionContext);
  if (!ctx) {
    throw new Error("useVerseSelection must be used within a VerseSelectionProvider");
  }
  return ctx;
}
