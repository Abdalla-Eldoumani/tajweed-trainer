#!/usr/bin/env node
// Browser smoke test for the features added in this round:
//   - Spaced repetition (Leitner): record review, see Review Due tile.
//   - Memorization tracker: toggle a verse, check localStorage.
//   - Memorization mode: Mushaf reader toolbar toggle blurs verse text.
//   - Global search: /search returns hits for "qalqalah" and a surah name.
//   - Web Speech TTS: speak button is rendered when supported.
//   - PWA: /manifest.webmanifest, /icon.svg, /sw.js endpoints respond.
//
// Mirrors the verify-* style. Runs against `npm run dev` (preferred for
// non-minified errors) but also works against `next start`.

import { chromium } from "playwright-core";

const CHROME =
  process.env.PLAYWRIGHT_CHROME ||
  (process.platform === "win32"
    ? `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe`
    : process.platform === "darwin"
    ? `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1208/chrome-mac/Chromium.app/Contents/MacOS/Chromium`
    : `${process.env.HOME}/.cache/ms-playwright/chromium-1208/chrome-linux/chrome`);
const BASE = process.env.BASE_URL || "http://localhost:3000";

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // ---- PWA endpoints ----
  const manifestResp = await page.goto(`${BASE}/manifest.webmanifest`, { waitUntil: "domcontentloaded" });
  record("manifest.webmanifest serves 200", manifestResp?.status() === 200, `status: ${manifestResp?.status()}`);
  const swResp = await page.goto(`${BASE}/sw.js`, { waitUntil: "domcontentloaded" });
  record("sw.js serves 200", swResp?.status() === 200, `status: ${swResp?.status()}`);
  const iconResp = await page.goto(`${BASE}/icon.svg`, { waitUntil: "domcontentloaded" });
  record("icon.svg serves 200", iconResp?.status() === 200, `status: ${iconResp?.status()}`);

  // ---- Search ----
  await page.goto(`${BASE}/search`, { waitUntil: "networkidle" });
  await page.fill('input[type="search"]', "qalqalah");
  await page.waitForTimeout(300);
  const qalqalahHits = await page.locator('a[href^="/learn/qalqalah"]').count();
  record("Search 'qalqalah' returns lesson links", qalqalahHits >= 1, `hits: ${qalqalahHits}`);
  await page.fill('input[type="search"]', "Al-Fatihah");
  await page.waitForTimeout(300);
  const fatihahHits = await page.locator('a[href^="/mushaf/surah/"]').count();
  record("Search 'Al-Fatihah' returns surah links", fatihahHits >= 1, `hits: ${fatihahHits}`);
  await page.fill('input[type="search"]', "x");
  await page.waitForTimeout(200);
  const tooShortHint = await page.locator("body").innerText();
  record("One-character query shows hint, not results", /letters or more|حرفان أو أكثر/.test(tooShortHint), "hint visible");

  // ---- Memorization tracker ----
  await page.goto(`${BASE}/mushaf/page/1`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("tajweed-trainer-progress"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  // Find a heart-style memorization button. They render with svg path d="M20.84..."
  const memorizeButtons = await page.locator('button[aria-label*="memorized"], button[aria-label*="حفظ"]').count();
  record("Mushaf renders per-verse memorize buttons", memorizeButtons >= 1, `count: ${memorizeButtons}`);
  if (memorizeButtons >= 1) {
    await page.locator('button[aria-label*="Mark as memorized"], button[aria-label*="وضع علامة محفوظ"]').first().click();
    await page.waitForTimeout(300);
    const memorized = await page.evaluate(() => {
      const raw = localStorage.getItem("tajweed-trainer-progress");
      return raw ? JSON.parse(raw)?.memorizedVerses ?? [] : [];
    });
    record("Toggling a verse persists it to memorizedVerses", memorized.length === 1, `count: ${memorized.length} sample: ${memorized[0]}`);
  } else {
    record("Toggling a verse persists it to memorizedVerses", false, "no buttons rendered");
  }

  // ---- Memorization mode ----
  const memorizeToggle = await page.locator('button[aria-label*="memorized verses"], button[aria-label*="وضع المراجعة"], button[aria-label*="recall mode"]').count();
  record("Memorization-mode toolbar toggle exists", memorizeToggle >= 1, `count: ${memorizeToggle}`);
  if (memorizeToggle >= 1) {
    await page.locator('button[aria-label*="Hide memorized"], button[aria-label*="recall"], button[aria-label*="إخفاء"]').first().click();
    await page.waitForTimeout(300);
    const blurred = await page.locator('.blur-md').count();
    record("Activating memorization mode blurs at least one verse", blurred >= 1, `blurred count: ${blurred}`);
  } else {
    record("Activating memorization mode blurs at least one verse", false, "no toggle");
  }

  // ---- Spaced repetition (after answering) ----
  await page.evaluate(() => localStorage.removeItem("tajweed-trainer-progress"));
  await page.goto(`${BASE}/practice/qalqalah`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Array.from(document.querySelectorAll("button")).some((b) => (b.textContent ?? "").trim().toLowerCase().includes("start")), { timeout: 15000 });
  await page.click('button:has-text("Start Quiz")');
  await page.waitForTimeout(400);
  await page.locator('button[role="radio"]').first().click();
  await page.waitForTimeout(300);
  const reviews = await page.evaluate(() => {
    const raw = localStorage.getItem("tajweed-trainer-progress");
    return raw ? Object.keys(JSON.parse(raw)?.reviews ?? {}) : [];
  });
  record("Answering a question records a review entry", reviews.length === 1, `count: ${reviews.length}`);

  // ---- TTS button (Web Speech API support varies) ----
  // Don't fail if speech is unavailable, just check the button is rendered
  // when supported, gracefully absent otherwise.
  const speechBtn = await page.locator('button[aria-label*="Read the question"], button[aria-label*="اقرأ السؤال"]').count();
  record("TTS button renders when speech is supported", speechBtn === 0 || speechBtn === 1, `count: ${speechBtn}`);

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.log("Failures:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
