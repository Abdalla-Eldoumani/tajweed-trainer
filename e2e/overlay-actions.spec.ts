import { test, expect, seedProgress, expectNoConsoleErrors } from "./support/fixtures";

// Drive the verse overlay's action hub (memorize, bookmark,
// play-from-here) and assert the localStorage writes and player state. The
// memorize/bookmark toggles flip their aria-label + aria-pressed and route
// through the storage funnel (memorizedVerses / bookmarks); play-from-here starts
// continuous playback, asserted byte-free via aria-current.
test.beforeEach(async ({ context }) => {
  // Suppress the first-launch onboarding tour (its own role="dialog").
  await seedProgress(context, { seenOnboarding: true });
});

// Read the persisted progress object the app writes through its single funnel.
function readProgress(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("tajweed-trainer-progress") || "{}"),
  );
}

test("overlay memorize, bookmark, and play-from-here drive storage and player state", async ({
  page,
  consoleErrors,
}) => {
  await page.goto("/mushaf/page/1");
  await expect(
    page.getByRole("button", { name: "Mark verses as memorized first" }),
  ).toBeVisible();

  // Open the overlay from the always-present per-verse details control (a non-tap
  // entry point that is never a colored letter, so it can never fire the rule
  // popover).
  await page
    .getByRole("button", { name: "Translation, tafsir, and verse actions (1:1)" })
    .click();

  const overlay = page.getByRole("dialog").filter({
    has: page.getByRole("button", { name: "Play this verse" }),
  });
  await expect(overlay).toBeVisible();

  // Memorize: the heart renders only after the overlay's mounted gate flips.
  const memorize = overlay.getByRole("button", { name: "Mark verse as memorized" });
  await expect(memorize).toBeVisible();
  await memorize.click();
  // The control flips to the unmark state (aria-label + aria-pressed) ...
  const memorized = overlay.getByRole("button", { name: "Unmark memorized verse" });
  await expect(memorized).toBeVisible();
  await expect(memorized).toHaveAttribute("aria-pressed", "true");
  // ... and the verse key lands in the localStorage memorizedVerses funnel.
  expect((await readProgress(page)).memorizedVerses).toContain("1:1");

  // Bookmark: same funnel, the bookmarks key.
  const bookmark = overlay.getByRole("button", { name: "Bookmark this verse" });
  await expect(bookmark).toBeVisible();
  await bookmark.click();
  const bookmarked = overlay.getByRole("button", { name: "Remove verse bookmark" });
  await expect(bookmarked).toBeVisible();
  await expect(bookmarked).toHaveAttribute("aria-pressed", "true");
  expect((await readProgress(page)).bookmarks).toContain("1:1");

  // Play surah from this point onwards starts continuous playback from 1:1, so
  // the verse button behind the overlay flips to aria-current (byte-free).
  await overlay
    .getByRole("button", { name: "Play surah from this point onwards" })
    .click();
  await expect(
    page.locator('[data-verse-key="1:1"] button.mushaf-verse'),
  ).toHaveAttribute("aria-current", "true");

  expectNoConsoleErrors(consoleErrors);
});
