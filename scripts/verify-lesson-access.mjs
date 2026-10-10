#!/usr/bin/env node
// Lesson access verification: drives Chromium against a running server and
// asserts that every lesson and practice quiz opens on a fresh profile, that
// no lock UI remains, and that progress tracking still records completions.
// Mirrors the structure of verify-mushaf.mjs.

import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const CHROME =
  process.env.PLAYWRIGHT_CHROME ||
  (process.platform === "win32"
    ? `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe`
    : process.platform === "darwin"
    ? `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1208/chrome-mac/Chromium.app/Contents/MacOS/Chromium`
    : `${process.env.HOME}/.cache/ms-playwright/chromium-1208/chrome-linux/chrome`);
const BASE = process.env.BASE_URL || "http://localhost:3000";
const STORE_KEY = "tajweed-trainer-progress";

const modules = JSON.parse(
  readFileSync(new URL("../src/data/content/learning-path.json", import.meta.url), "utf8"),
).modules;

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

async function setStore(page, patch) {
  await page.evaluate(
    ([key, p]) => {
      const progress = JSON.parse(localStorage.getItem(key) ?? "{}");
      localStorage.setItem(key, JSON.stringify({ ...progress, ...p }));
    },
    [STORE_KEY, patch],
  );
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // A fresh profile opens the first-run tour over the page; mark it seen.
  await context.addInitScript((key) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ seenOnboarding: true }));
  }, STORE_KEY);
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const consoleErrors = [];
  const failed404s = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    if (res.status() === 404) failed404s.push(res.url());
  });

  // 1. Fresh profile: every lesson route shows its own content, none shows a lock screen.
  await page.goto(`${BASE}/learn`, { waitUntil: "networkidle" });
  let lessonsOpen = 0;
  const closed = [];
  for (const m of modules) {
    await page.goto(`${BASE}/learn/${m.id}`, { waitUntil: "networkidle" });
    const text = await page.locator("main").innerText();
    const hasLockText = /module is locked/i.test(text);
    const hasTitle = text.includes(m.title_ar) || text.toLowerCase().includes(m.title_en.split(" (")[0].toLowerCase());
    if (!hasLockText && hasTitle) lessonsOpen += 1;
    else closed.push(m.id);
  }
  record(
    `Fresh profile: all ${modules.length} lessons open with their own content`,
    lessonsOpen === modules.length,
    closed.length ? `closed: ${closed.join(",")}` : `open: ${lessonsOpen}`,
  );

  // 2. Learn index: every module is a link and none carries the old locked state.
  await page.goto(`${BASE}/learn`, { waitUntil: "networkidle" });
  const moduleLinks = await page.locator("main ol a[href^='/learn/']").count();
  const lockedCards = await page.locator("main .cursor-not-allowed, main [aria-disabled='true']").count();
  record("Learn index lists every module as a link", moduleLinks === modules.length, `links: ${moduleLinks}`);
  record("Learn index shows no locked cards", lockedCards === 0, `locked: ${lockedCards}`);

  // 3. Sidebar: no module link is labelled as locked.
  const lockedAria = await page.evaluate(
    () => [...document.querySelectorAll("a[href^='/learn/']")].filter((a) => /locked/i.test(a.getAttribute("aria-label") ?? "")).length,
  );
  record("Sidebar marks no module as locked", lockedAria === 0, `count: ${lockedAria}`);

  // 4. Practice quizzes open directly, the hub shows no locked tiles.
  await page.goto(`${BASE}/practice/madd`, { waitUntil: "networkidle" });
  const practiceText = await page.locator("main").innerText();
  record("Direct /practice/madd opens the quiz", !/module is locked/i.test(practiceText) && practiceText.length > 80, `chars: ${practiceText.length}`);
  await page.goto(`${BASE}/practice`, { waitUntil: "networkidle" });
  const hubLocked = await page.locator("main [aria-disabled='true']").count();
  const hubTiles = await page.locator("main a[href^='/practice/']").count();
  record("Practice hub tiles are all links", hubLocked === 0 && hubTiles >= modules.length, `tiles: ${hubTiles}, locked: ${hubLocked}`);

  // 5. Progress tracking still records a completion and the index reflects it.
  await page.goto(`${BASE}/learn/makharij`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /mark as complete/i }).click();
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}"), STORE_KEY);
  const done = stored.modules?.makharij?.lessonsCompleted ?? [];
  record("Marking a lesson complete is stored", done.includes("makharij-main"), `lessonsCompleted: ${done.join(",")}`);
  await page.goto(`${BASE}/learn`, { waitUntil: "networkidle" });
  const completedLabels = await page.locator("main ol").getByText(/^completed$/i).count();
  record("Learn index shows the completed lesson", completedLabels >= 1, `labels: ${completedLabels}`);

  // 6. Arabic locale: a late lesson opens and no Arabic locked text appears.
  await setStore(page, { settings: { ...(stored.settings ?? {}), language: "ar" } });
  await page.goto(`${BASE}/learn/waqf`, { waitUntil: "networkidle" });
  const arText = await page.locator("main").innerText();
  record("Arabic locale: /learn/waqf opens its lesson", arText.includes("علامات الوقف") && !arText.includes("مقفل"), `chars: ${arText.length}`);
  await setStore(page, { settings: { ...(stored.settings ?? {}), language: "en" } });

  // 7. No serious console errors during the flow.
  const seriousErrors = consoleErrors.filter((e) => {
    if (e.includes("hydration") || e.includes("Hydration") || e.includes("Text content")) return false;
    if (e.includes("favicon")) return false;
    if (e.includes("404") && failed404s.every((u) => /favicon|\.ico/.test(u))) return false;
    return true;
  });
  record(
    "No serious console errors during the lesson access flow",
    seriousErrors.length === 0,
    seriousErrors.length
      ? `${seriousErrors.length} unexpected: ${seriousErrors.slice(0, 3).join(" | ")}`
      : `404s: ${failed404s.length}`,
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
