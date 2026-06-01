#!/usr/bin/env node
// Mushaf-reader verification: drives a real Chromium against the dev server and
// asserts the Mushaf reader behaves correctly across the critical pages.
// Not a build dep; only runs locally on demand.

import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

// Path to a Chromium binary. Override with PLAYWRIGHT_CHROME env var if your
// install lives elsewhere. Default tries the standard playwright cache.
const CHROME =
  process.env.PLAYWRIGHT_CHROME ||
  (process.platform === "win32"
    ? `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe`
    : process.platform === "darwin"
    ? `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1208/chrome-mac/Chromium.app/Contents/MacOS/Chromium`
    : `${process.env.HOME}/.cache/ms-playwright/chromium-1208/chrome-linux/chrome`);
const BASE = process.env.BASE_URL || "http://localhost:3000";
const SCREENSHOT_DIR = "mushaf-screenshots";

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
}

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  const networkUrls = [];
  page.on("request", (req) => networkUrls.push(req.url()));
  const failed404s = [];
  page.on("response", (res) => {
    if (res.status() === 404) failed404s.push(res.url());
  });

  // 1. Mushaf index loads with 114 surah cards
  await page.goto(`${BASE}/mushaf`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-index.png`, fullPage: true });
  const surahCardCount = await page.locator('a[href^="/mushaf/surah/"]').count();
  record("Index renders 114 surah cards", surahCardCount === 114, `actual: ${surahCardCount}`);

  // 2. Search filter narrows results
  await page.fill('input[type="search"]', "Fatihah");
  await page.waitForTimeout(200);
  const searchCount = await page.locator('a[href^="/mushaf/surah/"]').count();
  record("Search 'Fatihah' filters to 1 surah", searchCount === 1, `actual: ${searchCount}`);
  await page.fill('input[type="search"]', "");

  // 3. Filter "Madinah surahs" reduces grid
  await page.click('button[aria-pressed="false"]:has-text("Madinah")');
  await page.waitForTimeout(200);
  const madaniCount = await page.locator('a[href^="/mushaf/surah/"]').count();
  record("Madinah filter shows ~28 surahs", madaniCount > 20 && madaniCount < 35, `actual: ${madaniCount}`);
  await page.click('button:has-text("All")');

  // 4. Click Al-Fatihah → redirected to /mushaf/page/1
  await page.click('a[href="/mushaf/surah/1"]');
  await page.waitForURL(`${BASE}/mushaf/page/1`, { timeout: 5000 });
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SCREENSHOT_DIR}/02-page1-fatihah.png`, fullPage: true });
  record("Surah 1 link redirects to /mushaf/page/1", page.url() === `${BASE}/mushaf/page/1`);

  // 5. Page 1 has the mushaf-frame, surah-cartouche
  const hasFrame1 = await page.locator(".mushaf-frame").count();
  const hasCartouche1 = await page.locator(".surah-cartouche").count();
  record("Page 1 renders MushafFrame", hasFrame1 >= 1);
  record("Page 1 renders SurahCartouche for Al-Fatihah", hasCartouche1 >= 1);

  // 6. Page 1 must NOT render an extra BismillahLine (Al-Fatihah's bismillah is ayah 1)
  // BismillahLine is detected by the standalone gold bismillah text outside .tajweed-text
  const standaloneBismillahP1 = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("article > div, article > header > div"));
    return all.filter((el) => el.textContent?.includes("بِسْمِ ٱللَّٰهِ") && !el.querySelector(".tajweed-text")).length;
  });
  record("Page 1 (Al-Fatihah) has NO standalone BismillahLine", standaloneBismillahP1 === 0, `count: ${standaloneBismillahP1}`);

  // 7. Page 1 has 7 verse buttons
  const verseButtons1 = await page.locator(".mushaf-verse").count();
  record("Page 1 has 7 verse buttons", verseButtons1 === 7, `actual: ${verseButtons1}`);

  // 8. Navigate to page 2 (Al-Baqarah start)
  await page.goto(`${BASE}/mushaf/page/2`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-page2-baqarah.png`, fullPage: true });
  const cartouche2 = await page.locator(".surah-cartouche").count();
  record("Page 2 renders Al-Baqarah cartouche", cartouche2 >= 1);
  const standaloneBismillahP2 = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("article header div"));
    return els.filter((el) => el.textContent?.includes("بِسْمِ ٱللَّٰهِ") && !el.querySelector(".tajweed-text")).length;
  });
  record("Page 2 (Al-Baqarah) HAS standalone BismillahLine", standaloneBismillahP2 >= 1, `count: ${standaloneBismillahP2}`);

  // 9. At-Tawbah page (187) — cartouche but NO BismillahLine
  await page.goto(`${BASE}/mushaf/page/187`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/04-page187-tawbah.png`, fullPage: true });
  const tawbahCartouche = await page.locator(".surah-cartouche").count();
  record("Page 187 renders At-Tawbah cartouche", tawbahCartouche >= 1);
  const standaloneBismillahTawbah = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("article header div"));
    return els.filter((el) => el.textContent?.includes("بِسْمِ ٱللَّٰهِ") && !el.querySelector(".tajweed-text")).length;
  });
  record("Page 187 (At-Tawbah) has NO BismillahLine", standaloneBismillahTawbah === 0, `count: ${standaloneBismillahTawbah}`);

  // 10. Tap a verse → audio request issued
  await page.goto(`${BASE}/mushaf/page/1`, { waitUntil: "networkidle" });
  networkUrls.length = 0;
  await page.locator(".mushaf-verse").first().click();
  await page.waitForTimeout(2500);
  const audioRequest = networkUrls.find((u) => /alquran\.cloud|cdn\.islamic\.network|audio\/.+\.mp3/.test(u));
  record("Tap verse triggers audio fetch", !!audioRequest, audioRequest ? `url: ${audioRequest.slice(0, 80)}...` : "no audio request seen");

  // 11. Bookmark toggle persists to localStorage
  await page.click('button[aria-label*="bookmark"], button[aria-label*="ookmark"]');
  await page.waitForTimeout(200);
  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem("tajweed-trainer-progress");
    if (!raw) return null;
    return JSON.parse(raw).settings?.mushafBookmarks ?? null;
  });
  record("Bookmark persists to localStorage", Array.isArray(stored) && stored.includes(1), `bookmarks: ${JSON.stringify(stored)}`);

  // 12. Navigate to page 604 (last page) — next button disabled
  await page.goto(`${BASE}/mushaf/page/604`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/05-page604.png`, fullPage: true });
  const nextDisabled = await page.locator('a[aria-disabled="true"]:has(button[aria-label*="ext"])').count();
  record("Page 604 has next disabled", nextDisabled >= 1);

  // 13. Page 1 has prev disabled
  await page.goto(`${BASE}/mushaf/page/1`, { waitUntil: "networkidle" });
  const prevDisabled = await page.locator('a[aria-disabled="true"]').count();
  record("Page 1 has prev disabled", prevDisabled >= 1);

  // 14. Switch language to Arabic and verify Mushaf UI flips
  await page.evaluate(() => {
    const raw = localStorage.getItem("tajweed-trainer-progress") ?? "{}";
    const progress = JSON.parse(raw);
    progress.settings = { ...(progress.settings ?? {}), language: "ar" };
    localStorage.setItem("tajweed-trainer-progress", JSON.stringify(progress));
  });
  await page.goto(`${BASE}/mushaf`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/06-index-ar.png`, fullPage: true });
  const indexHtmlDir = await page.evaluate(() => document.documentElement.dir);
  record("Mushaf index renders RTL when AR set", indexHtmlDir === "rtl", `dir: ${indexHtmlDir}`);
  const arabicTitle = await page.locator("h1:has-text('المصحف')").count();
  record("Index title shows in Arabic", arabicTitle >= 1);

  // 15. Mushaf page 2 in AR mode
  await page.goto(`${BASE}/mushaf/page/2`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/07-page2-ar.png`, fullPage: true });
  const arabicJuzLabel = await page.locator("text=الجزء").count();
  record("Page 2 footer shows Arabic Juz label", arabicJuzLabel >= 1);

  // 16. Dark mode
  await page.evaluate(() => {
    const raw = localStorage.getItem("tajweed-trainer-progress") ?? "{}";
    const progress = JSON.parse(raw);
    progress.settings = { ...(progress.settings ?? {}), darkMode: true };
    localStorage.setItem("tajweed-trainer-progress", JSON.stringify(progress));
  });
  await page.goto(`${BASE}/mushaf/page/2`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/08-page2-ar-dark.png`, fullPage: true });
  const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  record("Dark mode applies on Mushaf page", isDark);

  // 17. No console errors beyond the known dev-time hydration warning
  const seriousErrors = consoleErrors.filter((e) => {
    if (e.includes("hydration") || e.includes("Hydration") || e.includes("Text content")) return false;
    // Filter favicon 404s — the project doesn't ship a favicon yet.
    if (e.includes("favicon")) return false;
    if (e.includes("404") && failed404s.every((u) => /favicon|\.ico/.test(u))) return false;
    return true;
  });
  record(
    "No serious console errors during Mushaf flow",
    seriousErrors.length === 0,
    seriousErrors.length ? `${seriousErrors.length} unexpected errors: ${seriousErrors.join(" | ")}` : `404s: ${failed404s.length} (${failed404s.map((u) => u.split("/").pop()).join(",")})`,
  );

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
