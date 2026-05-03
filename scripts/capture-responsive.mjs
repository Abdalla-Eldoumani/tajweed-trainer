#!/usr/bin/env node
// Phase 5 — capture responsive screenshots at the three standard breakpoints
// across every route the prompt enumerates. Saves to
// .playwright-mcp/responsive/<viewport>/<slug>.png so a human can scrub
// through the outputs and flag anything that wraps/overflows badly.
//
// Standard breakpoints: 375 (iPhone), 768 (tablet), 1440 (desktop). Each
// shot is full-page so the entire scroll region is captured.
//
// Style mirrors the other verify-* scripts.

import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const CHROME =
  process.env.PLAYWRIGHT_CHROME ||
  (process.platform === "win32"
    ? `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe`
    : process.platform === "darwin"
    ? `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1208/chrome-mac/Chromium.app/Contents/MacOS/Chromium`
    : `${process.env.HOME}/.cache/ms-playwright/chromium-1208/chrome-linux/chrome`);
const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT_ROOT = join(process.cwd(), ".playwright-mcp", "responsive");

const VIEWPORTS = [
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
];

// Routes per HANDOFF.md Phase 5. The "locked" entry hits /learn/madd which is
// gated until the prerequisite (laam-raa) is unlocked, so it triggers the
// LockedModuleScreen path.
const ROUTES = [
  { slug: "home", path: "/" },
  { slug: "learn-index", path: "/learn" },
  { slug: "learn-makharij", path: "/learn/makharij" },
  { slug: "learn-qalqalah", path: "/learn/qalqalah" },
  { slug: "mushaf-index", path: "/mushaf" },
  { slug: "mushaf-page-187", path: "/mushaf/page/187" },
  { slug: "mushaf-page-599", path: "/mushaf/page/599" },
  { slug: "practice-hub", path: "/practice" },
  { slug: "practice-qalqalah", path: "/practice/qalqalah" },
  { slug: "practice-mixed", path: "/practice/mixed" },
  { slug: "progress", path: "/progress" },
  { slug: "settings", path: "/settings" },
  { slug: "learn-madd-locked", path: "/learn/madd", clearProgress: true },
];

async function main() {
  for (const vp of VIEWPORTS) {
    mkdirSync(join(OUT_ROOT, vp.name), { recursive: true });
  }

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  let total = 0;
  let warnings = 0;

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    for (const route of ROUTES) {
      try {
        if (route.clearProgress) {
          // Land on a normal page first to gain access to localStorage, then
          // wipe progress so the locked-module screen shows.
          await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
          await page.evaluate(() => localStorage.removeItem("tajweed-trainer-progress"));
        }
        await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 20000 });
        // Give client-side hydration and dynamic-imported QuizSession time to mount.
        await page.waitForTimeout(700);
        const file = join(OUT_ROOT, vp.name, `${route.slug}.png`);
        await page.screenshot({ path: file, fullPage: true });
        total++;
        // Quick overflow heuristic: scrollWidth > clientWidth on <html> means
        // some element is forcing horizontal scroll on this viewport.
        const overflow = await page.evaluate(() => {
          const root = document.documentElement;
          return root.scrollWidth - root.clientWidth;
        });
        if (overflow > 1) {
          warnings++;
          console.log(`WARN ${vp.name}/${route.slug}: horizontal overflow of ${overflow}px`);
        }
        process.stdout.write(`OK   ${vp.name}/${route.slug}.png\n`);
      } catch (err) {
        warnings++;
        console.log(`FAIL ${vp.name}/${route.slug}: ${err.message ?? err}`);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log(`\nCaptured ${total} screenshots to ${OUT_ROOT}. Warnings: ${warnings}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
