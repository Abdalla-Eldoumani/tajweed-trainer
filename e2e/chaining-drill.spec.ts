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

// Regression: /progress renders BOTH the memorized-verse review and the chaining
// drill when there are memorized verses. Each binds keys 1-4 while revealed; a
// keypress must grade ONLY the focused drill, not both (a cross-fire would record
// a grade the learner never gave into the shared SM-2 schedule). With both drills
// revealed and focus in the chaining drill, pressing "3" (Good) must record the
// chaining HEAD (1:2) and leave the review verse (1:1) ungraded.
test("keyboard grading is scoped to the focused drill, not both at once", async ({
  page,
  context,
}) => {
  await seedProgress(context, { seenOnboarding: true, memorizedVerses: ["1:1"] });
  await page.goto("/progress");

  // Start + reveal the memorized-verse review (grades verse 1:1 itself).
  await page.getByRole("button", { name: "Start Review" }).click();
  await page.getByRole("button", { name: "Reveal" }).click();

  // Start + reveal the chaining drill (grades the seam HEAD 1:2). Now both are
  // revealed; the chaining reveal focus-loop leaves focus inside the chaining card.
  await page.getByRole("button", { name: "Start chaining" }).click();
  await page.getByRole("button", { name: "Reveal" }).click();

  // The chaining reveal focus-loop lands on its Good button (last in DOM, since the
  // drill mounts after the review). Wait for that focus before the keypress so the
  // test asserts the guard, not a focus race.
  await expect(page.getByRole("button", { name: /^Good\b/ }).last()).toBeFocused();

  // One keypress, focus in the chaining drill: only the chaining head is graded.
  await page.keyboard.press("3");

  await expect
    .poll(async () => (await readProgress(page)).memorizationReviews || {})
    .toHaveProperty("1:2");
  expect((await readProgress(page)).memorizationReviews).not.toHaveProperty("1:1");
});

// Regression (T-06-02): /progress now renders THREE keyboard drills at once — the
// memorized-verse review, the chaining drill, and the segment drill. Each binds
// keys 1-4 while its grade buttons are live; a keypress must grade ONLY the focused
// drill. Seeding two memorized verses makes the three drills grade THREE distinct
// keys — the review shows 1:1, the chaining head is 1:2 (seam tail 1:1), and the
// segment drill is pointed at 1:4 — so a single grade key with focus in the segment
// drill must record 1:4 alone and leave the review verse and chaining head
// ungraded. Without the root-scoped keydown guard, one keypress would grade all
// three. Locators are region-scoped because the shared grade labels now appear
// three times (the '.last()' trick above breaks with three drills).
test("keyboard grading with three drills stays scoped to the focused drill", async ({
  page,
  context,
}) => {
  await seedProgress(context, { seenOnboarding: true, memorizedVerses: ["1:1", "1:4"] });
  await page.goto("/progress");

  // Start + reveal the memorized-verse review (its shown verse is 1:1). It is the
  // only "Reveal" on the page until the chaining drill starts.
  await page.getByRole("button", { name: "Start Review" }).click();
  await page.getByRole("button", { name: "Reveal" }).click();

  // Start + reveal the chaining drill (grades the seam HEAD 1:2). The review now
  // shows its grade buttons, so the only remaining "Reveal" is the chaining drill's.
  await page.getByRole("button", { name: "Start chaining" }).click();
  await page.getByRole("button", { name: "Reveal" }).click();

  // Point the segment drill at a DISTINCT short verse (1:4 — two-plus words but a
  // single chunk at the default size), so starting it lands straight on the
  // optional whole-verse grade where its keys 1-4 are live. Its picker/start labels
  // are distinct from the other drills, so locating them before the region exists
  // is unambiguous.
  await page.getByLabel("Pick a memorized verse").selectOption("1:4");
  await page.getByRole("button", { name: "Start chunk drill" }).click();

  // The segment drill's reveal focus-loop lands on its Good button. Region-scope so
  // the three drills' identical grade labels never collide, and wait for the focus
  // before the keypress so the test asserts the guard, not a focus race.
  const segment = page.getByRole("region", { name: "Drill a verse in chunks" });
  await expect(segment.getByRole("button", { name: /^Good\b/ })).toBeFocused();

  // One keypress, focus in the segment drill: only its verse (1:4) is graded.
  await page.keyboard.press("3");

  await expect
    .poll(async () => Object.keys((await readProgress(page)).memorizationReviews || {}))
    .toEqual(["1:4"]);
});
