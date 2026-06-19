#!/usr/bin/env node
// Practice-quiz verification, including the practice hub: drives Chromium
// against the dev server and asserts the authored question pool reaches the
// per-module practice routes. The old module-filter dropdown has been replaced
// by the hub at /practice (PracticeModuleCard grid), with each module on its
// own route /practice/<id>.

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
  const consoleErrors = [];
  const failed404s = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    if (res.status() === 404) failed404s.push(res.url());
  });

  // 1. Practice hub renders 9 module tiles + Mixed Review. Each module tile
  //    surfaces its question count (30) somewhere in its card text.
  await page.goto(`${BASE}/practice`, { waitUntil: "networkidle" });
  // Wait for client-side render so the cards (which read useProgress) mount.
  await page.waitForTimeout(500);

  const hubModules = [
    { name: "Makharij", id: "makharij" },
    { name: "Noon Sakinah", id: "noon-sakinah" },
    { name: "Meem Sakinah", id: "meem-sakinah" },
    { name: "Ghunnah", id: "ghunnah" },
    { name: "Qalqalah", id: "qalqalah" },
    { name: "Madd", id: "madd" },
    { name: "Laam", id: "laam-raa" },
    { name: "Heavy", id: "tafkheem-tarqeeq" },
    { name: "Waqf", id: "waqf" },
  ];
  for (const m of hubModules) {
    const card = page.locator(`a[href="/practice/${m.id}"]`).first();
    const cardText = (await card.textContent({ timeout: 5000 }).catch(() => "")) ?? "";
    record(
      `${m.name} hub tile renders with 30 questions`,
      /30/.test(cardText),
      `card text excerpt: ${cardText.slice(0, 80).replace(/\s+/g, " ")}`,
    );
  }
  const mixedCard = page.locator(`a[href="/practice/mixed"]`).first();
  record(
    "Mixed Review tile is on the hub",
    (await mixedCard.count()) === 1,
    `mixed tile count: ${await mixedCard.count()}`,
  );

  // 2. Navigate to /practice/qalqalah and start a quiz directly. The dropdown
  //    is gone; the per-module route is the entry point.
  await page.goto(`${BASE}/practice/qalqalah`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => {
    return Array.from(document.querySelectorAll("button")).some((b) =>
      (b.textContent ?? "").trim().toLowerCase().includes("start"),
    );
  }, { timeout: 10000 });
  await page.click('button:has-text("Start Quiz")');
  await page.waitForTimeout(400);

  // 3. The first question's prompt is one of the authored prompts.
  const allPText = await page.evaluate(() => {
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

  // 4. The question shows 4 options.
  const optionButtons = await page.locator('button[role="radio"]').count();
  record("Question shows 4 options", optionButtons === 4, `count: ${optionButtons}`);

  // 5. The verse fragment is one of the verified examples.
  const expectedFragments = ["يَقْطَعُونَ", "يَجْعَلُونَ", "يَلِدْ", "الْفَلَقِ", "وَتَبَّ", "تَبَّتْ", "لَمْ يَلِدْ", "قُلْ أَعُوذُ"];
  const cardText = await page.locator("body").first().innerText();
  const matchedFragment = expectedFragments.find((f) => cardText.includes(f));
  record(
    "Verse fragment matches a verified qalqalah example",
    !!matchedFragment,
    matchedFragment ? `matched: ${matchedFragment}` : "no expected fragment found",
  );

  // 6. Tapping an option marks the question answered.
  await page.locator('button[role="radio"]').first().click();
  await page.waitForTimeout(300);
  const answeredState = await page.locator(
    'button[role="radio"][aria-checked="true"], button[disabled]',
  ).count();
  record(
    "Tapping an option marks the question answered",
    answeredState >= 1,
    `disabled/checked count: ${answeredState}`,
  );

  // 6b. post-answer feedback shows the rule label and an "Open the
  //     lesson section" link before the auto-advance fires (3s window).
  const feedbackText = await page.locator('[aria-live="polite"]').first().textContent({ timeout: 2000 }).catch(() => "");
  record(
    "Post-answer feedback shows rule and lesson link",
    /Rule|الحكم/.test(feedbackText ?? "") && /(Open|افتح)/.test(feedbackText ?? ""),
    `feedback text excerpt: ${(feedbackText ?? "").slice(0, 100).replace(/\s+/g, " ")}`,
  );

  // 6c. lesson page shows a "Practice this module" CTA below
  //     LessonNavigation. Use makharij (no prereq, never locked).
  await page.goto(`${BASE}/learn/makharij`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const practiceCtaCount = await page.locator(`a[href="/practice/makharij"]`).count();
  record(
    "Lesson page shows Practice this module CTA",
    practiceCtaCount >= 1,
    `cta count: ${practiceCtaCount}`,
  );

  // 7. The back-to-hub link routes to /practice. Click it and confirm the URL.
  await page.goto(`${BASE}/practice/qalqalah`, { waitUntil: "networkidle" });
  await page.click('a[href="/practice"]');
  await page.waitForURL(`${BASE}/practice`, { timeout: 5000 });
  record("Back-to-hub link routes to /practice", page.url() === `${BASE}/practice`, `url: ${page.url()}`);

  // 8. /practice/<unknown-module> returns a 404. The route uses notFound().
  const notFoundResp = await page.goto(`${BASE}/practice/does-not-exist`, { waitUntil: "networkidle" });
  record(
    "Unknown module id triggers a not-found response",
    notFoundResp?.status() === 404 || (await page.locator("body").innerText()).toLowerCase().includes("not found"),
    `status: ${notFoundResp?.status()}`,
  );

  // 9. No serious console errors.
  const seriousErrors = consoleErrors.filter((e) => {
    if (e.includes("hydration") || e.includes("Hydration") || e.includes("Text content")) return false;
    if (e.includes("Expected server HTML") || e.includes("did not match")) return false;
    if (e.includes("favicon")) return false;
    if (e.includes("404") && failed404s.every((u) => /favicon|\.ico|does-not-exist/.test(u))) return false;
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
