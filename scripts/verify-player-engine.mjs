#!/usr/bin/env node
// Network-free check of the pure verse-playback decision and queue builders.
// Imports the real arithmetic from src/lib/player-engine.ts (Node strips the TS
// types; the module has no runtime imports) so this verifies the same code the
// store runs, not a re-implementation. Then regex-asserts that usePlayer.onEnded
// delegates the decision to nextAfterEnded and that PlayerHost schedules the
// inter-verse gap as a cleared timer, so the math is checked AND the wiring is
// asserted (mirroring verify-study-tools.mjs / verify-player-position.mjs).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildRangeQueue, dedupeQueue, nextAfterEnded } from "../src/lib/player-engine.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");
const store = read("src", "hooks", "usePlayer.ts");
const host = read("src", "components", "ui", "PlayerHost.tsx");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A snapshot helper so each case states only the fields that matter.
function snap(over = {}) {
  return {
    repeatOne: 0,
    repeatsDone: 0,
    repeatRange: null,
    rangeLoopsDone: 0,
    loopSelection: false,
    mode: "single",
    index: 0,
    queueLength: 1,
    currentAyah: 1,
    sleepEndOfSurah: false,
    ...over,
  };
}

// --- buildRangeQueue ---------------------------------------------------------
record(
  "buildRangeQueue(2,3,5) is [2:3,2:4,2:5]",
  eq(buildRangeQueue(2, 3, 5), [
    { surah: 2, ayah: 3 },
    { surah: 2, ayah: 4 },
    { surah: 2, ayah: 5 },
  ]),
);
record(
  "buildRangeQueue normalizes a reversed range (2,5,3) -> [2:3,2:4,2:5]",
  eq(buildRangeQueue(2, 5, 3), [
    { surah: 2, ayah: 3 },
    { surah: 2, ayah: 4 },
    { surah: 2, ayah: 5 },
  ]),
);
record("buildRangeQueue(2,7,7) is a single-item queue", buildRangeQueue(2, 7, 7).length === 1);
record(
  "buildRangeQueue clamps sub-1 bounds to 1",
  eq(buildRangeQueue(2, 0, 1), [
    { surah: 2, ayah: 1 },
  ]),
);

// --- dedupeQueue -------------------------------------------------------------
{
  const out = dedupeQueue([
    { surah: 2, ayah: 5 },
    { surah: 1, ayah: 1 },
    { surah: 2, ayah: 5 },
    { surah: 3, ayah: 9 },
  ]);
  record("dedupeQueue keeps first-occurrence order and drops a repeat", eq(out, [
    { surah: 2, ayah: 5 },
    { surah: 1, ayah: 1 },
    { surah: 3, ayah: 9 },
  ]));
}

// --- nextAfterEnded: repeatOne ----------------------------------------------
record(
  "repeatOne mid-count -> repeat-one",
  eq(nextAfterEnded(snap({ repeatOne: 3, repeatsDone: 0 })), { kind: "repeat-one" }),
);
record(
  "repeatOne on its last play falls through to stop",
  nextAfterEnded(snap({ repeatOne: 3, repeatsDone: 2 })).kind === "stop",
);

// --- nextAfterEnded: repeatRange (regression vs current onEnded) -------------
record(
  "repeatRange walks forward inside the range",
  eq(
    nextAfterEnded(
      snap({ repeatRange: { from: 1, to: 3, count: 2 }, mode: "continuous", index: 0, queueLength: 6, currentAyah: 1 }),
    ),
    { kind: "advance", index: 1 },
  ),
);
record(
  "repeatRange loops back to the range start when more loops remain",
  eq(
    nextAfterEnded(
      snap({ repeatRange: { from: 1, to: 3, count: 2 }, rangeLoopsDone: 0, mode: "continuous", index: 2, queueLength: 6, currentAyah: 3 }),
    ),
    { kind: "loop-range", index: 0 },
  ),
);
record(
  "repeatRange stops (idle) once the loop count is exhausted",
  eq(
    nextAfterEnded(
      snap({ repeatRange: { from: 1, to: 3, count: 2 }, rangeLoopsDone: 1, mode: "continuous", index: 2, queueLength: 6, currentAyah: 3 }),
    ),
    { kind: "stop", status: "idle" },
  ),
);
// Total ayah-plays for a range [from..to] looped `count` times, walked via the
// decision, equals span * count (same invariant verify-study-tools.mjs asserts).
{
  const from = 2, to = 4, count = 3, queueLength = 6;
  let index = from - 1;
  let rangeLoopsDone = 0;
  let plays = 0;
  // Simulate ends until the decision says stop.
  for (let guard = 0; guard < 100; guard++) {
    plays++;
    const d = nextAfterEnded(
      snap({ repeatRange: { from, to, count }, rangeLoopsDone, mode: "continuous", index, queueLength, currentAyah: index + 1 }),
    );
    if (d.kind === "stop") break;
    if (d.kind === "loop-range") rangeLoopsDone++;
    index = d.index;
  }
  record(`range [${from}..${to}] x${count} totals ${(to - from + 1) * count} plays`, plays === (to - from + 1) * count, String(plays));
}

// --- nextAfterEnded: loopSelection (the new whole-queue loop) ----------------
record(
  "loopSelection at the LAST index wraps to index 0",
  eq(
    nextAfterEnded(snap({ loopSelection: true, mode: "continuous", index: 2, queueLength: 3, currentAyah: 99 })),
    { kind: "loop-selection", index: 0 },
  ),
);
record(
  "loopSelection mid-queue advances to index+1",
  eq(
    nextAfterEnded(snap({ loopSelection: true, mode: "continuous", index: 0, queueLength: 3 })),
    { kind: "advance", index: 1 },
  ),
);
// An N-item queue looped C whole times totals N*C plays (non-contiguous safe).
{
  const N = 4, C = 3;
  let index = 0;
  let loops = 0;
  let plays = 0;
  for (let guard = 0; guard < 100; guard++) {
    plays++;
    const d = nextAfterEnded(snap({ loopSelection: loops + 1 < C, mode: "continuous", index, queueLength: N }));
    if (d.kind === "stop") break;
    if (d.kind === "loop-selection") {
      loops++;
      index = d.index;
    } else {
      index = d.index;
    }
  }
  record(`a ${N}-item selection looped ${C}x totals ${N * C} plays`, plays === N * C, String(plays));
}
// loopSelection must NOT overload repeatRange: a non-contiguous set (no
// repeatRange) still loops by index, not by ayah number.
record(
  "loopSelection ignores ayah numbers (loops a non-contiguous set by index)",
  eq(
    nextAfterEnded(snap({ loopSelection: true, mode: "continuous", index: 2, queueLength: 3, currentAyah: 1 })),
    { kind: "loop-selection", index: 0 },
  ),
);

// --- nextAfterEnded: default paths (regression vs current onEnded) -----------
record(
  "single at end -> stop paused",
  eq(nextAfterEnded(snap({ mode: "single", index: 0, queueLength: 1 })), { kind: "stop", status: "paused" }),
);
record(
  "continuous at end -> stop idle",
  eq(nextAfterEnded(snap({ mode: "continuous", index: 2, queueLength: 3 })), { kind: "stop", status: "idle" }),
);
record(
  "continuous mid-queue -> advance",
  eq(nextAfterEnded(snap({ mode: "continuous", index: 0, queueLength: 3 })), { kind: "advance", index: 1 }),
);
record(
  "sleepEndOfSurah halts continuous auto-advance -> stop idle",
  eq(
    nextAfterEnded(snap({ mode: "continuous", index: 0, queueLength: 3, sleepEndOfSurah: true })),
    { kind: "stop", status: "idle" },
  ),
);

// --- precedence: repeatRange/repeatOne win over loopSelection ----------------
record(
  "repeatOne wins over loopSelection",
  nextAfterEnded(snap({ repeatOne: 2, repeatsDone: 0, loopSelection: true, queueLength: 3 })).kind === "repeat-one",
);
record(
  "repeatRange wins over loopSelection",
  eq(
    nextAfterEnded(
      snap({ repeatRange: { from: 1, to: 3, count: 2 }, loopSelection: true, mode: "continuous", index: 0, queueLength: 6, currentAyah: 1 }),
    ),
    { kind: "advance", index: 1 },
  ),
);

// --- store + host wiring assertions -----------------------------------------
record("Store exposes playSet", /\bplaySet:/.test(store));
record("Store exposes playRange", /\bplayRange:/.test(store));
record("Store exposes setLoopSelection", /\bsetLoopSelection:/.test(store));
record("Store exposes setInterVersePause", /\bsetInterVersePause:/.test(store));
record("State carries loopSelection and interVersePause", /loopSelection:/.test(store) && /interVersePause:/.test(store));
record("onEnded delegates to nextAfterEnded", /onEnded[\s\S]*?nextAfterEnded\(/.test(store));
record("Store imports the engine builders", /from "@\/lib\/player-engine"/.test(store) && /buildRangeQueue/.test(store) && /dedupeQueue/.test(store));
record("PlayerHost schedules the inter-verse gap as a setTimeout", /interVersePause/.test(host) && /setTimeout/.test(host));
record("PlayerHost clears the gap timer (clearTimeout)", /clearTimeout/.test(host));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
