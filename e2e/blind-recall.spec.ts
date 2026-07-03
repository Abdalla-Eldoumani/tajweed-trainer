import { test, expect, seedProgress, expectNoConsoleErrors } from "./support/fixtures";
import type { Locator } from "@playwright/test";

// E2E (BLIND-01/03/04): the audio-led (blind) mode, the costed per-session hint
// budget, the grade cap on a peeked verse (buttons AND keyboard AND focus), and
// the reload/finish budget lifecycle — all on the /progress memorized-verse
// review. The unit layer (07-01/07-02) proves the pure peek-budget math; these
// prove the learner-facing behavior. Audio-led mode is in-session React state
// that cannot be seeded, so each test clicks the toggle; sessionPeekUsed IS
// persisted, so it is asserted directly in localStorage (E2E-03). Every hint /
// reveal / grade label is the distinct 07-03/07-04 i18n string so the review's
// locators never collide with the chaining / segment drills on the same page.

const STORAGE_KEY = "tajweed-trainer-progress";

// The persisted progress object the app writes through its single storage funnel.
function readProgress(page: import("@playwright/test").Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), STORAGE_KEY);
}

// The verse key the review is currently showing, read byte-free from its mono
// reference span (e.g. "1:1"). Text-based, so the assertion never leaks the queue
// order and stays valid whatever verse is up.
async function currentRef(region: Locator): Promise<string> {
  return (await region.getByText(/^\d{1,3}:\d{1,3}$/).first().innerText()).trim();
}

// The in-session review card carries role="region" named by memorize.reviewStart;
// the pre-start card is a plain (roleless) card, so this name matches only the
// live review and never the chaining ("chain.title") or segment drill regions.
const REGION = "Review memorized verses";

test.beforeEach(async ({ context }) => {
  // Four memorized verses (each due immediately: no review entry) and a
  // three-hint budget. seenOnboarding suppresses the tour dialog. Seeded before
  // navigation so the pre-paint bootstrap and every hook's first read see it.
  await seedProgress(context, {
    seenOnboarding: true,
    memorizedVerses: ["1:1", "1:2", "1:3", "1:4"],
    settings: { peekBudget: 3 },
  });
});

test("BLIND-01: audio-led mode hides the verse, engages audio on Start, and Reveal shows it", async ({
  page,
  consoleErrors,
}) => {
  await page.goto("/progress");

  // Hydration gate: the Start button only renders once the memorized set has
  // loaded post-mount (dueNow > 0), so waiting for it proves the toggle + Start
  // handlers are wired before we click.
  const start = page.getByRole("button", { name: "Start Review" });
  await expect(start).toBeVisible();

  // Turn on audio-led (blind) mode, then start the session.
  await page.getByRole("checkbox", { name: "Audio-led (blind) mode" }).check();
  await start.click();

  const region = page.getByRole("region", { name: REGION });
  await expect(region).toBeVisible();

  // Hidden-until-reveal: the free Reveal is offered, the verse text is blurred,
  // and no grade button is shown yet (the blurred-until-reveal recall state).
  await expect(region.getByRole("button", { name: "Reveal" })).toBeVisible();
  await expect(region.locator(".blur-md")).toBeVisible();
  await expect(region.getByRole("button", { name: /^Good\b/ })).toHaveCount(0);

  // Audio engaged: audio-led auto-plays the verse on the Start gesture, so the
  // global mini-player transport (hidden while idle) becomes reachable — proof
  // playCurrent() ran. Player STATE, never decoded bytes.
  await expect(page.getByRole("region", { name: "Play" }).first()).toBeVisible();

  // Reveal shows the text (blur cleared) and the four SM-2 grade buttons appear.
  await region.getByRole("button", { name: "Reveal" }).click();
  await expect(region.locator(".blur-md")).toHaveCount(0);
  await expect(region.getByRole("button", { name: /^Again\b/ })).toBeVisible();
  await expect(region.getByRole("button", { name: /^Hard\b/ })).toBeVisible();
  await expect(region.getByRole("button", { name: /^Good\b/ })).toBeVisible();
  await expect(region.getByRole("button", { name: /^Easy\b/ })).toBeVisible();

  expectNoConsoleErrors(consoleErrors);
});

test("BLIND-03: each hint spends one budget unit, and the hint disables once the budget is gone", async ({
  page,
  consoleErrors,
}) => {
  await page.goto("/progress");
  const start = page.getByRole("button", { name: "Start Review" });
  await expect(start).toBeVisible();
  await start.click();

  const region = page.getByRole("region", { name: REGION });
  const hint = region.getByRole("button", { name: "Hint" });

  // Peek + grade Hard three times (a peeked verse is capped at hard). Each hint
  // adds ONE distinct verse key to sessionPeekUsed with count 1.
  for (let i = 1; i <= 3; i++) {
    const ref = await currentRef(region);
    await hint.click();
    await expect
      .poll(async () => (await readProgress(page)).sessionPeekUsed?.[ref])
      .toBe(1);
    await expect
      .poll(async () => Object.keys((await readProgress(page)).sessionPeekUsed || {}).length)
      .toBe(i);
    await region.getByRole("button", { name: /^Hard\b/ }).click();
  }

  // On the fourth verse the budget is spent: three distinct keys, hint disabled.
  await expect(hint).toBeDisabled();
  await expect
    .poll(async () => Object.keys((await readProgress(page)).sessionPeekUsed || {}).length)
    .toBe(3);

  expectNoConsoleErrors(consoleErrors);
});

test("BLIND-03: a peeked verse caps at hard on the buttons, the keyboard, and the focus target", async ({
  page,
  consoleErrors,
}) => {
  await page.goto("/progress");
  const start = page.getByRole("button", { name: "Start Review" });
  await expect(start).toBeVisible();
  await start.click();

  const region = page.getByRole("region", { name: REGION });
  const ref = await currentRef(region);

  // Peek this verse: it reveals early, spends a hint, and is capped at hard.
  await region.getByRole("button", { name: "Hint" }).click();
  await expect.poll(async () => (await readProgress(page)).sessionPeekUsed?.[ref]).toBe(1);

  // Buttons: good/easy are disabled, again/hard remain.
  const good = region.getByRole("button", { name: /^Good\b/ });
  const easy = region.getByRole("button", { name: /^Easy\b/ });
  const hard = region.getByRole("button", { name: /^Hard\b/ });
  await expect(good).toBeDisabled();
  await expect(easy).toBeDisabled();
  await expect(hard).toBeEnabled();

  // Focus: the post-reveal focus target moved onto Hard (never the disabled Good),
  // so the keyboard loop stays inside the card.
  await expect(hard).toBeFocused();

  // Keyboard: keys 3 (good) and 4 (easy) are a no-op for a peeked verse — the
  // review does NOT advance (same verse still shown, good still disabled), so a
  // keyboard user cannot bypass the visual cap.
  await page.keyboard.press("3");
  await page.keyboard.press("4");
  expect(await currentRef(region)).toBe(ref);
  await expect(good).toBeDisabled();

  // Key 2 (hard) IS allowed and advances to the next verse (Reveal returns).
  await page.keyboard.press("2");
  await expect(region.getByRole("button", { name: "Reveal" })).toBeVisible();
  expect(await currentRef(region)).not.toBe(ref);

  expectNoConsoleErrors(consoleErrors);
});

test("BLIND-04: a reload keeps the peek consumed (budget not refilled) and finishing clears it", async ({
  page,
  context,
  consoleErrors,
}) => {
  await page.goto("/progress");
  const start = page.getByRole("button", { name: "Start Review" });
  await expect(start).toBeVisible();
  await start.click();

  const region = page.getByRole("region", { name: REGION });
  const ref = await currentRef(region);

  // Spend one hint mid-session, then do NOT finish.
  await region.getByRole("button", { name: "Hint" }).click();
  await expect.poll(async () => (await readProgress(page)).sessionPeekUsed?.[ref]).toBe(1);

  // Neutralize the harness re-seed so the reload behaves like a real browser.
  // seedProgress installs a context init script that OVERWRITES localStorage on
  // EVERY navigation (it exists to set the pre-paint starting state), so a raw
  // reload would wipe the peek the app just persisted — the opposite of a real
  // reload, where localStorage survives. Snapshot the live progress and append an
  // init script restoring it; context init scripts run in add order, so this one
  // runs AFTER the seed and wins, making the reload faithfully preserve what the
  // app wrote. This tests the app's real reload behavior (does a fresh mount
  // refill the budget?), not the harness.
  const persisted = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  await context.addInitScript(
    ([key, value]) => {
      if (value !== null) window.localStorage.setItem(key, value);
    },
    [STORAGE_KEY, persisted] as const,
  );

  await page.reload();

  // The reload drops the in-session React state (back to the Start screen) ...
  await expect(page.getByRole("button", { name: "Start Review" })).toBeVisible();
  // ... but the persisted peek survives: the budget is NOT refilled.
  expect((await readProgress(page)).sessionPeekUsed?.[ref]).toBe(1);

  // Starting again honors the persisted peek: the hint reflects the consumed
  // budget (one of three spent) and the peeked verse is still capped at hard.
  await page.getByRole("button", { name: "Start Review" }).click();
  await expect(region).toBeVisible();
  await expect(region.getByRole("button", { name: "Hint" })).toContainText("2");

  // Reveal the (peeked) first verse and confirm the cap held across the reload.
  await region.getByRole("button", { name: "Reveal" }).click();
  await expect(region.getByRole("button", { name: /^Good\b/ })).toBeDisabled();

  // Finish the session: grade the peeked first verse at hard, then reveal + grade
  // the remaining three. On the finished transition the peek map resets to {}
  // (the ONLY reset — never on a reload or a start).
  await region.getByRole("button", { name: /^Hard\b/ }).click();
  for (let i = 0; i < 3; i++) {
    await region.getByRole("button", { name: "Reveal" }).click();
    await region.getByRole("button", { name: /^Good\b/ }).click();
  }

  await expect(page.getByRole("button", { name: "Try Again" })).toBeVisible();
  await expect.poll(async () => (await readProgress(page)).sessionPeekUsed).toEqual({});

  expectNoConsoleErrors(consoleErrors);
});
