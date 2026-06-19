import type { ReviewBox, ReviewState } from "./types";
import { getProgress, setReview } from "./storage";

// Leitner spacing in days. A correct answer promotes one box (max 5); a wrong
// answer drops to box 1. The interval is how long the question stays out of
// the due-list after the review.
export const LEITNER_INTERVALS: Record<ReviewBox, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

export const MASTERY_BOX: ReviewBox = 5;

function toIsoDate(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function computeNextDueDate(box: ReviewBox, now: Date = new Date()): string {
  return toIsoDate(addDays(now, LEITNER_INTERVALS[box]));
}

export function nextStateForAnswer(
  prev: ReviewState | undefined,
  correct: boolean,
  now: Date = new Date(),
): ReviewState {
  const today = toIsoDate(now);
  const currentBox: ReviewBox = prev?.box ?? 1;
  const nextBox: ReviewBox = correct
    ? (Math.min(MASTERY_BOX, currentBox + 1) as ReviewBox)
    : 1;
  return {
    box: nextBox,
    nextDueDate: computeNextDueDate(nextBox, now),
    lastSeenDate: today,
    timesSeen: (prev?.timesSeen ?? 0) + 1,
    timesCorrect: (prev?.timesCorrect ?? 0) + (correct ? 1 : 0),
  };
}

export function recordReview(questionId: string, correct: boolean, now: Date = new Date()): void {
  if (!questionId) return;
  const prev = getProgress().reviews[questionId];
  const next = nextStateForAnswer(prev, correct, now);
  setReview(questionId, next);
}

export function getDueQuestionIds(
  reviews: Record<string, ReviewState>,
  now: Date = new Date(),
): string[] {
  const today = toIsoDate(now);
  const due: string[] = [];
  for (const [id, state] of Object.entries(reviews)) {
    if (!state.nextDueDate || state.nextDueDate <= today) due.push(id);
  }
  return due;
}

// Due ids drawn from an explicit universe of candidate ids (e.g. memorized
// verseKeys), not only those already in the review map. An id with no review
// state has never been reviewed, so it is due immediately. This is the entry
// point for review over a set that grows outside the Leitner map: memorizing a
// verse adds it to the memorized set but writes no review entry, so
// getDueQuestionIds (which walks the map) would never surface it.
export function getDueFromUniverse(
  universe: Iterable<string>,
  reviews: Record<string, ReviewState>,
  now: Date = new Date(),
): string[] {
  const today = toIsoDate(now);
  const due: string[] = [];
  for (const id of universe) {
    const state = reviews[id];
    if (!state || !state.nextDueDate || state.nextDueDate <= today) due.push(id);
  }
  return due;
}

export interface ReviewStats {
  total: number;
  mastered: number;
  due: number;
}

export function getReviewStats(
  reviews: Record<string, ReviewState>,
  now: Date = new Date(),
): ReviewStats {
  const today = toIsoDate(now);
  let mastered = 0;
  let due = 0;
  let total = 0;
  for (const state of Object.values(reviews)) {
    total += 1;
    if (state.box === MASTERY_BOX) mastered += 1;
    if (!state.nextDueDate || state.nextDueDate <= today) due += 1;
  }
  return { total, mastered, due };
}
