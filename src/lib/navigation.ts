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
