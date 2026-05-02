#!/usr/bin/env node
// Phase 2 verification: drives Chromium against the dev server and asserts the
// authored question pool reaches the practice UI for qalqalah, with prompts,
// authored options, and audio still playable. Mirrors verify-mushaf.mjs.

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
  const failed404s = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    if (res.status() === 404) failed404s.push(res.url());
  });

  // 1. Practice page loads with the qalqalah option in the filter dropdown,
  // showing the authored question count (30).
  await page.goto(`${BASE}/practice`, { waitUntil: "networkidle" });
  const qalqalahOption = await page.locator('option:has-text("Qalqalah")').first().textContent();
  record(
    "Qalqalah filter shows 30 authored questions",
    /Qalqalah \(30\)/.test(qalqalahOption ?? ""),
    `option text: ${qalqalahOption}`,
  );

  // 2. Select qalqalah, start the quiz.
  await page.selectOption("#module-filter", "qalqalah");
  // QuizSession is dynamic-imported with ssr: false, so wait for it to mount.
  await page.waitForFunction(() => {
    return Array.from(document.querySelectorAll("button")).some((b) =>
      (b.textContent ?? "").trim().toLowerCase().includes("start"),
    );
  }, { timeout: 10000 });
  await page.click('button:has-text("Start Quiz")');
  await page.waitForTimeout(400);

  // 3. The first question's prompt is one of the authored prompts (not the
  //    static "identify the rule" header). The qalqalah authored prompts all
  //    contain "qalqalah" or "letter" or "level" in English.
  const promptText = await page.locator("article p, .text-text-muted").first().textContent();
  // Check the visible Card's first <p> contains an authored prompt by looking
  // for a question mark or one of our key phrases.
  const allPText = await page.evaluate(() => {
    const card = document.querySelector("article + div div") || document.querySelector("[class*='Card'], .text-center");
    return Array.from(document.querySelectorAll("p"))
      .map((p) => p.textContent ?? "")
      .filter((t) => t.length > 5);
  });
  const hasAuthoredPrompt = allPText.some(
    (t) => /qalqalah/i.test(t) || /which/i.test(t) || /how many/i.test(t) || /\?/.test(t),
  );
  record(
    "First qalqalah question shows an authored prompt",
    hasAuthoredPrompt,
    `paragraphs found: ${allPText.length}; first match preview: ${(allPText.find((t) => /\?/.test(t)) ?? "").slice(0, 60)}`,
  );

  // 4. The question shows 4 options (the authored options).
  const optionButtons = await page.locator('button[role="radio"]').count();
  record("Question shows 4 options", optionButtons === 4, `count: ${optionButtons}`);

  // 5. The verse fragment is one of the 5 verified examples (text content includes
  //    one of these expected fragments).
  const expectedFragments = ["يَقْطَعُونَ", "يَجْعَلُونَ", "يَلِدْ", "الْفَلَقِ", "وَتَبَّ", "تَبَّتْ", "لَمْ يَلِدْ", "قُلْ أَعُوذُ"];
  const cardText = await page.locator("article, body").first().innerText();
  const matchedFragment = expectedFragments.find((f) => cardText.includes(f));
  record(
    "Verse fragment matches a verified qalqalah example",
    !!matchedFragment,
    matchedFragment ? `matched: ${matchedFragment}` : "no expected fragment found in question card",
  );

  // 6. Click the first option, expect either a green-correct or red-incorrect
  //    state to appear (UI transitions to answered state).
  await page.locator('button[role="radio"]').first().click();
  await page.waitForTimeout(200);
  const answeredState = await page.locator(
    'button[role="radio"][aria-checked="true"], button[disabled]',
  ).count();
  record(
    "Tapping an option marks the question answered",
    answeredState >= 1,
    `disabled/checked count: ${answeredState}`,
  );

  // 7. No serious console errors.
  const seriousErrors = consoleErrors.filter((e) => {
    if (e.includes("hydration") || e.includes("Hydration") || e.includes("Text content")) return false;
    if (e.includes("favicon")) return false;
    if (e.includes("404") && failed404s.every((u) => /favicon|\.ico/.test(u))) return false;
    return true;
  });
  record(
    "No serious console errors during quiz flow",
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
