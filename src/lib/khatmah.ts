// Pure pace math for the opt-in khatmah (Quran-completion) plan. No React, no
// storage, no next imports: the progress page and scripts/verify-khatmah.mjs
// import this directly, the same way mastery.ts and memorization-scope.ts stay
// unit-testable. Every output is clamped and every division is guarded, so a
// same-day plan or a reader past the end can never produce NaN/Infinity.
//
// Model, linear by mushaf page. The whole Quran is 604 pages; being on page N
// is N/604 of the way through (the documented simplifying assumption: pages are
// treated as equal units, which they are not exactly, but it gives a calm,
// honest pace without per-page weighting). A plan covers the pages from its
// startPage through 604, so a learner who began partway in is not counted as
// starting over. Dates are whole calendar days; "today" is supplied by the
// caller (app code computes it with new Date()), so this stays deterministic.

import type { KhatmahPlan } from "./types";

const TOTAL_PAGES = 604;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface KhatmahPace {
  // Inclusive span of the plan in whole days (start and target both counted), so
  // a same-day plan is 1, never 0.
  totalDays: number;
  // Whole days from the start through today, clamped to [0, totalDays]. Before
  // the start it is 0; on or after the target it is totalDays.
  daysElapsed: number;
  // Whole days left until the target, clamped to [0, totalDays].
  daysRemaining: number;
  // Pages covered so far within the plan span (from startPage), clamped to
  // [0, pagesInPlan].
  pagesRead: number;
  // Pages left to reach page 604, clamped to [0, TOTAL_PAGES].
  pagesRemaining: number;
  // The steady pages-per-day the plan committed to (pagesInPlan / totalDays).
  dailyPace: number;
  // Pages-per-day needed from now to still finish on time, rounded up. When the
  // target is today or past it is the whole remaining amount (read it all today).
  dailyPagesNeeded: number;
  // The page the reader should be on by end of today to be exactly on the steady
  // pace, clamped to [0, TOTAL_PAGES].
  targetPageToday: number;
  // currentPage - targetPageToday: positive means ahead of pace, negative behind,
  // zero exactly on pace. Expressed in pages.
  pagesAhead: number;
  // The same gap expressed in whole days of the steady pace (positive ahead,
  // negative behind), guarded against a zero pace.
  daysAhead: number;
  // currentPage / 604 as a clamped integer percent. Only a finished read
  // (currentPage >= 604) reads 100.
  percentComplete: number;
  // True once the reader has reached the final page.
  isComplete: boolean;
}

// Whole-day difference between two ISO dates (YYYY-MM-DD), parsed at UTC midnight
// so the result is a clean integer regardless of the runtime timezone. Positive
// when `to` is after `from`.
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / DAY_MS);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

// Compute the full pace snapshot for a plan given the reader's current page and
// today's date. currentPage is the reader position the app records
// (lastRead.page); the caller clamps nothing, every field is bounded here.
export function computeKhatmahPace(
  plan: KhatmahPlan,
  currentPage: number,
  today: string,
): KhatmahPace {
  const startPage = clamp(plan.startPage, 1, TOTAL_PAGES);
  // A reader who never advanced past the start sits at startPage; one past the
  // end is pulled back to 604. The page is clamped into the plan span so the
  // read count and the ahead/behind delta are always honest.
  const page = clamp(currentPage, startPage, TOTAL_PAGES);

  const totalDays = Math.max(1, daysBetween(plan.startDate, plan.targetDate) + 1);
  const daysElapsed = clamp(daysBetween(plan.startDate, today), 0, totalDays);
  const daysRemaining = clamp(totalDays - daysElapsed, 0, totalDays);

  const pagesInPlan = TOTAL_PAGES - startPage + 1;
  const pagesRead = clamp(page - startPage + 1, 0, pagesInPlan);
  const pagesRemaining = clamp(TOTAL_PAGES - page, 0, TOTAL_PAGES);

  // totalDays is >= 1, so this never divides by zero.
  const dailyPace = pagesInPlan / totalDays;

  // The on-track page by end of today: start one page before the span, then add
  // the steady pace for each elapsed day. Clamped so it never names a page
  // outside the mushaf.
  const targetPageToday = clamp(
    Math.round(startPage - 1 + dailyPace * daysElapsed),
    0,
    TOTAL_PAGES,
  );

  const pagesAhead = page - targetPageToday;
  // Convert the page gap to days of the steady pace; dailyPace can be a small
  // positive number but never zero (pagesInPlan >= 1, totalDays >= 1).
  const daysAhead = dailyPace > 0 ? pagesAhead / dailyPace : 0;

  // To finish on time from now: spread the remaining pages over the remaining
  // days, rounding up so the plan is actually met. With no days left, the whole
  // remainder is due today.
  const dailyPagesNeeded =
    daysRemaining > 0 ? Math.ceil(pagesRemaining / daysRemaining) : pagesRemaining;

  const isComplete = page >= TOTAL_PAGES;
  const percentComplete = isComplete
    ? 100
    : clamp(Math.round((page / TOTAL_PAGES) * 100), 0, 99);

  return {
    totalDays,
    daysElapsed,
    daysRemaining,
    pagesRead,
    pagesRemaining,
    dailyPace,
    dailyPagesNeeded,
    targetPageToday,
    pagesAhead,
    daysAhead,
    percentComplete,
    isComplete,
  };
}

// Derive a target ISO date from a start date and a whole-day duration (used by
// the duration presets: 30/60/90 days). The duration is the inclusive span, so a
// 30-day plan beginning on day D targets D+29, exactly totalDays === 30 above.
// Pure date math at UTC midnight; returns YYYY-MM-DD.
export function targetDateForDuration(startDate: string, days: number): string {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const span = Math.max(1, Math.floor(days));
  if (Number.isNaN(start)) return startDate;
  const target = new Date(start + (span - 1) * DAY_MS);
  return target.toISOString().slice(0, 10);
}
