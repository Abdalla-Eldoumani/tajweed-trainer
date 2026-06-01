#!/usr/bin/env node
// Source-parity verification for the reading-depth API layer (network-free).
// Asserts the wrappers exist, fetch per chapter (not per ayah), route tafsir and
// translation HTML through the sanitizer, and that settings carry and validate
// the resource ids. Live resolution of the ids against /resources/* is checked
// at runtime in the app, not here (this environment has no network).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");
const api = read("src", "lib", "quran-api.ts");
const types = read("src", "lib", "types.ts");
const storage = read("src", "lib", "sanitize.ts") && read("src", "lib", "storage.ts");
const sanitize = read("src", "lib", "sanitize.ts");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
}

const fns = [
  "getTranslationsForChapter",
  "getTafsirForVerse",
  "getWordsForChapter",
  "getResourceTranslations",
  "getResourceTafsirs",
];
for (const f of fns) record(`API exposes ${f}`, new RegExp("export async function " + f + "\\b").test(api));

record("Tafsir routed through sanitizeTafsirHtml", /getTafsirForVerse[\s\S]*?sanitizeTafsirHtml/.test(api));
record("Translations routed through sanitizeTafsirHtml", /getTranslationsForChapter[\s\S]*?sanitizeTafsirHtml/.test(api));
record("sanitizeTafsirHtml exists in sanitize.ts", /export function sanitizeTafsirHtml/.test(sanitize));
record("Translations fetched per chapter (by_chapter)", /getTranslationsForChapter[\s\S]*?verses\/by_chapter/.test(api));
record("Word-by-word fetched per chapter (by_chapter)", /getWordsForChapter[\s\S]*?verses\/by_chapter\/[^?`]*\?words=true/.test(api));
record("Resource lists use the long cache", /getResourceTranslations[\s\S]*?LONG_CACHE_TTL/.test(api));
record("No per-ayah translation fetch loop", !/by_key\/\$\{[\s\S]*?\}\?translations=/.test(api));

record("UserSettings carries translationId", /translationId\?:\s*number/.test(types));
record("UserSettings carries tafsirId", /tafsirId\?:\s*number/.test(types));
record("UserSettings carries showWordByWord", /showWordByWord\?:\s*boolean/.test(types));
record("VerseWord type defined", /export interface VerseWord/.test(types));
record("Settings default a translationId and tafsirId", /translationId:\s*\d+/.test(storage) && /tafsirId:\s*\d+/.test(storage));
record("sanitizeSettings clamps translationId", /translationId:\s*pickNumber\(/.test(storage));
record("sanitizeSettings clamps tafsirId", /tafsirId:\s*pickNumber\(/.test(storage));
record("sanitizeSettings validates showWordByWord boolean", /showWordByWord:\s*[\s\S]*?typeof input\.showWordByWord === "boolean"/.test(storage));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}`);
  process.exit(1);
}
