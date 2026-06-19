// Pure verse-scope enumeration and the guarded breakdown math for the
// memorization tracker. Every list is bounded by the bundled per-surah ayah
// counts so a scope can never name a verse a surah does not have, and every
// percentage is derived from the memorized set, never stored. No React or next
// imports: the verify script and SSG import this directly. The 6236 total is
// owned by MAX_MEMORIZED in storage.ts; the `total` default below mirrors it for
// these pure call sites and is not a second source of truth.

import { ayahCountForSurah, versesForJuz } from "./navigation";
import { clampSurah, clampAyah } from "./validate";

// Re-export so consumers have one import site for every scope enumeration.
export { versesForJuz };

// Every "surah:ayah" key in a surah, 1..its real ayah count.
export function versesForSurah(surah: number): string[] {
  const s = clampSurah(surah);
  const n = ayahCountForSurah(s);
  return Array.from({ length: n }, (_, i) => `${s}:${i + 1}`);
}

// The inclusive "surah:ayah" keys for a verse range within one surah. A reversed
// range is normalized by swapping rather than read as empty, and the bounds are
// pulled back to the surah's real ayah count so a too-high end cannot invent
// verses.
export function versesForRange(surah: number, start: number, end: number): string[] {
  const s = clampSurah(surah);
  const n = ayahCountForSurah(s);
  let a = clampAyah(start);
  let b = clampAyah(end);
  if (a > b) [a, b] = [b, a];
  a = Math.min(a, n);
  b = Math.min(b, n);
  const out: string[] = [];
  for (let i = a; i <= b; i++) out.push(`${s}:${i}`);
  return out;
}

// The percent of the Quran memorized. The guards exist so the display is honest
// at the edges: a single memorized verse must not read 0%, and 6235 of 6236 must
// not read 100% — only a complete 6236 is 100%. The underlying count is always
// shown exactly beside this figure.
export function memorizedPercent(count: number, total = 6236): number {
  if (count <= 0) return 0;
  if (count >= total) return 100;
  const pct = (count / total) * 100;
  if (pct < 1) return Math.max(0.1, Math.round(pct * 10) / 10);
  const rounded = Math.round(pct);
  return rounded >= 100 ? 99 : Math.max(1, rounded);
}

// How many of a scope's verses are memorized: the size of the intersection of
// the memorized set with that scope's verse list.
export function countInScope(memorized: Set<string>, scopeVerses: string[]): number {
  let n = 0;
  for (const vk of scopeVerses) if (memorized.has(vk)) n++;
  return n;
}
