#!/usr/bin/env node
// Permanent gate for the verse overlay. No browser, no transpile: it reads
// src/components/mushaf/VerseOverlay.tsx (and MushafReader.tsx for the mount
// site), strips TS/TSX comments so a prose mention never satisfies a check, and
// asserts the static structure that makes the overlay correct and accessible.
// The behavioral checks (open on tap, focus trapped, scroll locked, dismiss
// three ways, every action reachable, the one-transport invariant across the
// five themes and both languages) are the Playwright gate at closeout; this
// locks the structure so it cannot silently regress. It checks:
//   1. portal + inert  — portals to document.body and is inert when closed
//      (inert={!open}), so the closed shell never traps focus or pointer.
//   2. scroll lock     — uses the shared ref-counted lock AND releases it in a
//      `return () =>` cleanup, so every open is balanced by an unlock.
//   3. focus trap      — a real trapTab with the shared focusables selector.
//   4. dismissal       — three ways out: Escape, scrim onClick={onClose}, and an
//      explicit close control referencing onClose with the close label.
//   5. action set      — play / play-from-here / memorize / bookmark / note keys
//      plus the lifted surfaces VerseNotes, ReciterCompare, ReadingDepth.
//   6. one transport   — NO second <audio> and no new Audio(; usePlayer commands
//      the one engine and useVerseSelection drives range/repeat/loop/gap.
//   7. focus restore   — captures the opener (document.activeElement) and
//      restores it on close via openerRef.current?.focus.
//   8. reduced motion  — the entrance has a motion-reduce variant (opacity only).
//   9. mount site      — MushafReader renders <VerseOverlay> LEXICALLY INSIDE
//      <VerseSelectionProvider>, so useVerseSelection() resolves at runtime
//      instead of throwing (which would kill the selection controls).
//  10. inline mount    — the overlay imports AND renders <OverlayInlineControls/>
//      (the reciter / speed / translation-source section), so the controls are
//      reachable inside the real overlay, not just defined.
//  11. inline bindings — OverlayInlineControls writes reciter, playbackSpeed, and
//      translationId through updateSettings (the one funnel), so each control is
//      two-way-bound to its setting (INLINE-01/02/03); a regression to local
//      state drops a write and fails.
//  12. inline one path — OverlayInlineControls READS settings.reciter /
//      .playbackSpeed / .translationId (the store, not a local mirror) and adds
//      no second <audio> / new Audio(.
//  13. seam retired    — the old "Change reciter -> /settings" line above the
//      transport is gone (ReciterLine removed); audio.changeReciter appears
//      EXACTLY ONCE, the kept ErrorLine recovery link. Re-adding a main-section
//      link or dropping the recovery link flips this to FAIL.
//
// Mirrors scripts/verify-motion.mjs in shape: the same record reporter, the same
// comment-stripping technique, process.exit(1) on any FAIL.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");

// Strip TS/TSX block and line comments so a prose mention of an identifier in a
// comment never creates a false match (the same technique verify-motion.mjs
// uses for its no-abandoned-path scan).
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
// Collapse runs of whitespace to a single space for multi-token comparisons.
const norm = (s) => s.replace(/\s+/g, " ").trim();

const overlay = read("src", "components", "mushaf", "VerseOverlay.tsx");
const src = stripComments(overlay);

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

// --- 1. portal to body + inert when closed ---
const portalsToBody = src.includes("createPortal(") && src.includes("document.body");
const inertWhenClosed = src.includes("inert={!open}");
record(
  "overlay portals to document.body and is inert when closed",
  portalsToBody && inertWhenClosed,
  portalsToBody && inertWhenClosed
    ? "createPortal(content, document.body) with inert={!open}"
    : `portalToBody=${portalsToBody} inert={!open}=${inertWhenClosed}`,
);

// --- 2. balanced scroll lock: locked while open, released in a cleanup ---
// Require the STRICT cleanup form so an imported-but-never-called unlock (an
// unbalanced lock) fails — a lenient "both identifiers present" check would pass
// even when the lock is never released.
const locksScroll = src.includes("lockBodyScroll");
const cleanupUnlocks = /return\s*\(\)\s*=>[^}]*unlockBodyScroll/.test(src);
record(
  "body scroll is locked while open and released in a cleanup",
  locksScroll && cleanupUnlocks,
  locksScroll && cleanupUnlocks
    ? "lockBodyScroll() balanced by return () => unlockBodyScroll()"
    : `lockBodyScroll=${locksScroll} returnCleanupUnlock=${cleanupUnlocks}`,
);

// --- 3. a real Tab trap with the shared focusables selector ---
const hasTrapTab = src.includes("trapTab");
const focusablesSelector = src.includes("'a[href], button:not([disabled])");
record(
  "Tab is trapped via trapTab with the shared focusables selector",
  hasTrapTab && focusablesSelector,
  hasTrapTab && focusablesSelector
    ? "trapTab over a[href], button:not([disabled]), ..."
    : `trapTab=${hasTrapTab} focusablesSelector=${focusablesSelector}`,
);

// --- 4. three-way dismissal: Escape, scrim tap, explicit close ---
const hasEscape = src.includes('"Escape"');
const scrimDismisses = /onClick=\{onClose\}/.test(src) && src.includes('aria-hidden="true"');
const closeControl = src.includes("onClose") && src.includes("reading.close");
const dismissMisses = [];
if (!hasEscape) dismissMisses.push("Escape branch");
if (!scrimDismisses) dismissMisses.push("scrim onClick={onClose}");
if (!closeControl) dismissMisses.push("close control (onClose + reading.close)");
record(
  "overlay dismisses three ways: Escape, scrim tap, explicit close",
  dismissMisses.length === 0,
  dismissMisses.length ? `missing: ${dismissMisses.join(", ")}` : "Escape + scrim + close all present",
);

// --- 5. the full action set + the lifted reading-depth surfaces ---
const ACTION_KEYS = [
  "player.playVerse",
  "player.playFromHere",
  "mushaf.memorizeMark",
  "mushaf.bookmarkVerse",
];
const LIFTED_SURFACES = ["VerseNotes", "ReciterCompare", "ReadingDepth"];
const actionMisses = [...ACTION_KEYS, ...LIFTED_SURFACES].filter((tok) => !src.includes(tok));
record(
  "the play / play-from-here / memorize / bookmark / note actions and lifted surfaces are present",
  actionMisses.length === 0,
  actionMisses.length ? `missing: ${actionMisses.join(", ")}` : "all actions and VerseNotes/ReciterCompare/ReadingDepth wired",
);

// --- 6. one transport: no second <audio>, commands the one engine ---
const noNewAudio = !src.includes("new Audio(");
const noAudioTag = !src.includes("<audio");
const usesPlayer = src.includes("usePlayer");
const usesSelection = src.includes("useVerseSelection");
const oneTransport = noNewAudio && noAudioTag && usesPlayer && usesSelection;
record(
  "overlay adds no second <audio> and commands usePlayer + useVerseSelection",
  oneTransport,
  oneTransport
    ? "no new Audio( / <audio; usePlayer + useVerseSelection referenced"
    : `noNewAudio=${noNewAudio} noAudioTag=${noAudioTag} usePlayer=${usesPlayer} useVerseSelection=${usesSelection}`,
);

// --- 7. opener focus restore on close ---
// Require the strict restore call, not the looser "openerRef.current somewhere
// + .focus somewhere", so a half-wired restore fails.
const capturesOpener = src.includes("openerRef") && src.includes("document.activeElement");
const restoresOpener = src.includes("openerRef.current?.focus");
record(
  "overlay captures the opener and restores focus to it on close",
  capturesOpener && restoresOpener,
  capturesOpener && restoresOpener
    ? "openerRef <- document.activeElement, restored via openerRef.current?.focus"
    : `capturesOpener=${capturesOpener} restoresOpener=${restoresOpener}`,
);

// --- 8. reduced-motion variant on the entrance ---
const reducedMotion = src.includes("motion-reduce:transition-none");
record(
  "the entrance has a reduced-motion variant (opacity only)",
  reducedMotion,
  reducedMotion ? "motion-reduce:transition-none on the transition" : "no motion-reduce variant on the entrance transition",
);

// --- 9. mount site: <VerseOverlay> sits inside <VerseSelectionProvider> ---
// A mis-wired mount that puts the overlay outside the provider would make
// useVerseSelection() throw at runtime; catch it statically by comparing
// lexical positions in the comment-stripped reader source.
const reader = stripComments(read("src", "components", "mushaf", "MushafReader.tsx"));
const providerOpen = reader.indexOf("<VerseSelectionProvider");
const providerClose = reader.indexOf("</VerseSelectionProvider>");
const overlayAt = reader.indexOf("<VerseOverlay");
const mountedInside =
  providerOpen >= 0 &&
  providerClose > providerOpen &&
  overlayAt > providerOpen &&
  overlayAt < providerClose;
record(
  "MushafReader renders <VerseOverlay> lexically inside <VerseSelectionProvider>",
  mountedInside,
  mountedInside
    ? "overlay sits between the provider's open and close tags"
    : `providerOpen=${providerOpen} overlayAt=${overlayAt} providerClose=${providerClose}`,
);

// --- The inline reciter / speed / translation-source controls (Phase 4) -------
// Read the inline-controls source too, so the binding checks below assert against
// the component that actually writes settings, not just its presence in the
// overlay. Stripped so a comment mention of updateSettings never satisfies a
// check.
const inline = stripComments(
  read("src", "components", "mushaf", "OverlayInlineControls.tsx"),
);
const inlineNorm = norm(inline);

// --- 10. the overlay MOUNTS the inline controls (import + render) ---
// Both an import of the component and a JSX render usage, so a stray import with
// no mount (or a mount with no import) fails rather than passing on one half.
const importsInline = /import\s*\{\s*OverlayInlineControls\s*\}/.test(src);
const rendersInline = src.includes("<OverlayInlineControls");
record(
  "overlay imports and renders <OverlayInlineControls/>",
  importsInline && rendersInline,
  importsInline && rendersInline
    ? "OverlayInlineControls imported and mounted in the overlay"
    : `import=${importsInline} render=${rendersInline}`,
);

// --- 11. inline controls bind the one funnel: updateSettings for all 3 fields --
// The INLINE-01/02/03 binding assertion. Each control writes its field through
// updateSettings; tolerate whitespace inside the object literal. A control that
// regressed to local state would drop its updateSettings({ <field> write here.
const FIELD_WRITES = [
  { field: "reciter", re: /updateSettings\(\{\s*reciter\b/ },
  { field: "playbackSpeed", re: /updateSettings\(\{\s*playbackSpeed\b/ },
  { field: "translationId", re: /updateSettings\(\{\s*translationId\b/ },
];
const writeMisses = FIELD_WRITES.filter((f) => !f.re.test(inlineNorm)).map((f) => f.field);
record(
  "inline controls write reciter / playbackSpeed / translationId via updateSettings",
  writeMisses.length === 0,
  writeMisses.length
    ? `missing updateSettings write for: ${writeMisses.join(", ")}`
    : "all three fields bound through updateSettings",
);

// --- 12. inline controls read the store, not a local mirror; no second audio ---
// They must bind settings.<field> (the one store) for each of the three values,
// and construct no <audio> / new Audio( (the one-engine invariant for this file
// too). A local-state fork would read its own variable instead of settings.X.
const READS = ["settings.reciter", "settings.playbackSpeed", "settings.translationId"];
const readMisses = READS.filter((tok) => !inline.includes(tok));
const inlineNoNewAudio = !inline.includes("new Audio(");
const inlineNoAudioTag = !inline.includes("<audio");
const inlineBindsStore = readMisses.length === 0 && inlineNoNewAudio && inlineNoAudioTag;
record(
  "inline controls read settings.reciter/playbackSpeed/translationId and add no second <audio>",
  inlineBindsStore,
  inlineBindsStore
    ? "binds settings.{reciter,playbackSpeed,translationId}; no new Audio( / <audio"
    : `readMisses=[${readMisses.join(", ")}] noNewAudio=${inlineNoNewAudio} noAudioTag=${inlineNoAudioTag}`,
);

// --- 13. the change-reciter-via-link seam is retired in the MAIN section ---
// Phase 4 retired the old "Change reciter -> /settings" line above the transport:
// the inline reciter control changes the reciter in place now. The ErrorLine's
// recovery link (the same audio.changeReciter + href="/settings" pair) is kept on
// purpose. Assert PRECISELY: the retired ReciterLine component is gone, AND
// audio.changeReciter appears EXACTLY ONCE (only the error-recovery link). This
// bites both ways: re-adding a main-section change-reciter link pushes the count
// to 2 (FAIL), and dropping the error-recovery link pushes it to 0 (FAIL).
const reciterLineGone = !src.includes("function ReciterLine") && !src.includes("<ReciterLine");
const changeReciterCount = (src.match(/audio\.changeReciter/g) || []).length;
const seamRetired = reciterLineGone && changeReciterCount === 1;
record(
  "the main-section change-reciter link is retired (only the error-recovery link remains)",
  seamRetired,
  seamRetired
    ? "ReciterLine removed; audio.changeReciter appears once (the ErrorLine recovery link)"
    : `reciterLineGone=${reciterLineGone} audio.changeReciter count=${changeReciterCount} (expected 1)`,
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
