import { describe, it, expect } from "vitest";
import {
  versesForSurah,
  versesForRange,
  memorizedPercent,
  countInScope,
} from "@/lib/memorization-scope";

// Migrated from scripts/verify-memorization.mjs (the scope + percent +
// countInScope half). These call the REAL memorization-scope exports so a
// regression in the enumeration, the range normalization, the honest percent
// edges, or the intersection count fails the suite; none of that math is
// re-derived here (the whole point of the migration).

const TOTAL_VERSES = 6236;

describe("versesForSurah - bounded enumeration", () => {
  it("Al-Fatihah has its 7 verses, 1:1 through 1:7", () => {
    expect(versesForSurah(1)).toEqual([
      "1:1", "1:2", "1:3", "1:4", "1:5", "1:6", "1:7",
    ]);
  });

  it("the sum of every surah's verses is 6236", () => {
    let sum = 0;
    for (let s = 1; s <= 114; s++) sum += versesForSurah(s).length;
    expect(sum).toBe(TOTAL_VERSES);
  });
});

describe("versesForRange - normalize + bound", () => {
  it("normalizes a reversed range (2, 5, 2)", () => {
    expect(versesForRange(2, 5, 2)).toEqual(["2:2", "2:3", "2:4", "2:5"]);
  });

  it("bounds the end by the surah's real ayah count", () => {
    // Al-Fatihah has 7 verses; an end past the real count is pulled back to 7.
    const bounded = versesForRange(1, 5, 99);
    expect(bounded).toEqual(["1:5", "1:6", "1:7"]);
  });
});

describe("memorizedPercent - honest at the edges", () => {
  it("0 memorized reads 0%", () => {
    expect(memorizedPercent(0)).toBe(0);
  });

  it("a single memorized verse is never 0%", () => {
    expect(memorizedPercent(1)).toBeGreaterThan(0);
  });

  it("6235 of 6236 reads 99, never 100", () => {
    expect(memorizedPercent(6235)).toBe(99);
  });

  it("only a full 6236 reads 100", () => {
    expect(memorizedPercent(6236)).toBe(100);
  });
});

describe("countInScope - intersection size", () => {
  it("counts only the memorized verses inside the scope", () => {
    const memorized = new Set(["1:1", "1:2", "2:255", "3:9"]);
    // Al-Fatihah scope intersects two memorized verses; 2:255 / 3:9 are out.
    expect(countInScope(memorized, versesForSurah(1))).toBe(2);
  });

  it("is 0 when nothing in the scope is memorized", () => {
    const memorized = new Set(["2:255"]);
    expect(countInScope(memorized, versesForSurah(1))).toBe(0);
  });
});
