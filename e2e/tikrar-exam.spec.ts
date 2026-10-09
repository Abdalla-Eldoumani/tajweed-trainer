import { test, expect, seedProgress, expectNoConsoleErrors } from "./support/fixtures";
import type { BrowserContext, Locator, Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// E2E: the three memorization surfaces on /progress,
// proven end to end against the real prod build.
//   - (Test A) the tikrar rep counter: a session's reps ADD to a seeded
//     prior-day total (across-days) and the cumulative total PERSISTS across a
//     reload — proving reps accumulate on the verse's running total, not reset.
//   - (Test B) the timed no-peek exam over a chosen scope: the verse text
//     is HIDDEN until the learner self-marks (no-peek), and a KNOWN mix (2 of 3
//     recalled) logs the EXACT computed percent (67%), shown in the summary and
//     the recent-attempts list, and persisted in examLog across a reload.
//   - (Test C) the session journal: setting goals then doing a memorize
//     (bulk-mark) and a recall grade climbs the memorized/revised tallies LIVE,
//     and the journal rides the exported backup (present in localStorage and in
//     the actual Settings Export download JSON).
//
// The storage math (logTikrarReps cumulative, logExamResult cap/percent,
// sanitizeSessionJournal + the memorize-add / revise tallies + export round-trip)
// is unit-tested in storage.test.ts; this spec proves the learner-facing behavior
// and that the recordReview -> recordJournalRevision fan-out shows up in the
// journal. Every date is computed INSIDE the browser via toLocaleDateString(
// "en-CA") so a seed lines up with the app's own local-day boundary (mirrors
// memorization-strength.spec / murajaah-dashboard.spec). Verses seeded for the
// tikrar drill and the exam reveal are chosen from the bundled snapshot set so
// they resolve their tajweed text offline (the stub serves {} for by_chapter).

const STORAGE_KEY = "tajweed-trainer-progress";

// The persisted progress object the app writes through its single storage funnel.
function readProgress(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), STORAGE_KEY);
}

// Today's local day key, computed the same way the app does (en-CA), so a
// storage read lines up with the day the app stamped.
function today(page: Page): Promise<string> {
  return page.evaluate(() => new Date().toLocaleDateString("en-CA"));
}

// Neutralize the harness re-seed for a reload/navigation so the page behaves like
// a real browser: seedProgress installs a context init script that OVERWRITES
// localStorage on EVERY navigation (to set the pre-paint starting state), so a
// raw reload/goto would wipe what the app just persisted. Snapshot the live
// progress and append an init script restoring it; context init scripts run in
// add order, so this one runs AFTER the seed and wins — the reload then
// faithfully preserves the app's writes. (The spec uses this idiom.)
async function preserveAcrossNavigation(page: Page, context: BrowserContext): Promise<void> {
  const persisted = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  await context.addInitScript(
    ([key, value]) => {
      if (value !== null) window.localStorage.setItem(key, value);
    },
    [STORAGE_KEY, persisted] as const,
  );
}

// The tikrar running total, read from the "Total for this verse: N" line (EN
// locale renders ASCII digits) so the assertion never depends on the audio path.
async function runningTotal(region: Locator): Promise<number> {
  const txt = await region.getByText(/Total for this verse:/).innerText();
  const m = txt.match(/(\d+)/);
  return m ? Number(m[1]) : NaN;
}

test("a tikrar session's reps add to a seeded prior-day total and persist across a reload", async ({
  page,
  context,
  consoleErrors,
}) => {
  // Three memorized verses (all bundled-snapshot-backed so the drill resolves
  // offline), and a SECOND init script seeding a prior-day tikrarLog for 2:3
  // (7 reps counted YESTERDAY) so the running total starts from a real earlier
  // day and the session must ADD to it, not replace it (across-days).
  await seedProgress(context, { seenOnboarding: true, memorizedVerses: ["2:3", "2:4", "2:5"] });
  await context.addInitScript(() => {
    const KEY = "tajweed-trainer-progress";
    const iso = (d: Date) => d.toLocaleDateString("en-CA");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const base = JSON.parse(window.localStorage.getItem(KEY) || "{}");
    base.tikrarLog = { "2:3": { reps: 7, lastRepDate: iso(yesterday) } };
    window.localStorage.setItem(KEY, JSON.stringify(base));
  });

  await page.goto("/progress");

  // Hydration gate: the picker heading only renders once the memorized set has
  // loaded post-mount, so waiting for it proves the drill's handlers are wired.
  await expect(page.getByRole("heading", { name: "Repeat a verse" })).toBeVisible();

  // Pick the verse that carries the prior-day count, then drop the session target
  // to 1. At target 1 the loop never repeats (setRepeatOne(1) plays once and
  // stops), so the audio path adds NOTHING to the counter — every rep here comes
  // from a deterministic manual tap, and the finish total is race-free.
  await page.getByLabel("Pick a verse to repeat").selectOption("2:3");
  const fewer = page.getByRole("button", { name: "Fewer repetitions" });
  for (let i = 0; i < 4; i++) await fewer.click(); // 5 -> 1
  await page.getByRole("button", { name: "Start repeating" }).click();

  const region = page.getByRole("region", { name: "Repeat a verse" });
  await expect(region).toBeVisible();

  // Count three reps by hand. The running total = the committed prior (7) + this
  // session's reps, so it must read at least 7 + 3 = 10 — proving the session
  // ADDS onto the seeded prior day rather than resetting to this session's count.
  const countRep = region.getByRole("button", { name: "Count a repetition" });
  for (let i = 0; i < 3; i++) await countRep.click();
  const total = await runningTotal(region);
  expect(total).toBeGreaterThanOrEqual(10);

  // Finish: the session's reps are logged into the cumulative total. The persisted
  // total equals exactly what the running line showed (7 + session), and it is
  // stamped with today's date (the across-days advance).
  await region.getByRole("button", { name: "Finish session" }).click();
  const day = await today(page);
  await expect
    .poll(async () => (await readProgress(page)).tikrarLog?.["2:3"]?.reps)
    .toBe(total);
  expect((await readProgress(page)).tikrarLog?.["2:3"]?.lastRepDate).toBe(day);

  // Reload as a real browser would (preserve what the app wrote), and confirm the
  // cumulative total PERSISTED — both across days (>= prior 7) and across reload.
  await preserveAcrossNavigation(page, context);
  await page.reload();
  expect((await readProgress(page)).tikrarLog?.["2:3"]?.reps).toBe(total);

  // Reopen the drill and confirm the UI surfaces the persisted total (>= it; the
  // fresh session's default target rearms audio, which can only add on top).
  await expect(page.getByRole("heading", { name: "Repeat a verse" })).toBeVisible();
  await page.getByLabel("Pick a verse to repeat").selectOption("2:3");
  await page.getByRole("button", { name: "Start repeating" }).click();
  const reopened = page.getByRole("region", { name: "Repeat a verse" });
  await expect(reopened).toBeVisible();
  expect(await runningTotal(reopened)).toBeGreaterThanOrEqual(total);

  expectNoConsoleErrors(consoleErrors);
});

test("a timed no-peek exam hides the verse until self-marked and logs the exact percent", async ({
  page,
  context,
  consoleErrors,
}) => {
  // Exactly three memorized verses in one surah (Al-Fatihah, all snapshot-backed),
  // so the surah scope holds exactly 3 and a 2-of-3 mix computes a clean 67%.
  await seedProgress(context, { seenOnboarding: true, memorizedVerses: ["1:1", "1:2", "1:3"] });

  await page.goto("/progress");

  // Hydration gate on the exam picker, then pick the surah scope covering the
  // seeded verses and confirm the in-scope count is the 3 we seeded.
  await expect(page.getByRole("heading", { name: "Timed recall exam" })).toBeVisible();
  await page.getByLabel("Choose a surah").selectOption("1");
  await expect(page.getByText("3 memorized verses in this scope")).toBeVisible();
  await page.getByRole("button", { name: "Start the exam" }).click();

  const region = page.getByRole("region", { name: "Timed recall exam" });
  await expect(region).toBeVisible();

  // NO-PEEK: before any self-mark the verse cannot even be revealed — only the
  // mark buttons are offered, so the text stays hidden until the learner commits.
  await expect(region.getByRole("button", { name: "Reveal the verse" })).toHaveCount(0);
  await expect(region.getByRole("button", { name: "I recalled it" })).toBeVisible();
  await expect(region.getByRole("button", { name: "I missed it" })).toBeVisible();

  // Verse 1: recalled. Revealing is possible ONLY after the mark (no-peek gate),
  // and revealing replaces the button with the verse text.
  await region.getByRole("button", { name: "I recalled it" }).click();
  await expect(region.getByRole("button", { name: "Reveal the verse" })).toBeVisible();
  await region.getByRole("button", { name: "Reveal the verse" }).click();
  await expect(region.getByRole("button", { name: "Reveal the verse" })).toHaveCount(0);
  await region.getByRole("button", { name: "Next" }).click();

  // Verse 2: recalled. Verse 3: missed. Result: 2 of 3 recalled.
  await region.getByRole("button", { name: "I recalled it" }).click();
  await region.getByRole("button", { name: "Next" }).click();
  await region.getByRole("button", { name: "I missed it" }).click();
  await region.getByRole("button", { name: "Next" }).click();

  // Summary: the EXACT computed percent (round(2/3*100) = 67) is shown, and the
  // attempt is listed in the recent-attempts list with its scope and percent.
  await expect(region.getByText("You recalled 67%")).toBeVisible();
  await expect(region.getByRole("heading", { name: "Recent attempts" })).toBeVisible();
  const attempt = region.getByRole("listitem").filter({ hasText: "67%" });
  await expect(attempt).toBeVisible();
  await expect(attempt).toContainText("Al-Fatihah");

  // The attempt was logged to examLog with the exact percent and total (3),
  // and it persists across a reload.
  const log = (await readProgress(page)).examLog;
  expect(log?.[0]?.percent).toBe(67);
  expect(log?.[0]?.total).toBe(3);
  expect(log?.[0]?.scope).toBe("Al-Fatihah");

  await preserveAcrossNavigation(page, context);
  await page.reload();
  expect((await readProgress(page)).examLog?.[0]?.percent).toBe(67);

  expectNoConsoleErrors(consoleErrors);
});

test("the journal shows today's goals and tallies and rides the exported backup", async ({
  page,
  context,
  consoleErrors,
}) => {
  // Three memorized verses (snapshot-backed so the recall drill can reveal them);
  // each is due immediately (no review entry) so a recall session is available.
  await seedProgress(context, { seenOnboarding: true, memorizedVerses: ["1:1", "1:2", "1:3"] });

  await page.goto("/progress");

  // Set today's goals; the journal then shows a summary that starts at 0 for both
  // tallies against the goals just saved.
  const journal = page.getByRole("region", { name: "Session journal" });
  await expect(journal).toBeVisible();
  await journal.getByLabel("Memorize goal").fill("5");
  await journal.getByLabel("Revise goal").fill("3");
  await journal.getByRole("button", { name: "Save goals" }).click();
  await expect(journal.getByText("Today: 0/5 memorized, 0/3 revised")).toBeVisible();

  // Memorize new verses via the bulk surface (a whole new surah). The storage
  // memorize-ADD path bumps today's `memorized` tally by the net-added delta, so
  // the journal's memorized count climbs LIVE through the change bus.
  await page.getByRole("button", { name: "Add memorized verses" }).click();
  await page.getByLabel("Whole surah").selectOption("112"); // Al-Ikhlas, 4 new verses
  await page.getByRole("button", { name: "Mark 4 verses" }).click();
  await expect(journal.getByText("Today: 4/5 memorized, 0/3 revised")).toBeVisible();

  // Run one recall grade. recordReview fans out to recordJournalRevision,
  // so the journal's revised tally climbs by one — the silent side effect made
  // visible.
  await page.getByRole("button", { name: "Start Review" }).click();
  const review = page.getByRole("region", { name: "Review memorized verses" });
  await expect(review).toBeVisible();
  await review.getByRole("button", { name: "Reveal" }).click();
  await review.getByRole("button", { name: /^Good\b/ }).click();
  await expect(journal.getByText("Today: 4/5 memorized, 1/3 revised")).toBeVisible();

  // The journal lives on TajweedProgress, so it is present in the persisted store
  // with the goals and tallies exactly as shown.
  const day = await today(page);
  const entry = (await readProgress(page)).sessionJournal?.[day];
  expect(entry).toEqual({ memorizeGoal: 5, reviseGoal: 3, memorized: 4, revised: 1 });

  // "Rides the backup": trigger the real Settings Export download and confirm the
  // journal is in the produced JSON with the same values (no separate export path
  // — it flows through exportProgress because it is a TajweedProgress field).
  await preserveAcrossNavigation(page, context);
  await page.goto("/settings");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export backup" }).click(),
  ]);
  const backup = JSON.parse(readFileSync(await download.path(), "utf-8"));
  expect(backup.sessionJournal?.[day]).toEqual({
    memorizeGoal: 5,
    reviseGoal: 3,
    memorized: 4,
    revised: 1,
  });

  expectNoConsoleErrors(consoleErrors);
});
