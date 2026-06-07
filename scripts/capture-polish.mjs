#!/usr/bin/env node
// One-off polish sweep: home, a lesson, the color legend, the mushaf, settings,
// and the audio player, each at 375 / 768 / 1440 in both light and dark. Saves
// flat into .playwright-mcp/<slug>-<theme>-<vp>.png. Mirrors capture-responsive
// (cached chromium-1208 + a running next dev). Quran content needs the network;
// offline the chrome/frame still renders and the shot is taken anyway.

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
const OUT = join(process.cwd(), ".playwright-mcp");

const VIEWPORTS = [
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
];

// slug, path, and an optional async action run before the shot (e.g. trigger
// the player). full=false captures the viewport only (player chrome is fixed).
const ROUTES = [
  { slug: "home", path: "/", full: true },
  // Makharij is the first module and is always unlocked, so it renders real
  // lesson content offline (the interactive diagram, letter grids, calmed
  // cards) without needing seeded progress.
  { slug: "lesson-makharij", path: "/learn/makharij", full: true },
  {
    slug: "legend",
    path: "/",
    full: false,
    // The legend Card has no id; locate it by its heading and shoot the card.
    focusLocator: (page) =>
      page.locator('h3:has-text("Tajweed Color Legend")').locator("xpath=ancestor::div[1]"),
  },
  // Mushaf index: offline-safe (bundled surah-index), shows the reader's
  // cartouche-styled surah cards. The page reader (/mushaf/page/N) fetches
  // verses from api.quran.com and errors offline; captured separately and noted.
  { slug: "mushaf-index", path: "/mushaf", full: true },
  { slug: "mushaf-page", path: "/mushaf/page/598", full: true },
  { slug: "settings", path: "/settings", full: true },
  {
    // Mixed practice renders a PracticeQuestion with an audio play button and
    // needs no module unlock, so it is a reliable offline trigger for the
    // global player chrome.
    slug: "player",
    path: "/practice/mixed",
    full: false,
    action: async (page) => {
      // Start the quiz so a PracticeQuestion (with its play button and a
      // colored verse from the bundled snapshots) renders.
      const start = page.locator('button:has-text("Start Quiz"), button:has-text("ابدأ")').first();
      if (await start.count()) {
        await start.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(600);
      }
      // Clicking the play button calls playVerse, which flips the global player
      // to a visible state immediately (status leaves idle even before the
      // cross-origin mp3 resolves), so the player chrome renders.
      const play = page.locator('[aria-label="Play"], [aria-label="تشغيل"]').first();
      if (await play.count()) {
        await play.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(900);
      }
    },
  },
];

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    const root = document.documentElement;
    if (t === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, theme);
  await page.waitForTimeout(250);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  let total = 0;
  const missing = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    for (const route of ROUTES) {
      for (const theme of ["light", "dark"]) {
        try {
          await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 25000 });
          await page.waitForTimeout(600);
          await setTheme(page, theme);
          if (route.action) await route.action(page);

          // Note pages whose Quran content did not load (offline api.quran.com).
          const hasTajweed = await page.evaluate(
            () => document.querySelector(".tajweed-text") !== null,
          );
          if (route.slug === "mushaf-page" && !hasTajweed) {
            missing.push(`${route.slug}-${theme}-${vp.name}`);
          }

          const file = join(OUT, `${route.slug}-${theme}-${vp.name}.png`);
          const focusEl = route.focusLocator
            ? route.focusLocator(page).first()
            : route.focus
            ? page.locator(route.focus).first()
            : null;
          if (focusEl) {
            if (await focusEl.count()) {
              await focusEl.scrollIntoViewIfNeeded();
              await focusEl.screenshot({ path: file }).catch(async () => {
                await page.screenshot({ path: file });
              });
            } else {
              await page.screenshot({ path: file });
            }
          } else {
            await page.screenshot({ path: file, fullPage: !!route.full });
          }
          total++;
          process.stdout.write(`OK   ${route.slug}-${theme}-${vp.name}.png\n`);
        } catch (err) {
          process.stdout.write(`FAIL ${route.slug}-${theme}-${vp.name}: ${err.message ?? err}\n`);
        }
      }
    }
    await context.close();
  }

  await browser.close();
  console.log(`\nCaptured ${total} screenshots to ${OUT}.`);
  if (missing.length) console.log(`Missing Quran content (offline): ${missing.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
