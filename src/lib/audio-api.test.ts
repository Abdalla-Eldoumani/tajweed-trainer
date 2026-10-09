import { describe, it, expect } from "vitest";
import { activeWordIndex, type WordSegment } from "@/lib/audio-api";

// Migrated from scripts/verify-word-segments.mjs. The .mjs re-implemented
// activeWordIndex locally because bare Node could not load audio-api.ts; under
// Vitest we import the REAL export so a regression in the word lookup fails the
// suite. Only the pure lookup is tested here: the network half
// (fetchSegments/fetchAudioUrl) is covered by the e2e specs, not here.

// Real captured segments: verse 1:2, reciter 12 (Al-Husary, the default), four
// words, confirmed live on 2026-06-13. Each tuple is
// [wordStartIndex, wordEndIndexExclusive, startMs, endMs].
const SAMPLE: WordSegment[] = [
  [0, 1, 250, 1060],
  [1, 2, 1070, 1950],
  [2, 3, 1960, 2660],
  [3, 4, 2670, 4360],
];

describe("word-segment fixture shape (verse 1:2, reciter 12)", () => {
  it("every entry is a 4-number tuple", () => {
    expect(SAMPLE).toHaveLength(4);
    for (const s of SAMPLE) {
      expect(s).toHaveLength(4);
      for (const n of s) expect(typeof n).toBe("number");
    }
  });

  it("word indices are 0-based and contiguous", () => {
    SAMPLE.forEach((s, i) => {
      expect(s[0]).toBe(i);
      expect(s[1]).toBe(i + 1);
    });
  });

  it("segment times are non-negative, ordered, and non-overlapping", () => {
    for (let i = 0; i < SAMPLE.length; i++) {
      const [, , start, end] = SAMPLE[i];
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeGreaterThan(start);
      if (i > 0) expect(start).toBeGreaterThanOrEqual(SAMPLE[i - 1][3]);
    }
  });
});

describe("activeWordIndex - mid-segment lookup", () => {
  const cases = [
    { ms: 690, word: 0 },
    { ms: 1470, word: 1 },
    { ms: 2280, word: 2 },
    { ms: 3070, word: 3 },
    { ms: 4359, word: 3 }, // last ms inside the final segment (end is exclusive)
  ];
  for (const c of cases) {
    it(`picks word ${c.word} at ${c.ms}ms`, () => {
      expect(activeWordIndex(SAMPLE, c.ms)).toBe(c.word);
    });
  }
});

describe("activeWordIndex - out-of-range and gap fallback", () => {
  it("landmine: returns -1 before, after, and in a gap (silent fallback)", () => {
    expect(activeWordIndex(SAMPLE, 0)).toBe(-1); // before the first word starts
    expect(activeWordIndex(SAMPLE, 200)).toBe(-1); // still in the lead-in
    expect(activeWordIndex(SAMPLE, 1065)).toBe(-1); // gap between word 0 and word 1
    expect(activeWordIndex(SAMPLE, 5000)).toBe(-1); // past the final word
  });

  it("returns -1 for empty segments", () => {
    expect(activeWordIndex([], 1000)).toBe(-1);
  });

  it("treats a segment end as exclusive (endMs itself is a miss)", () => {
    // 1060 is the exclusive end of word 0 and before word 1 starts (1070).
    expect(activeWordIndex(SAMPLE, 1060)).toBe(-1);
  });
});
