#!/usr/bin/env node
// Network-free source-parity guard for navigation state: the verse-bookmark and
// resume-reading (global + per-surah) shapes live on the consolidated progress
// model (so export / import / reset cover them), and the reader UI actually wires
// them. The sanitization and reminder logic (bookmark dedupe/junk-drop/cap 500,
// per-surah bounds/proto-guard/cap 114, the juz-start table, the backup-reminder
// gate) is now owned by the real-import tests src/lib/storage.test.ts and
// src/lib/navigation.test.ts, which import the shipped functions and fail on a
// regression.

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
// The per-verse bookmark action lives in the overlay the reader renders, so the
// "reachable from the reader UI" check looks at both.
const overlay = read("src", "components", "mushaf", "VerseOverlay.tsx");
const mIndex = read("src", "components", "mushaf", "MushafIndex.tsx");
const home = read("src", "app", "page.tsx");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

// --- Consolidated-model shape (types + storage source-parity) ----------------
record("Progress model carries bookmarks", /bookmarks:\s*string\[\]/.test(types));
record("VerseLocation type defined and lastRead present", /export interface VerseLocation/.test(types) && /lastRead\?:/.test(types));
record("Progress model carries per-surah last-read", /lastReadBySurah\?:\s*Record<number,\s*VerseLocation>/.test(types));
record("Default progress seeds bookmarks", /bookmarks:\s*\[\]/.test(storage));
record("Default progress seeds lastReadBySurah", /lastReadBySurah:\s*\{\}/.test(storage));
record("sanitizeProgress includes bookmarks", /bookmarks:\s*sanitizeBookmarks\(/.test(storage));
record("sanitizeProgress includes lastRead", /lastRead:\s*sanitizeLastRead\(/.test(storage));
record("sanitizeProgress includes lastReadBySurah", /lastReadBySurah:\s*sanitizeLastReadBySurah\(/.test(storage));
record("toggleVerseBookmark validates the verse key", /toggleVerseBookmark[\s\S]*?VERSE_KEY_PATTERN\.test/.test(storage));
record("setLastRead clamps the page to 1..604", /sanitizeVerseLocation[\s\S]*?pickNumber\(input\.page,\s*1,\s*1,\s*604\)/.test(storage));
record("setLastRead records the per-surah entry", /setLastRead[\s\S]*?lastReadBySurah\s*=\s*bySurah/.test(storage));
record("Per-surah sanitizer guards prototype-pollution keys", /sanitizeLastReadBySurah[\s\S]*?__proto__[\s\S]*?constructor[\s\S]*?prototype/.test(storage));
record("Per-surah sanitizer bounds the surah key to 1..114", /sanitizeLastReadBySurah[\s\S]*?surah < 1 \|\| surah > 114/.test(storage));
record("Per-surah map caps at 114 entries", /MAX_LAST_READ_BY_SURAH = 114/.test(storage));
record("Export/import cover the model (single store)", /export function exportProgress/.test(storage) && /export function importProgress/.test(storage));
record("Durable storage requested via navigator.storage.persist", /navigator\.storage[\s\S]*?\.persist\(\)/.test(pwa));

// --- Division navigation exports + reader wiring (source-parity) -------------
record("Navigation exposes pageForJuz", /export function pageForJuz/.test(nav));
record("Reader wires the juz jump", /pageForJuz\(/.test(reader));

// Dynamic in-reader index: the surah and juz selectors are CONTROLLED
// readouts of the open page, not empty jump-pickers. They read from server
// props so a deep-linked reload paints correct values on first paint.
record("Surah selector is controlled by the current page", /value=\{currentSurahValue/.test(reader));
record("Juz selector is controlled by the page juz", /value=\{currentJuzValue\}/.test(reader) && /currentJuzValue\s*=\s*clampJuz\(data\.juzNumber\)/.test(reader));
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
record("Reader wires verse bookmarks", /useBookmarks/.test(reader) || /useBookmarks/.test(overlay));
record("Mushaf index lists verse bookmarks", /useBookmarks/.test(mIndex));
record("Home surfaces daily verse and resume", /DailyVerse/.test(home) && /ResumeReading/.test(home));
record("Reader persists lastRead", /setLastRead\(/.test(reader));
record("Mushaf index reads per-surah resume", /lastReadBySurah/.test(mIndex) && /mushaf\.resumeSurah/.test(mIndex));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}`);
  process.exit(1);
}
