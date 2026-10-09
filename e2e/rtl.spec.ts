import { test, expect, expectNoConsoleErrors, seedProgress } from "./support/fixtures";

// A seeded Arabic locale must flip the document direction and localize
// the visible UI, not merely stamp the html attributes.
test("seeded Arabic locale renders RTL with Arabic navigation labels", async ({
  page,
  context,
  consoleErrors,
}) => {
  // Seed before the first navigation so the pre-paint bootstrap in layout.tsx
  // reads settings.language and sets dir/lang before first paint.
  await seedProgress(context, { settings: { language: "ar" } });
  await page.goto("/");

  const html = page.locator("html");
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(html).toHaveAttribute("lang", "ar");

  // The chrome is localized: the Mushaf nav entry reads "المصحف". The mobile tab
  // bar is hidden at the desktop viewport, so filtering to the visible match
  // targets the desktop sidebar link, proving the UI localized (not just the
  // html attributes).
  await expect(
    page.getByRole("link", { name: "المصحف" }).filter({ visible: true }).first(),
  ).toBeVisible();

  expectNoConsoleErrors(consoleErrors);
});
