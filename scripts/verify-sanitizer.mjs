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

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
