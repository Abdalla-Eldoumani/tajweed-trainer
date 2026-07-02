import { test, expect, seedProgress, expectNoConsoleErrors } from "./support/fixtures";

// E2E (CHAIN-01/04): the verse-chaining drill on /progress. Seeding one memorized
// verse (1:1) creates a verse seam whose tail is memorized (tail 1:1 -> head 1:2),
// so the drill has a session with no prior interaction. The drill cues the TAIL and
// hides the HEAD behind a Reveal; grading records the HEAD verse (1:2) into the
// shared memorizationReviews SM-2 keyspace. Distinct chain.* labels ("Chain
// memorized verses" / "Start chaining") keep the drill's locators unambiguous next
// to MemorizedReview, which renders its own section on the same page.
function readProgress(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("tajweed-trainer-progress") || "{}"),
  );
}

test("the chaining drill cues the tail, reveals the head, and grades it into the scheduler", async ({
  page,
  context,
  consoleErrors,
}) => {
  await seedProgress(context, { seenOnboarding: true, memorizedVerses: ["1:1"] });

  await page.goto("/progress");

  // The chaining drill renders its own section, distinct from MemorizedReview.
  await expect(
    page.getByRole("heading", { name: "Chain memorized verses" }),
  ).toBeVisible();
  const start = page.getByRole("button", { name: "Start chaining" });
  await expect(start).toBeVisible();
  await start.click();

  // In-session: the head of the seam is hidden behind a Reveal (the recall self-test).
  const reveal = page.getByRole("button", { name: "Reveal" });
  await expect(reveal).toBeVisible();
  await reveal.click();

  // The four SM-2 rating buttons appear; grade Good (match the leading word so the
  // interval-preview number does not make the selector brittle).
  const good = page.getByRole("button", { name: /^Good\b/ });
  await expect(good).toBeVisible();
  await good.click();

  // Grading records the HEAD verse (1:2) into the shared memorizationReviews SM-2
  // keyspace — never the tail, never the rule-quiz reviews map.
  await expect
    .poll(async () => Object.keys((await readProgress(page)).memorizationReviews || {}))
    .toContain("1:2");

  expectNoConsoleErrors(consoleErrors);
});
