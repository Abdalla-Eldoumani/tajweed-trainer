"use client";

import { useState, useEffect, useCallback } from "react";
import { getMemorizationReviews, setMemorizationReview } from "@/lib/storage";
import {
  nextStateForAnswer,
  getReviewStats,
  getDueQuestionIds,
  type ReviewStats,
} from "@/lib/spaced-repetition";
import type { ReviewState } from "@/lib/types";

// Leitner review over memorized verses, mirroring useReviews but reading and
// writing the separate `memorizationReviews` map (keyed by verseKey), never the
// rule-quiz `reviews` map. The pure spaced-repetition functions take any
// Record<string, ReviewState>, so they apply unchanged to verseKeys. Starts
// empty so SSR and the first client render match; the effect loads after mount.
export function useMemorizationReviews() {
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});

  useEffect(() => {
    setReviews(getMemorizationReviews());
  }, []);

  const refresh = useCallback(() => {
    setReviews(getMemorizationReviews());
  }, []);

  const recordReview = useCallback(
    (verseKey: string, correct: boolean) => {
      const prev = getMemorizationReviews()[verseKey];
      setMemorizationReview(verseKey, nextStateForAnswer(prev, correct));
      refresh();
    },
    [refresh],
  );

  // A memorized verse with no review entry has no nextDueDate, so
  // getDueQuestionIds treats it as due — newly memorized verses appear in
  // review immediately, which is the intended behavior.
  const dueIds = useCallback((now?: Date): string[] => getDueQuestionIds(reviews, now), [reviews]);
  const stats = useCallback((now?: Date): ReviewStats => getReviewStats(reviews, now), [reviews]);

  return {
    reviews,
    recordReview,
    dueIds,
    stats,
    refresh,
  };
}
