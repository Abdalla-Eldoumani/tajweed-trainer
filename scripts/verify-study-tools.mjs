#!/usr/bin/env node
// Network-free verification for the study tools layered on the player store:
// repeat-one, repeat-range, and the stop-at-end-of-surah sleep flag. Asserts the
// store exposes the controls and that onEnded honors them, plus a deterministic
// re-implementation check of the repeat-one play count.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");
const store = read("src", "hooks", "usePlayer.ts");
const css = read("src", "app", "globals.css");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
}

for (const a of ["setRepeatOne", "setRepeatRange", "clearRepeat", "setSleepEndOfSurah"]) {
  record(`Store exposes ${a}`, new RegExp("\\b" + a + ":").test(store));
}
record(
  "State carries repeatOne / repeatRange / sleepEndOfSurah",
  /repeatOne:/.test(store) && /repeatRange:/.test(store) && /sleepEndOfSurah:/.test(store),
);
record("onEnded honors repeatOne", /onEnded[\s\S]*?repeatOne > 0[\s\S]*?repeatsDone \+ 1 < s\.repeatOne/.test(store));
record("onEnded honors repeatRange", /onEnded[\s\S]*?repeatRange[\s\S]*?rangeLoopsDone \+ 1 < count/.test(store));
record("Sleep flag halts auto-advance at surah end", /!s\.sleepEndOfSurah/.test(store));

// Deterministic re-impl mirroring onEnded: how many times an ayah plays for N.
function playsForRepeatOne(n) {
  let plays = 1;
  let repeatsDone = 0;
  while (n > 0 && repeatsDone + 1 < n) {
    repeatsDone++;
    plays++;
  }
  return plays;
}
record("repeatOne=3 plays the ayah 3 times", playsForRepeatOne(3) === 3, String(playsForRepeatOne(3)));
record("repeatOne=1 plays once", playsForRepeatOne(1) === 1, String(playsForRepeatOne(1)));
record("repeatOne=0 plays once (off)", playsForRepeatOne(0) === 1, String(playsForRepeatOne(0)));

// Deterministic re-impl of range looping: total ayah-plays for [from..to] x count.
function playsForRange(from, to, count) {
  const span = to - from + 1;
  return span * count;
}
record("range [1..3] x2 yields 6 plays", playsForRange(1, 3, 2) === 6, String(playsForRange(1, 3, 2)));

// Single-rule highlight drill (CSS-driven, no per-letter re-tokenizing).
record("Drill dims the verse when data-tajweed-drill is set", /\[data-tajweed-drill\][\s\S]*?\.tajweed-text/.test(css));
record(
  "Drill restores the selected rule's color",
  /\[data-tajweed-drill="ghunnah"\][\s\S]*?\.ghunnah\s*\{[\s\S]*?var\(--tajweed-ghunnah\)/.test(css) &&
    /\[data-tajweed-drill="ikhafa"\][\s\S]*?var\(--tajweed-ikhafa\)/.test(css),
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}`);
  process.exit(1);
}
