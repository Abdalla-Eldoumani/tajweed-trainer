import { describe, it, expect } from "vitest";
import { peekRemaining, wasPeeked } from "@/lib/peek-budget";

// The BLIND-03 peek-budget matrix. Every case asserts against the REAL
// peek-budget exports — the expected values are written out literally and are
// never re-derived from the function under test. `sessionPeekUsed` is a
// Record<verseKey, count>; the verse keys here are structural ASCII "surah:ayah"
// strings, not Quran content. Signatures are map-FIRST (the CONTEXT lock):
// peekRemaining(sessionPeekUsed, budget) and wasPeeked(sessionPeekUsed, verseKey).

describe("peekRemaining - distinct-key budget decrement (BLIND-03)", () => {
  it("an empty map leaves the full budget", () => {
    expect(peekRemaining({}, 3)).toBe(3);
  });

  it("one peeked verse consumes one of the budget", () => {
    expect(peekRemaining({ "1:1": 1 }, 3)).toBe(2);
  });

  it("three distinct peeked verses consume the whole budget", () => {
    expect(peekRemaining({ "1:1": 1, "1:2": 1, "1:3": 1 }, 3)).toBe(0);
  });

  it("more peeked verses than the budget never goes negative (floored at 0)", () => {
    expect(peekRemaining({ "1:1": 1, "1:2": 1, "1:3": 1, "1:4": 1 }, 3)).toBe(0);
  });

  it("counts DISTINCT keys, not the sum of counts (a tampered high count consumes only one)", () => {
    expect(peekRemaining({ "1:1": 99 }, 3)).toBe(2);
  });

  it("a zero budget is already exhausted", () => {
    expect(peekRemaining({}, 0)).toBe(0);
  });

  it("a budget of one is fully consumed by a single peek", () => {
    expect(peekRemaining({ "1:1": 1 }, 1)).toBe(0);
  });
});

describe("wasPeeked - a verse is peeked only with a stored count > 0 (BLIND-03)", () => {
  it("is true for a verse with a stored positive count", () => {
    expect(wasPeeked({ "1:1": 1 }, "1:1")).toBe(true);
  });

  it("is false for a verse not in the map", () => {
    expect(wasPeeked({ "1:1": 1 }, "1:2")).toBe(false);
  });

  it("is false against an empty map", () => {
    expect(wasPeeked({}, "1:1")).toBe(false);
  });

  it("treats a zero count as not peeked", () => {
    expect(wasPeeked({ "1:1": 0 }, "1:1")).toBe(false);
  });
});
