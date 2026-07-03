import { describe, it, expect } from "vitest";
import {
  nextStateForAnswer,
  getDueQuestionIds,
  getReviewStats,
  getDueFromUniverse,
} from "@/lib/spaced-repetition";
import type { ReviewState } from "@/lib/types";

// Real-import coverage for the Leitner scheduler. spaced-repetition.ts
// value-imports ./storage, so it could not load under bare Node; under jsdom it
// loads and these call the REAL exports. The load-bearing case is
// getDueFromUniverse treating a verse with no review entry as due (the same rule
// the memorization review depends on). None of the box or due math is re-derived.

// Local-noon dates keep toIsoDate (computed in local time by the source) stable
// across timezones; the day boundary is never crossed by addDays here.
const answerNow = new Date(2026, 5, 1, 12, 0, 0); // 2026-06-01
const dueNow = new Date(2026, 5, 15, 12, 0, 0); // 2026-06-15
const TODAY = "2026-06-15";
const PAST = "2020-01-01";
const FUTURE = "2999-01-01";

const rev = (box: ReviewState["box"], nextDueDate: string): ReviewState => ({
  box,
  nextDueDate,
  lastSeenDate: "",
  timesSeen: 1,
  timesCorrect: 1,
});

describe("nextStateForAnswer - box transitions", () => {
  it("a first correct answer promotes to box 2 and counts the review", () => {
    const s = nextStateForAnswer(undefined, true, answerNow);
    expect(s.box).toBe(2);
    expect(s.timesSeen).toBe(1);
    expect(s.timesCorrect).toBe(1);
    expect(s.lastSeenDate).toBe("2026-06-01");
    expect(s.nextDueDate).toBe("2026-06-04"); // box 2 interval is 3 days
  });

  it("a correct answer at box 5 clamps at box 5", () => {
    const s = nextStateForAnswer(rev(5, PAST), true, answerNow);
    expect(s.box).toBe(5);
    expect(s.timesSeen).toBe(2);
    expect(s.nextDueDate).toBe("2026-07-01"); // box 5 interval is 30 days
  });

  it("a wrong answer resets to box 1 and does not count as correct", () => {
    const s = nextStateForAnswer(rev(3, FUTURE), false, answerNow);
    expect(s.box).toBe(1);
    expect(s.timesSeen).toBe(2);
    expect(s.timesCorrect).toBe(1); // unchanged: the answer was wrong
    expect(s.nextDueDate).toBe("2026-06-02"); // box 1 interval is 1 day
  });
});

describe("getDueQuestionIds - filters by nextDueDate <= today", () => {
  const reviews: Record<string, ReviewState> = {
    past: rev(3, PAST),
    today: rev(2, TODAY),
    future: rev(4, FUTURE),
    empty: rev(1, ""),
  };

  it("includes past-due, due-today, and empty-date ids", () => {
    const due = new Set(getDueQuestionIds(reviews, dueNow));
    expect(due.has("past")).toBe(true);
    expect(due.has("today")).toBe(true);
    expect(due.has("empty")).toBe(true);
  });

  it("excludes future-dated ids", () => {
    const due = getDueQuestionIds(reviews, dueNow);
    expect(due).not.toContain("future");
  });
});

describe("getReviewStats - { total, mastered, due }", () => {
  it("counts every entry, box-5 as mastered, and past/empty as due", () => {
    const reviews: Record<string, ReviewState> = {
      a: rev(5, PAST), // mastered AND due
      b: rev(5, FUTURE), // mastered, not due
      c: rev(2, TODAY), // due
      d: rev(1, ""), // due
    };
    expect(getReviewStats(reviews, dueNow)).toEqual({
      total: 4,
      mastered: 2,
      due: 3,
    });
  });
});

describe("getDueFromUniverse - a no-entry id is due immediately", () => {
  it("surfaces a universe id that has no review state", () => {
    const reviews: Record<string, ReviewState> = {
      "1:1": rev(4, FUTURE), // not due
      "1:2": rev(2, TODAY), // due today
      // "1:3" has no entry at all -> due
    };
    const due = getDueFromUniverse(["1:1", "1:2", "1:3"], reviews, dueNow);
    expect(due).toContain("1:3");
    expect(due).toContain("1:2");
    expect(due).not.toContain("1:1");
  });
});
