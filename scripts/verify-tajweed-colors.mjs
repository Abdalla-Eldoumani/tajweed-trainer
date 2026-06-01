#!/usr/bin/env node
// Verifies the tajweed color system: src/lib/tajweed-colors.ts is the single
// source of truth, and src/app/globals.css must stay in lockstep with it.
//
// The script parses both files (no TS compile) and asserts:
//   1. every class the live API sample emits has a map entry;
//   2. every map entry has a CSS selector;
//   3. every tajweed selector maps to a key (legacy aliases excepted);
//   4. every light/dark value, both schemes, is a valid #RRGGBB;
//   5. parity: each key's active-scheme light/dark equals its :root/.dark var;
//   6. contrast: dark values clear WCAG AA large-text (3:1) on the dark bg.
// Plus a guard that the mushaf frame no longer references a tajweed token.
//
// Contrast policy: light values are verbatim QUL (the reference mushaf) and may
// not be altered, so several chromatic light colors sit below AA on cream by
// design. Those are reported as WARN, never FAIL. The recessive grays
// (silent / wasl / laam / idgham-muta) are exempt entirely; their non-color cue
// is the legend's hairline swatch border. Dark lifts are ours to tune, so they
// are a hard FAIL if they miss 3:1.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const tsSrc = readFileSync(join(root, "src", "lib", "tajweed-colors.ts"), "utf8");
const css = readFileSync(join(root, "src", "app", "globals.css"), "utf8");

const results = [];
const warnings = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
}
function warn(name, details = "") {
  warnings.push({ name, details });
  console.log(`WARN: ${name}${details ? " — " + details : ""}`);
}

// Distinct classes the live API emitted for surahs 38, 2, 114 (enumerated
// 2026-05-30 via api.quran.com/api/v4). Every one must be a map key.
const SAMPLE_CLASSES = [
  "ghunnah", "ham_wasl", "idgham_ghunnah", "idgham_mutajanisayn",
  "idgham_shafawi", "idgham_wo_ghunnah", "ikhafa", "ikhafa_shafawi",
  "iqlab", "laam_shamsiyah", "madda_necessary", "madda_normal",
  "madda_obligatory", "madda_permissible", "qalaqah", "slnt",
];

// Legacy class names kept as CSS aliases -> the canonical key they point at.
const ALIASES = {
  ikhfaa: "ikhafa",
  ikhfaa_shafawi: "ikhafa_shafawi",
  idgham_no_ghunnah: "idgham_wo_ghunnah",
  qalqalah: "qalaqah",
  silent: "slnt",
};

// Recessive classes exempt from the light-contrast warning (meant to recede).
const RECESSIVE = new Set([
  "ham_wasl", "slnt", "laam_shamsiyah", "idgham_mutajanisayn", "idgham_mutaqaribayn",
]);

const LIGHT_BG = "#FDF8F0"; // --bg / --cream
const DARK_BGS = ["#1A1A2E", "#1E1E32"]; // --bg and the reader's --cream in dark
const LARGE_TEXT_MIN = 3.0; // verse glyphs are large text
const NORMAL_MIN = 4.5;
const HEX = /^#[0-9A-Fa-f]{6}$/;

// --- parse the active scheme ---
const schemeMatch = tsSrc.match(/export const SCHEME:\s*TajweedScheme\s*=\s*"(\w+)"/);
const scheme = schemeMatch ? schemeMatch[1] : null;
record("SCHEME constant is parseable", !!scheme, scheme || "not found");

// --- parse the map definitions ---
const defsBody = (tsSrc.match(/const TAJWEED_DEFS:[^=]*=\s*\{([\s\S]*?)\n\};/) || [])[1] || "";
const defs = {};
const entryRe = /^ {2}(\w+):\s*\{([\s\S]*?)\n {2}\},/gm;
let m;
while ((m = entryRe.exec(defsBody)) !== null) {
  const key = m[1];
  const body = m[2];
  const group = (body.match(/group:\s*"([^"]+)"/) || [])[1];
  const nw = body.match(/\bnew:\s*\{\s*light:\s*"([^"]+)",\s*dark:\s*"([^"]+)"\s*\}/);
  const cl = body.match(/\bclassic:\s*\{\s*light:\s*"([^"]+)",\s*dark:\s*"([^"]+)"\s*\}/);
  defs[key] = {
    group,
    new: nw ? { light: nw[1], dark: nw[2] } : null,
    classic: cl ? { light: cl[1], dark: cl[2] } : null,
  };
}
const defKeys = Object.keys(defs);
record("Map parses with entries", defKeys.length >= SAMPLE_CLASSES.length, `${defKeys.length} entries`);

// --- parse the CSS variables and selectors ---
const rootBody = (css.match(/:root\s*\{([\s\S]*?)\n\}/) || [])[1] || "";
const darkBody = (css.match(/\.dark\s*\{([\s\S]*?)\n\}/) || [])[1] || "";
function parseVars(block) {
  const out = {};
  const re = /--tajweed-(\w+):\s*(#[0-9A-Fa-f]{6})/g;
  let x;
  while ((x = re.exec(block)) !== null) out[x[1]] = x[2];
  return out;
}
const rootVars = parseVars(rootBody);
const darkVars = parseVars(darkBody);

const selectors = [];
const selRe = /\.([a-zA-Z_]\w*)\s*\{\s*color:\s*var\(--tajweed-(\w+)\)/g;
while ((m = selRe.exec(css)) !== null) selectors.push({ sel: m[1], varKey: m[2] });
const selByName = new Map(selectors.map((s) => [s.sel, s.varKey]));

// --- 1. every sampled class is a map key ---
const missingSample = SAMPLE_CLASSES.filter((c) => !defs[c]);
record("Every live-sample class has a map entry", missingSample.length === 0, missingSample.join(", "));

// --- 2. every map entry has a CSS selector ---
const missingSel = defKeys.filter((k) => !selByName.has(k));
record("Every map entry has a CSS selector", missingSel.length === 0, missingSel.join(", "));

// --- 3. every tajweed selector maps to a key (aliases excepted) ---
const orphanSel = [];
for (const { sel, varKey } of selectors) {
  if (ALIASES[sel]) {
    // alias must point at its canonical key's variable, which must be a real key
    if (ALIASES[sel] !== varKey || !defs[varKey]) orphanSel.push(`${sel}->${varKey}`);
  } else {
    // canonical selector: name is a key and points at its own variable
    if (!defs[sel] || varKey !== sel) orphanSel.push(`${sel}->${varKey}`);
  }
}
record("Every tajweed selector resolves to a key", orphanSel.length === 0, orphanSel.join(", "));

// --- 4. every light/dark value (both schemes) is a valid hex ---
const badHex = [];
for (const [k, d] of Object.entries(defs)) {
  for (const s of ["new", "classic"]) {
    if (!d[s] || !HEX.test(d[s].light)) badHex.push(`${k}.${s}.light`);
    if (!d[s] || !HEX.test(d[s].dark)) badHex.push(`${k}.${s}.dark`);
  }
}
record("All scheme values are valid #RRGGBB", badHex.length === 0, badHex.join(", "));

// --- 5. parity: active-scheme light/dark equals the :root/.dark variable ---
const drift = [];
for (const [k, d] of Object.entries(defs)) {
  const active = scheme && d[scheme] ? d[scheme] : null;
  if (!active) { drift.push(`${k}:no-active`); continue; }
  if ((rootVars[k] || "").toLowerCase() !== active.light.toLowerCase()) {
    drift.push(`${k} light css=${rootVars[k] || "none"} map=${active.light}`);
  }
  if ((darkVars[k] || "").toLowerCase() !== active.dark.toLowerCase()) {
    drift.push(`${k} dark css=${darkVars[k] || "none"} map=${active.dark}`);
  }
}
record("CSS variables match the map (parity)", drift.length === 0, drift.join("; "));

// variables with no backing map key (stale)
const staleVars = Object.keys({ ...rootVars, ...darkVars }).filter((k) => !defs[k]);
record("No CSS tajweed variable lacks a map entry", staleVars.length === 0, staleVars.join(", "));

// --- 6. contrast ---
function hexToRgb(h) {
  const x = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(h);
  return x ? [parseInt(x[1], 16), parseInt(x[2], 16), parseInt(x[3], 16)] : null;
}
function relLum(rgb) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}
function contrast(fg, bg) {
  const a = relLum(hexToRgb(fg));
  const b = relLum(hexToRgb(bg));
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}
function minDark(color) {
  return Math.min(...DARK_BGS.map((bg) => contrast(color, bg)));
}

const darkFails = [];
for (const [k, d] of Object.entries(defs)) {
  for (const s of ["new", "classic"]) {
    const ratio = minDark(d[s].dark);
    if (ratio < LARGE_TEXT_MIN) darkFails.push(`${k}.${s}.dark ${d[s].dark} ${ratio.toFixed(2)}:1`);
  }
}
record("Dark values clear 3:1 on the dark background", darkFails.length === 0, darkFails.join(", "));

// light-value contrast is informational only (QUL values are immutable)
for (const [k, d] of Object.entries(defs)) {
  if (RECESSIVE.has(k)) continue;
  const ratio = contrast(d.new.light, LIGHT_BG);
  if (ratio < NORMAL_MIN) {
    warn(`Light ${k} below AA on cream`, `${d.new.light} ${ratio.toFixed(2)}:1 (QUL value, kept verbatim)`);
  }
}

// --- frame decouple guard ---
const frameBody = (css.match(/\.mushaf-frame::after\s*\{([\s\S]*?)\n\}/) || [])[1] || "";
record("Mushaf frame references no tajweed token", !/--tajweed-/.test(frameBody), "frame is decoupled");

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed, ${warnings.length} warnings.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
