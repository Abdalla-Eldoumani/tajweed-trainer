import { describe, it, expect } from "vitest";
import { t } from "@/lib/i18n";

// Ported i18n key-presence half of scripts/verify-onboarding.mjs: the four v2
// onboarding step title/body pairs and the settings.onboardingTour* toggle
// labels each resolve to a non-empty string in BOTH en and ar. This imports the
// REAL t() and asserts through it (the behavioral tour wiring stays as
// source-parity in the kept .mjs).
//
// t(key, lang) returns entry[lang] ?? entry.en ?? key. So a completely missing
// key surfaces as t(key) === key, and a dropped `ar` side falls back to the en
// string. Each key below is genuinely bilingual (en differs from ar), so a
// dropped ar makes t(key,"ar") === t(key,"en"); asserting they DIFFER (and that
// neither equals the raw key) catches both a missing key and a missing side
// without reaching into the module-private dictionary.

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

// The segment-drill keys (Phase 6). Same EN+AR parity assertion, plus a
// distinctness check below. /progress now hosts FOUR keyboard drills (review,
// chaining, segment, and the typing drill added in Phase 8), so the segment
// drill's title / start / reveal labels must differ from the chaining and
// review drills or the four-drill e2e locators collide (RESEARCH Pitfall 4).
const SEGMENT_KEYS = [
  "segment.title",
  "segment.description",
  "segment.pickVerse",
  "segment.chunkSize",
  "segment.noSplit",
  "segment.startDrill",
  "segment.reveal",
  "segment.nextChunk",
  "segment.beginChain",
  "segment.finish",
  "segment.gradePrompt",
  "segment.skipGrade",
  "segment.drillProgress",
  "segment.chainProgress",
  "segment.empty",
];

// The typing-recall keys (Phase 8). Same EN+AR parity assertion, plus the
// four-drill distinctness check below: the typing drill is the FOURTH keyboard
// drill on /progress, so its title / start / reveal-word labels must differ
// from the segment, chaining, and review drills (and mushaf.memorizeReveal) or
// a /progress locator addresses the wrong drill (RESEARCH Pitfall 4). The two
// settings.diacriticInsensitive* keys are the paired toggle copy.
const TYPING_KEYS = [
  "typing.title",
  "typing.description",
  "typing.pickVerse",
  "typing.startDrill",
  "typing.prompt",
  "typing.inputLabel",
  "typing.submit",
  "typing.correct",
  "typing.wrong",
  "typing.retry",
  "typing.revealWord",
  "typing.progress",
  "typing.gradePrompt",
  "typing.skipGrade",
  "typing.empty",
  "typing.mistakesNote",
  "settings.diacriticInsensitive",
  "settings.diacriticInsensitiveHelp",
];

// The daily-revision (murajaah) dashboard, home due-card, local-reminder, and
// paired settings keys (Phase 9). Same EN+AR parity assertion, plus the
// distinctness check below: the dashboard's "begin revision" CTA is a fifth
// start-like control on the /progress family, so it must read differently from
// the four keyboard drills' start labels (review/chain/segment/typing) in BOTH
// locales, or a Playwright role/name locator collides with a drill.
const MURAJAAH_KEYS = [
  "murajaah.title",
  "murajaah.description",
  "murajaah.dueCount",
  "murajaah.newLabel",
  "murajaah.recentLabel",
  "murajaah.consolidatedLabel",
  "murajaah.newCapStatus",
  "murajaah.introducingNew",
  "murajaah.caughtUp",
  "murajaah.beginRevision",
  "murajaah.homeDue",
  "murajaah.review",
  "murajaah.notifyTitle",
  "murajaah.notifyBody",
  "settings.newVerseCap",
  "settings.newVerseCapHelp",
  "settings.revisionReminders",
  "settings.revisionRemindersHelp",
  "settings.revisionRemindersDenied",
];

describe("onboarding i18n keys carry both en and ar", () => {
  it.each(ONBOARDING_KEYS)("%s resolves to a non-empty en and a distinct non-empty ar", (key) => {
    const en = t(key, "en");
    const ar = t(key, "ar");
    // Present at all: t() returns the raw key when a key is missing entirely.
    expect(en, `${key} en`).not.toBe(key);
    expect(ar, `${key} ar`).not.toBe(key);
    expect(en.length, `${key} en`).toBeGreaterThan(0);
    expect(ar.length, `${key} ar`).toBeGreaterThan(0);
    // A dropped ar side falls back to en; these keys are genuinely bilingual, so
    // a real ar string must differ from the en one.
    expect(ar, `${key} ar fell back to en`).not.toBe(en);
  });
});

describe("segment-drill i18n keys carry both en and ar", () => {
  it.each(SEGMENT_KEYS)("%s resolves to a non-empty en and a distinct non-empty ar", (key) => {
    const en = t(key, "en");
    const ar = t(key, "ar");
    expect(en, `${key} en`).not.toBe(key);
    expect(ar, `${key} ar`).not.toBe(key);
    expect(en.length, `${key} en`).toBeGreaterThan(0);
    expect(ar.length, `${key} ar`).toBeGreaterThan(0);
    expect(ar, `${key} ar fell back to en`).not.toBe(en);
  });

  // The three-drill locator guarantee (RESEARCH Pitfall 4): the segment drill's
  // section title, start control, and reveal control must be textually distinct
  // from the chaining and review drills' equivalents, in both locales, so a
  // Playwright role/name locator can address exactly one drill.
  it("segment.title / startDrill / reveal are distinct from the other drills", () => {
    for (const lang of ["en", "ar"] as const) {
      expect(t("segment.title", lang)).not.toBe(t("chain.title", lang));
      expect(t("segment.title", lang)).not.toBe(t("memorize.reviewStart", lang));
      expect(t("segment.startDrill", lang)).not.toBe(t("chain.startChaining", lang));
      expect(t("segment.startDrill", lang)).not.toBe(t("review.startReview", lang));
      expect(t("segment.reveal", lang)).not.toBe(t("mushaf.memorizeReveal", lang));
    }
  });
});

describe("typing-drill i18n keys carry both en and ar", () => {
  it.each(TYPING_KEYS)("%s resolves to a non-empty en and a distinct non-empty ar", (key) => {
    const en = t(key, "en");
    const ar = t(key, "ar");
    expect(en, `${key} en`).not.toBe(key);
    expect(ar, `${key} ar`).not.toBe(key);
    expect(en.length, `${key} en`).toBeGreaterThan(0);
    expect(ar.length, `${key} ar`).toBeGreaterThan(0);
    expect(ar, `${key} ar fell back to en`).not.toBe(en);
  });

  // The four-drill locator guarantee (RESEARCH Pitfall 4): the typing drill's
  // section title, start control, and reveal-word control must be textually
  // distinct from the segment, chaining, and review drills' equivalents (and the
  // free mushaf.memorizeReveal), in both locales, so a Playwright role/name
  // locator addresses exactly one of the four /progress keyboard drills.
  it("typing.title / startDrill / revealWord are distinct from the other three drills", () => {
    for (const lang of ["en", "ar"] as const) {
      expect(t("typing.title", lang)).not.toBe(t("segment.title", lang));
      expect(t("typing.title", lang)).not.toBe(t("chain.title", lang));
      expect(t("typing.title", lang)).not.toBe(t("memorize.reviewStart", lang));
      expect(t("typing.startDrill", lang)).not.toBe(t("segment.startDrill", lang));
      expect(t("typing.startDrill", lang)).not.toBe(t("chain.startChaining", lang));
      expect(t("typing.startDrill", lang)).not.toBe(t("review.startReview", lang));
      expect(t("typing.revealWord", lang)).not.toBe(t("segment.reveal", lang));
      expect(t("typing.revealWord", lang)).not.toBe(t("mushaf.memorizeReveal", lang));
      // The verse pickers (segment + typing) are both labelled `<select>`s on the
      // same /progress; their aria-labels must differ so getByLabel addresses one.
      expect(t("typing.pickVerse", lang)).not.toBe(t("segment.pickVerse", lang));
    }
  });
});

describe("murajaah dashboard + settings i18n keys carry both en and ar", () => {
  it.each(MURAJAAH_KEYS)("%s resolves to a non-empty en and a distinct non-empty ar", (key) => {
    const en = t(key, "en");
    const ar = t(key, "ar");
    expect(en, `${key} en`).not.toBe(key);
    expect(ar, `${key} ar`).not.toBe(key);
    expect(en.length, `${key} en`).toBeGreaterThan(0);
    expect(ar.length, `${key} ar`).toBeGreaterThan(0);
    expect(ar, `${key} ar fell back to en`).not.toBe(en);
  });

  // The dashboard CTA scrolls to the existing MemorizedReview card rather than
  // spawning a second review instance, so it sits on /progress alongside all
  // four keyboard drills. Its label must be textually distinct from every
  // drill's start label in BOTH locales, or a role/name locator addresses the
  // wrong control (RESEARCH Pitfall 4).
  it("murajaah.beginRevision is distinct from all four drill start labels", () => {
    for (const lang of ["en", "ar"] as const) {
      expect(t("murajaah.beginRevision", lang)).not.toBe(t("review.startReview", lang));
      expect(t("murajaah.beginRevision", lang)).not.toBe(t("chain.startChaining", lang));
      expect(t("murajaah.beginRevision", lang)).not.toBe(t("segment.startDrill", lang));
      expect(t("murajaah.beginRevision", lang)).not.toBe(t("typing.startDrill", lang));
    }
  });
});
