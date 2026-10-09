// Pure seam resolution for the verse-chaining drill. A "seam" is the boundary
// between a unit and the next adjacent unit: the drill shows the TAIL (the last
// verse of the current unit) and asks the learner to recall the HEAD (the first
// verse of the next unit). The three seam types — verse, juz, page — are the
// SAME relation, head = nextVerse(tail); they differ only in which verses count
// as a tail (every verse / the last verse of a juz / the last verse of a page).
// A unit with no next unit returns null so no seam is ever fabricated (114:6,
// juz 30, and page 604 all resolve to null). Grading of the resolved head
// is done by the drill through the existing SM-2 scheduler, never here.
//
// Pure and server-safe: imports only navigation (seam-math base), memorization-
// scope (the one juz-enumeration import site), and validate (input clamping).
// No React/next/storage/DOM.

import { nextVerse, lastVerseOfPage, TOTAL_JUZ, TOTAL_MUSHAF_PAGES } from "./navigation";
import { versesForJuz } from "./memorization-scope";
import { clampSurah, clampAyah, clampJuz, clampPage } from "./validate";

export interface Seam {
  tail: string;
  head: string;
}

// The base relation. Every seam is a verse seam anchored at a specific tail:
// head = nextVerse(tail). null at 114:6 (no next verse), so no seam is invented.
export function resolveVerseSeam(surah: number, ayah: number): Seam | null {
  const head = nextVerse(surah, ayah);
  return head ? { tail: `${clampSurah(surah)}:${clampAyah(ayah)}`, head } : null;
}

// Juz seam: the tail is the last verse of juz J (reusing the memorization-scope
// enumeration), the head is nextVerse of it = the first verse of juz J+1. Juz 30
// has no next juz, so its own >= TOTAL_JUZ guard returns null before any tail is
// computed (114:6 is never handed to nextVerse here).
export function resolveJuzSeam(juz: number): Seam | null {
  const j = clampJuz(juz);
  if (j >= TOTAL_JUZ) return null; // juz 30 — no next juz
  const verses = versesForJuz(j);
  const [s, a] = verses[verses.length - 1].split(":").map(Number);
  return resolveVerseSeam(s, a);
}

// Page seam: the tail is the last verse of page P (from the offline PAGE_STARTS
// table via lastVerseOfPage), the head is nextVerse of it. Page 604 has no next
// page, so its own >= TOTAL_MUSHAF_PAGES guard returns null before any tail is
// computed. Derived independently from the juz seam: the /juzs and /verses/by_page
// conventions diverge at four juz, so a juz start is not always a page start.
export function resolvePageSeam(page: number): Seam | null {
  const p = clampPage(page);
  if (p >= TOTAL_MUSHAF_PAGES) return null; // page 604 — no next page
  const [s, a] = lastVerseOfPage(p).split(":").map(Number);
  return resolveVerseSeam(s, a);
}

// Every verse seam whose tail is a memorized verse. A memorized 114:6 yields no
// seam (resolveVerseSeam returns null and is skipped).
export function verseSeamsForMemorized(memorized: Set<string>): Seam[] {
  const out: Seam[] = [];
  for (const key of memorized) {
    const [s, a] = key.split(":").map(Number);
    const seam = resolveVerseSeam(s, a);
    if (seam) out.push(seam);
  }
  return out;
}

// Every juz seam (1..29) whose tail — the last verse of that juz — is memorized.
// Juz 30 is never enumerated (the loop stops before TOTAL_JUZ).
export function juzSeamsForMemorized(memorized: Set<string>): Seam[] {
  const out: Seam[] = [];
  for (let j = 1; j < TOTAL_JUZ; j++) {
    const seam = resolveJuzSeam(j);
    if (seam && memorized.has(seam.tail)) out.push(seam);
  }
  return out;
}

// Every page seam (1..603) whose tail — the last verse of that page — is
// memorized. Page 604 is never enumerated (the loop stops before
// TOTAL_MUSHAF_PAGES).
export function pageSeamsForMemorized(memorized: Set<string>): Seam[] {
  const out: Seam[] = [];
  for (let p = 1; p < TOTAL_MUSHAF_PAGES; p++) {
    const seam = resolvePageSeam(p);
    if (seam && memorized.has(seam.tail)) out.push(seam);
  }
  return out;
}
