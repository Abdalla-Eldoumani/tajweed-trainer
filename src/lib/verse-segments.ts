// Pure word-boundary chunk math for the segment-memorization drill. The single
// source of how a verse's REAL word count is split into contiguous chunks so the
// drill can reveal one chunk at a time and chain them. This is count math only:
// it never reads verse text, word text, audio segments, or storage, so it is
// safe on server and client and the `src/lib/**` coverage gate exercises it
// directly (mirrors verse-chaining.ts / memorization-scope.ts).
//
// A WordChunk is an inclusive, 0-based index range into the verse's REAL words,
// the words that remain once the trailing ayah-"end" marker is dropped from
// the word list, so index 0 is the first real word.
//
// no-split rule: a verse no longer than one chunk (a one-word verse, or a
// verse whose word count is <= the chunk size) yields a SINGLE chunk == the whole
// verse. The splitter never fabricates a boundary the word count does not
// support; the drill presents such a verse whole and says as much (isSplittable
// is false). A degenerate size (0/negative/fractional) clamps to a floor of 1 and
// never throws; a non-positive count yields no chunks.

export interface WordChunk {
  startWordIdx: number; // inclusive, 0-based index into the verse's real words
  endWordIdx: number; // inclusive, 0-based
}

// The auto default: 4 words per chunk. Learner-adjustable in-session (see
// CHUNK_SIZE_PRESETS); non-load-bearing, so a different value only changes how
// many chunks a verse has, never correctness.
export const DEFAULT_CHUNK_SIZE = 4;

// The sizes the drill offers the learner. The default is one of these.
export const CHUNK_SIZE_PRESETS = [3, 4, 5] as const;

// Split `wordCount` real words into contiguous chunks of `chunkSize`, the last
// chunk holding the remainder. Both arguments are floored and clamped
// (wordCount to >= 0, chunkSize to >= 1) so a degenerate or fractional input can
// never throw or spin: the size floor keeps the loop advancing and a zero count
// short-circuits to []. The final chunk's end is pinned to the last real index,
// so no boundary the word count does not support is ever produced.
export function splitIntoChunks(wordCount: number, chunkSize: number): WordChunk[] {
  const n = Math.max(0, Math.floor(wordCount || 0));
  const size = Math.max(1, Math.floor(chunkSize || 0));
  if (n === 0) return [];
  const chunks: WordChunk[] = [];
  for (let start = 0; start < n; start += size) {
    chunks.push({ startWordIdx: start, endWordIdx: Math.min(start + size - 1, n - 1) });
  }
  return chunks;
}

// Whether the verse splits into more than one chunk — the drill shows the verse
// whole and says "no split" when this is false (messaging). A one-word or
// short verse, and an empty verse, are all non-splittable.
export function isSplittable(wordCount: number, chunkSize: number): boolean {
  return splitIntoChunks(wordCount, chunkSize).length > 1;
}
