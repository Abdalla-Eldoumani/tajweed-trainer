// Pure alignment gate and sub-verse loop arithmetic for the follow-along layer.
// No React, no next, no zustand, no DOM (same rule as player-engine.ts and
// player-position.ts), so the controller imports it AND a plain Node verify
// script can exercise it directly via TS type-stripping.
//
// This module owns the two genuinely-new, risky decisions of the phase in
// isolation: whether a verse's audio segments can be trusted to line up with its
// visual words (canAlign), and when a sub-verse word-range loop should seek back
// versus stop (subVerseLoopDecision). Keeping them here makes them deterministic
// to test offline; the controller and PlayerHost only apply the results.

import type { WordSegment } from "@/lib/audio-api";

// Segments are 0-based contiguous (verify-word-segments.mjs asserts
// s[i][0] === i && s[i][1] === i + 1), so the recited-word count is just the
// number of segments. An empty array is zero words.
export function wordCount(segments: WordSegment[]): number {
  return segments.length;
}

// The alignment gate. The colored markup is a flat run of per-letter spans with
// no word grouping, so the only way to highlight the "current word" over it is to
// trust that the audio segment count equals the visual word count. Equality is
// the conservative rule: any mismatch (the trailing ayah-number span is not a
// recited word, a pause/punctuation divergence, etc.) means we cannot say which
// visual word the active segment maps to, so the caller treats the verse as
// having no segments and renders the plain markup with NO highlight. A wrong-word
// highlight is worse than no highlight, so there is deliberately no fuzzy
// tolerance here.
export function canAlign(segmentCount: number, visualWordCount: number): boolean {
  return segmentCount > 0 && segmentCount === visualWordCount;
}

// The start/end ms for a sub-verse word range [startWord..endWord] inclusive, or
// null when an index is out of range or there are no segments. A reversed range
// is normalized (the caller's two pickers can be chosen in either order). The
// tuple is [startIdx, endIdxExcl, startMs, endMs], so the range's start time is
// the low word's startMs and its end time is the high word's endMs.
export function rangeBounds(
  segments: WordSegment[],
  startWord: number,
  endWord: number,
): { startMs: number; endMs: number } | null {
  if (segments.length === 0) return null;
  const lo = Math.min(startWord, endWord);
  const hi = Math.max(startWord, endWord);
  if (lo < 0 || hi >= segments.length) return null;
  return { startMs: segments[lo][2], endMs: segments[hi][3] };
}

// One iteration of the sub-verse loop, kept in-session by the player. count is
// the total number of passes the user asked for; done is how many have already
// finished. The audio element only fires onended at file end, so this is the
// stop-at-time seam: PlayerHost reads it in ontimeupdate to decide loop vs stop
// mid-verse without a second engine.
export interface SubVerseLoop {
  startMs: number;
  endMs: number;
  count: number;
  done: number;
}

export type SubVerseDecision =
  | { kind: "playing" }
  | { kind: "loop"; seekMs: number }
  | { kind: "stop" };

// The sub-verse loop decision at media time `ms` (the caller passes
// currentTime * 1000). While before the range end, keep playing. At or after the
// end, seek back to the start if more passes remain, else stop. A degenerate
// count (<= 0) is treated as a single pass that stops at the end, and an empty or
// inverted range (endMs <= startMs) stops immediately, so the loop can never run
// forever.
export function subVerseLoopDecision(loop: SubVerseLoop, ms: number): SubVerseDecision {
  if (loop.endMs <= loop.startMs) return { kind: "stop" };
  if (ms < loop.endMs) return { kind: "playing" };
  const passes = loop.count > 0 ? loop.count : 1;
  if (loop.done + 1 < passes) return { kind: "loop", seekMs: loop.startMs };
  return { kind: "stop" };
}
