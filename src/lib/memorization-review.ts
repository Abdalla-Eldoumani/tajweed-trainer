import type { Sm2State } from "./types";
import { getDueFromUniverse } from "./spaced-repetition";
import { MASTERED_INTERVAL_DAYS } from "./recall-scheduler";

// Re-exported so a consumer reviewing memorized verses has one import site for
// both due-selection and these stats; the curve itself lives in
// spaced-repetition.ts and is never forked here.
export { getDueFromUniverse };

export interface MemorizationReviewStats {
  due: number;
  total: number;
  mastered: number;
}

// Review stats over the memorized universe rather than the review map. This
// exists because getReviewStats(memorizationReviews) walks only the review map:
// a memorized verse that has never been self-tested has no map entry, so it is
// invisible to that function's total and due (PATTERNS landmine G — it
// undercounts both). Here total is the size of the memorized set and due
// delegates to getDueFromUniverse, which treats a verse with no review entry as
// due immediately, so a freshly memorized verse correctly shows as due and
// counts toward the total without ever counting as mastered.
//
// "mastered" is the SM-2 definition (intervalDays >= MASTERED_INTERVAL_DAYS, the
// SRS-standard 21-day mature line), replacing the old Leitner box === 5 check.
// This preserves the old mastered set under migration exactly: a migrated box-5
// verse has intervalDays 30 (>= 21 -> mastered), box-4 has 14 (< 21 -> not).
export function getMemorizationReviewStats(
  memorized: Iterable<string>,
  reviews: Record<string, Sm2State>,
  now: Date = new Date(),
): MemorizationReviewStats {
  const keys = [...memorized];
  const total = keys.length;
  const due = getDueFromUniverse(keys, reviews, now).length;
  let mastered = 0;
  for (const key of keys) {
    if ((reviews[key]?.intervalDays ?? 0) >= MASTERED_INTERVAL_DAYS) mastered += 1;
  }
  return { due, total, mastered };
}
