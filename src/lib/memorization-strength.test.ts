import { describe, it, expect } from "vitest";
import {
  freshness,
  hasBeenRecalled,
  errorScore,
  hasError,
  isMastered,
  scopeStrength,
} from "@/lib/memorization-strength";
import type { Sm2State } from "@/lib/types";

// The STAT-01 / STAT-02 strength matrix. Every case asserts against the REAL
// memorization-strength exports; expected freshness / errorScore / scope
// aggregates are written out literally and never re-derived from the functions
// under test. `now` is a fixed instant so every derivation is deterministic (the
// lib takes the clock in — no Date.now). Verse keys are synthetic "s:a"
// placeholders, never authored Quran content.
//
// The clock: 2026-07-03 (local). daysBetween measures whole LOCAL days, so the
// wall-clock time within the day (09:00) never shifts a day boundary.
const NOW = new Date("2026-07-03T09:00:00");

// Fill a full Sm2State from the fields a case cares about; the rest are neutral
// defaults (mirrors the murajaah-queue.test.ts sm2 helper).
function sm2(partial: Partial<Sm2State>): Sm2State {
  return {
    repetitions: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    nextDueDate: "",
    lastReviewedDate: "",
    timesSeen: 0,
    timesCorrect: 0,
    lapses: 0,
    ...partial,
  };
}

describe("freshness - STAT-01 decay from the last recall to nextDueDate", () => {
  it("returns 0 for a verse with no entry (never recalled)", () => {
    expect(freshness(undefined, NOW)).toBe(0);
  });

  it("returns 0 for a recorded state with an empty lastReviewedDate", () => {
    expect(freshness(sm2({ lastReviewedDate: "", nextDueDate: "2026-07-13" }), NOW)).toBe(0);
  });

  it("is 1 the day of a recall due 10 days out (elapsed 0 / window 10)", () => {
    const fresh = sm2({ lastReviewedDate: "2026-07-03", nextDueDate: "2026-07-13" });
    expect(freshness(fresh, NOW)).toBe(1);
  });

  it("is ~0.5 at the window midpoint (elapsed 5 / window 10)", () => {
    const halfway = sm2({ lastReviewedDate: "2026-06-28", nextDueDate: "2026-07-08" });
    expect(freshness(halfway, NOW)).toBeCloseTo(0.5, 10);
  });

  it("is exactly 0 when now === nextDueDate (elapsed === window)", () => {
    const due = sm2({ lastReviewedDate: "2026-06-23", nextDueDate: "2026-07-03" });
    expect(freshness(due, NOW)).toBe(0);
  });

  it("clamps to 0 (never negative) past nextDueDate", () => {
    const overdue = sm2({ lastReviewedDate: "2026-06-20", nextDueDate: "2026-06-30" });
    expect(freshness(overdue, NOW)).toBe(0);
  });

  it("clamps the window to >= 1 when nextDueDate === lastReviewedDate (degenerate)", () => {
    // window = max(1, 0) = 1; the same-day recall still reads fresh (elapsed 0).
    const sameDay = sm2({ lastReviewedDate: "2026-07-03", nextDueDate: "2026-07-03" });
    expect(freshness(sameDay, NOW)).toBe(1);
    // A day later that 1-day window has fully elapsed -> 0, never negative.
    const yesterday = sm2({ lastReviewedDate: "2026-07-02", nextDueDate: "2026-07-02" });
    expect(freshness(yesterday, NOW)).toBe(0);
  });

  it("clamps the window to >= 1 when nextDueDate precedes lastReviewedDate", () => {
    // daysBetween(last, due) is negative here; max(1, ...) keeps the window at 1
    // so the result stays a valid [0, 1] number instead of dividing by a negative.
    const inverted = sm2({ lastReviewedDate: "2026-07-02", nextDueDate: "2026-07-01" });
    const value = freshness(inverted, NOW);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
    expect(value).toBe(0); // elapsed 1 over window 1
  });

  it("falls back to lastReviewedDate (due-now) when nextDueDate is empty", () => {
    // Empty nextDueDate means due-now per the Sm2State contract: window collapses
    // to 1 and a day-old recall reads red, NOT fresh.
    const dueNow = sm2({ lastReviewedDate: "2026-07-01", nextDueDate: "" });
    expect(freshness(dueNow, NOW)).toBe(0);
  });

  it("returns 0 (never NaN) for a corrupt/unparseable stored date", () => {
    // Defense-in-depth: a tampered date must not produce NaN, which would poison
    // the scope's freshness sum and render a `width: NaN%` bar.
    const corrupt = sm2({ lastReviewedDate: "not-a-date", nextDueDate: "2026-07-13" });
    const value = freshness(corrupt, NOW);
    expect(Number.isNaN(value)).toBe(false);
    expect(value).toBe(0);
  });
});

describe("hasBeenRecalled - unseen vs aged-to-red", () => {
  it("is false for no entry and for an empty lastReviewedDate", () => {
    expect(hasBeenRecalled(undefined)).toBe(false);
    expect(hasBeenRecalled(sm2({ lastReviewedDate: "" }))).toBe(false);
  });

  it("is true once a verse carries a lastReviewedDate, even aged to freshness 0", () => {
    const aged = sm2({ lastReviewedDate: "2026-06-20", nextDueDate: "2026-06-30" });
    expect(hasBeenRecalled(aged)).toBe(true);
    // freshness is 0 (overdue) yet the verse HAS been recalled -> distinct styling.
    expect(freshness(aged, NOW)).toBe(0);
  });
});

describe("errorScore / hasError - STAT-02 durable miss signal", () => {
  it("is 0 for a verse with no entry", () => {
    expect(errorScore(undefined)).toBe(0);
    expect(hasError(undefined)).toBe(false);
  });

  it("is lapses + max(0, timesSeen - timesCorrect) for a lapsed verse", () => {
    expect(errorScore(sm2({ lapses: 3, timesSeen: 5, timesCorrect: 4 }))).toBe(4);
    expect(hasError(sm2({ lapses: 3, timesSeen: 5, timesCorrect: 4 }))).toBe(true);
  });

  it("is 0 for a clean verse (no lapses, every recall correct)", () => {
    expect(errorScore(sm2({ lapses: 0, timesSeen: 5, timesCorrect: 5 }))).toBe(0);
    expect(hasError(sm2({ lapses: 0, timesSeen: 5, timesCorrect: 5 }))).toBe(false);
  });

  it("floors the miss term at 0 when timesCorrect exceeds timesSeen", () => {
    expect(errorScore(sm2({ lapses: 0, timesSeen: 3, timesCorrect: 5 }))).toBe(0);
  });

  it("counts lapses even when misses are 0", () => {
    expect(errorScore(sm2({ lapses: 2, timesSeen: 4, timesCorrect: 4 }))).toBe(2);
  });
});

describe("isMastered - the SM-2 mature line (>= MASTERED_INTERVAL_DAYS)", () => {
  it("is false for no entry", () => {
    expect(isMastered(undefined)).toBe(false);
  });

  it("is false just below the line (intervalDays 20)", () => {
    expect(isMastered(sm2({ intervalDays: 20 }))).toBe(false);
  });

  it("is true at and past the line (intervalDays 21, 22)", () => {
    expect(isMastered(sm2({ intervalDays: 21 }))).toBe(true);
    expect(isMastered(sm2({ intervalDays: 22 }))).toBe(true);
  });
});

describe("scopeStrength - one-pass scope aggregate", () => {
  // A mixed scope: one fresh (freshness 1), one overdue + lapsed (freshness 0,
  // errorScore 3), one halfway (freshness ~0.5), one with no entry at all.
  const reviews: Record<string, Sm2State> = {
    "2:1": sm2({ lastReviewedDate: "2026-07-03", nextDueDate: "2026-07-13" }),
    "2:2": sm2({
      lastReviewedDate: "2026-06-20",
      nextDueDate: "2026-06-30",
      lapses: 2,
      timesSeen: 4,
      timesCorrect: 3,
    }),
    "2:3": sm2({ lastReviewedDate: "2026-06-28", nextDueDate: "2026-07-08" }),
    // 2:4 intentionally absent -> no entry
  };

  it("aggregates count / memorized / freshness / errors over the mixed scope", () => {
    const result = scopeStrength(["2:1", "2:2", "2:3", "2:4"], reviews, NOW);
    expect(result.count).toBe(4); // scope size
    expect(result.memorized).toBe(3); // three carry a recall entry
    expect(result.avgFreshness).toBeCloseTo(0.5, 10); // (1 + 0 + 0.5) / 3
    expect(result.worstFreshness).toBe(0); // the overdue verse
    expect(result.errorTotal).toBe(3); // only 2:2 has errors
    expect(result.errorMax).toBe(3);
  });

  it("reports zeros for an all-no-entry scope (avg/worst freshness and errors 0)", () => {
    const result = scopeStrength(["9:1", "9:2"], {}, NOW);
    expect(result.count).toBe(2);
    expect(result.memorized).toBe(0);
    expect(result.avgFreshness).toBe(0);
    expect(result.worstFreshness).toBe(0);
    expect(result.errorTotal).toBe(0);
    expect(result.errorMax).toBe(0);
  });

  it("surfaces the seeded worstFreshness 1 when the only entry is fully fresh", () => {
    const result = scopeStrength(["2:1"], reviews, NOW);
    expect(result.count).toBe(1);
    expect(result.memorized).toBe(1);
    expect(result.avgFreshness).toBe(1);
    expect(result.worstFreshness).toBe(1);
    expect(result.errorTotal).toBe(0);
    expect(result.errorMax).toBe(0);
  });

  it("handles an empty scope", () => {
    const result = scopeStrength([], reviews, NOW);
    expect(result).toEqual({
      count: 0,
      memorized: 0,
      avgFreshness: 0,
      worstFreshness: 0,
      errorTotal: 0,
      errorMax: 0,
    });
  });

  it("is deterministic: the same input yields the same aggregate", () => {
    const keys = ["2:1", "2:2", "2:3", "2:4"];
    expect(scopeStrength(keys, reviews, NOW)).toEqual(scopeStrength(keys, reviews, NOW));
  });
});
