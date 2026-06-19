// Pure advance decision and queue builders for the verse-playback engine. No
// React, no next, no zustand, no DOM, same rule as player-position.ts, so the
// store imports it AND a plain Node verify script
// (scripts/verify-player-engine.mjs) exercises it directly via TS type-stripping.
//
// This module owns the state-machine arithmetic only. usePlayer.onEnded builds a
// snapshot and applies the returned decision; PlayerHost schedules any
// inter-verse gap timer. Keeping the math here makes the most fragile area of the
// codebase (the onEnded precedence) deterministically testable in isolation.

export interface QueueItem {
  surah: number;
  ayah: number;
}

// A contiguous verse range within ONE surah. Inclusive of both ends; normalizes
// when from > to (swap) so the queue is never empty or reversed; a single verse
// yields a one-item queue. The single-surah rule matches repeatRange's
// index===ayah-1 assumption, so a range built here can be walked by ayah number.
export function buildRangeQueue(surah: number, from: number, to: number): QueueItem[] {
  const s = Math.max(1, Math.floor(surah));
  let lo = Math.max(1, Math.floor(from));
  let hi = Math.max(1, Math.floor(to));
  if (lo > hi) {
    const tmp = lo;
    lo = hi;
    hi = tmp;
  }
  const q: QueueItem[] = [];
  for (let a = lo; a <= hi; a++) q.push({ surah: s, ayah: a });
  return q;
}

// Order-stable de-dup for a hand-picked, possibly non-contiguous set, so adding
// the same verse twice never doubles it. First occurrence wins; order preserved.
export function dedupeQueue(items: QueueItem[]): QueueItem[] {
  const seen = new Set<string>();
  const out: QueueItem[] = [];
  for (const it of items) {
    const key = `${it.surah}:${it.ayah}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ surah: it.surah, ayah: it.ayah });
  }
  return out;
}

// The snapshot the store hands the decision: exactly the fields onEnded inspects.
export interface EndedSnapshot {
  repeatOne: number;
  repeatsDone: number;
  repeatRange: { from: number; to: number; count: number } | null;
  rangeLoopsDone: number;
  loopSelection: boolean;
  mode: "single" | "continuous";
  index: number;
  queueLength: number;
  currentAyah: number;
  sleepEndOfSurah: boolean;
}

// The discriminated decision the store applies in onEnded. The store maps each
// kind onto the same field writes it does today (index/status/loadToken bump),
// so existing paths stay byte-for-byte equivalent and only loopSelection is new.
export type EndedDecision =
  | { kind: "repeat-one" }
  | { kind: "advance"; index: number }
  | { kind: "loop-range"; index: number }
  | { kind: "loop-selection"; index: number }
  | { kind: "stop"; status: "paused" | "idle" };

// Decide what happens when the current item ends. Precedence, highest first:
//   1. repeatOne   : loop the current ayah until repeatsDone+1 reaches the count.
//   2. repeatRange : walk from..to by ayah, then loop the range `count` times
//                    (the existing ayah-based loop; assumes index===ayah-1).
//   3. loopSelection : NEW whole-queue loop: step to index+1, and at the last
//                    index wrap back to 0. Works for ANY queue (contiguous or a
//                    hand-picked set); independent of repeatRange and never
//                    overloads it.
//   4. continuous  : auto-advance to index+1 unless the end-of-surah sleep flag
//                    is set.
//   5. stop        : single returns to "paused", continuous to "idle".
export function nextAfterEnded(s: EndedSnapshot): EndedDecision {
  // 1. Loop the current ayah a set number of times before moving on.
  if (s.repeatOne > 0 && s.repeatsDone + 1 < s.repeatOne) {
    return { kind: "repeat-one" };
  }

  // 2. Loop a verse range [from,to] `count` times, then stop. Mirrors the
  //    current onEnded exactly: step forward while inside the range, else loop
  //    back to the range start until the loop count is exhausted.
  if (s.repeatRange) {
    const { from, to, count } = s.repeatRange;
    if (s.currentAyah < to && s.index < s.queueLength - 1) {
      return { kind: "advance", index: s.index + 1 };
    }
    if (s.rangeLoopsDone + 1 < count) {
      return { kind: "loop-range", index: Math.max(0, from - 1) };
    }
    return { kind: "stop", status: "idle" };
  }

  // 3. Whole-selection loop: advance through the queue and wrap to 0 at the end.
  //    Distinct from repeatRange (PLAY-05); applies to any queue length.
  if (s.loopSelection && s.queueLength > 0) {
    if (s.index < s.queueLength - 1) {
      return { kind: "advance", index: s.index + 1 };
    }
    return { kind: "loop-selection", index: 0 };
  }

  // 4. Continuous mode auto-advances unless the sleep timer stops at surah end.
  if (s.mode === "continuous" && s.index < s.queueLength - 1 && !s.sleepEndOfSurah) {
    return { kind: "advance", index: s.index + 1 };
  }

  // 5. End of queue: single returns to paused, continuous goes idle.
  return { kind: "stop", status: s.mode === "single" ? "paused" : "idle" };
}
