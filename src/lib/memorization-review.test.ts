import { describe, it, expect } from "vitest";
import { getMemorizationReviewStats } from "@/lib/memorization-review";
import type { ReviewState } from "@/lib/types";

// Migrated from scripts/verify-memorization-review.mjs. The shipped
// getMemorizationReviewStats reuses getDueFromUniverse from spaced-repetition.ts,
// which value-imports ./storage and so could not load under bare Node; under
// jsdom (storage gates on `typeof window`) it loads, so this calls the REAL
// export. The load-bearing case is landmine G: a memorized verse with no review
// entry has never been self-tested, so stats taken over the memorized UNIVERSE
// must count it as due and toward total, and a review entry for an unmemorized
// verse is ignored. The stats are never re-derived here.

// A local-noon `now` keeps toIsoDate (which the source computes in local time)
// stable across timezones; PAST/FUTURE sit far from any local date either way.
const now = new Date(2026, 5, 21, 12, 0, 0);
const PAST = "2020-01-01"; // <= today -> due
const FUTURE = "2999-01-01"; // > today -> not due

const rev = (box: ReviewState["box"], nextDueDate: string): ReviewState => ({
  box,
  nextDueDate,
  lastSeenDate: "",
  timesSeen: 1,
  timesCorrect: 1,
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

  it("mixed set: total is the memorized count, mastered is box-5, due is past + never-reviewed", () => {
    const reviews: Record<string, ReviewState> = {
      "1:1": rev(5, FUTURE), // mastered, not due
      "1:2": rev(5, PAST), // mastered AND due
      "1:3": rev(2, PAST), // due, not mastered
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

  it("all box-5 future-dated -> due 0 and mastered == total", () => {
    const reviews: Record<string, ReviewState> = {
      "2:1": rev(5, FUTURE),
      "2:2": rev(5, FUTURE),
      "2:3": rev(5, FUTURE),
    };
    const stats = getMemorizationReviewStats(["2:1", "2:2", "2:3"], reviews, now);
    expect(stats.due).toBe(0);
    expect(stats.mastered).toBe(stats.total);
    expect(stats.total).toBe(3);
  });

  it("a review entry for an unmemorized verse is ignored", () => {
    const reviews: Record<string, ReviewState> = {
      "3:1": rev(5, FUTURE),
      "9:99": rev(5, PAST), // not in the memorized set -> ignored
    };
    expect(getMemorizationReviewStats(["3:1"], reviews, now)).toEqual({
      total: 1,
      mastered: 1,
      due: 0,
    });
  });
});
