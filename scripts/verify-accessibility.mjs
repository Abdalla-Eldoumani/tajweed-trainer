#!/usr/bin/env node
// Source-level regression guard for the accessibility fixes. No browser,
// no transpile: plain presence/absence checks on file contents, fast and
// dependency-free like the sibling verify-* scripts. It validates the
// focus rings, motion-reduce, smooth-scroll gating, aria-current and
// scroll-lock work, the mini-player slider dark accent and the
// contrast-scoped ayah-number pill, and the raw-filled-button dark parity fix
// (no `bg-primary text-white` left in src), so none of them can silently regress.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

// --- 1. focus rings: the visible focus-visible ring landed and the old
//        outline-none-with-border-only pattern is gone from the search box. ---
const searchSrc = read("src/app/search/page.tsx");
const paletteSrc = read("src/components/mushaf/ReaderPalette.tsx");
record(
  "search/page.tsx has focus-visible:ring-gold",
  /focus-visible:ring-gold/.test(searchSrc),
  "search input keyboard focus ring",
);
record(
  "ReaderPalette.tsx has focus-visible:ring-gold",
  /focus-visible:ring-gold/.test(paletteSrc),
  "palette input keyboard focus ring",
);
record(
  "search/page.tsx dropped focus:outline-none focus:border-primary",
  !/focus:outline-none focus:border-primary/.test(searchSrc),
  "old outline-suppressing pattern must be gone",
);

// --- 2. mini-player slider dark accent (mirrors the settings fix). ---
const miniSrc = read("src/components/ui/MiniPlayer.tsx");
record(
  "MiniPlayer.tsx slider uses accent-primary dark:accent-gold",
  /accent-primary dark:accent-gold/.test(miniSrc),
  "seek/volume thumb must be visible in dark",
);

// --- 3. no ungated smooth-scroll in the reader (both quote styles), and the
//        reduced-motion guard is present where the scroll happens. ---
const pageSrc = read("src/components/mushaf/MushafPage.tsx");
const readerSrc = read("src/components/mushaf/MushafReader.tsx");
const smoothRe = /behavior:\s*["']smooth["']/;
record(
  "MushafPage.tsx has no literal behavior:'smooth'",
  !smoothRe.test(pageSrc),
  "scroll behavior must be gated through prefersReducedMotion()",
);
record(
  "MushafReader.tsx has no literal behavior:'smooth'",
  !smoothRe.test(readerSrc),
  "scroll behavior must be gated through prefersReducedMotion()",
);
record(
  "MushafPage.tsx calls prefersReducedMotion()",
  /prefersReducedMotion\(\)/.test(pageSrc),
  "reduced-motion guard present",
);
// The verse-scroll-into-view moved out of the reader into MushafPage/the
// overlay, so the reader does no scrolling. Require the reduced-motion guard
// only if the reader actually scrolls (so it stays in force if a scroll ever
// returns here), and accept it as satisfied when there is no scroll to gate.
const readerScrolls = /scrollIntoView|scrollTo|window\.scroll/.test(readerSrc);
record(
  "MushafReader.tsx gates any scroll through prefersReducedMotion()",
  !readerScrolls || /prefersReducedMotion\(\)/.test(readerSrc),
  readerScrolls ? "reduced-motion guard present where the reader scrolls" : "reader does no scrolling, nothing to gate",
);

// --- 4. motion-reduce on the cited spinner/pulse animations. ---
const audioSrc = read("src/components/ui/AudioPlayer.tsx");
const tajweedSrc = read("src/components/ui/TajweedText.tsx");
record(
  "AudioPlayer.tsx spinner has motion-reduce:animate-none",
  /animate-spin motion-reduce:animate-none/.test(audioSrc),
  "loading spinner honors reduced motion",
);
record(
  "TajweedText.tsx skeleton has motion-reduce:animate-none",
  /animate-pulse motion-reduce:animate-none/.test(tajweedSrc),
  "loading skeleton honors reduced motion",
);

// --- 5. scroll-lock on the expanded playback sheet (lock and release), now via
//        the shared ref-counted source in lib/scroll-lock so stacked overlays
//        coordinate (the body stays locked until the last one releases). ---
const surfaceSrc = read("src/components/mushaf/PlaybackSurface.tsx");
record(
  "PlaybackSurface.tsx locks body scroll while expanded",
  /lockBodyScroll\(\)/.test(surfaceSrc),
  "lockBodyScroll() while expanded",
);
record(
  "PlaybackSurface.tsx restores body scroll on close",
  /unlockBodyScroll\(\)/.test(surfaceSrc),
  "unlockBodyScroll() on collapse/unmount",
);

// --- 6. aria-current wiring on both nav surfaces. ---
const sidebarSrc = read("src/components/layout/Sidebar.tsx");
const drawerSrc = read("src/components/layout/MobileDrawer.tsx");
const ariaCurrentRe = /aria-current=\{isActive \? "page" : undefined\}/;
record(
  "Sidebar.tsx marks the active link with aria-current",
  ariaCurrentRe.test(sidebarSrc),
  'aria-current={isActive ? "page" : undefined}',
);
record(
  "MobileDrawer.tsx marks the active link with aria-current",
  ariaCurrentRe.test(drawerSrc),
  'aria-current={isActive ? "page" : undefined}',
);

// --- 7. the ayah-number pill carries its contrast-scoped gold, not the shared
//        --gold-dark (which sits at AA-large only on --bg-subtle). The pill is
//        theme-aware: a deeper gold on the light grounds (the base rule), a
//        brighter gold on the dark grounds. The dark rule is now scoped to the
//        three dark themes ([data-theme="night"|"sepia"|"mihrab"]) rather than
//        the removed .dark class, since the phase replaced the single dark class
//        with per-ground [data-theme] blocks; the numeral must still be a scoped
//        contrast-safe hex, not the shared var(--gold-dark). ---
const css = read("src/app/globals.css");
const lightEnd = (css.match(/(?<![\]"]\s)\.tajweed-text \.end\s*\{([\s\S]*?)\n\}/) || [])[1] || "";
const darkEnd =
  (css.match(/\[data-theme="night"\] \.tajweed-text \.end[\s\S]*?\{([\s\S]*?)\n\}/) || [])[1] || "";
record(
  "ayah-number pill (light) sets a scoped color, not var(--gold-dark)",
  /color:\s*#[0-9A-Fa-f]{6}/.test(lightEnd) && !/color:\s*var\(--gold-dark\)/.test(lightEnd),
  "AA-normal contrast-scoped numeral color on the ivory pill",
);
record(
  "ayah-number pill (dark themes) sets a scoped color, not var(--gold-dark)",
  /color:\s*#[0-9A-Fa-f]{6}/.test(darkEnd) && !/color:\s*var\(--gold-dark\)/.test(darkEnd),
  "AA-normal contrast-scoped numeral color on the dark-ground pills",
);

// --- 8. no raw `bg-primary text-white` anywhere in src: filled primary buttons
//        must flip to gold on the night theme like the Button primitive, so the
//        only sanctioned pairing is bg-primary text-on-primary (+ the dark:
//        gold treatment). A bare text-white never flips and is the dark-mode
//        consistency tell this guard prevents from returning. ---
function walkSrc(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkSrc(full, acc);
    else if (/\.(tsx?|css)$/.test(entry)) acc.push(full);
  }
  return acc;
}
const offenders = walkSrc(join(root, "src")).filter((f) =>
  /bg-primary text-white/.test(readFileSync(f, "utf8")),
);
record(
  "src has zero raw `bg-primary text-white` (filled buttons flip to gold in dark)",
  offenders.length === 0,
  offenders.length ? offenders.map((f) => relative(root, f)).join(", ") : "none",
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} accessibility checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
