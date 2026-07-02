import { describe, it, expect } from "vitest";
import { wordCount, canAlign, rangeBounds, subVerseLoopDecision } from "@/lib/follow-along";
import type { WordSegment } from "@/lib/audio-api";

// NEW unit test for the follow-along pure functions. verify-follow-along.mjs only
// presence-asserts these; this exercises the real arithmetic. These are pure - no
// DOM, no Audio element, no component render (behavioral follow-along is Phase 3).
// A WordSegment is [startWordIdx, endWordIdxExcl, startMs, endMs]; segments are
// 0-based contiguous (s[i][0] === i, s[i][1] === i + 1).
const segments: WordSegment[] = [
  [0, 1, 0, 100],
  [1, 2, 100, 250],
  [2, 3, 250, 400],
];

describe("wordCount", () => {
  it("is the segment count, zero for an empty array", () => {
    expect(wordCount([])).toBe(0);
    expect(wordCount(segments)).toBe(3);
  });
});

describe("canAlign - the silent-fallback gate", () => {
  it("is true only when the segment count equals the visual word count", () => {
    expect(canAlign(3, 3)).toBe(true);
  });

  it("is false on any mismatch or when there are no segments", () => {
    expect(canAlign(3, 4)).toBe(false); // fewer visual words than segments
    expect(canAlign(4, 3)).toBe(false); // more segments than visual words
    expect(canAlign(0, 0)).toBe(false); // no segments -> no highlight
  });
});

describe("rangeBounds", () => {
  it("returns the low word's startMs and the high word's endMs, normalizing a reversed range", () => {
    expect(rangeBounds(segments, 0, 2)).toEqual({ startMs: 0, endMs: 400 });
    expect(rangeBounds(segments, 2, 0)).toEqual({ startMs: 0, endMs: 400 });
    expect(rangeBounds(segments, 1, 1)).toEqual({ startMs: 100, endMs: 250 });
  });

  it("returns null for empty segments or an out-of-range index", () => {
    expect(rangeBounds([], 0, 0)).toBeNull();
    expect(rangeBounds(segments, -1, 1)).toBeNull();
    expect(rangeBounds(segments, 0, 3)).toBeNull(); // hi >= length
  });
});

describe("subVerseLoopDecision", () => {
  const loop = { startMs: 100, endMs: 400, count: 3, done: 0 };

  it("keeps playing before the range end", () => {
    expect(subVerseLoopDecision(loop, 200)).toEqual({ kind: "playing" });
  });

  it("seeks back to the start when a pass ends and more passes remain", () => {
    expect(subVerseLoopDecision(loop, 400)).toEqual({ kind: "loop", seekMs: 100 });
    expect(subVerseLoopDecision(loop, 500)).toEqual({ kind: "loop", seekMs: 100 });
  });

  it("stops once the final pass ends", () => {
    expect(subVerseLoopDecision({ ...loop, done: 2 }, 400)).toEqual({ kind: "stop" });
  });

  it("treats a degenerate count (<= 0) as a single pass that stops at the end", () => {
    expect(subVerseLoopDecision({ startMs: 100, endMs: 400, count: 0, done: 0 }, 400)).toEqual({ kind: "stop" });
    expect(subVerseLoopDecision({ startMs: 100, endMs: 400, count: 1, done: 0 }, 400)).toEqual({ kind: "stop" });
  });

  it("stops immediately on an empty or inverted range so the loop can never run forever", () => {
    expect(subVerseLoopDecision({ startMs: 100, endMs: 100, count: 5, done: 0 }, 50)).toEqual({ kind: "stop" });
    expect(subVerseLoopDecision({ startMs: 100, endMs: 50, count: 5, done: 0 }, 200)).toEqual({ kind: "stop" });
  });
});
