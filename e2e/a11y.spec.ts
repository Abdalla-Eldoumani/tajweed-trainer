import AxeBuilder from "@axe-core/playwright";
import { test, expect, seedProgress } from "./support/fixtures";

// E2E-04: run the axe-core WCAG 2 A/AA rule engine over the key routes and
// enforce a ratcheted-clean baseline. The gate mirrors the Vitest coverage gate —
// it is enforced-and-met, not aspirational: every serious/critical violation must
// be ABSENT. HARD-03 landed the real fixes, so ACCEPTED_VIOLATIONS is now `{}` on
// every route (nothing tolerated). The two prior deferrals were resolved: the
// genuinely-adjustable UI chrome (the /mushaf gold badges + surah-number chips and
// the reader ⌘K hint) was fixed to AA at source, and the verified-immutable
// tajweed letter colors are scoped OUT of the scan (see the exclude rationale
// below). The ["serious","critical"] severity threshold is never loosened to make
// it pass — a fresh serious/critical violation on any route fails the gate.
//
// The eight routes: home, the learn index, the always-unlocked first lesson
// (/learn/makharij has no prerequisite gate — module-unlock.ts), the Mushaf
// index, a Mushaf reader page, practice, progress, and settings.
const ROUTES = [
  "/",
  "/learn",
  "/learn/makharij",
  "/mushaf",
  "/mushaf/page/1",
  "/practice",
  "/progress",
  "/settings",
] as const;

type Route = (typeof ROUTES)[number];

// Per-route accepted serious/critical rule ids mapped to a tolerated baseline
// node count. HARD-03 ratcheted this to a clean `{}` on EVERY route: no
// serious/critical violation is tolerated on any route. A rule id absent from a
// route's map (which is now all of them) is blocking at any count, so a fresh
// serious/critical node anywhere fails the gate. The two former deferrals — the
// /mushaf gold badges + chips (color-contrast 133) and the reader ⌘K hint on
// /mushaf/page/1 (color-contrast 1) — were fixed at source to AA and dropped
// here. Never re-add an entry to absorb a regression, and never lower the
// ["serious","critical"] threshold instead of fixing the source.
const ACCEPTED_VIOLATIONS: Record<Route, Record<string, number>> = {
  "/": {},
  "/learn": {},
  "/learn/makharij": {},
  "/mushaf": {},
  "/mushaf/page/1": {},
  "/practice": {},
  "/progress": {},
  "/settings": {},
};

test.beforeEach(async ({ context }) => {
  // Suppress the first-launch onboarding tour so its dialog does not overlay the
  // scanned page and skew the results.
  await seedProgress(context, { seenOnboarding: true });
});

for (const route of ROUTES) {
  test(`axe: no serious/critical WCAG 2 A/AA violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    // A navigation landmark renders on every route once the shell is up; waiting
    // for it settles the DOM before axe injects and analyzes.
    await expect(page.getByRole("navigation").first()).toBeVisible();

    // Scope the scan to exclude the <tajweed> custom elements the TajweedText
    // renderer emits. They carry the VERIFIED QUL mushaf color scheme (ghunnah
    // #FF7E1E, qalaqah #009EE6, …) — a standard, domain-fixed CONTENT color set,
    // like chart-data colors or a logotype, NOT adjustable UI. Those hexes are
    // immutable per the project's binding rule and guarded by
    // verify-tajweed-colors.mjs; they cannot be re-hued to satisfy contrast. The
    // home "/" DailyVerse rotates by day-of-year, so before this exclude the
    // color-contrast rule made "/" fail only on days its verse surfaced those
    // letters — a date-fragile, non-deterministic gate. Excluding ONLY the
    // <tajweed> element makes the scan deterministic (verse-independent) while
    // every OTHER element on every route stays under the full serious/critical
    // AA gate; the ["serious","critical"] threshold below is unchanged.
    // (`.exclude` takes a CSS selector; the bare tag name matches the element.)
    const results = await new AxeBuilder({ page })
      .exclude("tajweed")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const accepted = ACCEPTED_VIOLATIONS[route];
    const blocking = results.violations.filter((violation) => {
      if (!["serious", "critical"].includes(violation.impact ?? "")) return false;
      const baseline = accepted[violation.id];
      // Not accepted at all → blocking. Accepted → blocking only if it now has
      // MORE nodes than the measured baseline (a fresh regression).
      return baseline === undefined || violation.nodes.length > baseline;
    });

    expect(
      blocking,
      `Unaccepted or regressed serious/critical axe violations on ${route}: ${JSON.stringify(
        blocking.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.length,
          baseline: accepted[violation.id] ?? 0,
        })),
      )}`,
    ).toHaveLength(0);
  });
}
