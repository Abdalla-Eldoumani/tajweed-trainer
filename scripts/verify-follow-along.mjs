#!/usr/bin/env node
// Permanent gate for the follow-along layer (word-sync highlight, reveal-as-
// recited, the sub-verse word-range loop, and verse-level reading focus). No
// browser, no transpile: it reads the controller (useFollowAlong), the pure
// alignment/loop math (follow-along), the presentation layer (TajweedFollowText),
// the reader page (MushafPage), the player store + host (usePlayer, PlayerHost),
// and the per-verse overlay (VerseOverlay), strips TS/TSX comments so a prose
// mention never satisfies a check, and asserts the static WIRING that keeps the
// feature correct and safe. The behavioral checks (a segment-capable reciter
// highlights + advances, reveal uncovers word-by-word, the loop repeats a word
// range, focus dims other verses, and an everyayah reciter plays with no
// highlight and no error — at 1x and 0.75x) are the Playwright gate at closeout;
// this locks the wiring so it cannot silently regress. It checks:
//   1. one time source / no second audio — useFollowAlong reads
//      usePlayer((s) => s.currentTime) and uses fetchSegments + activeWordIndex,
//      and contains NO new Audio(, setInterval, or requestAnimationFrame, so the
//      active word can only come from the existing media clock (a regression to a
//      wall-clock timer fails). The sub-verse loop in usePlayer/PlayerHost adds
//      no second <audio> and no setInterval/rAF; it runs in the existing
//      ontimeupdate via the pure subVerseLoopDecision.
//   2. the markup is never mutated — TajweedFollowText injects
//      sanitizeTajweedHtml(...) via dangerouslySetInnerHTML and does NOT .replace
//      or .split the sanitized-html string (scoped to the html identifiers, so a
//      legitimate whitespace .split on a text node never false-positives) and has
//      no innerHTML = string edit; the active/blur mark is a class on a wrapper.
//   3. the no-segment path disables word-sync silently — canAlign is the exported
//      gate in follow-along, TajweedFollowText gates the marking on it (returns
//      the plain markup with no throw when it fails), and the controller's source
//      is the null-returning fetchSegments.
//   4. focus mode is verse-level — MushafPage applies mushaf-verse-dimmed off the
//      playing/selected verse key and the dim expression does NOT reference the
//      active word index (scoped to the dim/focus-key expressions, since the file
//      legitimately uses activeIdx for the highlight elsewhere).
//   5. one engine for the sub-verse loop — subVerseLoopDecision lives in
//      follow-along and is applied in PlayerHost, usePlayer holds the subVerseLoop
//      state, and VerseOverlay's sub-verse control constructs no new Audio(.
//
// Does NOT re-assert the segment shape / activeWordIndex lookup —
// scripts/verify-word-segments.mjs already locks that contract; this guards the
// wiring around it. Mirrors scripts/verify-rule-reveal.mjs in shape: the same
// read helper, the same strip-block-then-line comment stripping, the same record
// reporter, and process.exit(1) on any FAIL.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");

// Strip TS/TSX block then line comments so a prose mention of an identifier in a
// comment never creates a false match (the same technique verify-rule-reveal.mjs
// uses). Every one of these files carries long doc comments naming new Audio,
// setInterval, <audio>, activeIdx, .replace, and .split, so stripping is
// load-bearing here.
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const controller = stripComments(read("src", "hooks", "useFollowAlong.ts"));
const lib = stripComments(read("src", "lib", "follow-along.ts"));
const followText = stripComments(read("src", "components", "ui", "TajweedFollowText.tsx"));
const page = stripComments(read("src", "components", "mushaf", "MushafPage.tsx"));
const player = stripComments(read("src", "hooks", "usePlayer.ts"));
const host = stripComments(read("src", "components", "ui", "PlayerHost.tsx"));
const overlay = stripComments(read("src", "components", "mushaf", "VerseOverlay.tsx"));

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

// --- 1. one time source, no second audio in the controller -------------------
// The active word must come from the existing player's media clock, never a wall
// clock the controller spins up itself. So require the broad read of currentTime
// off usePlayer plus the segment source, and ban every way to make a second
// engine or timer (new Audio, setInterval, requestAnimationFrame). A regression
// that polled audio position on an interval, or created a parallel <audio>, fails.
const readsPlayerTime = /usePlayer\(\(s\)\s*=>\s*s\.currentTime\)/.test(controller);
const usesActiveWord = /activeWordIndex\(/.test(controller);
const usesFetchSegments = /fetchSegments\(/.test(controller);
const controllerNoAudio = !/new Audio\(/.test(controller);
const controllerNoInterval = !/setInterval\(/.test(controller);
const controllerNoRaf = !/requestAnimationFrame\(/.test(controller);
const oneTimeSource =
  readsPlayerTime &&
  usesActiveWord &&
  usesFetchSegments &&
  controllerNoAudio &&
  controllerNoInterval &&
  controllerNoRaf;
record(
  "the follow-along controller reads the one player media clock and starts no second audio/timer",
  oneTimeSource,
  oneTimeSource
    ? "usePlayer currentTime + activeWordIndex + fetchSegments, no new Audio / setInterval / rAF"
    : `playerTime=${readsPlayerTime} activeWord=${usesActiveWord} fetchSegments=${usesFetchSegments} noAudio=${controllerNoAudio} noInterval=${controllerNoInterval} noRaf=${controllerNoRaf}`,
);

// The sub-verse loop additions to the store and host introduce no second <audio>
// and no wall-clock timer of their own: usePlayer is state-only (no Audio), and
// PlayerHost runs the loop inside the existing ontimeupdate (no setInterval/rAF
// driving the loop; the lone setInterval in the host is the minutes sleep timer,
// asserted separately not to be the loop). Guard the store hard (no new Audio at
// all) and the host against a NEW rAF-driven loop.
const storeNoAudio = !/new Audio\(/.test(player);
const hostUsesTimeupdate = /ontimeupdate/.test(host);
const hostNoRaf = !/requestAnimationFrame\(/.test(host);
const loopOneEngine = storeNoAudio && hostUsesTimeupdate && hostNoRaf;
record(
  "the sub-verse loop runs on the existing engine (ontimeupdate), adding no second audio or rAF loop",
  loopOneEngine,
  loopOneEngine
    ? "usePlayer has no new Audio, PlayerHost drives the loop in ontimeupdate, no rAF"
    : `storeNoAudio=${storeNoAudio} ontimeupdate=${hostUsesTimeupdate} noRaf=${hostNoRaf}`,
);

// --- 2. the verified markup is never mutated ---------------------------------
// The layer must inject the SAME sanitized html TajweedText uses and mark the
// active word with a wrapper class, never by rewriting the html string. Require
// the sanitizer + dangerouslySetInnerHTML, then ban a string edit of the
// sanitized-html identifiers specifically (safeHtml / tajweedHtml) — scoped so a
// legitimate whitespace .split on a DOM text node can never trip it — and ban a
// raw innerHTML = assignment. Finally require a class/wrapper application, the
// evidence the mark is additive and the letter colors underneath stay untouched.
const sanitizes = /sanitizeTajweedHtml\(/.test(followText);
const injectsHtml = /dangerouslySetInnerHTML/.test(followText);
// Ban a .replace/.split whose receiver is the sanitized-html — either the html
// identifiers (safeHtml / tajweedHtml, the assign-then-edit form) or a
// sanitizeTajweedHtml(...) call result chained inline (the most direct mutation).
// Scoped to those receivers so a legitimate whitespace .split on a DOM text node
// (node.textContent grouping) never false-positives.
const htmlStringEdited =
  /\b(?:safeHtml|tajweedHtml)\s*\.\s*(?:replace|split)\s*\(/.test(followText) ||
  /sanitizeTajweedHtml\([^;]*\)\s*\.\s*(?:replace|split)\s*\(/.test(followText);
const rawInnerHtmlEdit = /\.innerHTML\s*=/.test(followText);
const marksWithClass = /classList|className|mushaf-word-active/.test(followText);
const markupUntouched =
  sanitizes && injectsHtml && !htmlStringEdited && !rawInnerHtmlEdit && marksWithClass;
record(
  "the highlight layer injects the sanitized markup unchanged and marks via a wrapper class",
  markupUntouched,
  markupUntouched
    ? "sanitizeTajweedHtml + dangerouslySetInnerHTML, no .replace/.split of the html, class-based mark"
    : `sanitizes=${sanitizes} inject=${injectsHtml} noStringEdit=${!htmlStringEdited} noInnerHtmlEdit=${!rawInnerHtmlEdit} classMark=${marksWithClass}`,
);

// --- 3. the no-segment path disables word-sync silently ----------------------
// canAlign is the exported alignment gate in the pure lib; the layer consults it
// and renders the plain markup with NO mark when it fails (no throw). Require the
// export, the layer's use of it, and the early-return/no-highlight fallback shape
// (`if (!canAlign(...)) return;`). The controller's segment source is
// fetchSegments, which resolves null for a segment-less reciter — the universal
// "no follow-along" signal — so a segment-less reciter never reaches a mark.
const exportsCanAlign = /export function canAlign/.test(lib);
const layerUsesCanAlign = /canAlign\(/.test(followText);
const silentFallback = /if\s*\(\s*!\s*canAlign\([^)]*\)\s*\)\s*return/.test(followText);
const sourceIsFetchSegments = /fetchSegments\(/.test(controller);
const noSegmentSilent =
  exportsCanAlign && layerUsesCanAlign && silentFallback && sourceIsFetchSegments;
record(
  "a segment-less reciter disables word-sync silently via the canAlign gate (plain markup, no throw)",
  noSegmentSilent,
  noSegmentSilent
    ? "export canAlign + layer canAlign gate + if(!canAlign) return + fetchSegments source"
    : `exportCanAlign=${exportsCanAlign} layerCanAlign=${layerUsesCanAlign} fallbackReturn=${silentFallback} fetchSegments=${sourceIsFetchSegments}`,
);

// --- 4. reading focus is verse-level, not word-level -------------------------
// The dim must key on the playing/selected verse, never the active word index, so
// it works for every reciter and with audio paused. Pull the focus-key and dim
// expressions (the `focusActiveKey = ...` assignment and the `mushaf-verse-dimmed`
// application line) and assert: the dim class exists, the dim keys on the verse
// (focusActiveKey / playingKey), and NEITHER scoped slice references activeIdx /
// activeWordIndex (a scoped check, since the file legitimately uses activeIdx for
// the highlight elsewhere — banning it file-wide would be a false positive).
const hasDimClass = /mushaf-verse-dimmed/.test(page);
const focusKeyExpr = (page.match(/focusActiveKey\s*=[\s\S]*?;/) ?? [""])[0];
const dimAppExpr = (page.match(/[^\n]*mushaf-verse-dimmed[^\n]*/) ?? [""])[0];
const dimDefExpr = (page.match(/const\s+dimmed\s*=[^\n]*/) ?? [""])[0];
const dimScope = focusKeyExpr + "\n" + dimAppExpr + "\n" + dimDefExpr;
const focusKeysOnVerse = /focusActiveKey/.test(dimAppExpr + dimDefExpr) && /playingKey/.test(focusKeyExpr);
const dimNotWordLevel = !/activeIdx|activeWordIndex/.test(dimScope);
const focusVerseLevel = hasDimClass && focusKeysOnVerse && dimNotWordLevel;
record(
  "reading focus mode dims by the playing/selected verse, never the active word index",
  focusVerseLevel,
  focusVerseLevel
    ? "mushaf-verse-dimmed keyed on focusActiveKey/playingKey, no activeIdx in the dim expression"
    : `dimClass=${hasDimClass} keysOnVerse=${focusKeysOnVerse} noActiveIdxInDim=${dimNotWordLevel}`,
);

// --- 5. one engine for the sub-verse word-range loop -------------------------
// The loop math lives once in the pure lib (subVerseLoopDecision), PlayerHost
// applies it, usePlayer holds the subVerseLoop state, and the overlay's sub-verse
// control only calls into the store (setSubVerseLoop) — it constructs no second
// <audio>. Require the decision in the lib AND the host, the store state, and ban
// new Audio( in the overlay.
const decisionInLib = /export function subVerseLoopDecision/.test(lib);
const decisionInHost = /subVerseLoopDecision\(/.test(host);
const storeHasLoopState = /subVerseLoop/.test(player);
const overlayNoAudio = !/new Audio\(/.test(overlay);
const subVerseOneEngine =
  decisionInLib && decisionInHost && storeHasLoopState && overlayNoAudio;
record(
  "the sub-verse loop is one engine: decision in the lib, applied in the host, no audio in the overlay",
  subVerseOneEngine,
  subVerseOneEngine
    ? "subVerseLoopDecision in lib + host, subVerseLoop state in store, no new Audio in the overlay"
    : `libDecision=${decisionInLib} hostDecision=${decisionInHost} storeState=${storeHasLoopState} overlayNoAudio=${overlayNoAudio}`,
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
