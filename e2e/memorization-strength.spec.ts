import { test, expect, seedProgress, expectNoConsoleErrors } from "./support/fixtures";
import type { BrowserContext } from "@playwright/test";

// E2E (STAT-01/02/03): the /progress "memorization health" section and the
// revision-streak counter, proven end to end against seeded Sm2State.
//   - STAT-01 freshness: a verse recalled today reads FRESH while a verse whose
//     next-due date has passed reads OVERDUE, so the two juz cells sit on opposite
//     sides of the aging scale (distinct accessible names, distinct color buckets).
//   - STAT-02 error heatmap: verses with recorded lapses surface as high-error in
//     their juz, surah, AND page scopes, while a clean scope (never failed) does
//     NOT — including a scope that is overdue but never lapsed, proving freshness
//     and error are independent signals.
//   - STAT-03 revision streak: the seeded memorizationStreak renders in a counter
//     whose title ("Revision streak") is DISTINCT from the practice streak
//     ("Streak") and whose figures come from memorizationStreak, not progress.streaks.
//
// The pure derivations (freshness / errorScore / scopeStrength) are unit-tested in
// memorization-strength.test.ts; this spec proves the learner-facing render. Every
// date is computed INSIDE the browser via toLocaleDateString("en-CA") so the seed
// lines up with the app's own local-day boundary (mirrors murajaah-dashboard.spec).
//
// The four memorized verses are chosen so their surah, juz, and page all differ,
// so each scope holds exactly one memorized verse and the scope aggregates are
// unambiguous:
//   1:1   Al-Fatihah  juz 1   — FRESH,   never lapsed (a clean, fresh scope)
//   78:1  An-Naba     juz 30  — OVERDUE, never lapsed (a clean, overdue scope)
//   2:255 Al-Baqarah  juz 3   — LAPSED,  errorScore 6 (lapses 3 + misses 3)
//   36:1  Ya-Sin      juz 22  — LAPSED,  errorScore 3 (lapses 1 + misses 2)

const MEMORIZED = ["1:1", "78:1", "2:255", "36:1"];

// Seed the base memorized set, then layer the date-dependent Sm2State and the
// revision streak in a SECOND init script (registered after seedProgress's, run in
// add order) that computes every date in-browser so it matches the app's day
// boundary (RESEARCH §5, T-10-12). errorScore(state) = lapses + max(0, timesSeen -
// timesCorrect); a due/overdue date is several days in the past so it is robustly
// overdue whatever the wall clock.
async function seedStrength(context: BrowserContext): Promise<void> {
  await seedProgress(context, { seenOnboarding: true, memorizedVerses: MEMORIZED });

  await context.addInitScript(() => {
    const KEY = "tajweed-trainer-progress";
    const iso = (d: Date) => d.toLocaleDateString("en-CA");
    const shift = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return iso(d);
    };
    const today = iso(new Date());
    const base = JSON.parse(window.localStorage.getItem(KEY) || "{}");
    const reviews: Record<string, unknown> = { ...(base.memorizationReviews || {}) };

    // FRESH: recalled today, next due 30 days out, never lapsed. freshness == 1.
    reviews["1:1"] = {
      repetitions: 4, easeFactor: 2.6, intervalDays: 30,
      nextDueDate: shift(30), lastReviewedDate: today,
      timesSeen: 4, timesCorrect: 4, lapses: 0,
    };
    // OVERDUE: last recall 20 days ago, due 5 days ago, never lapsed. freshness == 0
    // (aged past its due date) but errorScore == 0, so it heats the freshness facet
    // WITHOUT appearing in the error heatmap.
    reviews["78:1"] = {
      repetitions: 3, easeFactor: 2.4, intervalDays: 15,
      nextDueDate: shift(-5), lastReviewedDate: shift(-20),
      timesSeen: 3, timesCorrect: 3, lapses: 0,
    };
    // LAPSED A (surah 2 / juz 3 / its own page): errorScore = 3 + (5 - 2) = 6.
    reviews["2:255"] = {
      repetitions: 1, easeFactor: 1.9, intervalDays: 1,
      nextDueDate: shift(-2), lastReviewedDate: shift(-3),
      timesSeen: 5, timesCorrect: 2, lapses: 3,
    };
    // LAPSED B (surah 36 / juz 22 / its own page): errorScore = 1 + (3 - 1) = 3.
    reviews["36:1"] = {
      repetitions: 2, easeFactor: 2.1, intervalDays: 3,
      nextDueDate: shift(-1), lastReviewedDate: shift(-4),
      timesSeen: 3, timesCorrect: 1, lapses: 1,
    };

    base.memorizationReviews = reviews;
    // STAT-03: a distinct revision streak (never the practice streak). Values are
    // picked so they cannot be confused with the practice streak (seeded to 0/0).
    base.memorizationStreak = { currentStreak: 4, longestStreak: 9, lastRevisionDate: today };
    window.localStorage.setItem(KEY, JSON.stringify(base));
  });
}

test("STAT-01: a freshly recalled scope reads FRESH and an overdue one reads OVERDUE", async ({
  page,
  context,
  consoleErrors,
}) => {
  await seedStrength(context);
  await page.goto("/progress");

  // The freshness facet is a per-juz aging bar; scope to its region so the img
  // cells never collide with the error heatmap's img cells below it.
  const freshness = page.getByRole("region", { name: "Freshness" });
  await expect(freshness).toBeVisible();

  // Juz 1 holds the verse recalled today -> FRESH; juz 30 holds the verse whose
  // due date has passed -> OVERDUE. The two accessible names carry opposite
  // statuses, so the cells render on opposite ends of the lapis->ochre scale.
  await expect(
    freshness.getByRole("img", { name: "Juz 1: Fresh, 1 memorized", exact: true }),
  ).toBeVisible();
  await expect(
    freshness.getByRole("img", { name: "Juz 30: Overdue, 1 memorized", exact: true }),
  ).toBeVisible();

  expectNoConsoleErrors(consoleErrors);
});

test("STAT-02: the error heatmap surfaces lapsed verses by juz, surah, and page", async ({
  page,
  context,
  consoleErrors,
}) => {
  await seedStrength(context);
  await page.goto("/progress");

  const errors = page.getByRole("region", { name: "Recall errors" });
  await expect(errors).toBeVisible();

  // By juz: juz 3 (Al-Baqarah's, errorScore 6) and juz 22 (Ya-Sin's, errorScore 3)
  // are surfaced. exact:true matters — a substring match on "3: 6 recall errors..."
  // would also hit a page cell like "Page 43: 6 recall errors...".
  await expect(errors.getByRole("heading", { name: "Errors by juz" })).toBeVisible();
  await expect(
    errors.getByRole("img", { name: "3: 6 recall errors across 1 memorized verses", exact: true }),
  ).toBeVisible();
  await expect(
    errors.getByRole("img", { name: "22: 3 recall errors across 1 memorized verses", exact: true }),
  ).toBeVisible();

  // By surah: the two lapsed surahs are named and heated.
  await expect(errors.getByRole("heading", { name: "Errors by surah" })).toBeVisible();
  await expect(
    errors.getByRole("img", {
      name: "Al-Baqarah: 6 recall errors across 1 memorized verses",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    errors.getByRole("img", {
      name: "Ya-Sin: 3 recall errors across 1 memorized verses",
      exact: true,
    }),
  ).toBeVisible();

  // By page: the two lapsed verses each land on their own page. The exact page
  // number is a mushaf-table detail, so match the error count (which uniquely
  // identifies the page) rather than pinning the page number.
  await expect(errors.getByRole("heading", { name: "Errors by page" })).toBeVisible();
  await expect(
    errors.getByRole("img", { name: /^Page \d+: 6 recall errors across 1 memorized verses$/ }),
  ).toBeVisible();
  await expect(
    errors.getByRole("img", { name: /^Page \d+: 3 recall errors across 1 memorized verses$/ }),
  ).toBeVisible();

  // Clean scopes are NOT surfaced as errors: Al-Fatihah (fresh, never lapsed) does
  // not appear in the surah list, and juz 30 (OVERDUE but never lapsed) does not
  // appear in the juz errors — proving freshness and error are independent signals.
  await expect(errors.getByText("Al-Fatihah")).toHaveCount(0);
  await expect(errors.getByRole("img", { name: /^30: \d+ recall errors/ })).toHaveCount(0);

  expectNoConsoleErrors(consoleErrors);
});

test("STAT-03: the revision streak renders its own figures, distinct from the practice streak", async ({
  page,
  context,
  consoleErrors,
}) => {
  await seedStrength(context);
  await page.goto("/progress");

  // The memorization revision-streak card carries the DISTINCT "Revision streak"
  // title (exact:true — "Streak" is a substring of it) and shows the seeded
  // memorizationStreak figures (current 4, longest 9).
  const revision = page
    .getByRole("heading", { name: "Revision streak", exact: true })
    .locator("xpath=..");
  await expect(revision).toBeVisible();
  await expect(revision).toContainText("4");
  await expect(revision).toContainText("9");

  // The practice streak card ("Streak") is a SEPARATE element. It reads
  // progress.streaks (left at the default 0/0), so it carries neither of the
  // seeded revision figures — the two streaks never share a store or a locator.
  const practice = page.getByRole("heading", { name: "Streak", exact: true }).locator("xpath=..");
  await expect(practice).toBeVisible();
  await expect(practice).not.toContainText("4");
  await expect(practice).not.toContainText("9");

  // Both titles are present and unambiguous (exactly one heading each).
  await expect(page.getByRole("heading", { name: "Revision streak", exact: true })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Streak", exact: true })).toHaveCount(1);

  expectNoConsoleErrors(consoleErrors);
});
