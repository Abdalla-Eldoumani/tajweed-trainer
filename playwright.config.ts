import { defineConfig, devices } from "@playwright/test";

// End-to-end runner config. Specs live under e2e/**/*.spec.ts, deliberately
// outside Vitest's src/**/*.test.{ts,tsx} include so the two runners never
// collect each other's files.
//
// Browser: the default chromium project resolves Playwright's pinned Chromium
// revision from the standard cache. No executablePath / channel override, so
// the same config works on a local machine with the cached build and in CI,
// where the browser is installed fresh.
//
// Server: the PRODUCTION server (build then start on :3000), never next dev —
// the dev server wedges on the Mushaf prefetch in this environment. Locally,
// reuseExistingServer picks up an already-running `npm start` and skips the
// rebuild; CI always builds fresh.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    // Autoplay arg so audio play() resolves headless (a Playwright click is
    // already a trusted gesture; this removes any doubt). Muted so no sound.
    launchOptions: { args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
  },
});
