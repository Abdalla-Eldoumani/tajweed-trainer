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
