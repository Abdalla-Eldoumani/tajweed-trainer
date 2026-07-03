import { test, expect, expectNoConsoleErrors } from "./support/fixtures";

// E2E-02: emulating prefers-reduced-motion must be honored. The app gates
// JS-driven smooth scroll on the query (src/lib/reduced-motion.ts) and the CSS
// @media block neutralizes the .route-enter page-enter animation.
test("prefers-reduced-motion is honored", async ({ page, consoleErrors }) => {
  // Emulate before navigation so the query resolves true for the pre-paint and
  // first-paint CSS.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const matches = await page.evaluate(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  expect(matches).toBe(true);

  // RouteTransition keys a .route-enter div per route; under reduced motion the
  // CSS override disables its entrance:
  //   @media (prefers-reduced-motion: reduce) { .route-enter { animation: none } }
  // The global crush forces animation-duration to 0.01ms !important, so the
  // honest proof the entrance is neutralized is animation-name resolving to
  // "none" (no keyframe animation runs at all).
  const animationName = await page
    .locator(".route-enter")
    .first()
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(animationName).toBe("none");

  expectNoConsoleErrors(consoleErrors);
});
