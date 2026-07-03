import { describe, it, expect } from "vitest";
import { getYounesSurahUrl } from "@/lib/mp3quran-url";

// Migrated from scripts/verify-younes.mjs (the URL half). Under Vite's "@/"
// alias the module loads with no resolve hook, so this calls the REAL
// getYounesSurahUrl. The load-bearing landmine is that the Warsh source is
// per-surah (a 3-digit file) and must never look like the 6-digit per-ayah Hafs
// path. The Hafs-isolation source-parity checks stay in the kept .mjs guard.

describe("getYounesSurahUrl", () => {
  it("surah 1 is the exact per-surah server16 Warsh URL", () => {
    expect(getYounesSurahUrl(1)).toBe(
      "https://server16.mp3quran.net/souilass/Rewayat-Warsh-A-n-Nafi/001.mp3",
    );
  });

  it("is per-surah: a 3-digit file, never a 6-digit per-ayah path", () => {
    const url = getYounesSurahUrl(1);
    expect(/\/\d{3}\.mp3$/.test(url)).toBe(true);
    expect(/\d{6}\.mp3$/.test(url)).toBe(false);
  });

  it("zero-pads the surah to three digits (93 -> 093)", () => {
    expect(getYounesSurahUrl(93).endsWith("/093.mp3")).toBe(true);
  });
});
