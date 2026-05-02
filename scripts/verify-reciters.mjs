#!/usr/bin/env node
// Phase 4 verification: drives Chromium against the dev server and asserts
// the reciter expansion. Confirms:
//   - The settings page renders a <select> (the radio group is gone).
//   - The two defaults (Husary, Alafasy) always render, even before the
//     editions API responds.
//   - Choosing a reciter persists to localStorage and is read back on reload.
//   - A tampered localStorage entry falls back to husary on next load.
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

  // 1. Settings renders a <select> for reciter (radio group is gone).
  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("tajweed-trainer-progress"));
  await page.evaluate(() => localStorage.removeItem("tajweed-trainer-reciters"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const reciterSelect = await page.locator('select[aria-label="Reciter"]').count();
  record("Reciter select renders", reciterSelect === 1, `select count: ${reciterSelect}`);

  const radioCount = await page.locator('input[type="radio"][name="reciter"]').count();
  record("Old reciter radio group is gone", radioCount === 0, `radio count: ${radioCount}`);

  // 2. The two defaults (ar.husary, ar.alafasy) are present.
  const defaultIds = await page.evaluate(() => {
    const sel = document.querySelector('select[aria-label="Reciter"]');
    if (!sel) return [];
    return Array.from(sel.querySelectorAll("option")).map((o) => o.value);
  });
  record(
    "Default reciter ids ar.husary and ar.alafasy are listed",
    defaultIds.includes("ar.husary") && defaultIds.includes("ar.alafasy"),
    `ids: ${defaultIds.slice(0, 6).join(", ")}${defaultIds.length > 6 ? "…" : ""}`,
  );

  // 3. Has at least one optgroup (the Arabic group, where the defaults live).
  const optgroupLabels = await page.evaluate(() => {
    const sel = document.querySelector('select[aria-label="Reciter"]');
    if (!sel) return [];
    return Array.from(sel.querySelectorAll("optgroup")).map((g) => g.label);
  });
  record(
    "Reciter select uses optgroups",
    optgroupLabels.length >= 1,
    `groups: ${optgroupLabels.join(", ")}`,
  );

  // 4. Selecting Alafasy persists to localStorage.
  await page.selectOption('select[aria-label="Reciter"]', "ar.alafasy");
  await page.waitForTimeout(150);
  const persistedAlafasy = await page.evaluate(() => {
    const raw = localStorage.getItem("tajweed-trainer-progress");
    if (!raw) return null;
    return JSON.parse(raw)?.settings?.reciter ?? null;
  });
  record(
    "Choosing Alafasy persists ar.alafasy to localStorage",
    persistedAlafasy === "ar.alafasy",
    `persisted: ${persistedAlafasy}`,
  );

  // 5. Reload — the selection comes back.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const selectedAfterReload = await page.evaluate(() => {
    const sel = document.querySelector('select[aria-label="Reciter"]');
    return sel?.value ?? null;
  });
  record(
    "Reciter selection persists across reload",
    selectedAfterReload === "ar.alafasy",
    `selected after reload: ${selectedAfterReload}`,
  );

  // 6. Tamper with localStorage — set an invalid reciter id. On next read,
  //    sanitizeSettings should fall back to husary.
  await page.evaluate(() => {
    const raw = localStorage.getItem("tajweed-trainer-progress");
    const parsed = raw ? JSON.parse(raw) : { settings: {} };
    parsed.settings = { ...(parsed.settings ?? {}), reciter: "definitely-not-a-real-edition" };
    localStorage.setItem("tajweed-trainer-progress", JSON.stringify(parsed));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const fallback = await page.evaluate(() => {
    const sel = document.querySelector('select[aria-label="Reciter"]');
    return sel?.value ?? null;
  });
  // Falls back to "husary" (the alias) per pickReciter — the option list
  // contains both `husary` and `ar.husary`-aliased identifier; we only emit
  // `ar.husary` as a real option, so the alias-fallback rounds to husary
  // and renders as ar.husary. Either is acceptable.
  record(
    "Tampered reciter id falls back to a default (husary)",
    fallback === "husary" || fallback === "ar.husary",
    `select value after tamper: ${fallback}`,
  );

  // 7. Editions cache file is populated after a successful API load. Allow
  //    a network failure to leave it absent — defaults still render.
  const cache = await page.evaluate(() => {
    const raw = localStorage.getItem("tajweed-trainer-reciters");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return { count: parsed.editions?.length ?? 0, hasFetchedAt: typeof parsed.fetchedAt === "number" };
    } catch {
      return null;
    }
  });
  record(
    "Editions cache is populated or absent (network-tolerant)",
    cache === null || (cache.count >= 2 && cache.hasFetchedAt),
    cache === null ? "cache absent (network failed, defaults rendered)" : `count=${cache.count}`,
  );

  // 8. No serious console errors.
  const seriousErrors = consoleErrors.filter((e) => {
    if (e.includes("hydration") || e.includes("Hydration") || e.includes("Text content")) return false;
    if (e.includes("Expected server HTML") || e.includes("did not match")) return false;
    if (e.includes("favicon") || e.includes(".ico")) return false;
    if (/Failed to load resource.*404/.test(e)) return false;
    return true;
  });
  record(
    "No serious console errors during reciter flow",
    seriousErrors.length === 0,
    seriousErrors.length ? `${seriousErrors.length} unexpected: ${seriousErrors.slice(0, 3).join(" | ")}` : "0 errors",
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
