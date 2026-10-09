import { describe, it, expect } from "vitest";
import {
  resolveVerseSeam,
  resolveJuzSeam,
  resolvePageSeam,
  verseSeamsForMemorized,
  juzSeamsForMemorized,
  pageSeamsForMemorized,
} from "@/lib/verse-chaining";
import {
  JUZ_STARTS,
  nextVerse,
  pageForJuz,
  TOTAL_JUZ,
  TOTAL_MUSHAF_PAGES,
} from "@/lib/navigation";

// The seam matrix. Every case asserts against the REAL
// verse-chaining exports (seams are never re-derived here); the JUZ_STARTS /
// nextVerse / pageForJuz cross-checks come from the equally-real navigation
// exports. The three terminal nulls (114:6, juz 30, page 604) are pinned so no
// seam is ever fabricated for the last unit.

describe("resolveVerseSeam - verse seams", () => {
  it("mid-surah: 2:5 -> 2:6", () => {
    expect(resolveVerseSeam(2, 5)).toEqual({ tail: "2:5", head: "2:6" });
  });

  it("cross-surah with a preceding bismillah: 1:7 -> 2:1", () => {
    expect(resolveVerseSeam(1, 7)).toEqual({ tail: "1:7", head: "2:1" });
  });

  it("cross-surah into At-Tawbah (bismillahPre false): 8:75 -> 9:1", () => {
    expect(resolveVerseSeam(8, 75)).toEqual({ tail: "8:75", head: "9:1" });
  });

  it("returns null at 114:6, the end of the Quran (terminal)", () => {
    expect(resolveVerseSeam(114, 6)).toBeNull();
  });

  it("an over-count ayah is clamped, never producing an out-of-range tail", () => {
    // clampAyah caps at 286 and nextVerse rolls to the next surah, so the seam
    // is the real end-of-surah boundary rather than a fabricated 2:999.
    expect(resolveVerseSeam(2, 999)).toEqual({ tail: "2:286", head: "3:1" });
  });
});

describe("resolveJuzSeam - juz seams", () => {
  it("juz 1 -> juz 2: {tail:2:141, head:2:142}", () => {
    expect(resolveJuzSeam(1)).toEqual({ tail: "2:141", head: "2:142" });
  });

  it("every juz J in 1..29 resolves to a seam whose head is the first verse of juz J+1", () => {
    for (let j = 1; j < TOTAL_JUZ; j++) {
      const seam = resolveJuzSeam(j);
      expect(seam).not.toBeNull();
      const [ns, na] = JUZ_STARTS[j]; // JUZ_STARTS[j] (0-indexed) = start of juz j+1
      expect(seam!.head).toBe(`${ns}:${na}`);
    }
  });

  it("returns null for juz 30, which has no next juz (terminal)", () => {
    expect(resolveJuzSeam(30)).toBeNull();
  });
});

describe("resolvePageSeam - page seams", () => {
  it("page 1 -> page 2: {tail:1:7, head:2:1}", () => {
    expect(resolvePageSeam(1)).toEqual({ tail: "1:7", head: "2:1" });
  });

  it("every page P in 1..603 resolves to a seam whose head is nextVerse of its tail", () => {
    for (let p = 1; p < TOTAL_MUSHAF_PAGES; p++) {
      const seam = resolvePageSeam(p);
      expect(seam).not.toBeNull();
      const [ts, ta] = seam!.tail.split(":").map(Number);
      expect(seam!.head).toBe(nextVerse(ts, ta));
    }
  });

  it("returns null for page 604, which has no next page (terminal)", () => {
    expect(resolvePageSeam(TOTAL_MUSHAF_PAGES)).toBeNull();
  });
});

describe("juz seams and page seams are derived independently", () => {
  // Finding: the /juzs and /verses/by_page endpoints diverge for four juz.
  // The juz that opens a page is not always the verse the page opens with, so a
  // juz seam and a page seam are NOT the same boundary — each is derived from its
  // own table. Assert the juz seam INTO juz J differs from the page seam INTO the
  // page that opens juz J, for exactly the four divergent juz.
  const divergent = [4, 7, 11, 26];

  it.each(divergent)("juz %i: the juz seam and the opening page's seam differ", (j) => {
    const juzSeam = resolveJuzSeam(j - 1); // head = start of juz j
    const pageSeam = resolvePageSeam(pageForJuz(j) - 1); // seam into the page that opens juz j
    expect(juzSeam).not.toBeNull();
    expect(pageSeam).not.toBeNull();
    expect(juzSeam!.head).not.toBe(pageSeam!.head);
  });

  it("a non-divergent juz (juz 2) has a matching juz seam and opening-page seam", () => {
    const juzSeam = resolveJuzSeam(1); // head = start of juz 2 (2:142)
    const pageSeam = resolvePageSeam(pageForJuz(2) - 1); // seam into page 22
    expect(juzSeam!.head).toBe(pageSeam!.head);
    expect(juzSeam!.head).toBe("2:142");
  });
});

describe("verseSeamsForMemorized", () => {
  it("a memorized 114:6 yields no verse seam", () => {
    expect(verseSeamsForMemorized(new Set(["114:6"]))).toEqual([]);
  });

  it("a single memorized non-terminal verse yields its one seam", () => {
    expect(verseSeamsForMemorized(new Set(["2:5"]))).toEqual([
      { tail: "2:5", head: "2:6" },
    ]);
  });

  it("a mixed set yields one seam per non-terminal tail (114:6 skipped)", () => {
    const seams = verseSeamsForMemorized(new Set(["2:5", "114:6", "1:7"]));
    expect(seams).toHaveLength(2);
    expect(seams).toEqual(
      expect.arrayContaining([
        { tail: "2:5", head: "2:6" },
        { tail: "1:7", head: "2:1" },
      ]),
    );
  });
});

describe("juzSeamsForMemorized - tail-memorized filter", () => {
  it("includes the juz-1 seam when its tail (2:141) is memorized", () => {
    expect(juzSeamsForMemorized(new Set(["2:141"]))).toEqual([
      { tail: "2:141", head: "2:142" },
    ]);
  });

  it("excludes it when the tail is absent (a non-juz-tail verse yields no juz seam)", () => {
    expect(juzSeamsForMemorized(new Set(["2:5"]))).toEqual([]);
  });
});

describe("pageSeamsForMemorized - tail-memorized filter", () => {
  it("includes the page-1 seam when its tail (1:7) is memorized", () => {
    expect(pageSeamsForMemorized(new Set(["1:7"]))).toEqual([
      { tail: "1:7", head: "2:1" },
    ]);
  });

  it("excludes it when the tail is absent (a non-page-tail verse yields no page seam)", () => {
    expect(pageSeamsForMemorized(new Set(["1:1"]))).toEqual([]);
  });
});
