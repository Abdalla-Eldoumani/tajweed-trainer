import { test, expect, expectNoConsoleErrors } from "./support/fixtures";

// End-to-end proof that the whole rig runs: the cached browser launches, the
// prod server on :3000 serves the home page, the api/audio stub keeps every
// cross-origin call off the network, and the console guard sees no errors. Every
// later spec builds on this same test fixture.
test("home page loads with no console errors", async ({ page, consoleErrors }) => {
  await page.goto("/");
  // A navigation landmark always renders (the sidebar / margin chrome); .first()
  // tolerates the several nav landmarks the responsive chrome mounts.
  await expect(page.getByRole("navigation").first()).toBeVisible();
  expectNoConsoleErrors(consoleErrors);
});
