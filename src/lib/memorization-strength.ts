// Pure freshness + error-strength derivations of the already-persisted Sm2State
// (STAT-01 freshness, STAT-02 errors). This is point-in-time MATH ONLY: it reads
// an existing memorizationReviews entry and never writes, so there is no new
// storage — every value here is derived from what gradeRecall already durably
// wrote (lastReviewedDate / nextDueDate for freshness; lapses / timesSeen /
// timesCorrect for errors). Framework-agnostic on purpose (no React / next /
// storage / DOM), so it counts toward the `src/lib/**` coverage gate and
// memorization-strength.test.ts drives it directly, mirroring murajaah-queue.ts /
// memorization-scope.ts. It imports only the Sm2State shape from `./types` and the
// one MASTERED_INTERVAL_DAYS constant from `./recall-scheduler` (itself pure,
// types-only) — never spaced-repetition.ts / storage.ts, which would pull the
// storage graph and break this lib's purity.
//
// The clock is ALWAYS passed in as `now: Date` (never Date.now(), which is banned
// in this env and would break determinism), exactly like murajaah-queue takes its
// dueKeys in, so every derivation here is deterministic and testable.

import type { Sm2State } from "./types";
import { MASTERED_INTERVAL_DAYS } from "./recall-scheduler";

// Whole local-day count between two dates, measured at LOCAL midnight (each date
// with hours/minutes/seconds/ms zeroed). Both operands are re-anchored to local
// midnight here, so the epoch delta is always a whole number of days EXCEPT across
// a DST transition, where it is off by one hour; ROUNDED (not floored) so that
// hour never miscounts the span (a 10-day span crossing spring-forward is
// 10*24-1 hours -> round gives 10, floor wrongly gave 9). Local — not a UTC
// round-trip — on purpose: the whole app keys days off the en-CA local date (see
// recall-scheduler toIsoDate). Negative when b precedes a; callers guard as needed.
function daysBetween(a: Date, b: Date): number {
  const aMidnight = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bMidnight = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bMidnight - aMidnight) / 86_400_000);
}

// STAT-01. Freshness in [0, 1]: 1 right after a successful recall, decaying
// linearly toward 0 as the next-due date approaches, and 0 at/after nextDueDate
// (overdue reads red). A verse with no entry OR no lastReviewedDate has never been
// recalled, so it returns the 0 sentinel ("needs recall" == red); pair it with
// hasBeenRecalled to style an unseen verse distinctly from one that aged to red.
//
// The window is the scheduled span from the last recall to the next-due date
// (min 1 day so it can never divide by zero). An empty nextDueDate means "due now"
// per the Sm2State contract, so it falls back to lastReviewedDate — a due verse
// then reads red once a day has elapsed, matching the due semantic (do NOT treat a
// missing schedule as fresh). elapsed is measured against the passed-in `now`.
export function freshness(state: Sm2State | undefined, now: Date): number {
  if (!state || !state.lastReviewedDate) return 0;
  const last = new Date(state.lastReviewedDate + "T00:00:00");
  const due = new Date((state.nextDueDate || state.lastReviewedDate) + "T00:00:00");
  // Defense-in-depth: a tampered/corrupt stored date parses to an Invalid Date, and
  // an unguarded NaN here would propagate through scopeStrength's freshness sum and
  // render a `width: NaN%` bar for the whole scope. Treat it as never-recalled (0),
  // matching the app's "sanitize away tampered values" posture. Normal writes are
  // always valid en-CA dates from recall-scheduler.
  if (Number.isNaN(last.getTime()) || Number.isNaN(due.getTime())) return 0;
  const window = Math.max(1, daysBetween(last, due));
  const elapsed = daysBetween(last, now);
  return Math.min(1, Math.max(0, 1 - elapsed / window));
}

// Whether this verse has ever been through a recall. Lets the UI distinguish an
// unseen verse (freshness 0 because it was never recalled) from one that decayed
// to 0 (aged past its due date) — both read 0 from freshness().
export function hasBeenRecalled(state: Sm2State | undefined): boolean {
  return Boolean(state && state.lastReviewedDate);
}

// STAT-02. The durable miss signal for a verse: how many times a recall failed
// (lapses, the q<3 count gradeRecall maintains) plus any recorded misses not
// already counted as lapses (timesSeen - timesCorrect, floored at 0). A verse with
// no entry scores 0. Recall reveals/peeks are deliberately NOT part of this: the
// sessionPeekUsed map is session-only and cleared on finish, so it is not durable;
// lapses + misses is the only per-verse error signal that survives the session.
export function errorScore(state: Sm2State | undefined): number {
  if (!state) return 0;
  return state.lapses + Math.max(0, state.timesSeen - state.timesCorrect);
}

// Whether a verse has any durable error history (a non-zero errorScore).
export function hasError(state: Sm2State | undefined): boolean {
  return errorScore(state) > 0;
}

// Whether a verse has consolidated to the SM-2 mature line (its pure base interval
// has grown to >= MASTERED_INTERVAL_DAYS, the same threshold classifyVerse /
// getMemorizationReviewStats use for "mastered"). Exposed here so the Wave-2/3
// heatmap can flag consolidated cells from this single strength-math source rather
// than re-deriving the mature-line check inline.
export function isMastered(state: Sm2State | undefined): boolean {
  return Boolean(state && state.intervalDays >= MASTERED_INTERVAL_DAYS);
}

export interface ScopeStrength {
  count: number; // scope size == verseKeys.length
  // memorized: verses in this scope that carry a recall entry in `reviews` (i.e.
  // reviewed at least once). This counts reviewed-in-scope entries, NOT
  // memorized-set membership — a verse can be marked memorized before its first
  // recall and would not yet appear here.
  memorized: number;
  avgFreshness: number; // mean freshness over the reviewed verses (0 when none)
  worstFreshness: number; // min freshness over the reviewed verses (0 when none)
  errorTotal: number; // sum of errorScore over the whole scope
  errorMax: number; // largest single-verse errorScore in the scope
}

// Aggregate a scope's verseKeys against the reviews map in ONE O(n) pass, for a
// heatmap cell / breakdown row. No allocation per key beyond the accumulators, so
// it stays cheap across large scopes (bounded by the 6236-verse universe).
// Deterministic and side-effect-free; `now` is passed in for the freshness reads.
export function scopeStrength(
  verseKeys: string[],
  reviews: Record<string, Sm2State>,
  now: Date,
): ScopeStrength {
  let memorized = 0;
  let freshnessSum = 0;
  let worstFreshness = 1; // min-tracker seed; only surfaced once memorized > 0
  let errorTotal = 0;
  let errorMax = 0;

  for (const key of verseKeys) {
    const state = reviews[key];
    const error = errorScore(state); // 0 for a key with no entry
    errorTotal += error;
    if (error > errorMax) errorMax = error;
    if (state) {
      memorized += 1;
      const fresh = freshness(state, now);
      freshnessSum += fresh;
      if (fresh < worstFreshness) worstFreshness = fresh;
    }
  }

  return {
    count: verseKeys.length,
    memorized,
    avgFreshness: memorized > 0 ? freshnessSum / memorized : 0,
    worstFreshness: memorized > 0 ? worstFreshness : 0,
    errorTotal,
    errorMax,
  };
}
