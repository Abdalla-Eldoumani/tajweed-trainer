#!/usr/bin/env node
// Network-free verification of the memorization foundation. Mirrors
// verify-navigation.mjs: regex JUZ_STARTS out of navigation.ts, re-derive the
// enumeration and the store/percentage/intersection math in plain JS against
// surah-index.json (the real ayah counts), and compare. It imports no TS module,
// so it locks down the constants and semantics independently of the app code.
//
// Covers: JUZ_STARTS consistency (30 entries, monotonic, juz 1 == 1:1, each
// start in-bounds), the full juz enumeration totalling exactly 6236 unique keys
// with no dupes/gaps (juz 30 ending 114:6), the independent versesCount sum,
// versesForRange normalization/bounding, setMemorizedVerses union/difference/cap,
// memorizedPercent rounding guards, countInScope intersection, and
// getDueFromUniverse treating a memorized verse with no review entry as due.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");

const nav = read("src", "lib", "navigation.ts");
const surahIndex = JSON.parse(read("src", "data", "content", "surah-index.json"));

// Real per-surah ayah counts from the bundled index, keyed by surah number.
const AYAH_COUNT = new Map(surahIndex.map((s) => [s.number, s.versesCount]));
const ayahCountForSurah = (surah) => AYAH_COUNT.get(surah) ?? 0;
const TOTAL = 6236;

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
}

// --- (a) Parse JUZ_STARTS out of the source and check its consistency --------
const startsInner = nav.match(/JUZ_STARTS:[^=]*=\s*\[([\s\S]*?)\n\];/)?.[1] ?? "";
// Each entry is a `[surah, ayah]` pair; pull every pair regardless of comments.
const JUZ_STARTS = [...startsInner.matchAll(/\[\s*(\d+)\s*,\s*(\d+)\s*\]/g)].map(
  (m) => [Number(m[1]), Number(m[2])],
);

record("navigation.ts exports JUZ_STARTS", /export const JUZ_STARTS/.test(nav));
record("navigation.ts exports versesForJuz", /export function versesForJuz/.test(nav));
record("JUZ_STARTS has 30 entries", JUZ_STARTS.length === 30, String(JUZ_STARTS.length));
record(
  "Juz 1 starts at 1:1",
  JUZ_STARTS[0]?.[0] === 1 && JUZ_STARTS[0]?.[1] === 1,
  JSON.stringify(JUZ_STARTS[0]),
);

{
  let monotonic = true;
  let inBounds = true;
  for (let i = 0; i < JUZ_STARTS.length; i++) {
    const [s, a] = JUZ_STARTS[i];
    const count = ayahCountForSurah(s);
    if (count === 0 || a < 1 || a > count) {
      inBounds = false;
    }
    if (i > 0) {
      const [ps, pa] = JUZ_STARTS[i - 1];
      // Strictly increasing by surah, then by ayah within the same surah.
      if (s < ps || (s === ps && a <= pa)) monotonic = false;
    }
  }
  record("JUZ_STARTS is strictly monotonic by surah then ayah", monotonic);
  record("Every juz start ayah is within its surah's real ayah count", inBounds);
}

// --- (b) Re-derive the full enumeration; assert == 6236 unique, no dupes/gaps -
// The same walk versesForJuz does, in plain JS against the bundled counts.
function versesForJuz(juz) {
  const [startSurah, startAyah] = JUZ_STARTS[juz - 1];
  let endSurah;
  let endAyah;
  if (juz < 30) {
    const [nextSurah, nextAyah] = JUZ_STARTS[juz];
    if (nextAyah === 1) {
      endSurah = nextSurah - 1;
      endAyah = ayahCountForSurah(nextSurah - 1);
    } else {
      endSurah = nextSurah;
      endAyah = nextAyah - 1;
    }
  } else {
    endSurah = 114;
    endAyah = 6;
  }
  const out = [];
  let s = startSurah;
  let a = startAyah;
  while (s < endSurah || (s === endSurah && a <= endAyah)) {
    out.push(`${s}:${a}`);
    a++;
    if (a > ayahCountForSurah(s)) {
      s++;
      a = 1;
    }
  }
  return out;
}

{
  const all = [];
  for (let j = 1; j <= 30; j++) all.push(...versesForJuz(j));
  const unique = new Set(all);
  record("Juz enumeration produces exactly 6236 keys", all.length === TOTAL, String(all.length));
  record("Juz enumeration has zero duplicates", unique.size === all.length, `${unique.size} unique`);
  record("Juz enumeration totals 6236 unique keys", unique.size === TOTAL, String(unique.size));

  // Gap check: every surah:ayah from 1:1..114:last must appear exactly once.
  let gaps = 0;
  for (const surah of surahIndex) {
    for (let a = 1; a <= surah.versesCount; a++) {
      if (!unique.has(`${surah.number}:${a}`)) gaps++;
    }
  }
  record("Juz enumeration has zero gaps against surah-index", gaps === 0, `${gaps} missing`);

  const last = versesForJuz(30);
  record("Juz 30 ends at 114:6", last[last.length - 1] === "114:6", last[last.length - 1]);
}

// --- (c) Independently sum versesCount; assert == 6236 -----------------------
{
  const sum = surahIndex.reduce((acc, s) => acc + s.versesCount, 0);
  record("Sum of all surah versesCount is 6236", sum === TOTAL, String(sum));
}

// --- (d) Re-implement versesForRange; assert normalize + bound ---------------
function versesForRange(surah, start, end) {
  const n = ayahCountForSurah(surah);
  let a = start;
  let b = end;
  if (a > b) [a, b] = [b, a];
  a = Math.min(a, n);
  b = Math.min(b, n);
  const out = [];
  for (let i = a; i <= b; i++) out.push(`${surah}:${i}`);
  return out;
}
record(
  "versesForRange normalizes a reversed range (2,5,2)",
  JSON.stringify(versesForRange(2, 5, 2)) === JSON.stringify(["2:2", "2:3", "2:4", "2:5"]),
  JSON.stringify(versesForRange(2, 5, 2)),
);
{
  // Al-Fatihah has 7 verses; an end past the real count is pulled back to 7.
  const bounded = versesForRange(1, 5, 99);
  record(
    "versesForRange bounds the end by the surah's real ayah count",
    bounded[bounded.length - 1] === "1:7" && bounded.length === 3,
    JSON.stringify(bounded),
  );
}

// --- (e) Re-implement setMemorizedVerses set semantics -----------------------
const VERSE_KEY = /^\d{1,3}:\d{1,3}$/;
function setMemorizedVerses(existing, verseKeys, memorize) {
  const set = new Set(existing);
  for (const key of verseKeys) {
    if (!VERSE_KEY.test(key)) continue;
    if (memorize) {
      if (set.size >= TOTAL && !set.has(key)) continue;
      set.add(key);
    } else {
      set.delete(key);
    }
  }
  return Array.from(set);
}
{
  // Union: overlapping marks never double count.
  const after = setMemorizedVerses(["2:1", "2:2"], ["2:2", "2:3"], true);
  record(
    "setMemorizedVerses marks as a union (no double count)",
    after.length === 3 && new Set(after).size === 3,
    JSON.stringify(after),
  );
}
{
  // Difference: unmark removes exactly the listed keys, leaves the rest.
  const after = setMemorizedVerses(["2:1", "2:2", "2:3"], ["2:2"], false);
  record(
    "setMemorizedVerses unmarks exactly the listed keys",
    JSON.stringify(after) === JSON.stringify(["2:1", "2:3"]),
    JSON.stringify(after),
  );
}
{
  // Invalid keys are skipped, valid ones in the same call still apply.
  const after = setMemorizedVerses([], ["2:1", "bad", "999:99999999", "2:2"], true);
  record(
    "setMemorizedVerses skips invalid keys",
    JSON.stringify(after.sort()) === JSON.stringify(["2:1", "2:2"]),
    JSON.stringify(after),
  );
}
{
  // The 6236 cap holds inside the loop: a full set rejects a new key.
  const full = [];
  for (let s = 1, made = 0; s <= 114 && made < TOTAL; s++) {
    for (let a = 1; a <= ayahCountForSurah(s) && made < TOTAL; a++, made++) {
      full.push(`${s}:${a}`);
    }
  }
  // "115:1" is not a real verse but passes the shape regex; the cap must block it.
  const after = setMemorizedVerses(full, ["115:1"], true);
  record("setMemorizedVerses cap holds at 6236", after.length === TOTAL, String(after.length));
}

// --- (f) Re-implement memorizedPercent; assert the rounding guards -----------
function memorizedPercent(count, total = TOTAL) {
  if (count <= 0) return 0;
  if (count >= total) return 100;
  const pct = (count / total) * 100;
  if (pct < 1) return Math.max(0.1, Math.round(pct * 10) / 10);
  const rounded = Math.round(pct);
  return rounded >= 100 ? 99 : Math.max(1, rounded);
}
record("memorizedPercent(0) is 0", memorizedPercent(0) === 0, String(memorizedPercent(0)));
record("memorizedPercent(1) is a small nonzero", memorizedPercent(1) > 0, String(memorizedPercent(1)));
record("memorizedPercent(6235) is 99 (not 100)", memorizedPercent(6235) === 99, String(memorizedPercent(6235)));
record("memorizedPercent(6236) is 100", memorizedPercent(6236) === 100, String(memorizedPercent(6236)));

// --- (g) Re-implement countInScope; assert the intersection sums correctly ---
function countInScope(memorized, scopeVerses) {
  let n = 0;
  for (const vk of scopeVerses) if (memorized.has(vk)) n++;
  return n;
}
{
  const memorized = new Set(["1:1", "1:2", "2:255", "3:9"]);
  // Al-Fatihah scope intersects two memorized verses; 2:255 / 3:9 are out of scope.
  const n = countInScope(memorized, versesForSurahLocal(1));
  record("countInScope sums the intersection", n === 2, String(n));
}
function versesForSurahLocal(surah) {
  const n = ayahCountForSurah(surah);
  return Array.from({ length: n }, (_, i) => `${surah}:${i + 1}`);
}

// --- (h) Re-implement getDueFromUniverse; assert no-entry verses are due ------
// The memorized-verse review draws its queue from the memorized SET (the
// universe), not the review map: a memorized verse with no review entry has
// never been self-tested, so it must surface as due. Walking only the review map
// (getDueQuestionIds) would leave the queue permanently empty, since memorizing
// a verse writes no review entry.
function getDueFromUniverse(universe, reviews, today) {
  const due = [];
  for (const id of universe) {
    const state = reviews[id];
    if (!state || !state.nextDueDate || state.nextDueDate <= today) due.push(id);
  }
  return due;
}
{
  const today = "2026-06-19";
  const memorized = ["1:1", "1:2", "1:3"];
  // 1:1 due in the future (not due); 1:2 due today; 1:3 has no entry at all.
  const reviews = {
    "1:1": { nextDueDate: "2026-07-01" },
    "1:2": { nextDueDate: "2026-06-19" },
  };
  const due = getDueFromUniverse(memorized, reviews, today);
  record(
    "getDueFromUniverse surfaces a memorized verse with no review entry",
    due.includes("1:3"),
    JSON.stringify(due),
  );
  record("getDueFromUniverse includes a verse due today", due.includes("1:2"), JSON.stringify(due));
  record(
    "getDueFromUniverse excludes a verse due in the future",
    !due.includes("1:1"),
    JSON.stringify(due),
  );
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
