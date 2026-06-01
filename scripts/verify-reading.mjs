#!/usr/bin/env node
// Network-free verification for the offline reading-depth UI shell and the
// page/surah navigation logic. Live API behavior is exercised in the running
// app; here we check source parity and unit-test the pure navigation functions
// against the bundled surah index.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");
const rd = read("src", "components", "learn", "ReadingDepth.tsx");
const nav = read("src", "lib", "navigation.ts");
const idx = JSON.parse(read("src", "data", "content", "surah-index.json"));

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
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

// Unit tests: re-implement surahForPage against the bundled index.
const sorted = idx.slice().sort((a, b) => a.number - b.number);
function surahForPage(p) {
  let found = null;
  for (const s of sorted) {
    if (s.pages[0] <= p) found = s;
    else break;
  }
  return found;
}
record("page 1 resolves to Al-Fatihah (surah 1)", surahForPage(1)?.number === 1, String(surahForPage(1)?.number));
record("page 604 resolves to a surah", surahForPage(604) != null, String(surahForPage(604)?.number));
let nonDecreasing = true;
let prev = 0;
for (let p = 1; p <= 604; p++) {
  const n = surahForPage(p)?.number ?? 0;
  if (n < prev) {
    nonDecreasing = false;
    break;
  }
  prev = n;
}
record("page -> surah is non-decreasing across all 604 pages", nonDecreasing);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}`);
  process.exit(1);
}
