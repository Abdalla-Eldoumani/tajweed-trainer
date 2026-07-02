#!/usr/bin/env node
// Source-parity guard for the verse-playback store/host wiring. The pure queue
// and decision arithmetic is now owned by the real-import test
// src/lib/player-engine.test.ts, which imports the shipped symbols and fails on a
// regression. This script keeps only the wiring a unit test cannot see: usePlayer
// exposes the transport controls and delegates its onEnded decision to the
// engine, and PlayerHost schedules the inter-verse gap as a cleared timer.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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

// --- store + host wiring assertions (source-parity) --------------------------
record("Store exposes playSet", /\bplaySet:/.test(store));
record("Store exposes playRange", /\bplayRange:/.test(store));
record("Store exposes setLoopSelection", /\bsetLoopSelection:/.test(store));
record("Store exposes setInterVersePause", /\bsetInterVersePause:/.test(store));
record("State carries loopSelection and interVersePause", /loopSelection:/.test(store) && /interVersePause:/.test(store));
record("onEnded delegates the decision to the engine", /onEnded[\s\S]*?nextAfterEnded\(/.test(store));
record("Store imports the pure engine module", /from "@\/lib\/player-engine"/.test(store));
record("PlayerHost schedules the inter-verse gap as a setTimeout", /interVersePause/.test(host) && /setTimeout/.test(host));
record("PlayerHost clears the gap timer (clearTimeout)", /clearTimeout/.test(host));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
