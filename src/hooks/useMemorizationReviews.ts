"use client";

import { useState, useEffect, useCallback } from "react";
import { getMemorizationReviews, setMemorizationReview } from "@/lib/storage";
import { subscribeProgressChanged } from "@/lib/progress-events";
import { nextStateForAnswer, getDueFromUniverse } from "@/lib/spaced-repetition";
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
    // Re-read on every write so a recall grading session (which writes through
    // setMemorizationReview -> setProgress -> the change bus) refreshes every
    // mounted consumer live, like useBookmarks/useMemorization. Keeps the
    // /progress due-count card in sync after each graded verse with no reload.
    return subscribeProgressChanged(() => setReviews(getMemorizationReviews()));
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
    refresh,
  };
}
