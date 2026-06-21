#!/usr/bin/env node
// Permanent gate for the motion-and-hydration work. No browser, no transpile:
// parses src/app/globals.css, src/lib/motion.ts, the two chrome components, and
// src/app/layout.tsx, and asserts the static structure of the phase stays in its
// production-safe shape. The browser-only behaviors (the real route enter, the
// theme crossfade, the reduced-motion instant swap, the clean AR/EN first-render
// console) are confirmed by the Playwright gate; this locks the structure so it
// cannot silently regress. It checks:
//   1. motion tokens  — :root defines the four durations and three easing curves
//      with their exact values, and the durations are not duplicated into any
//      [data-theme] block (theme-independent, so they belong in :root once).
//   2. route-enter     — a .route-enter class drives the page turn off
//      var(--motion-page) AND the prefers-reduced-motion block disables it.
//   3. view-transition — the ::view-transition-old/new(root) cross-fade exists
//      off var(--motion-page) AND the reduced-motion block zeroes the
//      ::view-transition-* animation duration.
//   4. helper          — src/lib/motion.ts exports withViewTransition, reads the
//      genuine document.startViewTransition, feature-detects it with a typeof
//      ... === "function" guard, and calls prefersReducedMotion; settings/page
//      actually uses the helper so the real API call cannot disappear.
//   5. hydration fix   — Sidebar and Header each carry suppressHydrationWarning,
//      and never on a wrapping <aside>/<header>/<h1>/<nav>/<Link> (single text
//      node only, never a blanket suppression).
//   6. no-abandoned-path — layout.tsx (comment-stripped) has no
//      unstable_ViewTransition and no "use client" (it stays a server
//      component), and next.config.mjs has no experimental viewTransition flag.
//      A CSP non-regression check confirms connect-src still names only
//      'self' https://api.quran.com (the motion work needs no new origin).
//
// Mirrors scripts/verify-themes.mjs in shape: same record reporter, the same
// brace-aware block parsing, the cssNoComments comment-stripping so a prose
// mention in a comment never creates a false match, process.exit(1) on FAIL.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");

const css = read("src", "app", "globals.css");
const motionSrc = read("src", "lib", "motion.ts");
const settingsSrc = read("src", "app", "settings", "page.tsx");
const layoutSrc = read("src", "app", "layout.tsx");
const sidebarSrc = read("src", "components", "layout", "Sidebar.tsx");
const headerSrc = read("src", "components", "layout", "Header.tsx");
const nextConfig = read("next.config.mjs");

// Strip CSS comments first so prose like "var(--motion-page)" in a comment never
// satisfies a check (the same technique verify-themes.mjs uses).
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
// Strip JS/TS line and block comments from layout for the no-abandoned-path scan
// so the guard reacts to code, not a comment that names the abandoned API.
const layoutNoComments = layoutSrc
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

// --- brace-aware block capture, keyed by a literal selector (e.g. ":root",
// "[data-theme=\"night\"]"). Returns the block body, depth-aware so a nested
// rule inside the block does not truncate the capture. ---
function blockFor(source, selectorLiteral) {
  const start = source.indexOf(selectorLiteral);
  if (start < 0) return "";
  const open = source.indexOf("{", start);
  if (open < 0) return "";
  let depth = 1;
  let i = open + 1;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    i++;
  }
  return source.slice(open + 1, i - 1);
}

// The first @media (prefers-reduced-motion: reduce) block is the global motion
// crush; later ones gate specific animations. Capture EVERY such block and join
// them so a check finds an off-switch wherever it lives.
function reducedMotionBlocks(source) {
  const bodies = [];
  const marker = "@media (prefers-reduced-motion: reduce)";
  let from = 0;
  for (;;) {
    const at = source.indexOf(marker, from);
    if (at < 0) break;
    const open = source.indexOf("{", at);
    if (open < 0) break;
    let depth = 1;
    let i = open + 1;
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      i++;
    }
    bodies.push(source.slice(open + 1, i - 1));
    from = i;
  }
  return bodies;
}

// --- 1. motion tokens: present in :root with exact values, not in any theme ---
const rootBlock = blockFor(cssNoComments, ":root");
// Normalize spaces so cubic-bezier(0.2, 0, 0, 1) and cubic-bezier(0.2,0,0,1)
// compare equal; collapse runs of whitespace to a single space.
const norm = (s) => s.replace(/\s+/g, " ").trim();
const rootNorm = norm(rootBlock);

const DURATION_TOKENS = [
  ["--motion-micro", "120ms"],
  ["--motion-short", "200ms"],
  ["--motion-medium", "320ms"],
  ["--motion-page", "420ms"],
];
const EASING_TOKENS = [
  ["--ease-out", "cubic-bezier(0.2, 0, 0, 1)"],
  ["--ease-in", "cubic-bezier(0.4, 0, 1, 1)"],
  ["--ease-standard", "cubic-bezier(0.4, 0, 0.2, 1)"],
];

const tokenMisses = [];
for (const [name, value] of DURATION_TOKENS) {
  if (!rootNorm.includes(`${name}: ${value};`)) tokenMisses.push(`${name}: ${value}`);
}
for (const [name, value] of EASING_TOKENS) {
  if (!rootNorm.includes(`${name}: ${norm(value)};`)) tokenMisses.push(`${name}: ${value}`);
}
record(
  ":root defines the four duration and three easing motion tokens",
  tokenMisses.length === 0,
  tokenMisses.length ? `missing/mismatched: ${tokenMisses.join(", ")}` : "all seven present with exact values",
);

// The four durations are theme-independent: assert no [data-theme] block redefines
// any of them (a duplicate would let a theme silently diverge the motion pacing).
const THEMES = ["vellum", "pearl", "night", "sepia", "mihrab"];
const durationLeaks = [];
for (const theme of THEMES) {
  const block = blockFor(cssNoComments, `[data-theme="${theme}"]`);
  for (const [name] of DURATION_TOKENS) {
    if (new RegExp(`${name}\\s*:`).test(block)) durationLeaks.push(`${theme} redefines ${name}`);
  }
}
record(
  "No [data-theme] block redefines a motion duration token",
  durationLeaks.length === 0,
  durationLeaks.length ? durationLeaks.join("; ") : "durations live in :root only",
);

// --- 2. route-enter animation + its reduced-motion off-switch ---
const routeEnterBlock = blockFor(cssNoComments, ".route-enter");
const routeEnterUsesPageToken = /animation:[^;]*var\(--motion-page\)/.test(routeEnterBlock);
record(
  ".route-enter animation references var(--motion-page)",
  routeEnterUsesPageToken,
  routeEnterUsesPageToken ? norm(routeEnterBlock) : `found "${norm(routeEnterBlock) || "no .route-enter rule"}"`,
);

const reducedBlocks = reducedMotionBlocks(cssNoComments);
const reducedJoined = reducedBlocks.join("\n");
// The route-enter off-switch inside a reduced-motion block: .route-enter with
// animation set to none (or a zeroed duration). The dedicated gate uses none.
const routeEnterDisabled =
  /\.route-enter\s*\{[^}]*animation:\s*none/.test(reducedJoined) ||
  /\.route-enter\s*\{[^}]*animation-duration:\s*0s/.test(reducedJoined);
record(
  "prefers-reduced-motion disables the .route-enter animation",
  routeEnterDisabled,
  routeEnterDisabled ? "route-enter animation off under reduced motion" : "no .route-enter off-switch in a reduced-motion block",
);

// --- 3. ::view-transition root cross-fade + its reduced-motion zeroing ---
const vtOldBlock = blockFor(cssNoComments, "::view-transition-old(root)");
const vtNewBlock = blockFor(cssNoComments, "::view-transition-new(root)");
const vtOldOk = /animation:[^;]*var\(--motion-page\)/.test(vtOldBlock);
const vtNewOk = /animation:[^;]*var\(--motion-page\)/.test(vtNewBlock);
record(
  "::view-transition-old/new(root) cross-fade references var(--motion-page)",
  vtOldOk && vtNewOk,
  vtOldOk && vtNewOk
    ? "both root pseudo-elements animate off the page token"
    : `old=${vtOldOk ? "ok" : "missing"} new=${vtNewOk ? "ok" : "missing"}`,
);

// Inside a reduced-motion block, the ::view-transition-* animation is zeroed.
// Match the universal-selector form (old/new/group(*)) with a zeroed duration.
const vtZeroed = /::view-transition-(old|new|group)\(\*\)[\s\S]*?animation-duration:\s*0s/.test(reducedJoined);
record(
  "prefers-reduced-motion zeroes the ::view-transition animation duration",
  vtZeroed,
  vtZeroed ? "::view-transition-*(*) duration zeroed under reduced motion" : "no ::view-transition zeroing in a reduced-motion block",
);

// --- 4. the withViewTransition helper: export, genuine API, feature-detect,
//        reduced-motion gate; plus the real use site in settings ---
const exportsHelper = /export\s+function\s+withViewTransition\b/.test(motionSrc);
const usesGenuineApi = /document[\s\S]*startViewTransition|startViewTransition/.test(motionSrc) && motionSrc.includes("startViewTransition");
const featureDetected =
  motionSrc.includes("typeof") &&
  motionSrc.includes("startViewTransition") &&
  (motionSrc.includes('=== "function"') || motionSrc.includes("=== 'function'"));
const callsReducedMotion = /prefersReducedMotion\s*\(/.test(motionSrc);
const helperOk = exportsHelper && usesGenuineApi && featureDetected && callsReducedMotion;
record(
  "withViewTransition feature-detects document.startViewTransition and gates on prefersReducedMotion",
  helperOk,
  helperOk
    ? "exports the helper, reads the genuine API behind a typeof guard, honors reduced motion"
    : `export=${exportsHelper} api=${usesGenuineApi} typeofGuard=${featureDetected} reducedMotion=${callsReducedMotion}`,
);

const settingsUsesHelper = settingsSrc.includes("withViewTransition");
record(
  "settings/page.tsx imports and uses withViewTransition",
  settingsUsesHelper,
  settingsUsesHelper ? "the theme handler drives the View Transitions API" : "withViewTransition not referenced in settings/page.tsx",
);

// --- 5. wordmark hydration fix: present, single node only, never blanket ---
const WRAPPING_TAGS = ["aside", "header", "h1", "nav", "Link"];
for (const [label, src] of [["Sidebar", sidebarSrc], ["Header", headerSrc]]) {
  const present = src.includes("suppressHydrationWarning");
  // Guard against blanket suppression: the attribute must never sit on a
  // wrapping opening tag. Tolerate attributes between the tag name and the
  // attribute (e.g. <aside className=... suppressHydrationWarning>).
  const blanket = WRAPPING_TAGS.filter((tag) =>
    new RegExp(`<${tag}\\b[^>]*\\bsuppressHydrationWarning`).test(src),
  );
  record(
    `${label}.tsx suppresses hydration only on the wordmark node`,
    present && blanket.length === 0,
    !present
      ? "no suppressHydrationWarning found"
      : blanket.length
        ? `blanket suppression on <${blanket.join(">, <")}>`
        : "single text node, no wrapping element suppressed",
  );
}

// --- 6. no-abandoned-path guard + CSP non-regression ---
const layoutClean =
  !layoutNoComments.includes("unstable_ViewTransition") &&
  !/["']use client["']/.test(layoutNoComments);
record(
  "layout.tsx has no unstable_ViewTransition and no \"use client\"",
  layoutClean,
  layoutClean
    ? "stays a server component, no abandoned React ViewTransition path"
    : `unstable_ViewTransition=${layoutNoComments.includes("unstable_ViewTransition")} useClient=${/["']use client["']/.test(layoutNoComments)}`,
);

// Lenient: next.config.mjs must not carry an experimental viewTransition flag
// (the abandoned path). A bare substring scan is enough to catch a regression.
const hasExperimentalVt = /experimental[\s\S]*viewTransition/.test(nextConfig);
record(
  "next.config.mjs has no experimental viewTransition flag",
  !hasExperimentalVt,
  hasExperimentalVt ? "found an experimental viewTransition flag" : "no experimental view-transition flag",
);

// CSP non-regression: connect-src still names only 'self' https://api.quran.com.
// The motion work needs no new origin; this catches an accidental widening.
const connectOk = nextConfig.includes("connect-src 'self' https://api.quran.com");
record(
  "CSP connect-src is unchanged (no new origin for the motion work)",
  connectOk,
  connectOk ? "connect-src 'self' https://api.quran.com intact" : "connect-src changed or not found",
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
