import AxeBuilder from "@axe-core/playwright";
import { test, expect, seedProgress } from "./support/fixtures";

// E2E-04: run the axe-core WCAG 2 A/AA rule engine over the key routes and
// enforce a MEASURED baseline. The gate mirrors the Vitest coverage gate — it is
// enforced-and-met, not aspirational: every serious/critical violation is either
// absent or listed in ACCEPTED_RULE_IDS for that route with a justification and a
// HARD-03 follow-up. The severity threshold is never loosened to make it pass,
// and this phase changes no app source (real a11y fixes are Phase 13 / HARD-03).
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

// Per-route accepted serious/critical rule ids. Any id here is a genuine app
// a11y issue that this test-authoring phase does not fix (no src change); each
// carries a one-line justification and is deferred to HARD-03 (Phase 13). The
// baseline was MEASURED by first running this spec with an empty allowlist and
// recording the reported ids. Do NOT add an id to silence a violation without a
// justification, and never lower the ["serious","critical"] threshold instead.
const ACCEPTED_RULE_IDS: Record<Route, string[]> = {
  "/": [],
  "/learn": [],
  "/learn/makharij": [],
  // Gold-leaf ink on the vellum ground: the "Madani/Makki" surah badges
  // (#8f6f1e on #f4ead0 ≈ 3.92:1) and the gold surah-number chips (#8f6f1e on
  // #f7f0dc ≈ 4.13:1) fall short of the 4.5:1 AA text threshold. Fixing this is
  // a palette/token change to the shared gold tokens, out of scope for this
  // test-authoring phase. Deferred to HARD-03 (Phase 13 accessibility hardening).
  "/mushaf": ["color-contrast"],
  // The reader toolbar's ⌘K "Jump to…" hint (#888fa0 on #fcfaf3 ≈ 3.1:1) is
  // muted text below the AA threshold. Same gold/muted-token retune as /mushaf;
  // deferred to HARD-03 (Phase 13).
  "/mushaf/page/1": ["color-contrast"],
  "/practice": [],
  "/progress": [],
  "/settings": [],
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

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const accepted = ACCEPTED_RULE_IDS[route];
    const blocking = results.violations.filter(
      (violation) =>
        ["serious", "critical"].includes(violation.impact ?? "") &&
        !accepted.includes(violation.id),
    );

    expect(
      blocking,
      `Unaccepted serious/critical axe violations on ${route}: ${JSON.stringify(
        blocking.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length })),
      )}`,
    ).toHaveLength(0);
  });
}
