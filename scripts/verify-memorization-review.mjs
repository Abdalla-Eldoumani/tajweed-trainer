#!/usr/bin/env node
// Memorization-review stats verification. The shipped getMemorizationReviewStats
// (src/lib/memorization-review.ts) reuses getDueFromUniverse from
// spaced-repetition.ts, which has a value import of ./storage and so does NOT
// load under bare node. Like verify-memorization.mjs (which re-implements
// getDueFromUniverse for the same reason), this guard re-implements the pure
// stats logic and asserts the due/total/mastered math against synthetic inputs.
// The shipped lib reuses the real Leitner curve (no fork in app code); this
// guard locks the intended behavior, the case that matters most being landmine
// G: a memorized verse with no review entry has never been self-tested, so
// getReviewStats (which walks only the review map) would never count it — these
// stats are over the memorized UNIVERSE, so a never-reviewed memorized verse is
// both due and part of total, and a review entry for an unmemorized verse is
// ignored entirely.

const MASTERY_BOX = 5;
const toIsoDate = (d) => d.toISOString().slice(0, 10);

// Mirrors getDueFromUniverse (spaced-repetition.ts:75): a verse is due when it
// has no review state, no nextDueDate, or its nextDueDate is on/before today.
function getDueFromUniverse(universe, reviews, now) {
  const today = toIsoDate(now);
  const due = [];
  for (const id of universe) {
    const state = reviews[id];
    if (!state || !state.nextDueDate || state.nextDueDate <= today) due.push(id);
  }
  return due;
}

// Mirrors getMemorizationReviewStats (memorization-review.ts): total over the
// memorized universe, due via getDueFromUniverse, mastered = box-5 count.
function getMemorizationReviewStats(memorized, reviews, now = new Date()) {
  const keys = [...memorized];
  const total = keys.length;
  const due = getDueFromUniverse(keys, reviews, now).length;
  let mastered = 0;
  for (const key of keys) {
    if (reviews[key]?.box === MASTERY_BOX) mastered += 1;
  }
  return { due, total, mastered };
}

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

const today = new Date("2026-06-21");
const rev = (box, due) => ({ box, nextDueDate: due, lastSeenDate: "", timesSeen: 1, timesCorrect: 1 });
const PAST = "2020-01-01"; // <= today -> due
const FUTURE = "2999-01-01"; // > today -> not due

// 1. Empty memorized set -> all zero.
{
  const s = getMemorizationReviewStats([], {}, today);
  record("empty memorized -> { total: 0, due: 0, mastered: 0 }", s.total === 0 && s.due === 0 && s.mastered === 0, JSON.stringify(s));
}

// 2. Landmine G: one memorized verse with NO review entry is DUE and counted.
{
  const s = getMemorizationReviewStats(["2:255"], {}, today);
  record("single never-reviewed memorized verse -> total 1, due 1, mastered 0", s.total === 1 && s.due === 1 && s.mastered === 0, JSON.stringify(s));
}

// 3. Mixed: 1:1 box5 future (mastered, not due); 1:2 box5 past (mastered AND due);
//    1:3 box2 past (due, not mastered); 1:4 no entry (due).
{
  const reviews = { "1:1": rev(5, FUTURE), "1:2": rev(5, PAST), "1:3": rev(2, PAST) };
  const memorized = ["1:1", "1:2", "1:3", "1:4"];
  const s = getMemorizationReviewStats(memorized, reviews, today);
  record("mixed -> total is the memorized count (4)", s.total === 4, JSON.stringify(s));
  record("mixed -> mastered counts only box 5 (2)", s.mastered === 2, JSON.stringify(s));
  record("mixed -> due counts past-due + never-reviewed (3)", s.due === 3, JSON.stringify(s));
  const withoutNeverReviewed = getMemorizationReviewStats(["1:1", "1:2", "1:3"], reviews, today);
  record("mixed -> due includes the never-reviewed memorized verse", s.due === withoutNeverReviewed.due + 1, `${s.due} vs ${withoutNeverReviewed.due}`);
}

// 4. All box 5 future-dated -> due 0, mastered === total.
{
  const reviews = { "2:1": rev(5, FUTURE), "2:2": rev(5, FUTURE), "2:3": rev(5, FUTURE) };
  const s = getMemorizationReviewStats(["2:1", "2:2", "2:3"], reviews, today);
  record("all box 5 future -> due 0", s.due === 0, JSON.stringify(s));
  record("all box 5 future -> mastered === total (3)", s.mastered === s.total && s.total === 3, JSON.stringify(s));
}

// 5. A review entry for a verseKey NOT in the memorized set is ignored.
{
  const reviews = { "3:1": rev(5, FUTURE), "9:99": rev(5, PAST) };
  const s = getMemorizationReviewStats(["3:1"], reviews, today);
  record("unmemorized review entry ignored -> total 1, mastered 1, due 0", s.total === 1 && s.mastered === 1 && s.due === 0, JSON.stringify(s));
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} memorization-review checks passed.`);
process.exit(passed === results.length ? 0 : 1);
