#!/usr/bin/env node
// Milestone-certificate completion verification. Two halves, mirroring
// verify-memorization.mjs (which exercises the same scope math): the pure juz
// completion lives in src/lib/certificate.ts, but that module imports
// memorization-scope.ts, which imports navigation.ts via the bundler-only "@/"
// alias and extensionless paths, so it does not load under bare node. So this
// guard (a) regexes certificate.ts to prove getCompletedJuz is wired to the real
// scope math (countInScope + versesForJuz) and never generates Quranic text, then
// (b) re-derives the juz completion in plain JS against the bundled surah-index
// and navigation.ts's JUZ_STARTS and asserts the full-juz / partial / union
// cases. The khatmah-complete case imports the REAL computeKhatmahPace, which is
// type-only at its import site and so does load directly, exactly like
// verify-khatmah.mjs. The canvas draw/download is the browser gate (the closeout
// plan), not this offline guard, so only the pure completion math is asserted.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { computeKhatmahPace } from "../src/lib/khatmah.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");

const cert = read("src", "lib", "certificate.ts");
const nav = read("src", "lib", "navigation.ts");
const surahIndex = JSON.parse(read("src", "data", "content", "surah-index.json"));

const AYAH_COUNT = new Map(surahIndex.map((s) => [s.number, s.versesCount]));
const ayahCountForSurah = (surah) => AYAH_COUNT.get(surah) ?? 0;

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

// --- (a) Source wiring: getCompletedJuz uses the real scope math, the pure half
// imports only memorization-scope/khatmah, and no Quranic text is generated -----
record("certificate.ts exports getCompletedJuz", /export function getCompletedJuz/.test(cert));
{
  // The body of getCompletedJuz must drive completion off the real scope math:
  // it enumerates with versesForJuz, counts the intersection with countInScope,
  // and accepts a juz only when that count equals the scope length. Matched on
  // the body (whether the scope is inlined or held in a local), not on a single
  // call shape, so a clean refactor does not trip the guard.
  const body = cert.match(/export function getCompletedJuz[\s\S]*?\n\}/)?.[0] ?? "";
  record(
    "getCompletedJuz tests countInScope against versesForJuz length",
    /versesForJuz\(/.test(body) && /countInScope\(/.test(body) && /===\s*\w+\.length/.test(body),
  );
}
record(
  "certificate.ts imports countInScope + versesForJuz from memorization-scope",
  /import\s*\{[^}]*countInScope[^}]*versesForJuz[^}]*\}\s*from\s*["']\.\/memorization-scope["']/.test(cert) ||
    /import\s*\{[^}]*versesForJuz[^}]*countInScope[^}]*\}\s*from\s*["']\.\/memorization-scope["']/.test(cert),
);
record(
  "certificate.ts pure half pulls in no content JSON (no src/data import)",
  !/from\s*["'][^"']*data\/content/.test(cert),
);
record("certificate.ts exports the canvas draw helper", /export function drawCertificate/.test(cert));
record("certificate.ts exports certificateToBlob (toBlob wrapper)", /export function certificateToBlob/.test(cert));
record("certificate.ts canvas half uses toBlob (in-memory export)", /\.toBlob\(/.test(cert));

// --- (b) Re-derive versesForJuz exactly as the source does, then re-derive
// getCompletedJuz over it and assert the completion cases --------------------
const startsInner = nav.match(/JUZ_STARTS:[^=]*=\s*\[([\s\S]*?)\n\];/)?.[1] ?? "";
const JUZ_STARTS = [...startsInner.matchAll(/\[\s*(\d+)\s*,\s*(\d+)\s*\]/g)].map((m) => [
  Number(m[1]),
  Number(m[2]),
]);
record("navigation.ts JUZ_STARTS has 30 entries", JUZ_STARTS.length === 30, String(JUZ_STARTS.length));

function versesForJuz(juz) {
  const [startSurah, startAyah] = JUZ_STARTS[juz - 1];
  let endSurah;
  let endAyah;
  if (juz < 30) {
    const [nextSurah, nextAyah] = JUZ_STARTS[juz];
    if (nextAyah === 1) {
      endSurah = nextSurah - 1;
      endAyah = ayahCountForSurah(nextSurah - 1);
    } else {
      endSurah = nextSurah;
      endAyah = nextAyah - 1;
    }
  } else {
    endSurah = 114;
    endAyah = 6;
  }
  const out = [];
  let s = startSurah;
  let a = startAyah;
  while (s < endSurah || (s === endSurah && a <= endAyah)) {
    out.push(`${s}:${a}`);
    a++;
    if (a > ayahCountForSurah(s)) {
      s++;
      a = 1;
    }
  }
  return out;
}

function countInScope(memorized, scopeVerses) {
  let n = 0;
  for (const vk of scopeVerses) if (memorized.has(vk)) n++;
  return n;
}

// The re-derivation of getCompletedJuz under test (mirrors certificate.ts).
function getCompletedJuz(memorized) {
  const out = [];
  for (let j = 1; j <= 30; j++) {
    const scope = versesForJuz(j);
    if (countInScope(memorized, scope) === scope.length) out.push(j);
  }
  return out;
}

// (1) Empty set -> nothing complete.
record("empty memorized set -> getCompletedJuz returns []", getCompletedJuz(new Set()).length === 0, JSON.stringify(getCompletedJuz(new Set())));

// (2) All of juz 30 memorized -> 30 is complete.
{
  const all30 = new Set(versesForJuz(30));
  const done = getCompletedJuz(all30);
  record("all of juz 30 memorized -> includes 30", done.includes(30), JSON.stringify(done));
  record("only juz 30 (no other full juz) is returned", done.length === 1 && done[0] === 30, JSON.stringify(done));
}

// (3) Juz 30 minus one verse -> NOT complete (partial = not complete).
{
  const verses = versesForJuz(30);
  const minusOne = new Set(verses.slice(1)); // drop the first verse
  const done = getCompletedJuz(minusOne);
  record("juz 30 minus one verse -> 30 is NOT included (partial)", !done.includes(30), JSON.stringify(done));
}

// (4) Union of juz 1 and juz 30 fully memorized -> both returned.
{
  const union = new Set([...versesForJuz(1), ...versesForJuz(30)]);
  const done = getCompletedJuz(union);
  record("union of full juz 1 and 30 -> both 1 and 30 returned", done.includes(1) && done.includes(30), JSON.stringify(done));
}

// (5) Khatmah completeness via the REAL computeKhatmahPace (loads directly:
// type-only import site, like verify-khatmah.mjs). A reader at page 604 is
// complete; a partial reader is not.
{
  const complete = computeKhatmahPace(
    { startDate: "2026-06-01", targetDate: "2026-06-30", startPage: 1 },
    604,
    "2026-06-29",
  );
  record("computeKhatmahPace at page 604 -> isComplete true", complete.isComplete === true, String(complete.isComplete));
  const partial = computeKhatmahPace(
    { startDate: "2026-06-01", targetDate: "2026-06-30", startPage: 1 },
    300,
    "2026-06-15",
  );
  record("computeKhatmahPace at page 300 -> isComplete false", partial.isComplete === false, String(partial.isComplete));
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} certificate checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
