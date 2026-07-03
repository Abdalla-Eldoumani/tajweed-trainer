import { test as base, expect } from "@playwright/test";
import { stubQuran } from "./stub-quran";
import { attachConsole } from "./console";
import { seedProgress } from "./seed";

// Per-test fixtures shared by every e2e spec. Importing { test, expect } from
// here (instead of "@playwright/test" directly) gives a spec the whole rig:
//
// - context is pre-routed by stubQuran BEFORE the page navigates, so every
//   cross-origin api.quran.com and audio-host call is fulfilled from committed
//   fixtures and never reaches the live network.
// - consoleErrors is a live array of console.error + uncaught page-error text,
//   with listeners attached at fixture-init time (before the test body), so a
//   spec can assert expectNoConsoleErrors(consoleErrors) after it settles.
//
// Seed localStorage per test with seedProgress(context, partial) (re-exported
// below) before the first navigation when a spec needs RTL, memorized verses,
// or a theme.
type HarnessFixtures = {
  consoleErrors: string[];
};

export const test = base.extend<HarnessFixtures>({
  context: async ({ context }, use) => {
    await stubQuran(context);
    await use(context);
  },
  consoleErrors: async ({ page }, use) => {
    const errors = attachConsole(page);
    await use(errors);
  },
});

export { expect, seedProgress };
export { expectNoConsoleErrors } from "./console";
