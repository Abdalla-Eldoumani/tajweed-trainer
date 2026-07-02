import { describe, it, expect } from "vitest";
import {
  JUZ_STARTS,
  versesForJuz,
  pageForJuz,
  surahForPage,
  ayahCountForSurah,
  TOTAL_JUZ,
  TOTAL_MUSHAF_PAGES,
} from "@/lib/navigation";
import surahIndex from "@/data/content/surah-index.json";

// Migrated from scripts/verify-memorization.mjs (the JUZ_STARTS + enumeration
// half), scripts/verify-navigation.mjs (the pageForJuz table), and
// scripts/verify-reading.mjs (the surahForPage monotonicity). These call the
// REAL navigation exports so a regression in the juz table, the enumeration
// walk, or the page->surah mapping fails the suite; the walk is never
// re-derived here (the whole point of the migration). The bundled surah index
// backs the gap check exactly as the source scripts did.

const index = surahIndex as Array<{ number: number; versesCount: number }>;
const TOTAL_VERSES = 6236;

// The standard Hafs 604-page Madinah mushaf juz start pages.
const STANDARD_JUZ = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182,
  201, 222, 242, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

describe("JUZ_STARTS table", () => {
  it("has exactly 30 entries", () => {
    expect(JUZ_STARTS.length).toBe(TOTAL_JUZ);
  });

  it("juz 1 starts at 1:1", () => {
    expect(JUZ_STARTS[0]).toEqual([1, 1]);
  });

  it("is strictly monotonic by surah then ayah", () => {
    for (let i = 1; i < JUZ_STARTS.length; i++) {
      const [s, a] = JUZ_STARTS[i];
      const [ps, pa] = JUZ_STARTS[i - 1];
      expect(s > ps || (s === ps && a > pa)).toBe(true);
    }
  });

  it("every juz start ayah is within its surah's real ayah count", () => {
    for (const [s, a] of JUZ_STARTS) {
      const count = ayahCountForSurah(s);
      expect(count).toBeGreaterThan(0);
      expect(a).toBeGreaterThanOrEqual(1);
      expect(a).toBeLessThanOrEqual(count);
    }
  });
});

describe("versesForJuz - full enumeration (6236 unique, 0 dupes, 0 gaps)", () => {
  const all: string[] = [];
  for (let j = 1; j <= TOTAL_JUZ; j++) all.push(...versesForJuz(j));
  const unique = new Set(all);

  it("produces exactly 6236 keys", () => {
    expect(all.length).toBe(TOTAL_VERSES);
  });

  it("has zero duplicates (6236 unique keys)", () => {
    expect(unique.size).toBe(all.length);
    expect(unique.size).toBe(TOTAL_VERSES);
  });

  it("has zero gaps against the bundled surah index", () => {
    let gaps = 0;
    for (const surah of index) {
      for (let a = 1; a <= surah.versesCount; a++) {
        if (!unique.has(`${surah.number}:${a}`)) gaps++;
      }
    }
    expect(gaps).toBe(0);
  });

  it("juz 30 ends at 114:6", () => {
    const last = versesForJuz(30);
    expect(last[last.length - 1]).toBe("114:6");
  });
});

describe("surahForPage - page->surah mapping", () => {
  it("page 1 resolves to Al-Fatihah (surah 1)", () => {
    expect(surahForPage(1)?.number).toBe(1);
  });

  it("page 604 resolves to a surah", () => {
    expect(surahForPage(TOTAL_MUSHAF_PAGES)).not.toBeNull();
  });

  it("is non-decreasing across all 604 pages", () => {
    let prev = 0;
    for (let p = 1; p <= TOTAL_MUSHAF_PAGES; p++) {
      const n = surahForPage(p)?.number ?? 0;
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });
});

describe("pageForJuz - standard mushaf start pages", () => {
  it("matches the standard 30-page juz table", () => {
    for (let juz = 1; juz <= TOTAL_JUZ; juz++) {
      expect(pageForJuz(juz)).toBe(STANDARD_JUZ[juz - 1]);
    }
  });
});
