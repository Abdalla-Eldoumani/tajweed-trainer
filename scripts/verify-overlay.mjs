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
// The sheet form (the touch presentation of the same shell) and the docked
// mini-player add eight more, so the mobile reader cannot silently regress:
//  14. width switch    — VerseOverlay imports AND calls useIsDesktop, the one
//      boundary that picks the centered panel (>=1024) vs the bottom sheet.
//  15. swipe present    — SWIPE_CLOSE_THRESHOLD exists (the downward-drag close
//      distance ported from the retired PlaybackSurface sheet).
//  16. swipe closes,    — the grab-handle pointer-up dismiss body references
//      not stops         onClose and contains NO `stop`, so a swipe-down closes
//      the overlay while audio KEEPS playing; AND `.stop(` appears EXACTLY ONCE
//      in the overlay (the pre-existing clearSelection sameQueue guard, NOT the
//      dismiss). A file-wide no-stop check would falsely fail on clearSelection,
//      so this is scoped to the handler body + an occurrence count.
//  17. reserved bottom  — sheetBottomOffset and keyboardBottomOffset are wired,
//      so the sheet sits above the tab bar and rides above the keyboard.
//  18. verse stays      — the sheet box is a capped max-h-[..vh] with
//      visible           overflow-y-auto (NOT full-height), so the verse it
//      concerns stays readable above it and long verses scroll internally.
//  19. touch targets    — zero min-h-[36px] remain in the overlay (MOBILE-02:
//      the range stepper/loop/gap controls are >=44px for touch).
//  20. dismissed flag   — MiniPlayer has a `dismissed` flag AND the `visible`
//      expression includes `!dismissed`, so dismissing hides the bar without
//      ending playback and it stays gone until new playback.
//  21. docked, one      — MiniPlayer references reservedBottomFor (the docked
//      audio             bar sits above the tab bar, no content overlap) and
//      adds no second <audio> / new Audio( (the one-engine invariant).
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

// --- The sheet form: a width-selected bottom-sheet variant of the same shell ---
// Phase 6 ported PlaybackSurface's bottom sheet into the overlay as a touch form
// chosen by width; the panel is the >=1024 form. These checks lock the sheet's
// defining behaviors against the comment-stripped overlay source.

// --- 14. width switch: the overlay imports AND calls useIsDesktop ---
// Both the import and a call, so a stray import with no call (or vice versa)
// fails rather than passing on one half. useIsDesktop is the one boundary that
// selects the centered panel vs the bottom sheet.
const importsIsDesktop = /import\s*\{\s*useIsDesktop\s*\}/.test(src);
const callsIsDesktop = src.includes("useIsDesktop(");
record(
  "overlay imports and calls useIsDesktop to switch panel vs sheet by width",
  importsIsDesktop && callsIsDesktop,
  importsIsDesktop && callsIsDesktop
    ? "useIsDesktop imported and called (the panel/sheet width switch)"
    : `import=${importsIsDesktop} call=${callsIsDesktop}`,
);

// --- 15. the swipe-to-close threshold is present ---
const hasSwipeThreshold = src.includes("SWIPE_CLOSE_THRESHOLD");
record(
  "the sheet defines a swipe-close threshold (SWIPE_CLOSE_THRESHOLD)",
  hasSwipeThreshold,
  hasSwipeThreshold ? "SWIPE_CLOSE_THRESHOLD present" : "no SWIPE_CLOSE_THRESHOLD",
);

// --- 16. swipe-dismiss closes the overlay, it does NOT stop audio ---
// The single most important port adaptation: PlaybackSurface's sheet stopped the
// player on close; the overlay's swipe must call onClose (close the overlay,
// KEEP audio playing and the verse visible), never stop(). Scope the no-stop
// assertion to the grab-handle pointer-up handler BODY, because the overlay
// legitimately keeps exactly ONE st.stop() — the clearSelection sameQueue guard
// lifted from PlaybackSurface, which is NOT the dismiss. A file-wide no-stop
// check would falsely fail on that line. So: (a) the dismiss handler body
// references onClose and contains no `stop`, and (b) `.stop(` occurs EXACTLY
// ONCE in the overlay (the clearSelection one), mirroring the occurrence-count
// style this file already uses for audio.changeReciter.
const handleUpMatch = src.match(/onHandlePointerUp\s*=\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\};/);
const handleBody = handleUpMatch ? handleUpMatch[1] : "";
const dismissCallsOnClose = handleBody.includes("onClose(");
const dismissNoStop = handleBody.length > 0 && !/stop/.test(handleBody);
const stopCount = (src.match(/\.stop\(/g) || []).length;
const swipeClosesNotStops =
  !!handleUpMatch && dismissCallsOnClose && dismissNoStop && stopCount === 1;
record(
  "swipe-dismiss calls onClose (audio keeps playing), never stop; .stop( appears once",
  swipeClosesNotStops,
  swipeClosesNotStops
    ? "grab-handle pointer-up calls onClose with no stop; .stop( count=1 (clearSelection guard)"
    : `handlerFound=${!!handleUpMatch} dismissCallsOnClose=${dismissCallsOnClose} dismissNoStop=${dismissNoStop} stopCount=${stopCount} (expected 1)`,
);

// --- 17. reserved-bottom math: the sheet sits above the tab bar / keyboard ---
const usesSheetOffset = src.includes("sheetBottomOffset");
const usesKeyboardOffset = src.includes("keyboardBottomOffset");
record(
  "the sheet wires sheetBottomOffset and keyboardBottomOffset (above the tab bar / keyboard)",
  usesSheetOffset && usesKeyboardOffset,
  usesSheetOffset && usesKeyboardOffset
    ? "sheetBottomOffset + keyboardBottomOffset referenced"
    : `sheetBottomOffset=${usesSheetOffset} keyboardBottomOffset=${usesKeyboardOffset}`,
);

// --- 18. the sheet is sized to keep the verse visible (capped + scrolls) ---
// A capped viewport-height cap (max-h-[..vh]) plus overflow-y-auto, so the sheet
// covers only the lower portion and the verse it concerns stays readable above
// it; a full-height sheet would hide the verse. Assert the capped form exists.
const sheetCapped = /max-h-\[\d+vh\]/.test(src);
const sheetScrolls = src.includes("overflow-y-auto");
record(
  "the sheet uses a capped max-h-[..vh] with overflow-y-auto (not full-height)",
  sheetCapped && sheetScrolls,
  sheetCapped && sheetScrolls
    ? "capped max-h-[..vh] + overflow-y-auto so the verse stays visible above the sheet"
    : `cappedVh=${sheetCapped} overflowYAuto=${sheetScrolls}`,
);

// --- 19. MOBILE-02 touch targets: no sub-44px range controls remain ---
// The lifted range stepper / loop / gap controls were bumped to >=44px for
// touch; assert zero min-h-[36px] survive in the overlay.
const hasSmallTargets = src.includes("min-h-[36px]");
record(
  "no sub-44px (min-h-[36px]) touch targets remain in the overlay (MOBILE-02)",
  !hasSmallTargets,
  hasSmallTargets ? "min-h-[36px] still present" : "no min-h-[36px]; range targets are >=44px",
);

// --- The docked global mini-player (off the reader) ---------------------------
// Read the mini-player source (stripped) so the dismissed-flag and docked-bar
// checks assert against the component that actually renders the bar.
const miniPlayer = stripComments(read("src", "components", "ui", "MiniPlayer.tsx"));

// --- 20. the dismissed flag is present AND gates visibility ---
// MOBILE-03: dismissing hides the bar without ending playback (distinct from
// "no audio"), so it must both exist and be in the `visible` expression. A
// `dismissed` that is set but not read in `visible` would not actually hide the
// bar, so require it inside the visible computation.
const hasDismissed = miniPlayer.includes("dismissed");
const visibleGatesDismissed = /const visible =[^;]*!dismissed/.test(miniPlayer);
record(
  "the mini-player has a dismissed flag and the visible gate includes !dismissed",
  hasDismissed && visibleGatesDismissed,
  hasDismissed && visibleGatesDismissed
    ? "dismissed present and `visible` includes !dismissed"
    : `dismissed=${hasDismissed} visibleIncludesNotDismissed=${visibleGatesDismissed}`,
);

// --- 21. the docked bar reuses reservedBottomFor and adds no second audio ---
// The narrow/touch docked bar sits above the tab bar via reservedBottomFor (no
// content overlap), and like every player surface it constructs no <audio> /
// new Audio( — the one engine is PlayerHost.
const miniUsesReserved = miniPlayer.includes("reservedBottomFor");
const miniNoNewAudio = !miniPlayer.includes("new Audio(");
const miniNoAudioTag = !miniPlayer.includes("<audio");
const miniDocked = miniUsesReserved && miniNoNewAudio && miniNoAudioTag;
record(
  "the mini-player docks via reservedBottomFor and adds no second <audio>",
  miniDocked,
  miniDocked
    ? "reservedBottomFor referenced; no new Audio( / <audio"
    : `reservedBottomFor=${miniUsesReserved} noNewAudio=${miniNoNewAudio} noAudioTag=${miniNoAudioTag}`,
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
