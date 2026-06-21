#!/usr/bin/env node
// Permanent gate for the tap-a-letter rule reveal. No browser, no transpile: it
// reads the gesture component (TajweedText), the popover (TajweedRulePopover),
// the reader (MushafReader), the drill CSS (globals.css), and the two metadata
// maps (tajweed-rule-links, tajweed-colors), strips TS/TSX comments so a prose
// mention never satisfies a check, and asserts the static structure that makes
// the reveal correct. The behavioral checks (hover opens, long-press opens and
// suppresses the click, a plain tap plays the verse, the legend is readable, the
// drill dims) are the Playwright gate at closeout; this locks the structure so
// it cannot silently regress. It checks:
//   1. gesture model  — TajweedText branches on the event's pointerType (NOT a
//      media query), wires hover (onPointerEnter) and long-press (onPointerDown),
//      and the plain-click path does NOT stopPropagation, so a colored-letter tap
//      bubbles and the verse still plays. The ONLY allowed suppression is the
//      post-long-press one-shot guard inside onClickCapture; the old
//      early-return-then-stopPropagation shape that ate the verse tap is gone.
//   2. resolve survives — closest("tajweed") ... getColorForClass( is intact, so
//      the popover still opens for a known rule and no-ops for an unknown class.
//   3. popover content — TajweedRulePopover names the rule from the verified map
//      (getColorForClass + color.nameEn/nameAr) and links from the route map
//      (getLessonLinkForClass), with no authored rule prose; every rule-link key
//      is a real tajweed key (no dead link) and every route is a /learn route.
//   4. reader legend   — MushafReader imports AND renders <ColorLegend/> (both an
//      import and a render match, so a stray import without a mount fails).
//   5. drill intact    — globals.css still dims the verse under data-tajweed-drill
//      and restores the selected rule's color (ghunnah and ikhafa at least), the
//      single-rule drill (RULE-04) the phase confirms unchanged.
//
// Mirrors scripts/verify-overlay.mjs in shape: the same read helper, the same
// strip-block-then-line comment stripping, the same record reporter, and
// process.exit(1) on any FAIL.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");

// Strip TS/TSX block then line comments so a prose mention of an identifier in a
// comment never creates a false match (the same technique verify-overlay.mjs
// uses). The gesture component carries a long doc comment naming pointerType,
// hover, long-press, and stopPropagation, so stripping is load-bearing here.
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const tajweedText = stripComments(read("src", "components", "ui", "TajweedText.tsx"));
const popover = stripComments(read("src", "components", "ui", "TajweedRulePopover.tsx"));
const reader = stripComments(read("src", "components", "mushaf", "MushafReader.tsx"));
const css = read("src", "app", "globals.css");
const ruleLinks = read("src", "lib", "tajweed-rule-links.ts");
const colors = read("src", "lib", "tajweed-colors.ts");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

// --- 1. gesture: hover/long-press by pointerType, no verse-eating click -------
// The trigger must be the actual gesture (pointerType), never a media query, so
// a hybrid device behaves per the gesture used. Hover arms on onPointerEnter,
// long-press on onPointerDown. The plain-click path must NOT stopPropagation:
// the only allowed suppression is the post-long-press one-shot guard, which
// lives inside onClickCapture. Isolate everything BEFORE onClickCapture and
// assert the old early-return-then-stopPropagation shape (the exact thing that
// used to eat the verse tap) is absent there, so a regression to it fails while
// the kept one-shot guard is allowed.
const readsPointerType = /pointerType/.test(tajweedText);
const noMatchMedia = !/matchMedia/.test(tajweedText);
const wiresHover = /onPointerEnter=/.test(tajweedText);
const wiresLongPress = /onPointerDown=/.test(tajweedText);
const beforeClickGuard = tajweedText.split("onClickCapture")[0];
const noVerseEatingClick =
  !/getColorForClass\(cssClass\)\)\s*return;\s*[^]*?stopPropagation\(\)/.test(beforeClickGuard);
const gestureOk =
  readsPointerType && noMatchMedia && wiresHover && wiresLongPress && noVerseEatingClick;
record(
  "gesture opens on hover/long-press by pointerType and the tap bubbles to the verse",
  gestureOk,
  gestureOk
    ? "pointerType branch, onPointerEnter + onPointerDown, no plain-click stopPropagation"
    : `pointerType=${readsPointerType} noMatchMedia=${noMatchMedia} hover=${wiresHover} longPress=${wiresLongPress} noVerseEatingClick=${noVerseEatingClick}`,
);

// The one allowed suppression is present (the post-long-press one-shot guard), so
// a long-press does not also open the verse overlay. This bites the other way: if
// onClickCapture's stopPropagation were dropped, the long-press would leak a tap.
const hasOneShotGuard = /onClickCapture/.test(tajweedText) && /stopPropagation\(\)/.test(tajweedText);
record(
  "the post-long-press one-shot click guard is kept",
  hasOneShotGuard,
  hasOneShotGuard ? "onClickCapture suppresses exactly the follow-up click" : "missing onClickCapture stopPropagation guard",
);

// --- 2. the resolve survives: closest("tajweed") -> getColorForClass ----------
record(
  "TajweedText resolves the tapped class via the tajweed map",
  /closest\("tajweed"\)[\s\S]*?getColorForClass\(/.test(tajweedText),
);

// --- 3. popover content comes from the verified maps, no authored prose --------
// The popover names the rule from the color map and links from the route map; it
// renders color.nameEn/nameAr (not an inline rule description). A regression that
// authored a sentence about the rule would not add these map reads.
const popoverFromMap =
  /getColorForClass/.test(popover) &&
  /getLessonLinkForClass/.test(popover) &&
  /color\.nameEn/.test(popover) &&
  /color\.nameAr/.test(popover);
record(
  "the popover names the rule from the verified map and links from the route map",
  popoverFromMap,
  popoverFromMap
    ? "getColorForClass + getLessonLinkForClass + color.nameEn/nameAr"
    : "missing one of getColorForClass / getLessonLinkForClass / color.nameEn / color.nameAr",
);

// Reuse the verify-study-tools orphan-link technique: every class in the link map
// must be a real key in the tajweed map (no dead "Learn more" link), and every
// route value must be a /learn route (structural routing only, never content).
const linkClasses = [...ruleLinks.matchAll(/^ {2}([a-z_]+):\s*"\/learn\//gm)].map((m) => m[1]);
const defKeys = new Set([...colors.matchAll(/^ {2}([a-z_]+):\s*\{/gm)].map((m) => m[1]));
record("the rule-link map has entries", linkClasses.length > 0, `${linkClasses.length} classes`);
const orphanLinks = linkClasses.filter((c) => !defKeys.has(c));
record("every rule-link class exists in the tajweed map", orphanLinks.length === 0, orphanLinks.join(", "));
const routeValues = [...ruleLinks.matchAll(/:\s*"(\/[^"]*)"/g)].map((m) => m[1]);
const badRoutes = routeValues.filter((r) => !r.startsWith("/learn/"));
record("the rule-link map points only at /learn routes", badRoutes.length === 0, badRoutes.join(", "));

// --- 4. the legend is surfaced in the reader (RULE-03) ------------------------
// Both an import and a JSX render, so a stray import with no mount (or a mount
// with no import) fails rather than passing on one half.
const importsLegend = /import\s*\{\s*ColorLegend\s*\}/.test(reader);
const rendersLegend = /<ColorLegend/.test(reader);
record(
  "MushafReader imports and renders <ColorLegend/>",
  importsLegend && rendersLegend,
  importsLegend && rendersLegend ? "ColorLegend imported and mounted in the reader" : `import=${importsLegend} render=${rendersLegend}`,
);

// --- 5. the single-rule drill is intact (RULE-04) ----------------------------
// Reused verbatim from verify-study-tools.mjs: the dim rule is present and the
// selected rule's color is restored for at least ghunnah and ikhafa.
record("the drill dims the verse when data-tajweed-drill is set", /\[data-tajweed-drill\][\s\S]*?\.tajweed-text/.test(css));
record(
  "the drill restores the selected rule's color",
  /\[data-tajweed-drill="ghunnah"\][\s\S]*?\.ghunnah\s*\{[\s\S]*?var\(--tajweed-ghunnah\)/.test(css) &&
    /\[data-tajweed-drill="ikhafa"\][\s\S]*?var\(--tajweed-ikhafa\)/.test(css),
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
