import { test, expect, seedProgress, expectNoConsoleErrors } from "./support/fixtures";

// E2E: the cover-page recall toggle on the Mushaf reader. Cover mode
// blurs EVERY verse on the page (not only memorized ones), a tap on a covered
// verse reveals it in place (a FREE reveal that never opens the overlay), a tap
// on a revealed verse opens the overlay as usual, and with cover mode off a tap
// opens the overlay unchanged. Page 1 (Al-Fatihah) is snapshot-backed offline and
// has NO memorized verses seeded, so any blur proves cover mode blurs ALL verses
// (not the memorized-only recall path). The overlay dialog is disambiguated from
// the rule popover (also role="dialog") by its "Play this verse" button.

test.beforeEach(async ({ context }) => {
  // Suppress the first-launch onboarding tour (its own role="dialog") so the verse
  // overlay dialog stays unambiguous. No memorized verses: cover mode must blur
  // regardless.
  await seedProgress(context, { seenOnboarding: true });
});

// The verse overlay, scoped away from the rule popover.
function overlayOf(page: import("@playwright/test").Page) {
  return page.getByRole("dialog").filter({
    has: page.getByRole("button", { name: "Play this verse" }),
  });
}

test("cover mode blurs every verse; a covered tap reveals, a revealed tap opens the overlay", async ({
  page,
  consoleErrors,
}) => {
  await page.goto("/mushaf/page/1");

  // Hydration gate: the recall toggle takes its nothing-memorized label after
  // mount, proving the verse buttons' handlers are wired before we click.
  await expect(
    page.getByRole("button", { name: "Mark verses as memorized first" }),
  ).toBeVisible();

  const overlay = overlayOf(page);
  const verse2 = page.locator('[data-verse-key="1:2"] button.mushaf-verse');
  const verse3 = page.locator('[data-verse-key="1:3"] button.mushaf-verse');

  // Turn cover mode on (its off-state aria-label is "Cover the page to recall").
  await page.getByRole("button", { name: "Cover the page to recall" }).click();

  // Blur-all: at least two NON-memorized verses carry the blur signal, proving the
  // whole page is covered (not the memorized-only recall path).
  await expect(page.locator('[data-verse-key="1:2"] .blur-md')).toBeVisible();
  await expect(page.locator('[data-verse-key="1:3"] .blur-md')).toBeVisible();

  // A covered tap REVEALS the verse in place (blur cleared) and does NOT open the
  // overlay (the free per-verse reveal). The overlay is always mounted and toggled
  // by an opacity transition, so opacity 0 is the closed signal (Playwright's
  // hidden/visible does not react to opacity) — a covered tap must leave it at 0.
  await verse2.click();
  await expect(page.locator('[data-verse-key="1:2"] .blur-md')).toHaveCount(0);
  await expect(overlay).toHaveCSS("opacity", "0");
  // The still-covered neighbor stays blurred (reveal is per verse, not the page).
  await expect(page.locator('[data-verse-key="1:3"] .blur-md')).toBeVisible();

  // A tap on the now-revealed verse opens the overlay as usual (opacity 1); close
  // it (Escape) and it animates back to opacity 0.
  await verse2.click();
  await expect(overlay).toHaveCSS("opacity", "1");
  await page.keyboard.press("Escape");
  await expect(overlay).toHaveCSS("opacity", "0");

  // Turn cover mode off (its on-state aria-label is "Show the page"); a tap on a
  // verse opens the overlay unchanged (today's behavior when cover mode is off).
  await page.getByRole("button", { name: "Show the page" }).click();
  await verse3.click();
  await expect(overlay).toHaveCSS("opacity", "1");

  expectNoConsoleErrors(consoleErrors);
});
