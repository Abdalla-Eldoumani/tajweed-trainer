#!/usr/bin/env node
// Module-lock verification: drives Chromium against the dev server and asserts the
// module-lock enforcement works end-to-end across the gates listed in the plan.
// Mirrors the structure of verify-mushaf.mjs.

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

async function setProgress(page, modules) {
  await page.evaluate((mods) => {
    const raw = localStorage.getItem("tajweed-trainer-progress") ?? "{}";
    const progress = JSON.parse(raw);
    progress.modules = mods;
    localStorage.setItem("tajweed-trainer-progress", JSON.stringify(progress));
  }, modules);
}

async function setLanguage(page, lang) {
  await page.evaluate((l) => {
    const raw = localStorage.getItem("tajweed-trainer-progress") ?? "{}";
    const progress = JSON.parse(raw);
    progress.settings = { ...(progress.settings ?? {}), language: l };
    localStorage.setItem("tajweed-trainer-progress", JSON.stringify(progress));
  }, lang);
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

  // 1. Reset progress, confirm only Makharij is unlocked on /learn.
  // Locked ModuleCards wrap content in a div.cursor-not-allowed (line 87 of ModuleCard.tsx).
  await page.goto(`${BASE}/learn`, { waitUntil: "networkidle" });
  await setProgress(page, {});
  await page.reload({ waitUntil: "networkidle" });
  const lockedCardCount = await page.locator("div.cursor-not-allowed").count();
  record("Reset progress: 8 modules locked on /learn", lockedCardCount === 8, `count: ${lockedCardCount}`);

  // 2. Direct URL to /learn/madd renders the locked screen, not module content.
  await page.goto(`${BASE}/learn/madd`, { waitUntil: "networkidle" });
  // Locked screen has the i18n string "This module is locked. Complete a lesson..."
  const lockedBodyVisible = await page
    .locator('text=/This module is locked/i')
    .count();
  record("Direct /learn/madd renders locked screen", lockedBodyVisible >= 1, `bodyMatches: ${lockedBodyVisible}`);
  // The CTAs point at the prerequisite (qalqalah) per learning-path.json: the
  // primary at its practice quiz, the secondary at its lessons.
  const prereqQuizLink = await page.locator('a[href="/practice/qalqalah"]').count();
  record("Locked /learn/madd primary CTA points at /practice/qalqalah", prereqQuizLink >= 1, `linkCount: ${prereqQuizLink}`);
  const prereqLink = await page.locator('a[href="/learn/qalqalah"]').count();
  record("Locked /learn/madd CTA points at /learn/qalqalah", prereqLink >= 1, `linkCount: ${prereqLink}`);

  // 3. Direct URL to /learn/waqf renders locked screen pointing at tafkheem-tarqeeq.
  await page.goto(`${BASE}/learn/waqf`, { waitUntil: "networkidle" });
  const waqfPrereqLink = await page.locator('a[href="/learn/tafkheem-tarqeeq"]').count();
  record("Locked /learn/waqf CTA points at /learn/tafkheem-tarqeeq", waqfPrereqLink >= 1, `linkCount: ${waqfPrereqLink}`);

  // 4. Sidebar shows a lock indicator on locked module names. Lock indicator is a small
  // SVG with the rect+path shape; we look for any svg inside the expanded learn submenu
  // adjacent to a module link. Easier: check that the aria-label on locked links
  // includes "(Locked)" since useTranslation provides that string.
  await page.goto(`${BASE}/learn`, { waitUntil: "networkidle" });
  const lockedAriaCount = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('aside a[href^="/learn/"]'));
    return links.filter((a) => a.getAttribute("aria-label")?.includes("Locked")).length;
  });
  record("Sidebar marks 8 modules with locked aria-label", lockedAriaCount === 8, `count: ${lockedAriaCount}`);

  // 5. Regression guard for the lesson-only unlock bug: completing a Makharij
  // lesson without finishing its quiz must NOT unlock /learn/noon-sakinah.
  await setProgress(page, { makharij: { lessonsCompleted: ["makharij-main"], quizScores: [], lastAccessed: "" } });
  await page.goto(`${BASE}/learn/noon-sakinah`, { waitUntil: "networkidle" });
  const noonLockedLessonsOnly = await page.locator('text=/This module is locked/i').count();
  record("Lessons alone do not unlock /learn/noon-sakinah", noonLockedLessonsOnly >= 1, `lockedMatches: ${noonLockedLessonsOnly}`);

  // 5b. Finishing the Makharij practice quiz unlocks /learn/noon-sakinah.
  const quizDone = (score) => [{ lessonId: "quiz", score, date: "2026-01-01T00:00:00.000Z" }];
  await setProgress(page, { makharij: { lessonsCompleted: ["makharij-main"], quizScores: quizDone(80), lastAccessed: "" } });
  await page.goto(`${BASE}/learn/noon-sakinah`, { waitUntil: "networkidle" });
  const noonHasLockedBody = await page.locator('text=/This module is locked/i').count();
  record("Makharij quiz finished unlocks /learn/noon-sakinah", noonHasLockedBody === 0, `lockedMatches: ${noonHasLockedBody}`);

  // 5c. The same gate covers the practice route: /practice/noon-sakinah is
  // reachable now, while /practice/meem-sakinah (still locked) is not.
  await page.goto(`${BASE}/practice/meem-sakinah`, { waitUntil: "networkidle" });
  const meemQuizLocked = await page.locator('text=/This module is locked/i').count();
  record("/practice/meem-sakinah locked until noon-sakinah quiz done", meemQuizLocked >= 1, `lockedMatches: ${meemQuizLocked}`);

  // 6. /learn/madd still locked because qalqalah's quiz is not done.
  await page.goto(`${BASE}/learn/madd`, { waitUntil: "networkidle" });
  const maddStillLocked = await page.locator('text=/This module is locked/i').count();
  record("/learn/madd still locked (qalqalah quiz not done)", maddStillLocked >= 1, `lockedMatches: ${maddStillLocked}`);

  // 7. Walk the full chain (each prerequisite quiz finished), confirm
  // /learn/waqf renders content.
  await setProgress(page, {
    makharij: { lessonsCompleted: ["makharij-main"], quizScores: quizDone(80), lastAccessed: "" },
    "noon-sakinah": { lessonsCompleted: ["noon-sakinah-main"], quizScores: quizDone(80), lastAccessed: "" },
    "meem-sakinah": { lessonsCompleted: ["meem-sakinah-main"], quizScores: quizDone(80), lastAccessed: "" },
    ghunnah: { lessonsCompleted: ["ghunnah-main"], quizScores: quizDone(80), lastAccessed: "" },
    qalqalah: { lessonsCompleted: ["qalqalah-main"], quizScores: quizDone(80), lastAccessed: "" },
    madd: { lessonsCompleted: ["madd-main"], quizScores: quizDone(80), lastAccessed: "" },
    "laam-raa": { lessonsCompleted: ["laam-raa-main"], quizScores: quizDone(80), lastAccessed: "" },
    "tafkheem-tarqeeq": { lessonsCompleted: ["tafkheem-main"], quizScores: quizDone(80), lastAccessed: "" },
  });
  await page.goto(`${BASE}/learn/waqf`, { waitUntil: "networkidle" });
  const waqfLockedAfterChain = await page.locator('text=/This module is locked/i').count();
  record("Walking the full quiz chain unlocks /learn/waqf", waqfLockedAfterChain === 0, `lockedMatches: ${waqfLockedAfterChain}`);

  // 8. Reset progress, switch to Arabic, confirm Arabic locked screen renders with the
  // CTA still pointing at the prereq URL.
  await setProgress(page, {});
  await setLanguage(page, "ar");
  await page.goto(`${BASE}/learn/madd`, { waitUntil: "networkidle" });
  const arabicLockedBody = await page.locator('text=/هذه الوحدة مقفلة/').count();
  record("Arabic locale: /learn/madd shows Arabic locked body", arabicLockedBody >= 1, `arBody: ${arabicLockedBody}`);
  const arabicPrereqLink = await page.locator('a[href="/learn/qalqalah"]').count();
  record("Arabic locale: locked CTA still points at /learn/qalqalah", arabicPrereqLink >= 1, `linkCount: ${arabicPrereqLink}`);

  // 9. Reset language, confirm no console errors beyond the known favicon 404.
  await setLanguage(page, "en");
  const seriousErrors = consoleErrors.filter((e) => {
    if (e.includes("hydration") || e.includes("Hydration") || e.includes("Text content")) return false;
    if (e.includes("favicon")) return false;
    // The bare "404 (Not Found)" message has no URL in the text. Map it back to
    // failed404s and filter out favicon/.ico the same way verify-mushaf.mjs does.
    if (e.includes("404") && failed404s.every((u) => /favicon|\.ico/.test(u))) return false;
    return true;
  });
  record(
    "No serious console errors during module-lock flow",
    seriousErrors.length === 0,
    seriousErrors.length
      ? `${seriousErrors.length} unexpected: ${seriousErrors.slice(0, 3).join(" | ")}`
      : `404s: ${failed404s.length} (${failed404s.map((u) => u.split("/").pop()).join(",")})`,
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
