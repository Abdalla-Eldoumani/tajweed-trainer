import { test, expect, seedProgress, expectNoConsoleErrors } from "./support/fixtures";

// E2E-01: open the reader and play a single verse. Two-step by design (v0.6.0):
// a plain verse TAP opens the verse overlay and does NOT auto-play; the overlay's
// auto-focused "Play this verse" is what starts playback. Player state is asserted
// byte-free via aria-current on the played verse (playVerse sets status
// synchronously), never through decoded audio.
test.beforeEach(async ({ context }) => {
  // Suppress the first-launch onboarding tour. It renders its own role="dialog",
  // so leaving it up would make the verse overlay ambiguous to select.
  await seedProgress(context, { seenOnboarding: true });
});

test("tap a verse opens the overlay without playing; Play this verse marks it current", async ({
  page,
  consoleErrors,
}) => {
  await page.goto("/mushaf/page/1");

  // Hydration gate: the recall toggle only takes its post-mount, nothing-
  // memorized label after the client mounts, so waiting for it proves the verse
  // buttons' onClick handlers are wired before we click (an early click is a
  // no-op on the SSG HTML).
  await expect(
    page.getByRole("button", { name: "Mark verses as memorized first" }),
  ).toBeVisible();

  const verse = page.locator('[data-verse-key="1:1"] button.mushaf-verse');
  // Before any interaction the verse is not the playing verse.
  await expect(verse).not.toHaveAttribute("aria-current", "true");

  await verse.click();

  // The overlay opens. The rule popover also uses role="dialog"; scope to the one
  // dialog carrying "Play this verse" so the assertion is unambiguous.
  const overlay = page.getByRole("dialog").filter({
    has: page.getByRole("button", { name: "Play this verse" }),
  });
  await expect(overlay).toBeVisible();
  // A tap alone does not start playback.
  await expect(verse).not.toHaveAttribute("aria-current", "true");

  // The overlay's Play this verse starts single-verse playback; playVerse sets
  // status "loading" synchronously, so the verse button flips to aria-current.
  await overlay.getByRole("button", { name: "Play this verse" }).click();
  await expect(verse).toHaveAttribute("aria-current", "true");

  expectNoConsoleErrors(consoleErrors);
});
