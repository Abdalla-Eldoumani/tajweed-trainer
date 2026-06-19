#!/usr/bin/env node
// Network-free verification for navigation state: verse bookmarks, resume
// reading, and durable storage. Asserts the shape lives in the consolidated
// progress model (so export / import / reset cover it) and round-trips a sample
// through the bookmark sanitizer re-implementation.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");
const types = read("src", "lib", "types.ts");
const storage = read("src", "lib", "storage.ts");
let pwa = "";
try {
  pwa = read("src", "components", "layout", "PWARegister.tsx");
} catch {
  pwa = "";
}
const nav = read("src", "lib", "navigation.ts");
const reader = read("src", "components", "mushaf", "MushafReader.tsx");
const mIndex = read("src", "components", "mushaf", "MushafIndex.tsx");
const home = read("src", "app", "page.tsx");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
}

record("Progress model carries bookmarks", /bookmarks:\s*string\[\]/.test(types));
record("VerseLocation type defined and lastRead present", /export interface VerseLocation/.test(types) && /lastRead\?:/.test(types));
record("Default progress seeds bookmarks", /bookmarks:\s*\[\]/.test(storage));
record("sanitizeProgress includes bookmarks", /bookmarks:\s*sanitizeBookmarks\(/.test(storage));
record("sanitizeProgress includes lastRead", /lastRead:\s*sanitizeLastRead\(/.test(storage));
record("toggleVerseBookmark validates the verse key", /toggleVerseBookmark[\s\S]*?VERSE_KEY_PATTERN\.test/.test(storage));
record("setLastRead clamps the page to 1..604", /sanitizeLastRead[\s\S]*?pickNumber\(input\.page,\s*1,\s*1,\s*604\)/.test(storage));
record("Export/import cover the model (single store)", /export function exportProgress/.test(storage) && /export function importProgress/.test(storage));
record("Durable storage requested via navigator.storage.persist", /navigator\.storage[\s\S]*?\.persist\(\)/.test(pwa));

// Division navigation: juz jump returns the expected start pages.
const STANDARD_JUZ = [1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];
const juzInner = nav.match(/JUZ_START_PAGES\s*=\s*\[([\s\S]*?)\]/)?.[1] ?? "";
const juzPages = juzInner.split(",").map((s) => s.trim()).filter((s) => s !== "").map(Number);
record("Navigation exposes pageForJuz", /export function pageForJuz/.test(nav));
record("Juz table has 30 start pages", juzPages.length === 30, String(juzPages.length));
record("Juz start pages match the standard mushaf", JSON.stringify(juzPages) === JSON.stringify(STANDARD_JUZ));
record("Reader wires the juz jump", /pageForJuz\(/.test(reader));

// Dynamic in-reader index (Phase 6): the surah and juz selectors are CONTROLLED
// readouts of the open page, not empty jump-pickers. They read from server
// props so a deep-linked reload paints correct values on first paint.
record("Surah selector is controlled by the current page", /value=\{currentSurahValue/.test(reader));
record("Juz selector is controlled by the page juz", /value=\{data\.juzNumber\}/.test(reader));
record("Surah jump routes through pageForSurah", /pageForSurah\(/.test(reader));
// The two converted selectors must not carry the old empty placeholder option
// (the index labels). The drill select keeps its own `drillOff` empty option,
// so assert specifically against the surah/juz index placeholders.
record(
  "Surah selector dropped its empty placeholder",
  !/<option value="">\{t\("mushaf\.surahIndex"\)\}<\/option>/.test(reader),
);
record(
  "Juz selector dropped its empty placeholder",
  !/<option value="">\{t\("mushaf\.juzIndex"\)\}<\/option>/.test(reader),
);
// The reader no longer navigates via the surah redirect route; the surah
// selector targets the page funnel directly so all three jumps converge.
record("Surah selector no longer targets the /mushaf/surah redirect", !/\/mushaf\/surah\//.test(reader));

// The new model is actually reachable from the UI (not dead code).
record("Reader wires verse bookmarks", /useBookmarks/.test(reader));
record("Mushaf index lists verse bookmarks", /useBookmarks/.test(mIndex));
record("Home surfaces daily verse and resume", /DailyVerse/.test(home) && /ResumeReading/.test(home));
record("Reader persists lastRead", /setLastRead\(/.test(reader));

// Round-trip: bookmark sanitization re-implementation kept in sync with storage.ts.
const VERSE_KEY = /^\d{1,3}:\d{1,3}$/;
const MAX = 500;
function sanitizeBookmarks(input) {
  if (!Array.isArray(input)) return [];
  const out = new Set();
  for (const v of input) {
    if (typeof v !== "string" || !VERSE_KEY.test(v)) continue;
    out.add(v);
    if (out.size >= MAX) break;
  }
  return Array.from(out);
}
const sample = ["2:255", "2:255", "x", "114:6", "999:99999999", 42];
record(
  "Round-trip keeps valid keys, drops junk and duplicates",
  JSON.stringify(sanitizeBookmarks(sample)) === JSON.stringify(["2:255", "114:6"]),
  JSON.stringify(sanitizeBookmarks(sample)),
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}`);
  process.exit(1);
}
