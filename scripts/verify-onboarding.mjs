#!/usr/bin/env node
// Permanent gate for the first-launch onboarding tour. No browser, no transpile:
// it reads the tour component (OnboardingTour) and the string table (i18n),
// strips TS/TSX comments so a prose mention never satisfies a check, and asserts
// the static WIRING that keeps the tour correct and safe. The behavioral gate
// (the Settings toggle <-> the seenOnboarding flag <-> the tour live re-trigger:
// a genuinely-new profile auto-shows the v2 tour once, a reload never re-shows a
// dismissed tour, a returning seenOnboarding:true profile is NOT auto-shown, and
// toggling the Settings control ON re-shows the tour with no reload) is the
// Playwright gate at closeout; this locks the wiring so it cannot silently
// regress. It checks:
//   1. the seen-once flag drives auto-show and dismissal persists it —
//      getOnboardingSeen is read and setOnboardingSeen(true) is written on
//      dismissal (so a reload never re-shows a dismissed tour).
//   2. the live re-trigger — subscribeProgressChanged is imported from
//      @/lib/progress-events and called, AND the subscription re-reads
//      getOnboardingSeen, so a later Settings write re-shows the tour.
//   3. no re-open loop — the tour never writes setOnboardingSeen(false) (only the
//      Settings page writes false; the tour writing false on open would loop).
//   4. no new flag / no version bump — the tour touches no localStorage directly
//      and gates on no tour-version token; auto-show keys only on the existing
//      boolean flag.
//   5. copy from i18n only (CONST-01) — the tour renders its strings through t(
//      and holds no Arabic-script literal at all (a hardcoded verse/hadith would
//      trip this; the Arabic lives in i18n.ts, never the component).
//   6. mechanics retained (regression lock) — createPortal, inert,
//      lockBodyScroll, trapTab, and aria-modal are still present so a future edit
//      cannot quietly drop the modal a11y/scroll mechanics.
//   7. the i18n keys exist with both sides — the four v2 step title/body pairs and
//      the settings.onboardingTour* toggle labels each carry en: and ar: (a
//      missing AR side is a fail).
//
// Mirrors scripts/verify-follow-along.mjs in shape: the same read helper, the
// same strip-block-then-line comment stripping, the same record reporter, a
// passed/total tally, and process.exit(1) on any FAIL.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");

// Strip TS/TSX block then line comments so a prose mention of an identifier in a
// doc comment never creates a false match. This is load-bearing: the tour's own
// doc comment names setOnboardingSeen(false) while describing the loop guard, and
// the i18n file is dense with prose.
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const tour = stripComments(read("src", "components", "onboarding", "OnboardingTour.tsx"));
const i18n = stripComments(read("src", "lib", "i18n.ts"));

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

// --- 1. the seen-once flag drives auto-show and dismissal persists it ---------
// Auto-show is derived from getOnboardingSeen(); an explicit dismissal must write
// the flag true through the storage funnel so a reload never re-shows it.
const readsFlag = /getOnboardingSeen/.test(tour);
const persistsOnDismiss = /setOnboardingSeen\(true\)/.test(tour);
const flagWiring = readsFlag && persistsOnDismiss;
record(
  "the tour reads the seen-once flag and persists it on dismissal",
  flagWiring,
  flagWiring
    ? "getOnboardingSeen read + setOnboardingSeen(true) on dismiss"
    : `getOnboardingSeen=${readsFlag} setOnboardingSeen(true)=${persistsOnDismiss}`,
);

// --- 2. the live re-trigger via the change bus --------------------------------
// The tour must re-evaluate the flag on a bus event so a Settings write re-shows
// it with no reload: subscribeProgressChanged imported from the bus, called, and
// the listener re-reads getOnboardingSeen.
const importsBus =
  /import\s*\{[^}]*\bsubscribeProgressChanged\b[^}]*\}\s*from\s*["']@\/lib\/progress-events["']/.test(
    tour,
  );
const callsBus = /subscribeProgressChanged\(/.test(tour);
// The subscription's listener re-reads the flag: a subscribeProgressChanged(...)
// call whose argument body names getOnboardingSeen.
const listenerReReads =
  /subscribeProgressChanged\(\s*\([^)]*\)\s*=>[^)]*getOnboardingSeen/.test(tour);
const liveRetrigger = importsBus && callsBus && listenerReReads;
record(
  "the tour subscribes to the change bus and re-reads the flag for the live re-trigger",
  liveRetrigger,
  liveRetrigger
    ? "subscribeProgressChanged imported from @/lib/progress-events, called, listener re-reads getOnboardingSeen"
    : `import=${importsBus} call=${callsBus} listenerReReads=${listenerReReads}`,
);

// --- 3. no re-open loop -------------------------------------------------------
// Only the Settings page writes the flag false. The tour writing false (on open
// or in the listener) would re-open itself forever. Assert it never appears.
const noWriteFalse = !/setOnboardingSeen\(false\)/.test(tour);
record(
  "the tour never writes the flag false (no re-open loop; only Settings writes false)",
  noWriteFalse,
  noWriteFalse ? "no setOnboardingSeen(false) in the tour" : "found setOnboardingSeen(false) — would loop",
);

// --- 4. no new flag / no version bump -----------------------------------------
// Auto-show keys only on the existing boolean flag through the storage funnel:
// the tour touches no localStorage directly and gates on no tour-version token.
const noLocalStorage = !/localStorage/.test(tour);
const noVersionGate = !/tourVersion|onboardingVersion|ONBOARDING_VERSION/.test(tour);
const noNewFlag = noLocalStorage && noVersionGate;
record(
  "the tour adds no ad-hoc storage key and no tour-version gate (one existing flag only)",
  noNewFlag,
  noNewFlag
    ? "no direct localStorage, no tour-version token"
    : `noLocalStorage=${noLocalStorage} noVersionGate=${noVersionGate}`,
);

// --- 5. copy from i18n only (CONST-01) ----------------------------------------
// The tour renders its strings through t( and holds no Arabic-script literal at
// all — a hardcoded verse/hadith would trip the zero-scan. The Arabic copy lives
// in i18n.ts (checked separately below), never in the component.
const rendersViaT = /\bt\(/.test(tour);
const noArabicLiteral = !/[؀-ۿ]/.test(tour);
const copyFromI18n = rendersViaT && noArabicLiteral;
record(
  "the tour renders copy through t() and holds no hardcoded Arabic/verse text (CONST-01)",
  copyFromI18n,
  copyFromI18n
    ? "t() used, zero Arabic-script literals in the component"
    : `usesT=${rendersViaT} noArabicLiteral=${noArabicLiteral}`,
);

// --- 6. mechanics retained (regression lock) ---------------------------------
// A future edit must not quietly drop the modal a11y/scroll mechanics.
const mechanics = {
  createPortal: /createPortal/.test(tour),
  inert: /\binert\b/.test(tour),
  lockBodyScroll: /lockBodyScroll/.test(tour),
  trapTab: /trapTab/.test(tour),
  ariaModal: /aria-modal/.test(tour),
};
const mechanicsKept = Object.values(mechanics).every(Boolean);
record(
  "the tour retains its modal mechanics (portal, inert, scroll-lock, trapTab, aria-modal)",
  mechanicsKept,
  mechanicsKept
    ? "createPortal + inert + lockBodyScroll + trapTab + aria-modal all present"
    : Object.entries(mechanics)
        .map(([k, v]) => `${k}=${v}`)
        .join(" "),
);

// --- 7. the i18n keys exist with both en and ar -------------------------------
// The four v2 step title/body pairs and the settings.onboardingTour* toggle
// labels must each carry en: and ar:. A missing AR side is a fail. The exact key
// names must match what the tour and the Settings toggle reference.
const ONBOARDING_KEYS = [
  "onboarding.step.mushaf.title",
  "onboarding.step.mushaf.body",
  "onboarding.step.themes.title",
  "onboarding.step.themes.body",
  "onboarding.step.followAlong.title",
  "onboarding.step.followAlong.body",
  "onboarding.step.tracker.title",
  "onboarding.step.tracker.body",
  "settings.onboardingTour",
  "settings.onboardingTourHelp",
];
const escapeKey = (k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const keyBodyFor = (key) => {
  const m = i18n.match(new RegExp(`"${escapeKey(key)}"\\s*:\\s*\\{([\\s\\S]*?)\\}`));
  return m ? m[1] : null;
};
const missingKey = [];
const missingSide = [];
for (const key of ONBOARDING_KEYS) {
  const body = keyBodyFor(key);
  if (body === null) {
    missingKey.push(key);
    continue;
  }
  const hasEn = /\ben\s*:/.test(body);
  const hasAr = /\bar\s*:/.test(body);
  if (!hasEn || !hasAr) missingSide.push(`${key}(en=${hasEn},ar=${hasAr})`);
}
const i18nKeysOk = missingKey.length === 0 && missingSide.length === 0;
record(
  "every onboarding step key and the settings.onboardingTour* labels carry both en and ar",
  i18nKeysOk,
  i18nKeysOk
    ? `${ONBOARDING_KEYS.length} keys present with en + ar`
    : `missing=${missingKey.join(",") || "none"} incomplete=${missingSide.join(",") || "none"}`,
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
