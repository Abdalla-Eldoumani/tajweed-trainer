import { test, expect, seedProgress, expectNoConsoleErrors } from "./support/fixtures";
import type { BrowserContext } from "@playwright/test";

// E2E (REV-01/02/03/04): the daily-revision (murajaah) dashboard on /progress and
// the honest on-open due card on the home page. The pure queue math and the
// notification fire-decision are unit-tested (murajaah-queue.test.ts /
// notification-gate.test.ts); these prove the learner-facing behavior end to end:
//   - REV-03 the uncapped due count shows on open (dashboard + home);
//   - REV-02 every due recent + consolidated verse is surfaced with no cap;
//   - REV-01 the daily NEW cap (default 5) bounds only the new tail of the
//     composed recall session — the count stays uncapped, the session does not;
//   - REV-04 the due count + dashboard function with notification permission never
//     granted (the default headless state) and no reminder toggle when uninstalled.
//
// A memorized verse with NO memorizationReviews entry is due immediately AND
// classifies NEW; an entry with a numeric easeFactor (the SM-2 branch), a past
// nextDueDate and intervalDays < 21 is a due RECENT, >= 21 a due CONSOLIDATED.
// Selectors are the stable role/text names: the dashboard's per-class ProgressBars
// carry the accessible name "New: N" / "Recent: N" / "Consolidated: N", the
// recall Start button is "Start Review", the session card is the "Review
// memorized verses" region, and the home card is the distinct murajaah.homeDue
// text — none collide with the four /progress drills.

const STORAGE_KEY = "tajweed-trainer-progress";

// Layer the date-dependent review state on top of a base seedProgress payload.
// This SECOND context init script is registered after seedProgress's, and init
// scripts run in add order, so it reads the base payload back out of localStorage
// and augments it with the memorizationReviews entries and the daily-new tracking
// counter. Every date is computed INSIDE the browser via toLocaleDateString(
// "en-CA") so the seeded due dates line up with the app's own day boundary
// (RESEARCH §6); a due entry's nextDueDate is five days in the past so it is
// robustly due whatever the wall clock. A memorized verse absent from both lists
// keeps no entry and so stays NEW and due immediately.
async function seedReviewDates(
  context: BrowserContext,
  spec: { recent?: string[]; consolidated?: string[]; introducedToday?: number },
): Promise<void> {
  await context.addInitScript((s) => {
    const KEY = "tajweed-trainer-progress";
    const iso = (d: Date) => d.toLocaleDateString("en-CA");
    const daysAgo = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d;
    };
    const past = iso(daysAgo(5));
    const today = iso(new Date());
    const base = JSON.parse(window.localStorage.getItem(KEY) || "{}");
    const reviews: Record<string, unknown> = { ...(base.memorizationReviews || {}) };
    for (const key of s.recent ?? []) {
      // repetitions > 0 + intervalDays 7 (< 21) => a due RECENT verse.
      reviews[key] = {
        repetitions: 3,
        easeFactor: 2.5,
        intervalDays: 7,
        nextDueDate: past,
        lastReviewedDate: past,
        timesSeen: 3,
        timesCorrect: 3,
        lapses: 0,
      };
    }
    for (const key of s.consolidated ?? []) {
      // repetitions > 0 + intervalDays 30 (>= 21) => a due CONSOLIDATED verse.
      reviews[key] = {
        repetitions: 6,
        easeFactor: 2.6,
        intervalDays: 30,
        nextDueDate: past,
        lastReviewedDate: past,
        timesSeen: 6,
        timesCorrect: 6,
        lapses: 0,
      };
    }
    base.memorizationReviews = reviews;
    base.dailyNewVersesTracking = { date: today, count: s.introducedToday ?? 0 };
    window.localStorage.setItem(KEY, JSON.stringify(base));
  }, spec);
}

// The dashboard is a Card headed by the murajaah.title h2; scope the honest due
// figure (a role-less red headline number) to it so the count assertion never
// collides with the memorization tracker / khatmah figures elsewhere on the page.
function dashboard(page: import("@playwright/test").Page) {
  return page.getByRole("heading", { name: "Today's revision" }).locator("xpath=..");
}

test("REV-03: the uncapped due count shows on open on the dashboard and the home card", async ({
  page,
  context,
  consoleErrors,
}) => {
  // A mix of one due NEW (no entry), one due RECENT, one due CONSOLIDATED = 3 due.
  await seedProgress(context, {
    seenOnboarding: true,
    memorizedVerses: ["1:1", "2:3", "2:4"],
  });
  await seedReviewDates(context, { recent: ["2:3"], consolidated: ["2:4"], introducedToday: 0 });

  await page.goto("/progress");

  // The dashboard headline shows the honest uncapped due total (3) with its caption.
  const panel = dashboard(page);
  await expect(panel.getByText("due for revision")).toBeVisible();
  await expect(panel.locator("span.text-red-600")).toHaveText("3");

  // The balanced breakdown accounts for all three classes (1 each) — the
  // ProgressBar accessible names are unambiguous on the page.
  await expect(panel.getByRole("progressbar", { name: "New: 1" })).toBeVisible();
  await expect(panel.getByRole("progressbar", { name: "Recent: 1" })).toBeVisible();
  await expect(panel.getByRole("progressbar", { name: "Consolidated: 1" })).toBeVisible();

  // The home page surfaces the SAME uncapped due count on open (REV-03).
  await page.goto("/");
  await expect(page.getByText("3 verses due for revision")).toBeVisible();

  expectNoConsoleErrors(consoleErrors);
});

test("REV-02: every due recent and consolidated verse is surfaced with no cap", async ({
  page,
  context,
  consoleErrors,
}) => {
  // Seven due verses (4 recent + 3 consolidated, no new) — more than the default
  // NEW cap of 5. Recent and consolidated are never capped, so all 7 must surface.
  const recent = ["2:3", "2:4", "2:5", "2:6"];
  const consolidated = ["2:8", "2:14", "2:27"];
  await seedProgress(context, {
    seenOnboarding: true,
    memorizedVerses: [...recent, ...consolidated],
  });
  await seedReviewDates(context, { recent, consolidated, introducedToday: 0 });

  await page.goto("/progress");

  const panel = dashboard(page);
  // The honest due total counts all seven, above the NEW cap — nothing is dropped.
  await expect(panel.locator("span.text-red-600")).toHaveText("7");
  await expect(panel.getByRole("progressbar", { name: "Recent: 4" })).toBeVisible();
  await expect(panel.getByRole("progressbar", { name: "Consolidated: 3" })).toBeVisible();
  await expect(panel.getByRole("progressbar", { name: "New: 0" })).toBeVisible();
  // No new material is introduced (the cap gates only NEW, of which there are none).
  await expect(panel.getByText("Introducing 0 new today")).toBeVisible();

  expectNoConsoleErrors(consoleErrors);
});

test("REV-01: the NEW tail caps at the default 5 in the composed recall session", async ({
  page,
  context,
  consoleErrors,
}) => {
  // Seven NEW verses (all of Al-Fatihah, memorized with no review entry) and a
  // fresh daily counter (0 introduced today), at the default cap of 5.
  const newVerses = ["1:1", "1:2", "1:3", "1:4", "1:5", "1:6", "1:7"];
  await seedProgress(context, { seenOnboarding: true, memorizedVerses: newVerses });
  await seedReviewDates(context, { introducedToday: 0 });

  await page.goto("/progress");

  const panel = dashboard(page);
  // The dashboard shows the honest uncapped due count (7) ...
  await expect(panel.locator("span.text-red-600")).toHaveText("7");
  await expect(panel.getByRole("progressbar", { name: "New: 7" })).toBeVisible();
  // ... but only 5 are admitted to today's session (REV-01 caps the NEW tail) ...
  await expect(panel.getByText("Introducing 5 new today")).toBeVisible();
  await expect(panel.getByText("0 of 5 new introduced today")).toBeVisible();

  // ... and the composed recall session runs exactly those 5 before finishing:
  // grading five reveal-and-rate cycles reaches the finished screen. Had the cap
  // not applied, a sixth verse (Reveal) would show instead of "Quiz Complete".
  const start = page.getByRole("button", { name: "Start Review" });
  await expect(start).toBeVisible();
  await start.click();

  const region = page.getByRole("region", { name: "Review memorized verses" });
  await expect(region).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await region.getByRole("button", { name: "Reveal" }).click();
    await region.getByRole("button", { name: /^Good\b/ }).click();
  }
  await expect(page.getByRole("heading", { name: "Quiz Complete" })).toBeVisible();

  expectNoConsoleErrors(consoleErrors);
});

test("REV-04: the due count and dashboard work with notification permission never granted", async ({
  page,
  context,
  consoleErrors,
}) => {
  // Three due NEW verses, headless default (notification permission not granted,
  // app not installed as a PWA).
  await seedProgress(context, { seenOnboarding: true, memorizedVerses: ["1:1", "1:2", "1:3"] });
  await seedReviewDates(context, { introducedToday: 0 });

  await page.goto("/progress");

  // The headless default never grants notification permission — the reminder
  // cannot fire, and the dashboard must not depend on it.
  const permission = await page.evaluate(() =>
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );
  expect(permission).not.toBe("granted");

  // The due count and the full dashboard still render regardless (REV-04).
  const panel = dashboard(page);
  await expect(panel.getByRole("heading", { name: "Today's revision" })).toBeVisible();
  await expect(panel.locator("span.text-red-600")).toHaveText("3");

  // And because the tab is not an installed standalone PWA, the Settings reminder
  // toggle is absent — the intended UX (a reminder is only offered where it can
  // reliably fire). The due count above proves it does not gate the dashboard.
  await page.goto("/settings");
  await expect(page.getByRole("checkbox", { name: "Revision reminders" })).toHaveCount(0);

  expectNoConsoleErrors(consoleErrors);
});
