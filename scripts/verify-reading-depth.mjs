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
const readingDepth = read("src", "components", "learn", "ReadingDepth.tsx");
const search = read("src", "app", "search", "page.tsx");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
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

// ReadingDepth: the tafsir fetch is effect-driven and keyed on the source, so
// switching the tafsir in Settings updates an open panel instead of showing the
// first source forever. The dep array must carry settings.tafsirId AND
// tafsirOpen (refetch on source change while open); the effect body reaches
// getTafsirForVerse.
record(
  "Tafsir fetched in an effect reaching getTafsirForVerse",
  /useEffect\(\(\) => \{[\s\S]*?getTafsirForVerse\([\s\S]*?\}, \[/.test(readingDepth),
);
record(
  "Tafsir effect dep array is keyed on tafsirId and tafsirOpen",
  /\}, \[[^\]]*settings\.tafsirId[^\]]*tafsirOpen[^\]]*\]/.test(readingDepth),
);
// Regression guard: the first-load cache guard that froze the panel on the
// initial source is gone (mirror the negative model above).
record(
  "Tafsir no longer cache-guarded on first load",
  !/if \(tafsir !== null/.test(readingDepth),
);
// The fetch lives in the effect, not the open/close handler, so reopening at the
// same source does not refetch and switching sources does. Scope the match to
// the handler body up to its first line-start "}" so a later getTafsirForVerse
// (e.g. the JSX comment) is not read as living inside the handler.
const toggleBody = /function toggleTafsir\(\) \{([\s\S]*?)\n {2}\}/.exec(readingDepth);
record(
  "Tafsir fetch is not in the toggle handler",
  !!toggleBody && !/getTafsirForVerse/.test(toggleBody[1]),
);
// Both render branches inject only sanitized HTML (sanitized in the API
// wrapper, asserted above); neither prints raw API text.
record(
  "Reading-depth renders both branches as sanitized HTML",
  (readingDepth.match(/dangerouslySetInnerHTML/g) ?? []).length >= 2,
);

// Search honors the selected resource so verse snippets render in the same
// language as the reading-depth panel, not the API's English default: the URL
// carries translations=<id> and the page threads settings.translationId in.
record(
  "Search requests the selected translation resource",
  /searchVerses[\s\S]*?\/search\?[\s\S]*?translations=/.test(api),
);
record(
  "Search page passes the selected translationId",
  /searchVerses\([^)]*translationId/.test(search) || /settings\.translationId/.test(search),
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}`);
  process.exit(1);
}
