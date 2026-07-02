import { describe, it, expect } from "vitest";
import {
  gradeRecall,
  previewIntervals,
  migrateLeitnerToSm2,
  MASTERED_INTERVAL_DAYS,
} from "@/lib/recall-scheduler";
import type { RecallGrade, ReviewState, Sm2State } from "@/lib/types";

// Real-import coverage for the pure SM-2 recall scheduler. Every expected value
// is pinned from 04-RESEARCH.md's worked tables (updated-EF' ordering). The
// scheduler is pure, so these call the REAL exports directly.

// Local-noon fixture keeps toIsoDate (computed in local time by the source)
// stable across timezones; addDays never crosses a day boundary here. Mirrors
// spaced-repetition.test.ts.
const now = new Date(2026, 5, 1, 12, 0, 0); // 2026-06-01

// The lib's date derivation, reproduced locally so the tests derive expected due
// dates rather than hardcoding raw strings for modifier-scaled cases.
function isoAddDays(d: Date, days: number): string {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next.toLocaleDateString("en-CA");
}

const sm2 = (over: Partial<Sm2State> = {}): Sm2State => ({
  repetitions: 0,
  easeFactor: 2.5,
  intervalDays: 1,
  nextDueDate: "",
  lastReviewedDate: "",
  timesSeen: 0,
  timesCorrect: 0,
  lapses: 0,
  ...over,
});

const GRADES: RecallGrade[] = ["again", "hard", "good", "easy"];

describe("gradeRecall - new verse (prev undefined)", () => {
  it("again resets reps, penalizes EF -0.32, counts a lapse not a correct", () => {
    const s = gradeRecall(undefined, "again", now);
    expect(s.repetitions).toBe(0);
    expect(s.easeFactor).toBeCloseTo(2.18, 5);
    expect(s.intervalDays).toBe(1);
    expect(s.nextDueDate).toBe("2026-06-02");
    expect(s.lastReviewedDate).toBe("2026-06-01");
    expect(s.timesSeen).toBe(1);
    expect(s.timesCorrect).toBe(0);
    expect(s.lapses).toBe(1);
  });

  it("hard -> EF 2.36, reps 1, interval 1, one correct", () => {
    const s = gradeRecall(undefined, "hard", now);
    expect(s.repetitions).toBe(1);
    expect(s.easeFactor).toBeCloseTo(2.36, 5);
    expect(s.intervalDays).toBe(1);
    expect(s.timesCorrect).toBe(1);
    expect(s.lapses).toBe(0);
  });

  it("good -> EF 2.50, reps 1, interval 1", () => {
    const s = gradeRecall(undefined, "good", now);
    expect(s.repetitions).toBe(1);
    expect(s.easeFactor).toBeCloseTo(2.5, 5);
    expect(s.intervalDays).toBe(1);
    expect(s.timesCorrect).toBe(1);
  });

  it("easy -> EF 2.60, reps 1, interval 1", () => {
    const s = gradeRecall(undefined, "easy", now);
    expect(s.repetitions).toBe(1);
    expect(s.easeFactor).toBeCloseTo(2.6, 5);
    expect(s.intervalDays).toBe(1);
  });

  it("every passing grade's first interval is 1 day (classic SM-2, no graduating interval)", () => {
    for (const g of ["hard", "good", "easy"] as RecallGrade[]) {
      expect(gradeRecall(undefined, g, now).intervalDays).toBe(1);
    }
    for (const g of GRADES) {
      expect(gradeRecall(undefined, g, now).timesSeen).toBe(1);
    }
  });
});

describe("gradeRecall - matured verse (reps 4, EF 2.5, interval 30)", () => {
  const matured = sm2({
    repetitions: 4,
    easeFactor: 2.5,
    intervalDays: 30,
    timesSeen: 8,
    timesCorrect: 7,
    lapses: 0,
  });

  it("again -> interval 1, EF 2.18, reps 0, lapse++ and correct unchanged at 7", () => {
    const s = gradeRecall(matured, "again", now);
    expect(s.intervalDays).toBe(1);
    expect(s.easeFactor).toBeCloseTo(2.18, 5);
    expect(s.repetitions).toBe(0);
    expect(s.timesCorrect).toBe(7);
    expect(s.timesSeen).toBe(9);
    expect(s.lapses).toBe(1);
  });

  it("hard -> round(30 x 2.36)=71, EF 2.36, reps 5", () => {
    const s = gradeRecall(matured, "hard", now);
    expect(s.intervalDays).toBe(71);
    expect(s.easeFactor).toBeCloseTo(2.36, 5);
    expect(s.repetitions).toBe(5);
    expect(s.timesCorrect).toBe(8);
    expect(s.lapses).toBe(0);
  });

  it("good -> round(30 x 2.50)=75, EF 2.50, reps 5", () => {
    const s = gradeRecall(matured, "good", now);
    expect(s.intervalDays).toBe(75);
    expect(s.easeFactor).toBeCloseTo(2.5, 5);
    expect(s.repetitions).toBe(5);
  });

  it("easy -> round(30 x 2.60)=78, EF 2.60, reps 5", () => {
    const s = gradeRecall(matured, "easy", now);
    expect(s.intervalDays).toBe(78);
    expect(s.easeFactor).toBeCloseTo(2.6, 5);
    expect(s.repetitions).toBe(5);
  });

  it("the four passing intervals are distinct and monotonic (again 1 < hard 71 < good 75 < easy 78)", () => {
    const again = gradeRecall(matured, "again", now).intervalDays;
    const hard = gradeRecall(matured, "hard", now).intervalDays;
    const good = gradeRecall(matured, "good", now).intervalDays;
    const easy = gradeRecall(matured, "easy", now).intervalDays;
    expect(again).toBeLessThan(hard);
    expect(hard).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
  });
});

describe("gradeRecall - lapsed verse (reps 0, EF 2.18, interval 1) - EF carries forward", () => {
  const lapsed = sm2({ repetitions: 0, easeFactor: 2.18, intervalDays: 1 });

  it("again -> EF 1.86, interval 1, reps 0", () => {
    const s = gradeRecall(lapsed, "again", now);
    expect(s.easeFactor).toBeCloseTo(1.86, 5);
    expect(s.intervalDays).toBe(1);
    expect(s.repetitions).toBe(0);
  });

  it("hard -> EF 2.04, interval 1, reps 1 (not reset to 2.5)", () => {
    const s = gradeRecall(lapsed, "hard", now);
    expect(s.easeFactor).toBeCloseTo(2.04, 5);
    expect(s.intervalDays).toBe(1);
    expect(s.repetitions).toBe(1);
  });

  it("good -> EF 2.18, interval 1, reps 1", () => {
    const s = gradeRecall(lapsed, "good", now);
    expect(s.easeFactor).toBeCloseTo(2.18, 5);
    expect(s.repetitions).toBe(1);
  });

  it("easy -> EF 2.28, interval 1, reps 1", () => {
    const s = gradeRecall(lapsed, "easy", now);
    expect(s.easeFactor).toBeCloseTo(2.28, 5);
    expect(s.repetitions).toBe(1);
  });
});

describe("gradeRecall - EF floor at 1.3", () => {
  it("from EF 1.5, hard -> 1.36 (above floor)", () => {
    const s = gradeRecall(sm2({ easeFactor: 1.5, repetitions: 3, intervalDays: 10 }), "hard", now);
    expect(s.easeFactor).toBeCloseTo(1.36, 5);
  });

  it("from EF 1.36, hard -> clamped to 1.30 (not 1.22)", () => {
    const s = gradeRecall(sm2({ easeFactor: 1.36, repetitions: 3, intervalDays: 10 }), "hard", now);
    expect(s.easeFactor).toBe(1.3);
  });

  it("from EF 1.5, again -> clamped to 1.30 (not 1.18)", () => {
    const s = gradeRecall(sm2({ easeFactor: 1.5, repetitions: 3 }), "again", now);
    expect(s.easeFactor).toBe(1.3);
  });
});

describe("gradeRecall - Math.round intervals (not floor/ceil)", () => {
  it("prev interval 3, good -> round(3 x 2.5)=round(7.5)=8 (floor would give 7)", () => {
    const s = gradeRecall(sm2({ repetitions: 2, easeFactor: 2.5, intervalDays: 3 }), "good", now);
    expect(s.intervalDays).toBe(8);
  });

  it("prev interval 30, hard -> round(30 x 2.36)=round(70.8)=71 (floor would give 70)", () => {
    const s = gradeRecall(sm2({ repetitions: 4, easeFactor: 2.5, intervalDays: 30 }), "hard", now);
    expect(s.intervalDays).toBe(71);
  });

  it("caps the base interval at MAX_INTERVAL (36500)", () => {
    const huge = sm2({ repetitions: 5, easeFactor: 2.5, intervalDays: 20000 });
    expect(gradeRecall(huge, "easy", now).intervalDays).toBe(36500); // round(20000 x 2.6)=52000 -> capped
  });
});

describe("gradeRecall - the 1 -> 6 jump on the second success", () => {
  it("a new verse graded good twice lands on interval 6, not 3", () => {
    const first = gradeRecall(undefined, "good", now);
    expect(first.repetitions).toBe(1);
    expect(first.intervalDays).toBe(1);
    const second = gradeRecall(first, "good", now);
    expect(second.repetitions).toBe(2);
    expect(second.intervalDays).toBe(6);
  });
});

describe("gradeRecall - balanced modifier scales only the due date", () => {
  const matured = sm2({ repetitions: 4, easeFactor: 2.5, intervalDays: 30 });

  it("modifier 0.5/1.0/2.0 keep intervalDays 75 and EF 2.50; only the due date changes", () => {
    for (const mod of [0.5, 1.0, 2.0]) {
      const s = gradeRecall(matured, "good", now, mod);
      expect(s.intervalDays).toBe(75);
      expect(s.easeFactor).toBeCloseTo(2.5, 5);
    }
  });

  it("effective interval is 38/75/150 at 0.5/1.0/2.0", () => {
    expect(gradeRecall(matured, "good", now, 0.5).nextDueDate).toBe(isoAddDays(now, 38));
    expect(gradeRecall(matured, "good", now, 1.0).nextDueDate).toBe(isoAddDays(now, 75));
    expect(gradeRecall(matured, "good", now, 2.0).nextDueDate).toBe(isoAddDays(now, 150));
  });

  it("a non-finite modifier is guarded to 1.0 (never NaN a due date)", () => {
    expect(gradeRecall(matured, "good", now, NaN).nextDueDate).toBe(isoAddDays(now, 75));
    expect(gradeRecall(matured, "good", now, Infinity).nextDueDate).toBe(isoAddDays(now, 75));
    expect(previewIntervals(matured, NaN).good).toBe(75);
  });

  it("the effective interval never drops below 1 (a tiny modifier still yields >= 1 day)", () => {
    // base 1 x 0.4 -> round(0.4)=0 -> max(1, 0) = 1
    expect(gradeRecall(undefined, "good", now, 0.4).nextDueDate).toBe(isoAddDays(now, 1));
  });

  it("defaults to modifier 1.0 when omitted", () => {
    const g = gradeRecall(matured, "good");
    expect(g.intervalDays).toBe(75);
    expect(previewIntervals(matured).good).toBe(75);
  });
});

describe("previewIntervals - equals what grading would produce", () => {
  const matured = sm2({ repetitions: 4, easeFactor: 2.5, intervalDays: 30 });

  it("matured at modifier 1.0 -> { again:1, hard:71, good:75, easy:78 }", () => {
    expect(previewIntervals(matured, 1.0)).toEqual({ again: 1, hard: 71, good: 75, easy: 78 });
  });

  it("each preview equals the effective interval gradeRecall applies for that grade", () => {
    for (const mod of [0.5, 1.0, 2.0]) {
      const preview = previewIntervals(matured, mod);
      for (const g of GRADES) {
        expect(gradeRecall(matured, g, now, mod).nextDueDate).toBe(isoAddDays(now, preview[g]));
      }
    }
  });
});

describe("migrateLeitnerToSm2 - lossless box 1..5 -> SM-2", () => {
  const legacy = (box: ReviewState["box"], over: Partial<ReviewState> = {}): ReviewState => ({
    box,
    nextDueDate: "2026-09-01",
    lastSeenDate: "2026-06-01",
    timesSeen: 8,
    timesCorrect: 7,
    ...over,
  });

  const EXPECTED_INTERVAL: Record<ReviewState["box"], number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

  it("maps reps=box, EF 2.5, intervalDays=Leitner, preserving dates/counts, lapses 0", () => {
    for (const box of [1, 2, 3, 4, 5] as ReviewState["box"][]) {
      const s = migrateLeitnerToSm2(legacy(box));
      expect(s.repetitions).toBe(box);
      expect(s.easeFactor).toBe(2.5);
      expect(s.intervalDays).toBe(EXPECTED_INTERVAL[box]);
      expect(s.nextDueDate).toBe("2026-09-01"); // verbatim - never changes WHEN it's due
      expect(s.lastReviewedDate).toBe("2026-06-01"); // from lastSeenDate
      expect(s.timesSeen).toBe(8);
      expect(s.timesCorrect).toBe(7);
      expect(s.lapses).toBe(0);
    }
  });

  it("is deterministic - the same input migrates to a deep-equal state", () => {
    const input = legacy(3);
    expect(migrateLeitnerToSm2(input)).toEqual(migrateLeitnerToSm2(input));
  });

  it("box-5 does not regress: next good -> 75, next hard -> 71 (both > 30)", () => {
    const migrated5 = migrateLeitnerToSm2(legacy(5));
    expect(gradeRecall(migrated5, "good", now).intervalDays).toBe(75);
    expect(gradeRecall(migrated5, "hard", now).intervalDays).toBe(71);
  });

  it("box-5 next again resets to 1 (a genuine failure)", () => {
    const migrated5 = migrateLeitnerToSm2(legacy(5));
    expect(gradeRecall(migrated5, "again", now).intervalDays).toBe(1);
  });
});

describe("MASTERED_INTERVAL_DAYS", () => {
  it("is 21 (the SRS-standard mature-card line)", () => {
    expect(MASTERED_INTERVAL_DAYS).toBe(21);
  });
});
