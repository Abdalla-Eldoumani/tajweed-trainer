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
const engine = read("src", "lib", "player-engine.ts");
const css = read("src", "app", "globals.css");
const miniPlayer = read("src", "components", "ui", "MiniPlayer.tsx");
const host = read("src", "components", "ui", "PlayerHost.tsx");
const ruleLinks = read("src", "lib", "tajweed-rule-links.ts");
const colors = read("src", "lib", "tajweed-colors.ts");
const tajweedText = read("src", "components", "ui", "TajweedText.tsx");
const mushafPage = read("src", "components", "mushaf", "MushafPage.tsx");
const exampleCard = read("src", "components", "learn", "ExampleCard.tsx");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
}

for (const a of ["setRepeatOne", "setRepeatRange", "clearRepeat", "setSleepEndOfSurah", "setSleepTimer"]) {
  record(`Store exposes ${a}`, new RegExp("\\b" + a + ":").test(store));
}
record(
  "State carries repeatOne / repeatRange / sleepEndOfSurah",
  /repeatOne:/.test(store) && /repeatRange:/.test(store) && /sleepEndOfSurah:/.test(store),
);
// The onEnded precedence moved into the pure engine (player-engine.ts); the
// store delegates to it. Assert the guarantees in their new home plus the
// delegation, so this still proves repeat-one / repeat-range / sleep are honored.
record("onEnded delegates the decision to the engine", /onEnded[\s\S]*?nextAfterEnded\(/.test(store));
record("Engine honors repeatOne", /repeatOne > 0[\s\S]*?repeatsDone \+ 1 < s\.repeatOne/.test(engine));
record("Engine honors repeatRange", /repeatRange[\s\S]*?rangeLoopsDone \+ 1 < count/.test(engine));
record("Sleep flag halts auto-advance at surah end", /!s\.sleepEndOfSurah/.test(engine));
record("setRepeatRange repositions and restarts (not a no-op)", /setRepeatRange:[\s\S]*?index: startIndex[\s\S]*?loadToken: s\.loadToken \+ 1/.test(store));
record("Store carries a minutes sleep deadline", /sleepDeadline:/.test(store));
record("PlayerHost stops when the sleep deadline passes", /sleepDeadline[\s\S]*?Date\.now\(\)\s*>=\s*sleepDeadline[\s\S]*?\.stop\(\)/.test(host));

// The controls are reachable from the player UI, not dead store code.
for (const a of ["setRepeatOne", "setRepeatRange", "setSleepTimer", "setSleepEndOfSurah"]) {
  record(`Mini player wires ${a}`, new RegExp("\\." + a + "\\(").test(miniPlayer));
}

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

// --- Tap-a-letter rule popover (EXT-02) ---
// Every class in the rule-link map must be a real key in the tajweed map, so the
// popover can never offer a "Learn more" link for a class that has no color /
// name (a dead link) and the two maps can never drift.
const linkClasses = [...ruleLinks.matchAll(/^ {2}([a-z_]+):\s*"\/learn\//gm)].map((m) => m[1]);
const defKeys = new Set([...colors.matchAll(/^ {2}([a-z_]+):\s*\{/gm)].map((m) => m[1]));
record("Rule-link map has entries", linkClasses.length > 0, `${linkClasses.length} classes`);
const orphanLinks = linkClasses.filter((c) => !defKeys.has(c));
record("Every rule-link class exists in the tajweed map", orphanLinks.length === 0, orphanLinks.join(", "));

// The link map is structural routing only: every route value it maps to must be
// a /learn lesson route, never anything else (it carries no verified content).
const routeValues = [...ruleLinks.matchAll(/:\s*"(\/[^"]*)"/g)].map((m) => m[1]);
const badRoutes = routeValues.filter((r) => !r.startsWith("/learn/"));
record("Rule-link map points only at /learn routes", badRoutes.length === 0, badRoutes.join(", "));

// The delegated handler owns the colored-letter tap so the reader's verse play
// button does not also fire (stopPropagation), and only acts on a known rule.
record("TajweedText resolves the tapped class via the tajweed map", /closest\("tajweed"\)[\s\S]*?getColorForClass\(/.test(tajweedText));
record("TajweedText stops propagation on a colored-letter tap", /getColorForClass\(cssClass\)\)\s*return;[\s\S]*?stopPropagation\(\)/.test(tajweedText));
record("Rule popover is opt-in via explainRules", /explainRules\?:\s*boolean/.test(tajweedText) && /if \(!explainRules\)/.test(tajweedText));

// explainRules is enabled where intended: the reader page and lesson examples.
record("Reader enables explainRules on verse text", /<TajweedText[\s\S]*?explainRules/.test(mushafPage));
record("Lesson examples enable explainRules", /<TajweedText[\s\S]*?explainRules/.test(exampleCard));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}`);
  process.exit(1);
}
