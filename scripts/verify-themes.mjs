#!/usr/bin/env node
// Permanent gate for the five-theme system. No browser, no transpile: parses
// src/app/globals.css and src/lib/tajweed-colors.ts and asserts that the themes
// stay complete, legible, and in lockstep with their source. It checks:
//   1. completeness  — every [data-theme] block defines every required token
//      (the app token set plus the full --tajweed-* set). A gap is a FAIL.
//   2. contrast      — every per-theme tajweed value clears WCAG large-text 3:1
//      against the harder of that theme's --bg / --bg-card. On a DARK ground
//      (night/sepia/mihrab, ours to tune) a shortfall is a FAIL; on a LIGHT
//      ground (vellum/pearl, carrying verbatim-derived hues) it is a WARN. The
//      recessive grays recede by design and are exempt from a hard FAIL.
//   3. parity        — each theme's CSS --tajweed-* equals THEME_TAJWEED in
//      tajweed-colors.ts, and the agreement contract holds: vellum equals :root
//      and night equals .dark.
//   4. distinguishability — no two DISTINCT rules render as the same hex on the
//      same ground, beyond the reference same-color groups (built from the map,
//      not hardcoded).
//   5. no-orphan guard — globals.css contains no `.dark ` descendant compound
//      selector. After the phase converted the dark surface rules to the
//      three-ground [data-theme] form, an orphaned `.dark .foo {}` rule would
//      silently apply on only one of the three dark themes; this guard makes
//      that a build failure. The bare `.dark { }` variable block is allowed.
//
// Mirrors scripts/verify-tajweed-colors.mjs in shape: same record/warn
// reporting, the same hexToRgb/relLum/contrast helpers, process.exit(1) on FAIL.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const css = readFileSync(join(root, "src", "app", "globals.css"), "utf8");
const tsSrc = readFileSync(join(root, "src", "lib", "tajweed-colors.ts"), "utf8");

const results = [];
const warnings = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}
function warn(name, details = "") {
  warnings.push({ name, details });
  console.log(`WARN: ${name}${details ? ": " + details : ""}`);
}

// The five theme names, and which grounds are dark (ours to tune -> hard FAIL)
// versus light (verbatim-derived hues -> WARN only).
const THEMES = ["vellum", "pearl", "night", "sepia", "mihrab"];
const DARK_GROUNDS = new Set(["night", "sepia", "mihrab"]);

// The non-tajweed app token set every theme must define (the Plan 02 set).
const REQUIRED_APP_TOKENS = [
  "--primary", "--accent", "--bg", "--bg-card", "--bg-subtle", "--text",
  "--text-muted", "--gold", "--gold-hairline", "--border", "--margin-bg",
  "--margin-card", "--margin-text", "--margin-muted", "--margin-line",
  "--margin-active", "--margin-active-bg", "--margin-hover-bg",
];

// The full --tajweed-* class set, taken from THEME_TAJWEED so the gate tracks
// the source rather than a hardcoded list.
const TAJWEED_CLASSES = (() => {
  const body = (tsSrc.match(/export const THEME_TAJWEED:[^=]*=\s*\{([\s\S]*?)\n\};/) || [])[1] || "";
  const keys = [];
  const re = /^ {2}(\w+):\s*\{/gm;
  let m;
  while ((m = re.exec(body)) !== null) keys.push(m[1]);
  return keys;
})();
record("THEME_TAJWEED parses with class keys", TAJWEED_CLASSES.length > 0, `${TAJWEED_CLASSES.length} classes`);

// Recessive grays: recede by design (their cue is the legend hairline swatch),
// so they are exempt from a hard contrast FAIL. Same set the sibling script uses.
const RECESSIVE = new Set([
  "ham_wasl", "slnt", "laam_shamsiyah", "idgham_mutajanisayn", "idgham_mutaqaribayn",
]);

const LARGE_TEXT_MIN = 3.0; // verse glyphs are large text
const HEX = /^#[0-9A-Fa-f]{6}$/;

// --- parse THEME_TAJWEED: class -> { theme -> hex } ---
function parseThemeTajweed() {
  const out = {};
  const body = (tsSrc.match(/export const THEME_TAJWEED:[^=]*=\s*\{([\s\S]*?)\n\};/) || [])[1] || "";
  const entryRe = /^ {2}(\w+):\s*\{([^}]*)\},/gm;
  let m;
  while ((m = entryRe.exec(body)) !== null) {
    const key = m[1];
    const inner = m[2];
    const perTheme = {};
    const tRe = /(\w+):\s*"(#[0-9A-Fa-f]{6})"/g;
    let t;
    while ((t = tRe.exec(inner)) !== null) perTheme[t[1]] = t[2];
    out[key] = perTheme;
  }
  return out;
}
const mapTajweed = parseThemeTajweed();

// --- parse a [data-theme="name"] block body ---
function themeBlock(name) {
  const re = new RegExp(`\\[data-theme="${name}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`);
  return (css.match(re) || [])[1] || "";
}
// --- parse the leading :root / .dark variable blocks (first match only) ---
function leadBlock(selector) {
  const re = new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`);
  return (css.match(re) || [])[1] || "";
}

// Pull a single CSS var value (hex) from a block.
function varHex(block, name) {
  const m = block.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`));
  return m ? m[1] : null;
}
// Pull all --tajweed-* hex values from a block into { class -> hex }.
function tajweedVars(block) {
  const out = {};
  const re = /--tajweed-(\w+):\s*(#[0-9A-Fa-f]{6})/g;
  let m;
  while ((m = re.exec(block)) !== null) out[m[1]] = m[2];
  return out;
}
// True if a block defines a token name at all (any value, hex or rgba()).
function definesToken(block, name) {
  return new RegExp(`${name}\\s*:`).test(block);
}

const blocks = Object.fromEntries(THEMES.map((t) => [t, themeBlock(t)]));
const blockMissing = THEMES.filter((t) => !blocks[t].trim());
record("All five [data-theme] blocks are present", blockMissing.length === 0, blockMissing.join(", "));

// --- 1. completeness: every theme defines every required token ---
const tokenGaps = [];
for (const t of THEMES) {
  const block = blocks[t];
  for (const tok of REQUIRED_APP_TOKENS) {
    if (!definesToken(block, tok)) tokenGaps.push(`${t} missing ${tok}`);
  }
  for (const cls of TAJWEED_CLASSES) {
    if (!definesToken(block, `--tajweed-${cls}`)) tokenGaps.push(`${t} missing --tajweed-${cls}`);
  }
}
record("Every theme defines every required token", tokenGaps.length === 0, tokenGaps.join("; "));

// --- contrast helpers (verbatim from verify-tajweed-colors.mjs) ---
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

// --- 2. per-ground contrast: tajweed value vs the harder of --bg / --bg-card ---
const contrastFails = [];
for (const t of THEMES) {
  const block = blocks[t];
  const bg = varHex(block, "--bg");
  const bgCard = varHex(block, "--bg-card");
  if (!bg || !bgCard) {
    contrastFails.push(`${t} missing --bg/--bg-card to contrast against`);
    continue;
  }
  const vars = tajweedVars(block);
  for (const cls of TAJWEED_CLASSES) {
    if (RECESSIVE.has(cls)) continue; // recede by design
    const hex = vars[cls];
    if (!hex || !HEX.test(hex)) continue; // completeness check already flagged a gap
    const ratio = Math.min(contrast(hex, bg), contrast(hex, bgCard));
    if (ratio < LARGE_TEXT_MIN) {
      const detail = `${t}.${cls} ${hex} ${ratio.toFixed(2)}:1`;
      if (DARK_GROUNDS.has(t)) contrastFails.push(detail);
      else warn(`Light-ground tajweed below 3:1`, `${detail} (verbatim-derived hue, kept)`);
    }
  }
}
record("Dark-ground tajweed values clear 3:1 on both grounds", contrastFails.length === 0, contrastFails.join(", "));

// --- 3. parity: CSS --tajweed-* per theme equals THEME_TAJWEED ---
const parityDrift = [];
for (const t of THEMES) {
  const vars = tajweedVars(blocks[t]);
  for (const cls of TAJWEED_CLASSES) {
    const cssHex = (vars[cls] || "").toLowerCase();
    const mapHex = (mapTajweed[cls]?.[t] || "").toLowerCase();
    if (!mapHex) { parityDrift.push(`${t}.${cls}: no map value`); continue; }
    if (cssHex !== mapHex) parityDrift.push(`${t}.${cls} css=${cssHex || "none"} map=${mapHex}`);
  }
}
record("Per-theme CSS tajweed values match THEME_TAJWEED", parityDrift.length === 0, parityDrift.join("; "));

// agreement contract: vellum == :root tajweed vars, night == .dark tajweed vars
const rootTajweed = tajweedVars(leadBlock(":root"));
const darkTajweed = tajweedVars(leadBlock("\\.dark"));
const vellumTajweed = tajweedVars(blocks.vellum);
const nightTajweed = tajweedVars(blocks.night);
function sameVars(a, b) {
  const drift = [];
  for (const cls of TAJWEED_CLASSES) {
    if ((a[cls] || "").toLowerCase() !== (b[cls] || "").toLowerCase()) {
      drift.push(`${cls} ${a[cls] || "none"} vs ${b[cls] || "none"}`);
    }
  }
  return drift;
}
const vellumDrift = sameVars(vellumTajweed, rootTajweed);
const nightDrift = sameVars(nightTajweed, darkTajweed);
record("vellum tajweed equals :root", vellumDrift.length === 0, vellumDrift.join("; "));
record("night tajweed equals .dark", nightDrift.length === 0, nightDrift.join("; "));

// --- 4. mutual distinguishability ---
// Build the allowed same-color groups from THEME_TAJWEED: any two classes that
// carry the same hex on every theme are an intentional reference group (the
// madd-obligatory variants, idgham with/without ghunnah, the recessive grays).
// A same-ground collision between two classes NOT in the same group is a FAIL.
function sameAcrossAllThemes(a, b) {
  return THEMES.every(
    (t) => (mapTajweed[a]?.[t] || "").toLowerCase() === (mapTajweed[b]?.[t] || "").toLowerCase(),
  );
}
const allowedPair = new Set();
for (let i = 0; i < TAJWEED_CLASSES.length; i++) {
  for (let j = i + 1; j < TAJWEED_CLASSES.length; j++) {
    const a = TAJWEED_CLASSES[i];
    const b = TAJWEED_CLASSES[j];
    if (sameAcrossAllThemes(a, b)) allowedPair.add(`${a}|${b}`);
  }
}
const collisions = [];
for (const t of THEMES) {
  const vars = tajweedVars(blocks[t]);
  for (let i = 0; i < TAJWEED_CLASSES.length; i++) {
    for (let j = i + 1; j < TAJWEED_CLASSES.length; j++) {
      const a = TAJWEED_CLASSES[i];
      const b = TAJWEED_CLASSES[j];
      const va = (vars[a] || "").toLowerCase();
      const vb = (vars[b] || "").toLowerCase();
      if (!va || !vb) continue;
      if (va === vb && !allowedPair.has(`${a}|${b}`)) {
        collisions.push(`${t}: ${a} and ${b} both ${va}`);
      }
    }
  }
}
record("No two distinct rules collide on any ground", collisions.length === 0, collisions.join("; "));

// --- 5. no-orphan guard: no `.dark ` descendant compound selector ---
// Strip CSS comments first so prose like "equals the .dark set" never trips it.
// The bare `.dark { ... }` variable block (`.dark` then whitespace then `{`)
// must NOT match; a descendant rule (`.dark .foo`, `.dark #x`, `.dark[..]`) must.
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
const darkDescendant = /\.dark\s+[.#:\[a-zA-Z]/;
const orphanMatch = cssNoComments.match(darkDescendant);
record(
  "globals.css has no orphaned `.dark ` descendant selector",
  !orphanMatch,
  orphanMatch ? `found "${orphanMatch[0]}"` : "only the bare .dark {} variable block",
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed, ${warnings.length} warnings.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
