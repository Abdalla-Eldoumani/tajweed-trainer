import type { ReviewState } from "./types";
import { getDueFromUniverse } from "./spaced-repetition";

// Re-exported so a consumer reviewing memorized verses has one import site for
// both due-selection and these stats; the curve itself lives in
// spaced-repetition.ts and is never forked here.
export { getDueFromUniverse };

// Leitner top box (mirrors MASTERY_BOX in spaced-repetition.ts; kept local so
// this module imports only a type + getDueFromUniverse, exactly as mastery.ts
// keeps its own literal rather than importing a non-exported const).
const MASTERY_BOX = 5;

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
export function getMemorizationReviewStats(
  memorized: Iterable<string>,
  reviews: Record<string, ReviewState>,
  now: Date = new Date(),
): MemorizationReviewStats {
  const keys = [...memorized];
  const total = keys.length;
  const due = getDueFromUniverse(keys, reviews, now).length;
  let mastered = 0;
  for (const key of keys) {
    if (reviews[key]?.box === MASTERY_BOX) mastered += 1;
  }
  return { due, total, mastered };
}
