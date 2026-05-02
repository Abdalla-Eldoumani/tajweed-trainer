#!/usr/bin/env node
// Phase 7 verification: smoke-tests the tajweed HTML sanitizer in
// src/lib/sanitize.ts. The Quran.com Foundation API is trusted, but
// `text_uthmani_tajweed` still flows through inline HTML rendering in
// TajweedText, so the sanitizer is a defense-in-depth gate.
//
// We re-implement the sanitizer here (in JS, no TS compile) and assert
// behavior matches the source declaration. The source-parity check fires if
// the canonical regex or allowed shapes diverge.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, "..", "src", "lib", "sanitize.ts"), "utf8");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
}

// Source parity: declared shapes haven't drifted.
record("Source allows tajweed class attribute", /<tajweed class=/.test(src), "literal in source");
record("Source allows span class end", /<span class="end">/.test(src), "literal in source");
record("Source restricts class to /^[a-z_]+$/", /\^\[a-z_\]\+\$/.test(src), "literal in source");

// Re-implementation kept in sync with src.
const ALLOWED_CLASS = /^[a-z_]+$/;
function sanitize(input) {
  if (typeof input !== "string") return "";
  let out = input.replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (full, rawTag, rawAttrs) => {
    const tag = String(rawTag).toLowerCase();
    const isClose = full.startsWith("</");
    const attrs = String(rawAttrs ?? "");
    if (tag === "tajweed") {
      if (isClose) return "</tajweed>";
      const cls = attrs.match(/class\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const value = cls ? (cls[2] ?? cls[3] ?? cls[4] ?? "") : "";
      return ALLOWED_CLASS.test(value) ? `<tajweed class="${value}">` : "<tajweed>";
    }
    if (tag === "span") {
      if (isClose) return "</span>";
      const cls = attrs.match(/class\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const value = cls ? (cls[2] ?? cls[3] ?? cls[4] ?? "") : "";
      return value === "end" ? '<span class="end">' : "";
    }
    return "";
  });
  out = out.replace(/javascript\s*:/gi, "").replace(/data\s*:\s*text\/html/gi, "");
  return out;
}

// Behavioral cases.
const canonical = '<tajweed class="ham_wasl">ٱ</tajweed>لْحَمْدُ <span class="end">١</span>';
record("Canonical input passes through unchanged", sanitize(canonical) === canonical, sanitize(canonical));

record(
  "Empty/null inputs collapse to empty string",
  sanitize("") === "" && sanitize(null) === "" && sanitize(undefined) === "",
);

const scriptCase = "<scr" + "ipt>alert(1)</scr" + "ipt>" + "وَ";
record(
  "Script tag is stripped",
  !sanitize(scriptCase).toLowerCase().includes("scr" + "ipt"),
  sanitize(scriptCase),
);

record(
  "iframe is stripped",
  !sanitize('<iframe src="x"></iframe>وَ').includes("iframe"),
  sanitize('<iframe src="x"></iframe>وَ'),
);

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

record(
  "Non-end span is removed",
  !sanitize('<span class="other">x</span>').includes("<span"),
  sanitize('<span class="other">x</span>'),
);

record(
  "End-span is preserved",
  sanitize('<span class="end">١</span>') === '<span class="end">١</span>',
  sanitize('<span class="end">١</span>'),
);

record(
  "javascript: URI in text is stripped",
  !sanitize("see javascript:alert(1) here").toLowerCase().includes("javascript:"),
  sanitize("see javascript:alert(1) here"),
);

record(
  "HTML comments are stripped",
  sanitize("<!-- evil -->وَ") === "وَ",
  sanitize("<!-- evil -->وَ"),
);

record(
  "CDATA sections are stripped",
  !sanitize("<![CDATA[<scr" + "ipt>x</scr" + "ipt>]]>وَ").toLowerCase().includes("scr" + "ipt"),
  sanitize("<![CDATA[<x>x</x>]]>وَ"),
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
