// Per-surah Warsh source for the walled-off Younes Souilass narration surface.
// Separate from the Hafs per-ayah resolver in audio-api.ts on purpose: this is a
// different narration, offered per surah only, and must never route through the
// Hafs playback path. Pure and import-free of React/next (lib rule).

import { clampSurah } from "./validate";

const YOUNES_BASE = "https://server16.mp3quran.net/souilass/Rewayat-Warsh-A-n-Nafi/";

// Build the per-surah file URL: the surah is zero-padded to three digits, e.g.
// 1 -> 001.mp3. Per-surah only (Warsh, partial coverage ~65 surahs); the caller
// gates the result through toSafeAudioUrl and degrades quietly on a 404.
export function getYounesSurahUrl(surah: number): string {
  return `${YOUNES_BASE}${String(clampSurah(surah)).padStart(3, "0")}.mp3`;
}
