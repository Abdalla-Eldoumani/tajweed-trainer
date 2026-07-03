import { describe, it, expect } from "vitest";
import { classifyVerse, composeDailyQueue } from "@/lib/murajaah-queue";
import type { Sm2State } from "@/lib/types";

// The REV-01 / REV-02 daily-queue matrix. Every case asserts against the REAL
// murajaah-queue exports — the expected order, counts, newAllowed, newDue, and
// dueTotal are written out literally and are never re-derived from the functions
// under test. classifyVerse buckets a verse from its Sm2State; composeDailyQueue
// surfaces every due recent + consolidated verse uncapped (REV-02) and caps only
// the NEW tail at newVerseCap minus introduced-today (REV-01). Verse keys are
// synthetic "s:a" placeholders, never authored Quran content.
//
// MASTERED_INTERVAL_DAYS is 21 (the SM-2 mature line, from recall-scheduler.ts):
// intervalDays 20 is still "recent", 21 crosses into "consolidated".

// Fill a full Sm2State from the fields a case cares about (classifyVerse only
// reads repetitions + intervalDays); the rest are neutral defaults.
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

describe("classifyVerse - the new / recent / consolidated buckets", () => {
  it("no entry is NEW", () => {
    expect(classifyVerse(undefined)).toBe("new");
  });

  it("repetitions 0 is NEW even with a large interval (reps 0 wins)", () => {
    expect(classifyVerse(sm2({ repetitions: 0, intervalDays: 99 }))).toBe("new");
  });

  it("repetitions > 0 with intervalDays 20 is RECENT (below the mature line)", () => {
    expect(classifyVerse(sm2({ repetitions: 3, intervalDays: 20 }))).toBe("recent");
  });

  it("intervalDays 21 is CONSOLIDATED (>= MASTERED_INTERVAL_DAYS boundary)", () => {
    expect(classifyVerse(sm2({ repetitions: 3, intervalDays: 21 }))).toBe("consolidated");
  });

  it("intervalDays 22 is CONSOLIDATED (past the boundary)", () => {
    expect(classifyVerse(sm2({ repetitions: 3, intervalDays: 22 }))).toBe("consolidated");
  });
});

// The main fixture: an interleaved dueKeys list holding 2 due RECENT, 2 due
// CONSOLIDATED, and 7 due NEW, so a passing order also proves within-class order
// is preserved from a shuffled input. 4:1 carries an explicit repetitions-0 entry
// (a lapsed-then-reset verse) to prove reps 0 outranks its inflated interval; the
// remaining new keys (4:2..4:7) have no entry at all.
const reviews: Record<string, Sm2State> = {
  "2:1": sm2({ repetitions: 3, intervalDays: 10 }), // recent
  "2:2": sm2({ repetitions: 2, intervalDays: 20 }), // recent (20 < 21)
  "3:1": sm2({ repetitions: 5, intervalDays: 30 }), // consolidated
  "3:2": sm2({ repetitions: 4, intervalDays: 21 }), // consolidated (boundary)
  "4:1": sm2({ repetitions: 0, intervalDays: 99 }), // new (reps 0 beats interval)
  // 4:2..4:7 intentionally absent -> undefined -> new
};

// Interleaved so grouping is a real assertion, not an artifact of input order.
const dueKeys = ["4:1", "2:1", "3:1", "4:2", "2:2", "3:2", "4:3", "4:4", "4:5", "4:6", "4:7"];

describe("composeDailyQueue - REV-01 NEW-tail cap over REV-02 uncapped due", () => {
  it("caps only the NEW tail at 5, surfaces all recent + consolidated (cap 5, introduced 0)", () => {
    const result = composeDailyQueue({
      dueKeys,
      reviews,
      newVersesIntroducedToday: 0,
      newVerseCap: 5,
    });
    // recent (dueKeys order) + consolidated (dueKeys order) + first 5 new (dueKeys order).
    expect(result.order).toEqual([
      "2:1",
      "2:2",
      "3:1",
      "3:2",
      "4:1",
      "4:2",
      "4:3",
      "4:4",
      "4:5",
    ]);
    expect(result.order).toHaveLength(9);
    expect(result.counts).toEqual({ new: 7, recent: 2, consolidated: 2 });
    expect(result.newDue).toBe(7);
    expect(result.newAllowed).toBe(5);
    expect(result.dueTotal).toBe(11);
  });

  it("REV-02: every due recent + consolidated is in order regardless of the cap", () => {
    // Cap 0 -> no NEW may enter, but all recent + consolidated still appear.
    const result = composeDailyQueue({
      dueKeys,
      reviews,
      newVersesIntroducedToday: 0,
      newVerseCap: 0,
    });
    expect(result.order).toEqual(["2:1", "2:2", "3:1", "3:2"]);
    expect(result.newAllowed).toBe(0);
    for (const key of ["2:1", "2:2", "3:1", "3:2"]) {
      expect(result.order).toContain(key);
    }
    // Counts stay the honest per-class due totals even when the NEW tail is trimmed.
    expect(result.counts).toEqual({ new: 7, recent: 2, consolidated: 2 });
    expect(result.newDue).toBe(7);
    expect(result.dueTotal).toBe(11);
  });

  it("cap boundary: introduced === cap -> newAllowed 0, no NEW, recent + consolidated remain", () => {
    const result = composeDailyQueue({
      dueKeys,
      reviews,
      newVersesIntroducedToday: 5,
      newVerseCap: 5,
    });
    expect(result.newAllowed).toBe(0);
    expect(result.order).toEqual(["2:1", "2:2", "3:1", "3:2"]);
    expect(result.order.some((k) => k.startsWith("4:"))).toBe(false);
    expect(result.counts).toEqual({ new: 7, recent: 2, consolidated: 2 });
    expect(result.dueTotal).toBe(11);
  });

  it("partial remaining: introduced 3, cap 5, newDue 1 -> newAllowed min(1, 2) === 1", () => {
    // A small fixture with exactly one due NEW verse.
    const smallReviews: Record<string, Sm2State> = {
      "2:1": sm2({ repetitions: 3, intervalDays: 10 }), // recent
      "3:1": sm2({ repetitions: 5, intervalDays: 30 }), // consolidated
      // 4:1 absent -> new
    };
    const result = composeDailyQueue({
      dueKeys: ["2:1", "3:1", "4:1"],
      reviews: smallReviews,
      newVersesIntroducedToday: 3,
      newVerseCap: 5,
    });
    expect(result.newDue).toBe(1);
    expect(result.newAllowed).toBe(1);
    expect(result.order).toEqual(["2:1", "3:1", "4:1"]);
    expect(result.counts).toEqual({ new: 1, recent: 1, consolidated: 1 });
    expect(result.dueTotal).toBe(3);
  });

  it("introduced past the cap clamps newAllowed to 0 (never negative)", () => {
    const result = composeDailyQueue({
      dueKeys,
      reviews,
      newVersesIntroducedToday: 8,
      newVerseCap: 5,
    });
    expect(result.newAllowed).toBe(0);
    expect(result.order.some((k) => k.startsWith("4:"))).toBe(false);
  });

  it("dueTotal always equals dueKeys.length", () => {
    expect(
      composeDailyQueue({ dueKeys, reviews, newVersesIntroducedToday: 0, newVerseCap: 5 }).dueTotal,
    ).toBe(dueKeys.length);
    expect(
      composeDailyQueue({ dueKeys: [], reviews, newVersesIntroducedToday: 0, newVerseCap: 5 })
        .dueTotal,
    ).toBe(0);
  });

  it("an empty due set yields an empty queue and zeroed counts", () => {
    const result = composeDailyQueue({
      dueKeys: [],
      reviews,
      newVersesIntroducedToday: 0,
      newVerseCap: 5,
    });
    expect(result.order).toEqual([]);
    expect(result.counts).toEqual({ new: 0, recent: 0, consolidated: 0 });
    expect(result.newDue).toBe(0);
    expect(result.newAllowed).toBe(0);
    expect(result.dueTotal).toBe(0);
  });

  it("is deterministic: the same input yields the same order (no Date.now / Math.random)", () => {
    const params = { dueKeys, reviews, newVersesIntroducedToday: 0, newVerseCap: 5 } as const;
    const a = composeDailyQueue({ ...params });
    const b = composeDailyQueue({ ...params });
    expect(a.order).toEqual(b.order);
  });
});
