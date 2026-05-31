#!/usr/bin/env node
// Phase 3 verification: drives Chromium against the dev server and asserts the
// Quran.com reciter library in settings. Confirms:
//   - The settings page renders a reciter <select> and a search input.
//   - Reciters are grouped by style (Mujawwad / Murattal), with the default
//     (id 12, Al-Husary muallim) and Alafasy (id 7) present.
//   - Choosing a reciter persists the numeric id and survives reload.
//   - The search input narrows the options.
//   - A tampered localStorage reciter id falls back to the default (12).
//
// Mirrors the style of the other verify-* scripts.

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
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("tajweed-trainer-progress"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  // 1. The reciter select and search input render; the old radio group is gone.
  record("Reciter select renders", (await page.locator('select[aria-label="Reciter"]').count()) === 1);
  record("Reciter search input renders", (await page.locator('input[aria-label="Search reciters"]').count()) === 1);
  record("Old reciter radio group is gone", (await page.locator('input[type="radio"][name="reciter"]').count()) === 0);

  // 2. The default (12) and Alafasy (7) are present.
  const ids = await page.evaluate(() =>
    Array.from(document.querySelectorAll('select[aria-label="Reciter"] option')).map((o) => o.value),
  );
  record("Default id 12 and Alafasy id 7 are listed", ids.includes("12") && ids.includes("7"), `ids: ${ids.join(",")}`);

  // 3. Reciters are grouped by style.
  const groups = await page.evaluate(() =>
    Array.from(document.querySelectorAll('select[aria-label="Reciter"] optgroup')).map((g) => g.label),
  );
  record("Reciter select groups by style", groups.includes("Mujawwad") && groups.includes("Murattal"), `groups: ${groups.join(", ")}`);

  // 4. Choosing Alafasy (7) persists.
  await page.selectOption('select[aria-label="Reciter"]', "7");
  await page.waitForTimeout(150);
  const persisted = await page.evaluate(() => {
    const r = localStorage.getItem("tajweed-trainer-progress");
    return r ? JSON.parse(r)?.settings?.reciter ?? null : null;
  });
  record("Choosing Alafasy persists id 7", persisted === "7", `persisted: ${persisted}`);

  // 5. Reload — the selection comes back.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const afterReload = await page.evaluate(() => document.querySelector('select[aria-label="Reciter"]')?.value ?? null);
  record("Reciter selection persists across reload", afterReload === "7", `after reload: ${afterReload}`);

  // 6. Search narrows the options.
  await page.fill('input[aria-label="Search reciters"]', "Minshawi");
  await page.waitForTimeout(250);
  const narrowed = await page.evaluate(() =>
    Array.from(document.querySelectorAll('select[aria-label="Reciter"] option')).map((o) => o.textContent.trim()),
  );
  record(
    "Search narrows the reciter options",
    narrowed.length < ids.length && narrowed.some((t) => t.includes("Minshawi")),
    `narrowed ${narrowed.length}/${ids.length}`,
  );
  await page.fill('input[aria-label="Search reciters"]', "");

  // 7. A tampered reciter id falls back to the default (12).
  await page.evaluate(() => {
    const r = localStorage.getItem("tajweed-trainer-progress");
    const p = r ? JSON.parse(r) : { settings: {} };
    p.settings = { ...(p.settings ?? {}), reciter: "not-a-real-id" };
    localStorage.setItem("tajweed-trainer-progress", JSON.stringify(p));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const fallback = await page.evaluate(() => document.querySelector('select[aria-label="Reciter"]')?.value ?? null);
  record("Tampered reciter id falls back to default 12", fallback === "12", `value after tamper: ${fallback}`);

  // 8. No serious console errors.
  const serious = consoleErrors.filter(
    (e) => !/hydration|Hydration|Text content|Expected server HTML|did not match|favicon|\.ico|Failed to load resource.*404/.test(e),
  );
  record("No serious console errors", serious.length === 0, serious.slice(0, 3).join(" | ") || "0 errors");

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
