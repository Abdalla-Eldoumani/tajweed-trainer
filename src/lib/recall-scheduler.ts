import type { RecallGrade, ReviewBox, ReviewState, Sm2State } from "./types";

// Pure SuperMemo SM-2 recall curve for memorized-verse review. This is the
// SINGLE source of the recall schedule: the storage sanitizer, the stats module,
// and the review hook consume it and never fork it. Framework-agnostic on
// purpose (no React / next / storage import) so recall-scheduler.test.ts
// exercises it directly, mirroring spaced-repetition.ts / khatmah.ts.
//
// Updated-EF' ordering: easeFactor is updated FIRST, then the
// interval is computed with the new EF' (`round(prev * EF')`). This is Wozniak's
// original SuperMemo formulation and the only ordering that makes the four-button
// interval preview distinct and monotonic (again < hard < good < easy).

// Quality grade per button. `again` is a fail (q < 3): it resets the repetition
// count and interval but still applies the EF penalty (EF carries forward,
// penalized, never reset to 2.5). again -> q2 (EF -0.32) rather than q0 (-0.80)
// keeps two early misses recoverable instead of cratering to the floor.
const Q: Record<RecallGrade, number> = { again: 2, hard: 3, good: 4, easy: 5 };

// SM-2 constants. INITIAL_EF/MIN_EF are the algorithm invariants; MAX_EF and
// MAX_INTERVAL are the tamper bounds the storage sanitizer (sanitizeSm2)
// applies at the trust boundary. Exported so those bounds have one source.
export const INITIAL_EF = 2.5;
export const MIN_EF = 1.3;
export const MAX_EF = 5.0; // tamper ceiling, enforced in sanitizeSm2
export const MAX_INTERVAL = 36500; // ~100 years, Anki's default interval cap

// "mastered" for SM-2: a consolidated verse has survived to a >= 21-day interval
// (the SRS-standard mature-card line). Exported for the stats module.
export const MASTERED_INTERVAL_DAYS = 21;

// Leitner interval table, copied locally (NOT imported from spaced-repetition.ts,
// which value-imports storage and would break this lib's purity). Mirrors the
// private const there; used only by migrateLeitnerToSm2 to seed intervalDays.
const LEITNER_INTERVALS: Record<ReviewBox, number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

// Local ISO-date helpers, copied verbatim from spaced-repetition.ts (L17-25).
// toLocaleDateString("en-CA") yields local-time YYYY-MM-DD, matching the app's
// due-today convention; a UTC toISOString would drift off-by-one near midnight.
function toIsoDate(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

interface GradeComputation {
  efNext: number;
  repsNext: number;
  baseInterval: number; // PURE, un-modified
  passed: boolean;
}

// The core SM-2 step, without dates or the modifier, so gradeRecall and
// previewIntervals share exactly one interval derivation and can never diverge.
function computeGrade(prev: Sm2State | undefined, grade: RecallGrade): GradeComputation {
  const q = Q[grade];
  const passed = q >= 3;
  const n = prev?.repetitions ?? 0; // PRE-increment repetition count
  const ef = prev?.easeFactor ?? INITIAL_EF;
  const prevInterval = prev?.intervalDays ?? 0;

  // 1. Update EF first (applies to every grade, including fails), clamp to floor.
  let efNext = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (efNext < MIN_EF) efNext = MIN_EF;

  // 2. Repetitions + PURE base interval, using the pre-increment count n.
  let repsNext: number;
  let baseInterval: number;
  if (!passed) {
    // q < 3: relearn reset. Interval back to 1 day, reps to 0; EF still penalized.
    repsNext = 0;
    baseInterval = 1;
  } else {
    repsNext = n + 1;
    if (n === 0) baseInterval = 1; // first success (fixed)
    else if (n === 1) baseInterval = 6; // second success (fixed, NOT round(1*EF))
    else baseInterval = Math.round(prevInterval * efNext); // updated-EF' ordering
  }
  if (baseInterval > MAX_INTERVAL) baseInterval = MAX_INTERVAL;

  return { efNext, repsNext, baseInterval, passed };
}

// The balanced modifier scales ONLY the due-date interval, never the stored pure
// intervalDays and never easeFactor. Guard non-finite input so a bad modifier
// can never NaN a due date; Math.max(1, ...) so the offset is never zero/negative.
function effectiveInterval(baseInterval: number, modifier: number): number {
  const safeMod = Number.isFinite(modifier) ? modifier : 1.0;
  return Math.max(1, Math.round(baseInterval * safeMod));
}

// Grade a recall and return the next SM-2 state. `now` and `modifier` are passed
// in so the lib stays deterministic and testable. The stored intervalDays is the
// PURE base interval; the modifier is applied only to nextDueDate, so it never
// compounds across reviews.
export function gradeRecall(
  prev: Sm2State | undefined,
  grade: RecallGrade,
  now: Date = new Date(),
  modifier = 1.0,
): Sm2State {
  const { efNext, repsNext, baseInterval, passed } = computeGrade(prev, grade);
  const effective = effectiveInterval(baseInterval, modifier);
  return {
    repetitions: repsNext,
    easeFactor: efNext,
    intervalDays: baseInterval,
    nextDueDate: toIsoDate(addDays(now, effective)),
    lastReviewedDate: toIsoDate(now),
    timesSeen: (prev?.timesSeen ?? 0) + 1,
    timesCorrect: (prev?.timesCorrect ?? 0) + (passed ? 1 : 0),
    lapses: (prev?.lapses ?? 0) + (passed ? 0 : 1),
  };
}

// The EFFECTIVE (modifier-applied, min-1) day count each button would produce,
// for the per-button preview label. Reuses computeGrade + effectiveInterval so
// previewIntervals(prev, m).good always equals gradeRecall(prev,"good",_,m)'s
// effective interval.
export function previewIntervals(
  prev: Sm2State | undefined,
  modifier = 1.0,
): Record<RecallGrade, number> {
  return {
    again: effectiveInterval(computeGrade(prev, "again").baseInterval, modifier),
    hard: effectiveInterval(computeGrade(prev, "hard").baseInterval, modifier),
    good: effectiveInterval(computeGrade(prev, "good").baseInterval, modifier),
    easy: effectiveInterval(computeGrade(prev, "easy").baseInterval, modifier),
  };
}

// Lossless Leitner-box -> SM-2 migration. Preserves the learner's position: the
// nextDueDate is copied VERBATIM (migration never changes WHEN a verse is next
// due), repetitions = box, intervalDays = the box's Leitner interval, a neutral
// easeFactor 2.5 (no history to derive it). A box-5 verse does not regress: its
// next passing grade grows the interval (round(30 * 2.5) = 75 > 30). Pure; the
// storage sanitizer feeds an already-bounded ReviewState in.
export function migrateLeitnerToSm2(old: ReviewState): Sm2State {
  return {
    repetitions: old.box,
    easeFactor: INITIAL_EF,
    intervalDays: LEITNER_INTERVALS[old.box],
    nextDueDate: old.nextDueDate,
    lastReviewedDate: old.lastSeenDate,
    timesSeen: old.timesSeen,
    timesCorrect: old.timesCorrect,
    lapses: 0,
  };
}
