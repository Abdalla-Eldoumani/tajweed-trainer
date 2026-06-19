// Mushaf navigation logic, derived entirely from the bundled surah index — no
// network. Exact page<->surah mapping plus clamped page stepping. Juz/hizb jumps
// depend on per-verse division data the API already returns on each page
// (MushafPageData.juzNumber); they are not hardcoded here so no structural
// metadata is ever guessed.

import surahIndex from "@/data/content/surah-index.json";
import type { SurahHeader } from "./types";
import { clampPage, clampSurah, clampJuz } from "./validate";

export const TOTAL_MUSHAF_PAGES = 604;
export const TOTAL_JUZ = 30;

// Start page of each juz in the standard Hafs 604-page Madinah mushaf. This is
// fixed structural pagination (the same in every printing of that mushaf), not
// Quranic text, so it is a constant here rather than fetched. Juz N starts on
// JUZ_START_PAGES[N - 1].
const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182,
  201, 222, 242, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

// First mushaf page of a juz (1..30).
export function pageForJuz(juz: number): number {
  return JUZ_START_PAGES[clampJuz(juz) - 1] ?? 1;
}

// First [surah, ayah] of each juz (1..30) in Hafs 'an 'Asim. Verified structural
// metadata, the same justification the page table above carries: fetched once
// from api.quran.com/api/v4/juzs and cross-checked by enumeration to total
// exactly 6236 verses with no gaps or duplicates (juz 30 runs to 114:6). It is a
// constant, never generated, and lives here rather than under src/data (that tree
// is frozen). scripts/verify-memorization.mjs is the guard against silent drift.
export const JUZ_STARTS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],    // Juz 1
  [2, 142],  // Juz 2
  [2, 253],  // Juz 3
  [3, 93],   // Juz 4
  [4, 24],   // Juz 5
  [4, 148],  // Juz 6
  [5, 82],   // Juz 7
  [6, 111],  // Juz 8
  [7, 88],   // Juz 9
  [8, 41],   // Juz 10
  [9, 93],   // Juz 11
  [11, 6],   // Juz 12
  [12, 53],  // Juz 13
  [15, 1],   // Juz 14
  [17, 1],   // Juz 15
  [18, 75],  // Juz 16
  [21, 1],   // Juz 17
  [23, 1],   // Juz 18
  [25, 21],  // Juz 19
  [27, 56],  // Juz 20
  [29, 46],  // Juz 21
  [33, 31],  // Juz 22
  [36, 28],  // Juz 23
  [39, 32],  // Juz 24
  [41, 47],  // Juz 25
  [46, 1],   // Juz 26
  [51, 31],  // Juz 27
  [58, 1],   // Juz 28
  [67, 1],   // Juz 29
  [78, 1],   // Juz 30  (runs to 114:6)
];

// Every "surah:ayah" key in a juz (1..30). The start is JUZ_STARTS[j-1]; the end
// is the verse just before the next juz's start, so a juz that begins mid-surah
// is handled by walking surah-by-surah and honoring each surah's real ayah count
// for the rollover. Juz 30 ends at the last verse, 114:6. Pure and server-safe.
export function versesForJuz(juz: number): string[] {
  const j = clampJuz(juz);
  const [startSurah, startAyah] = JUZ_STARTS[j - 1];
  let endSurah: number;
  let endAyah: number;
  if (j < TOTAL_JUZ) {
    const [nextSurah, nextAyah] = JUZ_STARTS[j];
    if (nextAyah === 1) {
      // The next juz starts a fresh surah, so this juz ends on the last verse of
      // the preceding surah.
      endSurah = nextSurah - 1;
      endAyah = ayahCountForSurah(nextSurah - 1);
    } else {
      endSurah = nextSurah;
      endAyah = nextAyah - 1;
    }
  } else {
    endSurah = 114;
    endAyah = 6;
  }
  const out: string[] = [];
  let s = startSurah;
  let a = startAyah;
  while (s < endSurah || (s === endSurah && a <= endAyah)) {
    out.push(`${s}:${a}`);
    a++;
    if (a > ayahCountForSurah(s)) {
      s++;
      a = 1;
    }
  }
  return out;
}

// Ayah count for a surah, from the bundled index. Used to build a continuous
// playback queue when switching the player into full-surah mode.
export function ayahCountForSurah(surah: number): number {
  const meta = INDEX.find((s) => s.number === clampSurah(surah));
  return meta ? meta.versesCount : 7;
}

// Sorted by surah number so start pages are ascending (surah order == page order).
const INDEX = (surahIndex as SurahHeader[]).slice().sort((a, b) => a.number - b.number);

// First mushaf page of a surah. Exact, from the bundled index.
export function pageForSurah(surah: number): number {
  const meta = INDEX.find((s) => s.number === clampSurah(surah));
  return meta ? meta.pages[0] : 1;
}

// The surah a mushaf page belongs to: the last surah whose start page is <= page.
export function surahForPage(page: number): SurahHeader | null {
  const p = clampPage(page);
  let found: SurahHeader | null = null;
  for (const s of INDEX) {
    if (s.pages[0] <= p) found = s;
    else break;
  }
  return found;
}

export function nextPage(page: number): number {
  return Math.min(TOTAL_MUSHAF_PAGES, clampPage(page) + 1);
}

export function prevPage(page: number): number {
  return Math.max(1, clampPage(page) - 1);
}

export function isValidPage(page: unknown): boolean {
  return typeof page === "number" && Number.isInteger(page) && page >= 1 && page <= TOTAL_MUSHAF_PAGES;
}
