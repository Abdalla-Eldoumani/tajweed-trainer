"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getMemorizationReviews,
  setMemorizationReview,
  getNewVersesIntroducedToday,
  recordNewVerseIntroduced,
  updateMemorizationStreak,
  recordJournalRevision,
} from "@/lib/storage";
import { subscribeProgressChanged } from "@/lib/progress-events";
import { getDueFromUniverse } from "@/lib/spaced-repetition";
import { gradeRecall, previewIntervals } from "@/lib/recall-scheduler";
import { composeDailyQueue } from "@/lib/murajaah-queue";
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
      // First-ever grade of this verse (no prior entry) counts as new material
      // entering revision today, capped globally by composeToday's newVerseCap.
      // Fires once per verse across ALL four recall drills (review/chaining/
      // segment/typing) since they all record through this one hook point; a
      // re-grade never re-counts because `prev` then exists.
      if (!prev) recordNewVerseIntroduced();
      // Every revision grade (any of the four recall drills route through this
      // one path) marks today as revised for the memorization revision streak
      // Unconditional, not gated on `!prev`: re-grading an
      // already-introduced verse still counts as revising today. The storage
      // helper is idempotent per local day, so a second grade the same day is a
      // no-op. SM-2 grading and the memorizationReviews write above are untouched.
      updateMemorizationStreak();
      // The session-journal revision tally rides here beside the streak
      // as a separate `sessionJournal` side effect that increments
      // today's `revised` count. Also unconditional and once per grade, so any
      // of the four recall drills tallies the day's revision. Independent of the
      // streak (neither reads the other) and, like the streak, leaves the SM-2
      // write and recall-scheduler.ts untouched.
      recordJournalRevision();
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

  // Today's composed daily-revision queue: the single source that shapes both
  // the dashboard overview and the recall session, so they can never diverge.
  // Computes the full (uncapped) due set via the same getDueFromUniverse, then
  // hands it to the pure composeDailyQueue with the introduced-today counter and
  // the newVerseCap so only the NEW tail is capped (recent + consolidated stay
  // uncapped). Recomputes through the change bus because `reviews` is a
  // dep and every recordReview write bumps the bus; the tracking counter is read
  // fresh (side-effect-free) each time so it reflects today's introductions.
  const composeToday = useCallback(
    (memorized: Iterable<string>, now?: Date) => {
      const dueKeys = getDueFromUniverse(memorized, reviews, now);
      return composeDailyQueue({
        dueKeys,
        reviews,
        newVersesIntroducedToday: getNewVersesIntroducedToday(now),
        newVerseCap: settings.newVerseCap ?? 5,
      });
    },
    [reviews, settings.newVerseCap],
  );

  return {
    reviews,
    recordReview,
    dueMemorized,
    composeToday,
    preview,
    refresh,
  };
}
