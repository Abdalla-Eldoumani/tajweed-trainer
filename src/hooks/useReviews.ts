"use client";

import { useState, useEffect, useCallback } from "react";
import { getProgress } from "@/lib/storage";
import {
  recordReview as doRecordReview,
  getReviewStats,
  getDueQuestionIds,
  type ReviewStats,
} from "@/lib/spaced-repetition";
import type { ReviewState } from "@/lib/types";

// Start with an empty reviews map so the SSR pass and the first client render
// produce identical DOM. The effect populates the real state from localStorage
// after mount.
export function useReviews() {
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});

  useEffect(() => {
    setReviews(getProgress().reviews);
  }, []);

  const refresh = useCallback(() => {
    setReviews(getProgress().reviews);
  }, []);

  const recordReview = useCallback(
    (questionId: string, correct: boolean) => {
      doRecordReview(questionId, correct);
      refresh();
    },
    [refresh],
  );

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
