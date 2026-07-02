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
