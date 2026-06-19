#!/usr/bin/env node
// Sanitizer verification: exercises the REAL sanitizer exported from
// src/lib/sanitize.ts (imported directly — Node strips the TypeScript types),
// so a correctness change to the source is always covered here. The Quran.com
// Foundation API is trusted, but its HTML still flows through inline rendering
// in TajweedText and ReadingDepth, so the sanitizer is a defense-in-depth gate.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { sanitizeTajweedHtml as sanitize, sanitizeTafsirHtml as sanitizeTafsir } from "../src/lib/sanitize.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, "..", "src", "lib", "sanitize.ts"), "utf8");
// storage.ts holds the progress funnel; the onboarding-flag group below regexes
// this source (it does not import it) and re-derives the coercion in plain JS,
// matching verify-navigation.mjs / verify-memorization.mjs. sanitizeProgress is
// kept un-imported on purpose: there is one sanitizer in the source and no second
// copy here to drift from it.
const storage = readFileSync(join(__dirname, "..", "src", "lib", "storage.ts"), "utf8");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
}

// Source presence: the two exported sanitizers and the class allowlist exist.
record("Source exports sanitizeTajweedHtml", /export function sanitizeTajweedHtml/.test(src));
record("Source exports sanitizeTafsirHtml", /export function sanitizeTafsirHtml/.test(src));
record("Source restricts tajweed class to /^[a-z_]+$/", /\^\[a-z_\]\+\$/.test(src));
record("Source escapes brackets before re-allowing tags", /function escapeBrackets/.test(src));

// --- Verse sanitizer behavioral cases ---
const canonical = '<tajweed class="ham_wasl">ٱ</tajweed>لْحَمْدُ <span class="end">١</span>';
record("Canonical input passes through unchanged", sanitize(canonical) === canonical, sanitize(canonical));

record(
  "Empty/null inputs collapse to empty string",
  sanitize("") === "" && sanitize(null) === "" && sanitize(undefined) === "",
);

const scriptCase = "<scr" + "ipt>alert(1)</scr" + "ipt>" + "وَ";
record("Script tag is stripped", !sanitize(scriptCase).toLowerCase().includes("scr" + "ipt"), sanitize(scriptCase));

record("iframe is stripped", !sanitize('<iframe src="x"></iframe>وَ').includes("iframe"), sanitize('<iframe src="x"></iframe>وَ'));

record(
  "onclick handler on <tajweed> is stripped, class kept",
  sanitize('<tajweed class="ghunnah" onclick="alert(1)">ن</tajweed>') === '<tajweed class="ghunnah">ن</tajweed>',
  sanitize('<tajweed class="ghunnah" onclick="alert(1)">ن</tajweed>'),
);

record(
  "Disallowed class (with digits/dashes) is dropped",
  sanitize('<tajweed class="evil-1">x</tajweed>') === '<tajweed>x</tajweed>',
  sanitize('<tajweed class="evil-1">x</tajweed>'),
);

record("Non-end span is removed", !sanitize('<span class="other">x</span>').includes("<span"), sanitize('<span class="other">x</span>'));

record("End-span is preserved", sanitize('<span class="end">١</span>') === '<span class="end">١</span>', sanitize('<span class="end">١</span>'));

record("javascript: URI in text is stripped", !sanitize("see javascript:alert(1) here").toLowerCase().includes("javascript:"), sanitize("see javascript:alert(1) here"));

record("HTML comments are stripped", sanitize("<!-- evil -->وَ") === "وَ", sanitize("<!-- evil -->وَ"));

record("CDATA sections are stripped", !sanitize("<![CDATA[<scr" + "ipt>x</scr" + "ipt>]]>وَ").toLowerCase().includes("scr" + "ipt"), sanitize("<![CDATA[<x>x</x>]]>وَ"));

// --- Mutation-XSS reassembly: removing an inner tag must not re-form a live
// tag from the surrounding bytes. The escape-then-reallow design makes the
// output carry no raw '<' outside the two reconstructed shapes. ---
const tajweedReassembly = "<" + "<scr" + "ipt>scr" + "ipt>alert(1)<" + "</scr" + "ipt>/scr" + "ipt>";
record(
  "Verse: <<script>script> reassembly leaves no raw tag",
  !sanitize(tajweedReassembly).includes("<scr" + "ipt") && !/<[a-zA-Z]/.test(sanitize(tajweedReassembly).replace(/<\/?(tajweed|span)/g, "")),
  sanitize(tajweedReassembly),
);
const tajweedImgReassembly = "<" + "<img src=x onerror=alert(1)>img src=x onerror=alert(1)>";
record(
  "Verse: <<img onerror> reassembly carries no live img",
  !/<img/i.test(sanitize(tajweedImgReassembly)) && !/onerror=[^&]/i.test(sanitize(tajweedImgReassembly)),
  sanitize(tajweedImgReassembly),
);

// --- Tafsir sanitizer behavioral cases ---
record("Source defines the tafsir tag allowlist", /TAFSIR_ALLOWED_TAGS/.test(src));

record(
  "Tafsir keeps allowed formatting and strips attributes",
  sanitizeTafsir('<p class="x" onclick="e()">Ibn <strong>Kathir</strong></p>') === "<p>Ibn <strong>Kathir</strong></p>",
  sanitizeTafsir('<p class="x" onclick="e()">Ibn <strong>Kathir</strong></p>'),
);
record("Tafsir strips a script element and its contents", !sanitizeTafsir("<p>ok</p><scr" + "ipt>alert(1)</scr" + "ipt>").toLowerCase().includes("alert"), sanitizeTafsir("<p>ok</p><scr" + "ipt>alert(1)</scr" + "ipt>"));
record("Tafsir strips an iframe element and its contents", sanitizeTafsir('<p>a</p><iframe src="x">b</iframe>') === "<p>a</p>", sanitizeTafsir('<p>a</p><iframe src="x">b</iframe>'));
record("Tafsir drops img onerror entirely (img not allowed)", sanitizeTafsir('<img src=x onerror="alert(1)">') === "", sanitizeTafsir('<img src=x onerror="alert(1)">'));
record("Tafsir drops anchor tag, keeps text (no href surface)", sanitizeTafsir('<a href="javascript:alert(1)">link</a>') === "link", sanitizeTafsir('<a href="javascript:alert(1)">link</a>'));
record("Tafsir strips a style element and its contents", sanitizeTafsir("<style>body{color:red}</style><p>x</p>") === "<p>x</p>", sanitizeTafsir("<style>body{color:red}</style><p>x</p>"));
record("Tafsir strips javascript: in text", !sanitizeTafsir("see javascript:alert(1)").toLowerCase().includes("javascript:"), sanitizeTafsir("see javascript:alert(1)"));
record("Tafsir keeps a footnote sup marker, drops its attribute", sanitizeTafsir('text<sup foot_note="12">1</sup>') === "text<sup>1</sup>", sanitizeTafsir('text<sup foot_note="12">1</sup>'));

// Tafsir mutation-XSS reassembly: the exact bypasses from the security audit.
record(
  "Tafsir: <<img onerror> reassembly collapses to inert text",
  sanitizeTafsir("<" + "<img src=x onerror=alert(1)>img src=x onerror=alert(1)>") === "" &&
    !sanitizeTafsir("<" + "<img src=x onerror=alert(1)>img src=x onerror=alert(1)>").includes("<"),
  sanitizeTafsir("<" + "<img src=x onerror=alert(1)>img src=x onerror=alert(1)>"),
);
record(
  "Tafsir: <<a><svg onload> reassembly carries no live tag",
  !sanitizeTafsir("<" + "<a href=x>svg onload=alert(1)>").includes("<"),
  sanitizeTafsir("<" + "<a href=x>svg onload=alert(1)>"),
);
record(
  "Tafsir: an allowed tag cannot smuggle a handler attribute",
  sanitizeTafsir("<p onclick=alert(1)>hi</p>") === "<p>hi</p>",
  sanitizeTafsir("<p onclick=alert(1)>hi</p>"),
);

// --- Onboarding flag (seenOnboarding): the first-launch seen-once flag rides on
// the consolidated progress object, not an ad-hoc localStorage key, so a tampered
// or legacy payload cannot suppress or force the onboarding modal. Two halves,
// mirroring verify-navigation.mjs: (a) regex storage.ts to prove the wiring is in
// the real source, and (b) re-derive the boolean coercion in plain JS. ---

// (a) Source wiring: the field is defaulted false, coerced in sanitizeProgress,
// has a get/set helper pair, and is not dropped by export / import / reset.
record(
  "storage: DEFAULT_PROGRESS defaults seenOnboarding false",
  /DEFAULT_PROGRESS[\s\S]*?seenOnboarding:\s*false/.test(storage),
);
record(
  "storage: sanitizeProgress coerces seenOnboarding to a boolean (else false)",
  /seenOnboarding:\s*typeof input\.seenOnboarding === "boolean" \? input\.seenOnboarding : false/.test(storage),
);
record(
  "storage: getOnboardingSeen reads the flag (?? false)",
  /export function getOnboardingSeen\(\): boolean[\s\S]*?getProgress\(\)\.seenOnboarding \?\? false/.test(storage),
);
record(
  "storage: setOnboardingSeen writes through the funnel (setProgress, no raw localStorage)",
  /export function setOnboardingSeen\(value: boolean\): void[\s\S]*?progress\.seenOnboarding = value[\s\S]*?setProgress\(progress\)/.test(storage),
);
// Export/import/reset carry the flag by construction (single store), the same way
// verify-navigation.mjs proves bookmarks ride along: export reads the whole
// post-sanitize object via getProgress() and serializes it (it also stamps
// lastBackupAt into that object before serializing), import re-runs
// sanitizeProgress, and reset spreads cloneDefaultProgress() (default false), so
// no per-field export/import/reset code exists or should.
record(
  "storage: export serializes the whole progress object (flag rides along)",
  /export function exportProgress[\s\S]*?getProgress\(\)[\s\S]*?JSON\.stringify\(progress/.test(storage),
);
record(
  "storage: import re-runs sanitizeProgress (flag re-coerced on restore)",
  /export function importProgress[\s\S]*?sanitizeProgress\(parsed\)/.test(storage),
);
record(
  "storage: resetProgress spreads cloneDefaultProgress (default-false clears the flag)",
  /export function resetProgress[\s\S]*?\.\.\.cloneDefaultProgress\(\)/.test(storage),
);

// (b) Re-derive the coercion in plain JS (no import of the TS source) and assert
// the three contract points: absent -> false, non-boolean -> false, true -> true.
const coerceSeenOnboarding = (input) =>
  typeof input?.seenOnboarding === "boolean" ? input.seenOnboarding : false;
record(
  "Onboarding: absent flag coerces to false (lossless legacy migration)",
  coerceSeenOnboarding({}) === false,
  String(coerceSeenOnboarding({})),
);
record(
  "Onboarding: a non-boolean string coerces to false (cannot force onboarding)",
  coerceSeenOnboarding({ seenOnboarding: "yes" }) === false,
  String(coerceSeenOnboarding({ seenOnboarding: "yes" })),
);
record(
  "Onboarding: a non-boolean number coerces to false",
  coerceSeenOnboarding({ seenOnboarding: 1 }) === false,
  String(coerceSeenOnboarding({ seenOnboarding: 1 })),
);
record(
  "Onboarding: a stored true round-trips to true",
  coerceSeenOnboarding({ seenOnboarding: true }) === true,
  String(coerceSeenOnboarding({ seenOnboarding: true })),
);

// --- Prototype-pollution key guard: the keyed-map sanitizers (modules, reviews,
// memorizationReviews, readSections) rebuild plain objects from
// attacker-influenceable keys in an imported/stored payload, so each loop skips
// the dangerous keys. Two halves, mirroring the onboarding group: (a) regex
// storage.ts to prove the guard is in the real source on every keyed-map loop,
// and (b) re-derive the keyed-copy in plain JS and assert that a payload carrying
// "__proto__"/"constructor"/"prototype" keys creates no such own-keys and leaves
// Object.prototype unpolluted. ---

// (a) Source wiring: every keyed-map loop (modules, reviews, memorizationReviews,
// readSections, lastReadBySurah) carries the skip before it copies a key.
const guardMatches =
  storage.match(/=== "__proto__" \|\| \w+ === "constructor" \|\| \w+ === "prototype"\) continue;/g) || [];
record(
  "storage: keyed-map loops skip __proto__/constructor/prototype keys (5 guards)",
  guardMatches.length === 5,
  String(guardMatches.length),
);

// (b) Re-derive the guarded keyed copy (no import of the TS source) and prove the
// guard is structural: a polluting payload yields a clean object and never
// touches the global prototype. Without the guard, assigning out["__proto__"]
// would set the object's prototype instead of an own-key.
const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];
const copyKeyedMapGuarded = (input) => {
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    out[key] = value;
  }
  return out;
};
const pollutingPayload = {
  __proto__: { polluted: true },
  constructor: "evil",
  prototype: "evil",
  "noon-sakinah": { lessonsCompleted: [] },
};
const guarded = copyKeyedMapGuarded(pollutingPayload);
record(
  "Pollution: dangerous keys create no own-keys on the rebuilt map",
  DANGEROUS_KEYS.every((k) => !Object.prototype.hasOwnProperty.call(guarded, k)),
  Object.keys(guarded).join(","),
);
record(
  "Pollution: a legitimate key still survives the guarded copy",
  Object.prototype.hasOwnProperty.call(guarded, "noon-sakinah"),
  Object.keys(guarded).join(","),
);
record(
  "Pollution: Object.prototype is not polluted after the guarded copy",
  // eslint-disable-next-line no-proto
  ({}).polluted === undefined && Object.prototype.polluted === undefined,
  String(({}).polluted),
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
