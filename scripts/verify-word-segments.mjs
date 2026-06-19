#!/usr/bin/env node
// Word-segment timing verification (offline, deterministic). Locks the contract
// the word-sync highlight depends on: the Quran.com v4 segment shape
// [wordStartIndex, wordEndIndexExclusive, startMs, endMs] and the
// time-to-word lookup. The sample below is a real captured response for verse
// 1:2 with recitation id 12 (Al-Husary, the default reciter), confirmed live on
// 2026-06-13. The algorithm mirrors activeWordIndex() in src/lib/audio-api.ts,
// which tsc type-checks; this guards its behavior without a running browser.

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

// Real captured segments: verse 1:2, reciter 12 (4 words). Each tuple is
// [wordStartIndex, wordEndIndexExclusive, startMs, endMs].
const SAMPLE = [
  [0, 1, 250, 1060],
  [1, 2, 1070, 1950],
  [2, 3, 1960, 2660],
  [3, 4, 2670, 4360],
];

// Mirror of activeWordIndex() in src/lib/audio-api.ts.
function activeWordIndex(segments, ms) {
  for (const [startWord, , startMs, endMs] of segments) {
    if (ms >= startMs && ms < endMs) return startWord;
  }
  return -1;
}

// 1. Shape: every entry is a 4-tuple of numbers.
const shapeOk = SAMPLE.every((s) => Array.isArray(s) && s.length === 4 && s.every((n) => typeof n === "number"));
record("segment entries are 4-number tuples", shapeOk, `count: ${SAMPLE.length}`);

// 2. Word indices are 0-based and contiguous.
const idxOk = SAMPLE.every((s, i) => s[0] === i && s[1] === i + 1);
record("word indices are 0-based and contiguous", idxOk);

// 3. Times are non-negative and non-overlapping in order.
let timesOk = true;
for (let i = 0; i < SAMPLE.length; i++) {
  const [, , start, end] = SAMPLE[i];
  if (start < 0 || end <= start) timesOk = false;
  if (i > 0 && start < SAMPLE[i - 1][3]) timesOk = false;
}
record("segment times are ordered and non-overlapping", timesOk);

// 4. The lookup picks the right word mid-segment.
const cases = [
  { ms: 690, word: 0 },
  { ms: 1470, word: 1 },
  { ms: 2280, word: 2 },
  { ms: 3070, word: 3 },
  { ms: 4359, word: 3 },
];
let hitOk = true;
for (const c of cases) {
  const got = activeWordIndex(SAMPLE, c.ms);
  if (got !== c.word) { hitOk = false; record(`lookup ${c.ms}ms -> word ${c.word}`, false, `got ${got}`); }
}
record("lookup picks the active word at sampled times", hitOk);

// 5. Outside any segment (before the first / after the last / in a gap) -> -1.
const missOk = activeWordIndex(SAMPLE, 0) === -1 && activeWordIndex(SAMPLE, 200) === -1 &&
  activeWordIndex(SAMPLE, 5000) === -1 && activeWordIndex(SAMPLE, 1065) === -1;
record("lookup returns -1 outside any segment (silent fallback)", missOk);

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} word-segment checks passed.`);
process.exit(passed === results.length ? 0 : 1);
