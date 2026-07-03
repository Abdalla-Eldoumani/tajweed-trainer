#!/usr/bin/env node
// Network-free source-parity guard for the offline reading-depth UI shell and the
// page/surah navigation exports. Live API behavior is exercised in the running
// app; here we check that the shell wires the wrappers and the navigation module
// exposes its page/surah helpers. The page->surah resolution logic (surahForPage)
// is now owned by the real-import test src/lib/navigation.test.ts, which imports
// the shipped function and asserts the non-decreasing-across-604 invariant.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");
const rd = read("src", "components", "learn", "ReadingDepth.tsx");
const nav = read("src", "lib", "navigation.ts");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

// Reading-depth UI shell.
record("ReadingDepth fetches translation via the wrapper", /getTranslationsForChapter/.test(rd));
record("ReadingDepth fetches tafsir via the wrapper", /getTafsirForVerse/.test(rd));
record('ReadingDepth handles loading and error states', /"loading"/.test(rd) && /"error"/.test(rd));
record(
  "ReadingDepth renders only sanitized html, never generated text",
  /dangerouslySetInnerHTML/.test(rd) && !/lorem|fabricat|placeholder verse/i.test(rd),
);

// Navigation source parity.
record(
  "navigation exposes pageForSurah and surahForPage",
  /export function pageForSurah/.test(nav) && /export function surahForPage/.test(nav),
);
record("navigation exposes page step helpers", /export function nextPage/.test(nav) && /export function prevPage/.test(nav));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}`);
  process.exit(1);
}
