import { test, expect, seedProgress, expectNoConsoleErrors } from "./support/fixtures";

// E2E-01 + E2E-03: mark a verse memorized and confirm it surfaces as due in the
// /progress recall review, then reveal and grade it. A memorized verse with no
// review entry is due immediately (the separate memorizationReviews keyspace),
// so a seeded verse populates the review with no prior interaction. Selectors are
// the stable English role/text names (no data-testid needed on this surface).
test("a seeded memorized verse is due in the progress review and can be revealed and graded", async ({
  page,
  context,
  consoleErrors,
}) => {
  // Seed one memorized verse (due immediately) and suppress the onboarding tour,
  // both before navigation so the pre-paint bootstrap and first read see them.
  await seedProgress(context, { seenOnboarding: true, memorizedVerses: ["1:1"] });

  await page.goto("/progress");

  // The tracker reflects the seeded verse (post-mount): the exact count / 6236.
  await expect(page.getByText(/1 \/ 6236/)).toBeVisible();

  // The recall review offers a session because the seeded verse is due.
  await expect(
    page.getByRole("heading", { name: "Review memorized verses" }),
  ).toBeVisible();
  const start = page.getByRole("button", { name: "Start Review" });
  await expect(start).toBeVisible();
  await start.click();

  // In-session: the verse is hidden behind a Reveal (the recall self-test).
  const reveal = page.getByRole("button", { name: "Reveal" });
  await expect(reveal).toBeVisible();
  await reveal.click();

  // The grade controls appear; "Correct" needs exact matching because the
  // default substring match would also hit "Incorrect".
  const correct = page.getByRole("button", { name: "Correct", exact: true });
  await expect(correct).toBeVisible();
  await expect(page.getByRole("button", { name: "Incorrect", exact: true })).toBeVisible();
  await correct.click();

  // Grading the only due verse advances the queue to the finished state.
  await expect(page.getByRole("heading", { name: "Quiz Complete" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try Again" })).toBeVisible();

  expectNoConsoleErrors(consoleErrors);
});
