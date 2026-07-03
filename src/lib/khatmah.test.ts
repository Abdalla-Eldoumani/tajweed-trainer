import { describe, it, expect } from "vitest";
import { computeKhatmahPace, targetDateForDuration } from "@/lib/khatmah";
import type { KhatmahPlan } from "@/lib/types";

// Migrated from scripts/verify-khatmah.mjs. These call the REAL exported
// computeKhatmahPace / targetDateForDuration so a regression in the pace math
// fails the suite; the arithmetic is never re-derived here (the whole point of
// the migration). `today` is passed in explicitly, exactly as the source does,
// so the derivation stays deterministic.

const plan = (over: Partial<KhatmahPlan> = {}): KhatmahPlan => ({
  startDate: "2026-06-01",
  targetDate: "2026-06-30",
  startPage: 1,
  ...over,
});

describe("computeKhatmahPace - same-day plan (divide-by-zero guard)", () => {
  const p = computeKhatmahPace(
    { startDate: "2026-06-19", targetDate: "2026-06-19", startPage: 1 },
    1,
    "2026-06-19",
  );

  it("totalDays is 1, never 0", () => {
    expect(p.totalDays).toBe(1);
  });

  it("daysElapsed 0, daysRemaining 1", () => {
    expect(p.daysElapsed).toBe(0);
    expect(p.daysRemaining).toBe(1);
  });

  it("dailyPace is finite (the whole mushaf in one day)", () => {
    expect(Number.isFinite(p.dailyPace)).toBe(true);
    expect(p.dailyPace).toBe(604);
  });

  it("daysAhead is finite (no NaN/Infinity from a zero pace)", () => {
    expect(Number.isFinite(p.daysAhead)).toBe(true);
  });

  it("dailyPagesNeeded is the whole remainder (603)", () => {
    expect(p.dailyPagesNeeded).toBe(603);
  });

  it("pagesRead counts the start page (1)", () => {
    expect(p.pagesRead).toBe(1);
  });
});

describe("computeKhatmahPace - ahead of pace", () => {
  // 30-day plan (Jun 1..Jun 30), day 10 (elapsed 9), on page 250.
  // dailyPace = 604/30 = 20.1333; target = round(20.1333*9) = 181; 250 > 181.
  const p = computeKhatmahPace(plan(), 250, "2026-06-10");

  it("totalDays 30", () => {
    expect(p.totalDays).toBe(30);
  });

  it("daysElapsed 9", () => {
    expect(p.daysElapsed).toBe(9);
  });

  it("dailyPace ~20.13 (604/30)", () => {
    expect(p.dailyPace).toBeCloseTo(604 / 30, 4);
  });

  it("targetPageToday 181", () => {
    expect(p.targetPageToday).toBe(181);
  });

  it("pagesAhead is page minus target (positive)", () => {
    expect(p.pagesAhead).toBe(250 - 181);
    expect(p.pagesAhead).toBeGreaterThan(0);
  });

  it("daysAhead positive", () => {
    expect(p.daysAhead).toBeGreaterThan(0);
  });

  it("percentComplete is round(250/604)", () => {
    expect(p.percentComplete).toBe(Math.round((250 / 604) * 100));
  });
});

describe("computeKhatmahPace - behind pace", () => {
  // Same plan, day 20 (elapsed 19), only on page 100.
  // target = round(20.1333*19) = round(382.53) = 383; behind by 283.
  // daysRemaining = 11; pagesRemaining = 504; needed = ceil(504/11) = 46.
  const p = computeKhatmahPace(plan(), 100, "2026-06-20");

  it("daysElapsed 19", () => {
    expect(p.daysElapsed).toBe(19);
  });

  it("targetPageToday 383", () => {
    expect(p.targetPageToday).toBe(383);
  });

  it("pagesAhead is negative (behind the target)", () => {
    expect(p.pagesAhead).toBe(100 - 383);
    expect(p.pagesAhead).toBeLessThan(0);
  });

  it("daysAhead negative", () => {
    expect(p.daysAhead).toBeLessThan(0);
  });

  it("daysRemaining 11", () => {
    expect(p.daysRemaining).toBe(11);
  });

  it("pagesRemaining 504", () => {
    expect(p.pagesRemaining).toBe(504);
  });

  it("dailyPagesNeeded is ceil(504/11) = 46", () => {
    expect(p.dailyPagesNeeded).toBe(46);
  });
});

describe("computeKhatmahPace - complete (clamps to 604)", () => {
  // currentPage past 604 clamps to 604: complete, 100%, nothing remaining.
  const p = computeKhatmahPace(plan(), 700, "2026-06-15");

  it("isComplete true", () => {
    expect(p.isComplete).toBe(true);
  });

  it("percentComplete 100", () => {
    expect(p.percentComplete).toBe(100);
  });

  it("pagesRemaining 0", () => {
    expect(p.pagesRemaining).toBe(0);
  });

  it("pagesRead clamps to the span (604)", () => {
    expect(p.pagesRead).toBe(604);
  });
});

describe("computeKhatmahPace - percentComplete reaches 100 only on a real finish", () => {
  // Landmine: page 603 of 604 must read 99, never 100 (honest at the edge).
  const p = computeKhatmahPace(plan(), 603, "2026-06-29");

  it("page 603 -> percentComplete 99, not 100", () => {
    expect(p.percentComplete).toBe(99);
    expect(p.isComplete).toBe(false);
  });
});

describe("computeKhatmahPace - overdue (today past the target)", () => {
  // elapsed clamps to totalDays (30); daysRemaining 0; target clamps to 604.
  // needed falls back to the whole remainder (read it all "today").
  const p = computeKhatmahPace(plan(), 300, "2026-07-15");

  it("daysElapsed clamps to totalDays (30)", () => {
    expect(p.daysElapsed).toBe(30);
  });

  it("daysRemaining 0", () => {
    expect(p.daysRemaining).toBe(0);
  });

  it("targetPageToday clamps to 604", () => {
    expect(p.targetPageToday).toBe(604);
  });

  it("dailyPagesNeeded is the whole remainder (304)", () => {
    expect(p.dailyPagesNeeded).toBe(304);
  });

  it("not complete (still 300/604 read)", () => {
    expect(p.isComplete).toBe(false);
  });
});

describe("computeKhatmahPace - partway-in plan (startPage > 1)", () => {
  // start page 302, 11-day plan; pagesInPlan = 303; dailyPace = 303/11 = 27.545.
  // day 6 (elapsed 5): target = round(301 + 27.545*5) = round(438.7) = 439.
  // page 400: read = 400-302+1 = 99; remaining to 604 = 204; behind (400<439).
  const p = computeKhatmahPace(
    { startDate: "2026-06-01", targetDate: "2026-06-11", startPage: 302 },
    400,
    "2026-06-06",
  );

  it("totalDays 11", () => {
    expect(p.totalDays).toBe(11);
  });

  it("dailyPace 303/11", () => {
    expect(p.dailyPace).toBeCloseTo(303 / 11, 4);
  });

  it("pagesRead is plan-relative, counted from startPage (99)", () => {
    expect(p.pagesRead).toBe(99);
  });

  it("pagesRemaining to 604 (204)", () => {
    expect(p.pagesRemaining).toBe(204);
  });

  it("targetPageToday 439", () => {
    expect(p.targetPageToday).toBe(439);
  });

  it("percentComplete is round(400/604) (absolute, not plan-relative)", () => {
    expect(p.percentComplete).toBe(Math.round((400 / 604) * 100));
  });
});

describe("computeKhatmahPace - page below startPage clamps up", () => {
  // currentPage 1 with startPage 100 is impossible reading; the page clamps up
  // to startPage so pagesRead is exactly 1 (just the start), never negative.
  const p = computeKhatmahPace(
    { startDate: "2026-06-01", targetDate: "2026-06-30", startPage: 100 },
    1,
    "2026-06-01",
  );

  it("pagesRead 1, never negative", () => {
    expect(p.pagesRead).toBe(1);
  });

  it("pagesAhead never below the negative span", () => {
    expect(p.pagesAhead).toBeGreaterThanOrEqual(-604);
  });
});

describe("computeKhatmahPace - before the start date", () => {
  const p = computeKhatmahPace(
    { startDate: "2026-06-10", targetDate: "2026-06-30", startPage: 1 },
    1,
    "2026-06-01",
  );

  it("daysElapsed 0", () => {
    expect(p.daysElapsed).toBe(0);
  });

  it("targetPageToday 0 (at the span start, one page before page 1)", () => {
    expect(p.targetPageToday).toBe(0);
  });
});

describe("targetDateForDuration - inclusive-span round-trip", () => {
  it("30 days from Jun 1 targets Jun 30 (D+29)", () => {
    expect(targetDateForDuration("2026-06-01", 30)).toBe("2026-06-30");
  });

  it("the 30-day preset round-trips to totalDays 30", () => {
    const t30 = targetDateForDuration("2026-06-01", 30);
    const span = computeKhatmahPace(
      { startDate: "2026-06-01", targetDate: t30, startPage: 1 },
      1,
      "2026-06-01",
    );
    expect(span.totalDays).toBe(30);
  });

  it("the 90-day preset round-trips to totalDays 90", () => {
    const t90 = targetDateForDuration("2026-06-01", 90);
    const span90 = computeKhatmahPace(
      { startDate: "2026-06-01", targetDate: t90, startPage: 1 },
      1,
      "2026-06-01",
    );
    expect(span90.totalDays).toBe(90);
  });
});
