#!/usr/bin/env node
// Khatmah pace-math verification. Imports the REAL computeKhatmahPace and
// targetDateForDuration from src/lib/khatmah.ts (Node strips the types; the
// module imports only a type, so it loads without the app runtime) and asserts
// the derivation against hand-computed expectations. Pure and offline, mirroring
// verify-mastery.mjs.
//
// Covers the edge cases that matter for an honest, non-nagging planner: a
// same-day plan (the divide-by-zero guard), being ahead, being behind, a
// finished read, a reader past the on-track target, an overdue plan (target in
// the past), a partway-in plan (startPage > 1), and the duration-preset date
// derivation round-tripping to the right total span.

import { computeKhatmahPace, targetDateForDuration } from "../src/lib/khatmah.ts";

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
}
// Float compare with a small tolerance for the pace/days fields.
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

// --- (a) Same-day plan: totalDays is 1, nothing divides by zero --------------
{
  const p = computeKhatmahPace(
    { startDate: "2026-06-19", targetDate: "2026-06-19", startPage: 1 },
    1,
    "2026-06-19",
  );
  record("same-day plan -> totalDays 1 (no divide-by-zero)", p.totalDays === 1, String(p.totalDays));
  record("same-day plan -> daysElapsed 0, daysRemaining 1", p.daysElapsed === 0 && p.daysRemaining === 1, `${p.daysElapsed}/${p.daysRemaining}`);
  record("same-day plan -> dailyPace finite", Number.isFinite(p.dailyPace) && p.dailyPace === 604, String(p.dailyPace));
  record("same-day plan -> daysAhead finite", Number.isFinite(p.daysAhead), String(p.daysAhead));
  record("same-day plan -> dailyPagesNeeded is the whole remainder", p.dailyPagesNeeded === 603, String(p.dailyPagesNeeded));
  record("same-day plan -> pagesRead 1", p.pagesRead === 1, String(p.pagesRead));
}

// --- (b) Ahead of pace: read past the on-track target page -------------------
{
  // 30-day plan (Jun 1..Jun 30), day 10 (elapsed 9), on page 250.
  // dailyPace = 604/30 = 20.1333; target = round(20.1333*9) = 181; 250 > 181.
  const p = computeKhatmahPace(
    { startDate: "2026-06-01", targetDate: "2026-06-30", startPage: 1 },
    250,
    "2026-06-10",
  );
  record("ahead -> totalDays 30", p.totalDays === 30, String(p.totalDays));
  record("ahead -> daysElapsed 9", p.daysElapsed === 9, String(p.daysElapsed));
  record("ahead -> dailyPace ~20.13", near(p.dailyPace, 604 / 30), String(p.dailyPace));
  record("ahead -> targetPageToday 181", p.targetPageToday === 181, String(p.targetPageToday));
  record("ahead -> page past target", p.pagesAhead === 250 - 181, String(p.pagesAhead));
  record("ahead -> pagesAhead positive", p.pagesAhead > 0, String(p.pagesAhead));
  record("ahead -> daysAhead positive", p.daysAhead > 0, String(p.daysAhead));
  record("ahead -> percentComplete round(250/604)", p.percentComplete === Math.round((250 / 604) * 100), String(p.percentComplete));
}

// --- (c) Behind pace: target page is ahead of the reader ---------------------
{
  // Same plan, day 20 (elapsed 19), only on page 100.
  // target = round(20.1333*19) = round(382.53) = 383; behind by 283.
  // daysRemaining = 11; pagesRemaining = 504; needed = ceil(504/11) = 46.
  const p = computeKhatmahPace(
    { startDate: "2026-06-01", targetDate: "2026-06-30", startPage: 1 },
    100,
    "2026-06-20",
  );
  record("behind -> daysElapsed 19", p.daysElapsed === 19, String(p.daysElapsed));
  record("behind -> targetPageToday 383", p.targetPageToday === 383, String(p.targetPageToday));
  record("behind -> pagesAhead negative", p.pagesAhead === 100 - 383 && p.pagesAhead < 0, String(p.pagesAhead));
  record("behind -> daysAhead negative", p.daysAhead < 0, String(p.daysAhead));
  record("behind -> daysRemaining 11", p.daysRemaining === 11, String(p.daysRemaining));
  record("behind -> pagesRemaining 504", p.pagesRemaining === 504, String(p.pagesRemaining));
  record("behind -> dailyPagesNeeded ceil(504/11)=46", p.dailyPagesNeeded === 46, String(p.dailyPagesNeeded));
}

// --- (d) Complete: reader at or past the final page --------------------------
{
  // currentPage past 604 clamps to 604: complete, 100%, nothing remaining.
  const p = computeKhatmahPace(
    { startDate: "2026-06-01", targetDate: "2026-06-30", startPage: 1 },
    700,
    "2026-06-15",
  );
  record("complete -> isComplete true", p.isComplete === true, String(p.isComplete));
  record("complete -> percentComplete 100", p.percentComplete === 100, String(p.percentComplete));
  record("complete -> pagesRemaining 0", p.pagesRemaining === 0, String(p.pagesRemaining));
  record("complete -> pagesRead clamped to span (604)", p.pagesRead === 604, String(p.pagesRead));
}

// --- (e) percentComplete reaches 100 only on a real finish -------------------
{
  // Page 603 of 604 must read 99, never 100 (honest at the edge).
  const almost = computeKhatmahPace(
    { startDate: "2026-06-01", targetDate: "2026-06-30", startPage: 1 },
    603,
    "2026-06-29",
  );
  record("page 603 -> percentComplete 99 (not 100)", almost.percentComplete === 99 && !almost.isComplete, String(almost.percentComplete));
}

// --- (f) Overdue: today is past the target, not complete ---------------------
{
  // elapsed clamps to totalDays (30); daysRemaining 0; target clamps to 604.
  // needed falls back to the whole remainder (read it all "today").
  const p = computeKhatmahPace(
    { startDate: "2026-06-01", targetDate: "2026-06-30", startPage: 1 },
    300,
    "2026-07-15",
  );
  record("overdue -> daysElapsed clamps to totalDays", p.daysElapsed === 30, String(p.daysElapsed));
  record("overdue -> daysRemaining 0", p.daysRemaining === 0, String(p.daysRemaining));
  record("overdue -> targetPageToday clamps to 604", p.targetPageToday === 604, String(p.targetPageToday));
  record("overdue -> dailyPagesNeeded is whole remainder 304", p.dailyPagesNeeded === 304, String(p.dailyPagesNeeded));
  record("overdue -> not complete", p.isComplete === false, String(p.isComplete));
}

// --- (g) Partway-in plan: startPage > 1 counts read from the start -----------
{
  // start page 302, 11-day plan; pagesInPlan = 303; dailyPace = 303/11 = 27.545.
  // day 6 (elapsed 5): target = round(301 + 27.545*5) = round(438.7) = 439.
  // page 400: read = 400-302+1 = 99; remaining to 604 = 204; behind (400<439).
  const p = computeKhatmahPace(
    { startDate: "2026-06-01", targetDate: "2026-06-11", startPage: 302 },
    400,
    "2026-06-06",
  );
  record("partway -> totalDays 11", p.totalDays === 11, String(p.totalDays));
  record("partway -> dailyPace 303/11", near(p.dailyPace, 303 / 11), String(p.dailyPace));
  record("partway -> pagesRead from startPage (99)", p.pagesRead === 99, String(p.pagesRead));
  record("partway -> pagesRemaining to 604 (204)", p.pagesRemaining === 204, String(p.pagesRemaining));
  record("partway -> targetPageToday 439", p.targetPageToday === 439, String(p.targetPageToday));
  record("partway -> percentComplete round(400/604)", p.percentComplete === Math.round((400 / 604) * 100), String(p.percentComplete));
}

// --- (h) Reader never advanced: page below startPage clamps to startPage ------
{
  // currentPage 1 with startPage 100 is impossible reading; the page clamps up to
  // startPage so pagesRead is exactly 1 (just the start), never negative.
  const p = computeKhatmahPace(
    { startDate: "2026-06-01", targetDate: "2026-06-30", startPage: 100 },
    1,
    "2026-06-01",
  );
  record("page below startPage -> pagesRead 1 (not negative)", p.pagesRead === 1, String(p.pagesRead));
  record("page below startPage -> pagesAhead not below -span", p.pagesAhead >= -604, String(p.pagesAhead));
}

// --- (i) Before the start date: elapsed 0, target at the span start ----------
{
  const p = computeKhatmahPace(
    { startDate: "2026-06-10", targetDate: "2026-06-30", startPage: 1 },
    1,
    "2026-06-01",
  );
  record("before start -> daysElapsed 0", p.daysElapsed === 0, String(p.daysElapsed));
  record("before start -> targetPageToday 0", p.targetPageToday === 0, String(p.targetPageToday));
}

// --- (j) targetDateForDuration round-trips to the right inclusive span -------
{
  const t30 = targetDateForDuration("2026-06-01", 30);
  record("30-day preset targets Jun 30", t30 === "2026-06-30", t30);
  const span = computeKhatmahPace(
    { startDate: "2026-06-01", targetDate: t30, startPage: 1 },
    1,
    "2026-06-01",
  );
  record("30-day preset -> totalDays 30", span.totalDays === 30, String(span.totalDays));
  const t90 = targetDateForDuration("2026-06-01", 90);
  const span90 = computeKhatmahPace(
    { startDate: "2026-06-01", targetDate: t90, startPage: 1 },
    1,
    "2026-06-01",
  );
  record("90-day preset -> totalDays 90", span90.totalDays === 90, String(span90.totalDays));
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} khatmah checks passed.`);
process.exit(passed === results.length ? 0 : 1);
