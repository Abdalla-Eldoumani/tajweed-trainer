// Pure daily-revision (murajaah) queue math. The single source of how today's
// due memorized verses are bucketed and shaped into one balanced session, so the
// dashboard overview and the recall session can never diverge. It is count/order
// math only: the DUE set is passed IN (never re-derived here) and it touches no
// storage, so it stays framework-agnostic (no React / next / storage / DOM) and
// the `src/lib/**` coverage gate exercises it directly, mirroring
// verse-chaining.ts / verse-segments.ts. It imports only the Sm2State shape and
// the one MASTERED_INTERVAL_DAYS constant from recall-scheduler.ts (itself pure,
// types-only) — never spaced-repetition.ts / storage.ts, which would pull the
// storage graph and break this lib's purity.
//
// the daily NEW-verse cap bounds ONLY the new tail of the session.
// every due recent + consolidated verse is always surfaced, uncapped.
// dueTotal is the honest uncapped due count regardless of the cap. Deterministic:
// no wall clock, no randomness; order preserves dueKeys order within each class.

import type { Sm2State } from "./types";
import { MASTERED_INTERVAL_DAYS } from "./recall-scheduler";

export type VerseClass = "new" | "recent" | "consolidated";

// Bucket a memorized verse from its SM-2 state. No entry OR repetitions === 0
// (never reviewed, or lapsed-then-reset) means the verse needs a fresh
// introduction, so it is NEW — this precedence is checked first, before the
// interval, so a stale large interval on a reset verse never masks it. A verse
// that has survived to the mature line (intervalDays >= MASTERED_INTERVAL_DAYS,
// the same threshold getMemorizationReviewStats uses for "mastered") is
// CONSOLIDATED; anything in between is RECENT. Tolerates any finite number: the
// stored state is clamped upstream by the storage sanitizer before it arrives.
export function classifyVerse(state: Sm2State | undefined): VerseClass {
  if (!state || state.repetitions === 0) return "new";
  if (state.intervalDays >= MASTERED_INTERVAL_DAYS) return "consolidated";
  return "recent";
}

export interface DailyQueue {
  order: string[]; // recent (all) then consolidated (all) then the capped new tail
  counts: { new: number; recent: number; consolidated: number }; // per-class due totals (uncapped)
  dueTotal: number; // dueKeys.length — the honest uncapped due count
  newDue: number; // count of due NEW verses (uncapped)
  newAllowed: number; // NEW verses admitted to the session today (cap)
}

// Shape today's session from the full due set. `dueKeys` is ALL due verseKeys
// (uncapped); the caller computes it (via getDueFromUniverse) and passes
// it in so this lib never re-derives the due rule. One O(n) pass classifies each
// key via reviews[key] and partitions into recent / consolidated / new arrays,
// each preserving dueKeys order. newAllowed = min(newDue, max(0, cap -
// introducedToday)) so an already-met or exceeded cap admits no new verses and
// the count is never negative. The session order revises the known first (recent,
// then consolidated) before introducing the day's new material, and the cap
// naturally bounds only that NEW tail. counts are the FULL per-class due totals
// (uncapped) so the dashboard shows the honest breakdown even when the tail is
// trimmed; dueTotal = dueKeys.length.
export function composeDailyQueue(params: {
  dueKeys: string[];
  reviews: Record<string, Sm2State>;
  newVersesIntroducedToday: number;
  newVerseCap: number;
}): DailyQueue {
  const { dueKeys, reviews, newVersesIntroducedToday, newVerseCap } = params;

  const recent: string[] = [];
  const consolidated: string[] = [];
  const newArr: string[] = [];

  for (const key of dueKeys) {
    switch (classifyVerse(reviews[key])) {
      case "consolidated":
        consolidated.push(key);
        break;
      case "recent":
        recent.push(key);
        break;
      default:
        newArr.push(key);
    }
  }

  const newDue = newArr.length;
  const newAllowed = Math.min(newDue, Math.max(0, newVerseCap - newVersesIntroducedToday));
  const order = recent.concat(consolidated, newArr.slice(0, newAllowed));

  return {
    order,
    counts: { new: newDue, recent: recent.length, consolidated: consolidated.length },
    dueTotal: dueKeys.length,
    newDue,
    newAllowed,
  };
}
