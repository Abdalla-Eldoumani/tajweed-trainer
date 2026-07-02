"use client";

import { useState, useEffect, useCallback } from "react";
import { getMemorizationReviews, setMemorizationReview } from "@/lib/storage";
import { subscribeProgressChanged } from "@/lib/progress-events";
import { getDueFromUniverse } from "@/lib/spaced-repetition";
import { gradeRecall, previewIntervals } from "@/lib/recall-scheduler";
import { useSettings } from "@/hooks/useSettings";
import type { RecallGrade, Sm2State } from "@/lib/types";

// SM-2 recall over memorized verses, reading and writing the separate
// `memorizationReviews` map (keyed by verseKey), never the rule-quiz `reviews`
// map. The pure recall-scheduler functions take any Sm2State, so they apply
// unchanged to verseKeys. Starts empty so SSR and the first client render match;
// the effect loads after mount. The balanced interval modifier is read ONCE here
// from settings (Open Question 1 recommendation) and forwarded into the pure lib,
// so the component passes only key + grade and never handles the modifier.
export function useMemorizationReviews() {
  const [reviews, setReviews] = useState<Record<string, Sm2State>>({});
  const { settings } = useSettings();
  const modifier = settings.reviewIntervalModifier ?? 1.0;

  useEffect(() => {
    setReviews(getMemorizationReviews());
    // Re-read on every write so a recall grading session (which writes through
    // setMemorizationReview -> setProgress -> the change bus) refreshes every
    // mounted consumer live, like useBookmarks/useMemorization. Keeps the
    // /progress due-count card in sync after each graded verse with no reload.
    return subscribeProgressChanged(() => setReviews(getMemorizationReviews()));
  }, []);

  const refresh = useCallback(() => {
    setReviews(getMemorizationReviews());
  }, []);

  // Self-graded recall: the four rating buttons map to a quality grade in the
  // pure lib. gradeRecall derives the next SM-2 state (EF, interval, next due
  // date), with the balanced modifier applied to the due date only.
  const recordReview = useCallback(
    (verseKey: string, grade: RecallGrade) => {
      const prev = getMemorizationReviews()[verseKey];
      setMemorizationReview(verseKey, gradeRecall(prev, grade, new Date(), modifier));
      refresh();
    },
    [refresh, modifier],
  );

  // The effective (modifier-applied) next-interval day count each button would
  // produce for a verse, for the per-button preview label. Reads from the hook's
  // `reviews` state (not a fresh storage read) so it re-renders through the
  // change bus; a not-yet-reviewed verse falls back to the new-verse preview.
  const preview = useCallback(
    (verseKey: string): Record<RecallGrade, number> =>
      previewIntervals(reviews[verseKey], modifier),
    [reviews, modifier],
  );

  // Due memorized verses, drawn from the memorized set as the universe (the
  // caller passes the live Set), not the review map. A memorized verse with no
  // review entry has never been self-tested, so it is due immediately;
  // getDueQuestionIds alone would never surface it because it only walks ids
  // already present in the map.
  const dueMemorized = useCallback(
    (memorized: Iterable<string>, now?: Date): string[] =>
      getDueFromUniverse(memorized, reviews, now),
    [reviews],
  );

  return {
    reviews,
    recordReview,
    dueMemorized,
    preview,
    refresh,
  };
}
