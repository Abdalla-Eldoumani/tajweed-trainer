import { describe, it, expect } from "vitest";
import {
  splitIntoChunks,
  isSplittable,
  DEFAULT_CHUNK_SIZE,
  CHUNK_SIZE_PRESETS,
} from "@/lib/verse-segments";

// The splitter matrix. Every case asserts against the REAL
// verse-segments exports — the expected ranges are written out literally and are
// never re-derived from the function under test. A chunk is an inclusive, 0-based
// word-index range into the verse's REAL words. The no-split cases (a
// one-word verse, a verse no longer than the chunk size) are pinned so the
// splitter can never fabricate a boundary the word count does not support.

describe("splitIntoChunks - the matrix", () => {
  it("(1, 4) -> a one-word verse yields a single whole-verse chunk", () => {
    expect(splitIntoChunks(1, 4)).toEqual([{ startWordIdx: 0, endWordIdx: 0 }]);
  });

  it("(4, 4) -> an exact single chunk, no split", () => {
    expect(splitIntoChunks(4, 4)).toEqual([{ startWordIdx: 0, endWordIdx: 3 }]);
  });

  it("(3, 5) -> chunkSize >= wordCount yields a single chunk", () => {
    expect(splitIntoChunks(3, 5)).toEqual([{ startWordIdx: 0, endWordIdx: 2 }]);
  });

  it("(8, 4) -> an exact multiple splits into two full chunks", () => {
    expect(splitIntoChunks(8, 4)).toEqual([
      { startWordIdx: 0, endWordIdx: 3 },
      { startWordIdx: 4, endWordIdx: 7 },
    ]);
  });

  it("(9, 4) -> the last chunk holds a remainder of one", () => {
    expect(splitIntoChunks(9, 4)).toEqual([
      { startWordIdx: 0, endWordIdx: 3 },
      { startWordIdx: 4, endWordIdx: 7 },
      { startWordIdx: 8, endWordIdx: 8 },
    ]);
  });

  it("(10, 4) -> the last chunk holds a remainder of two", () => {
    expect(splitIntoChunks(10, 4)).toEqual([
      { startWordIdx: 0, endWordIdx: 3 },
      { startWordIdx: 4, endWordIdx: 7 },
      { startWordIdx: 8, endWordIdx: 9 },
    ]);
  });

  it("(0, 4) -> an empty verse yields no chunks", () => {
    expect(splitIntoChunks(0, 4)).toEqual([]);
  });

  it("(6, 1) -> the minimum size yields six one-word chunks", () => {
    expect(splitIntoChunks(6, 1)).toEqual([
      { startWordIdx: 0, endWordIdx: 0 },
      { startWordIdx: 1, endWordIdx: 1 },
      { startWordIdx: 2, endWordIdx: 2 },
      { startWordIdx: 3, endWordIdx: 3 },
      { startWordIdx: 4, endWordIdx: 4 },
      { startWordIdx: 5, endWordIdx: 5 },
    ]);
  });

  it("(6, 0) -> a degenerate size clamps to 1 and never throws (six chunks)", () => {
    expect(splitIntoChunks(6, 0)).toEqual([
      { startWordIdx: 0, endWordIdx: 0 },
      { startWordIdx: 1, endWordIdx: 1 },
      { startWordIdx: 2, endWordIdx: 2 },
      { startWordIdx: 3, endWordIdx: 3 },
      { startWordIdx: 4, endWordIdx: 4 },
      { startWordIdx: 5, endWordIdx: 5 },
    ]);
  });

  it("(5, 3) -> a typical short verse splits into a full chunk and a remainder", () => {
    expect(splitIntoChunks(5, 3)).toEqual([
      { startWordIdx: 0, endWordIdx: 2 },
      { startWordIdx: 3, endWordIdx: 4 },
    ]);
  });
});

describe("splitIntoChunks - degenerate input is clamped, never thrown", () => {
  it("a negative chunkSize clamps to 1 (six one-word chunks)", () => {
    expect(splitIntoChunks(6, -4)).toEqual([
      { startWordIdx: 0, endWordIdx: 0 },
      { startWordIdx: 1, endWordIdx: 1 },
      { startWordIdx: 2, endWordIdx: 2 },
      { startWordIdx: 3, endWordIdx: 3 },
      { startWordIdx: 4, endWordIdx: 4 },
      { startWordIdx: 5, endWordIdx: 5 },
    ]);
  });

  it("a negative wordCount clamps to 0 and yields no chunks", () => {
    expect(splitIntoChunks(-3, 4)).toEqual([]);
  });

  it("a fractional wordCount is floored", () => {
    // 5.9 floors to 5 real words, size 3 -> [{0,2},{3,4}].
    expect(splitIntoChunks(5.9, 3)).toEqual([
      { startWordIdx: 0, endWordIdx: 2 },
      { startWordIdx: 3, endWordIdx: 4 },
    ]);
  });

  it("a fractional chunkSize is floored", () => {
    // size 3.9 floors to 3, over 5 words -> [{0,2},{3,4}].
    expect(splitIntoChunks(5, 3.9)).toEqual([
      { startWordIdx: 0, endWordIdx: 2 },
      { startWordIdx: 3, endWordIdx: 4 },
    ]);
  });

  it("does not throw on any of the degenerate inputs", () => {
    expect(() => splitIntoChunks(0, 0)).not.toThrow();
    expect(() => splitIntoChunks(-1, -1)).not.toThrow();
    expect(() => splitIntoChunks(NaN, NaN)).not.toThrow();
  });
});

describe("isSplittable - no-split messaging", () => {
  it("is false for a one-word verse (a single chunk is not a meaningful split)", () => {
    expect(isSplittable(1, 4)).toBe(false);
  });

  it("is false when the chunk size is >= the word count", () => {
    expect(isSplittable(3, 5)).toBe(false);
    expect(isSplittable(4, 4)).toBe(false);
  });

  it("is true when the word count exceeds the chunk size", () => {
    expect(isSplittable(9, 4)).toBe(true);
    expect(isSplittable(5, 3)).toBe(true);
  });

  it("is false for an empty verse (no chunks at all is not splittable)", () => {
    expect(isSplittable(0, 4)).toBe(false);
  });
});

describe("splitter constants", () => {
  it("DEFAULT_CHUNK_SIZE is 4", () => {
    expect(DEFAULT_CHUNK_SIZE).toBe(4);
  });

  it("CHUNK_SIZE_PRESETS is exactly [3, 4, 5]", () => {
    expect(CHUNK_SIZE_PRESETS).toEqual([3, 4, 5]);
  });

  it("the default chunk size is one of the presets", () => {
    expect(CHUNK_SIZE_PRESETS).toContain(DEFAULT_CHUNK_SIZE);
  });
});
