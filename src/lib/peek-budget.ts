// Pure peek-budget arithmetic for the blind-recall review (BLIND-03). The single
// source of how many hints remain in a review session and whether a given verse
// has been peeked. This is count math over the persisted `sessionPeekUsed` map
// only: it imports nothing from React/next/`@/lib/storage`/DOM, so it is safe on
// server and client and the `src/lib/**` coverage gate exercises it directly
// (mirrors memorization-scope.ts / khatmah.ts / verse-segments.ts).
//
// `sessionPeekUsed` is a Record<verseKey, count> ("surah:ayah" -> times peeked,
// count >= 1). The consumer never imports storage; it passes the read map in.
// Signatures are map-FIRST (the CONTEXT lock), which differs from the RESEARCH
// prose example that wrote the budget first — honor the lock.

// How many peeks remain: the budget minus the number of DISTINCT peeked verses
// (Object.keys length), NOT the sum of counts, floored at 0. Counting distinct
// keys means a tampered `{"1:1": 99}` still consumes only one of the budget, and
// the Math.max keeps the result from ever going negative when more verses were
// peeked than the budget allows. In the real flow a verse is peeked at most once
// (after a peek its text stays revealed), so distinct-key counting matches use.
export function peekRemaining(
  sessionPeekUsed: Record<string, number>,
  budget: number,
): number {
  return Math.max(0, budget - Object.keys(sessionPeekUsed).length);
}

// Whether this verse was peeked this session: true only when it has a stored
// count > 0. A missing key or a zero count reads as "not peeked", so the grade
// cap never fires on a verse the learner recalled unaided.
export function wasPeeked(
  sessionPeekUsed: Record<string, number>,
  verseKey: string,
): boolean {
  return (sessionPeekUsed[verseKey] ?? 0) > 0;
}
