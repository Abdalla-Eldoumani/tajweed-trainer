import { describe, it, expect } from "vitest";
import { getMemorizationReviewStats } from "@/lib/memorization-review";
import type { Sm2State } from "@/lib/types";

// Migrated from scripts/verify-memorization-review.mjs. The shipped
// getMemorizationReviewStats reuses getDueFromUniverse from spaced-repetition.ts,
// which value-imports ./storage and so could not load under bare Node; under
// jsdom (storage gates on `typeof window`) it loads, so this calls the REAL
// export. The load-bearing case is landmine G: a memorized verse with no review
// entry has never been self-tested, so stats taken over the memorized UNIVERSE
// must count it as due and toward total, and a review entry for an unmemorized
// verse is ignored. The stats are never re-derived here.
//
// memorizationReviews is SM-2 (Sm2State), so the helper builds an Sm2State and
// "mastered" is intervalDays >= 21, not box === 5. A verse with no entry is due
// and counted.

// A local-noon `now` keeps toIsoDate (which the source computes in local time)
// stable across timezones; PAST/FUTURE sit far from any local date either way.
const now = new Date(2026, 5, 21, 12, 0, 0);
const PAST = "2020-01-01"; // <= today -> due
const FUTURE = "2999-01-01"; // > today -> not due

// A minimal Sm2State fixture: only intervalDays (mastered predicate) and
// nextDueDate (due predicate) are load-bearing here; the rest are neutral.
const sm2 = (intervalDays: number, nextDueDate: string): Sm2State => ({
  repetitions: 1,
  easeFactor: 2.5,
  intervalDays,
  nextDueDate,
  lastReviewedDate: "",
  timesSeen: 1,
  timesCorrect: 1,
  lapses: 0,
});

describe("getMemorizationReviewStats", () => {
  it("empty memorized set -> total 0, due 0, mastered 0", () => {
    expect(getMemorizationReviewStats([], {}, now)).toEqual({
      total: 0,
      due: 0,
      mastered: 0,
    });
  });

  it("landmine G: a never-reviewed memorized verse is due AND counted", () => {
    expect(getMemorizationReviewStats(["2:255"], {}, now)).toEqual({
      total: 1,
      due: 1,
      mastered: 0,
    });
  });

  it("mixed set: total is the memorized count, mastered is intervalDays>=21, due is past + never-reviewed", () => {
    const reviews: Record<string, Sm2State> = {
      "1:1": sm2(30, FUTURE), // mastered (30 >= 21), not due
      "1:2": sm2(30, PAST), // mastered AND due
      "1:3": sm2(3, PAST), // due, not mastered (3 < 21)
      // "1:4" has no entry -> due, not mastered
    };
    const stats = getMemorizationReviewStats(["1:1", "1:2", "1:3", "1:4"], reviews, now);
    expect(stats.total).toBe(4);
    expect(stats.mastered).toBe(2);
    expect(stats.due).toBe(3);

    // The never-reviewed verse is what pushes due from 2 to 3.
    const withoutNeverReviewed = getMemorizationReviewStats(["1:1", "1:2", "1:3"], reviews, now);
    expect(stats.due).toBe(withoutNeverReviewed.due + 1);
  });

  it("mastered is intervalDays >= 21: 20 not mastered, 21 mastered (boundary), migrated box-5 interval 30 mastered", () => {
    const reviews: Record<string, Sm2State> = {
      "1:1": sm2(20, FUTURE), // below the line
      "1:2": sm2(21, FUTURE), // exactly the line
      "1:3": sm2(30, FUTURE), // a migrated box-5 verse
    };
    const stats = getMemorizationReviewStats(["1:1", "1:2", "1:3"], reviews, now);
    expect(stats.mastered).toBe(2); // 21 and 30, not 20
    expect(getMemorizationReviewStats(["1:1"], reviews, now).mastered).toBe(0);
    expect(getMemorizationReviewStats(["1:2"], reviews, now).mastered).toBe(1);
    expect(getMemorizationReviewStats(["1:3"], reviews, now).mastered).toBe(1);
  });

  it("all mastered + future-dated -> due 0 and mastered == total", () => {
    const reviews: Record<string, Sm2State> = {
      "2:1": sm2(30, FUTURE),
      "2:2": sm2(30, FUTURE),
      "2:3": sm2(30, FUTURE),
    };
    const stats = getMemorizationReviewStats(["2:1", "2:2", "2:3"], reviews, now);
    expect(stats.due).toBe(0);
    expect(stats.mastered).toBe(stats.total);
    expect(stats.total).toBe(3);
  });

  it("a review entry for an unmemorized verse is ignored", () => {
    const reviews: Record<string, Sm2State> = {
      "3:1": sm2(30, FUTURE),
      "9:99": sm2(30, PAST), // not in the memorized set -> ignored
    };
    expect(getMemorizationReviewStats(["3:1"], reviews, now)).toEqual({
      total: 1,
      mastered: 1,
      due: 0,
    });
  });
});
