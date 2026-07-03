import { test, expect, seedProgress, expectNoConsoleErrors } from "./support/fixtures";

// E2E (PROG-01 + PROG-02): the two granular-progress requirements, proven end to
// end against the real prod build.
//   - PROG-01 Test A (render at zero): the hizb coverage rings render on /progress
//     for a brand-new learner (no memorized verses) with hizb 1's ring reading 0%.
//     This is the one memorization surface that shows at zero (mounted-only gate).
//   - PROG-01 Test B (fills for a seeded scope): seeding all of Al-Fatihah (in hizb 1
//     / rub' 1) fills hizb 1's ring to a nonzero coverage, and the rub'-1 ring behind
//     the disclosure likewise reads nonzero — proving coverage is derived from the
//     memorized set over the captured hizb/rub' tables.
//   - PROG-02 Test C (revision reciter honored): with a seeded revisionReciter ("7",
//     Alafasy) distinct from the browse reciter ("12", Husary Muallim), a recall play
//     from the memorized review fires the audio request for reciter 7 — proving the
//     revision surface resolves the revision reciter, not the browse reciter.
//
// The ring coverage math (countInScope over versesForHizb / versesForRub) and the
// revisionReciter fallback (resolveRevisionReciter) are unit-tested in navigation /
// storage / revision-reciter tests; this spec proves the learner-facing behavior.
// All EN locale (the seed default), so digits are ASCII and labels match t() EN.
// Verses seeded for the recall reveal are snapshot-backed (Al-Fatihah) so the text
// resolves offline (the stub serves {} for by_chapter). Player behavior is asserted
// via the audio REQUEST, never decoded audio bytes.

// The hizb/rub' rings section on /progress (role=region, t("hizb.title") EN).
const RINGS_REGION = "Hizb & rub' coverage";

test("PROG-01: the hizb rings render at zero for a learner with nothing memorized", async ({
  page,
  context,
  consoleErrors,
}) => {
  // A fresh learner: onboarding suppressed, NO memorized verses. The rings must
  // still render (mounted-only gate) so the empty coverage is visible from day one.
  await seedProgress(context, { seenOnboarding: true });

  await page.goto("/progress");

  // The rings section is present even with nothing memorized (the one memorization
  // surface that renders at zero). Waiting for it also gates on hydration.
  const rings = page.getByRole("region", { name: RINGS_REGION });
  await expect(rings).toBeVisible();

  // Hizb 1's ring reports 0% for a learner with no memorized verses. The per-ring
  // aria-label carries the scope + percent + count; "Hizb 1:" is a unique prefix
  // (it never matches "Hizb 10:"..."Hizb 19:").
  const hizb1 = rings.locator('li[aria-label^="Hizb 1:"]');
  await expect(hizb1).toHaveAttribute("aria-label", /^Hizb 1: 0% memorized\b/);

  expectNoConsoleErrors(consoleErrors);
});

test("PROG-01: seeding all of Al-Fatihah fills the covering hizb and rub' rings", async ({
  page,
  context,
  consoleErrors,
}) => {
  // All seven verses of Al-Fatihah (which lies inside hizb 1 / rub' 1). Al-Fatihah
  // is a small fraction of hizb 1 (~148 verses) and of rub' 1, so each rounds to a
  // small POSITIVE percent — proving coverage is derived from the memorized set.
  await seedProgress(context, {
    seenOnboarding: true,
    memorizedVerses: ["1:1", "1:2", "1:3", "1:4", "1:5", "1:6", "1:7"],
  });

  await page.goto("/progress");

  const rings = page.getByRole("region", { name: RINGS_REGION });
  await expect(rings).toBeVisible();

  // Hizb 1's ring now reads a NONZERO percent (leading digit 1-9, so "0%" is ruled
  // out and a value like "10%" is not mis-read as zero).
  const hizb1 = rings.locator('li[aria-label^="Hizb 1:"]');
  await expect(hizb1).toHaveAttribute("aria-label", /^Hizb 1: [1-9]\d*% memorized\b/);

  // Reveal the finer rub' al-hizb rings (default collapsed) and confirm rub' 1 —
  // the quarter of hizb 1 that also holds Al-Fatihah — likewise reads nonzero.
  await rings.getByRole("button", { name: "Show rub' al-hizb rings" }).click();
  const rub1 = rings.locator("li[aria-label^=\"Rub' 1:\"]");
  await expect(rub1).toHaveAttribute("aria-label", /^Rub' 1: [1-9]\d*% memorized\b/);

  expectNoConsoleErrors(consoleErrors);
});

test("PROG-02: a recall play honors the seeded revision reciter, not the browse reciter", async ({
  page,
  context,
  consoleErrors,
}) => {
  // Browse reciter 12 (Husary Muallim, the default), a DISTINCT revision reciter 7
  // (Alafasy). Both are Quran.com (non-EveryAyah) reciters, so both resolve audio
  // through GET /recitations/{id}/by_ayah/{surah}:{ayah}. Three snapshot-backed
  // memorized verses (Al-Fatihah), each due immediately, so a recall session exists.
  await seedProgress(context, {
    seenOnboarding: true,
    memorizedVerses: ["1:1", "1:2", "1:3"],
    settings: { reciter: "12", revisionReciter: "7" },
  });

  // Record which reciter id each by_ayah audio request used, so we can prove the
  // recall play requested the REVISION reciter (7) and never the browse reciter (12).
  const byAyahReciters = new Set<string>();
  page.on("request", (req) => {
    const m = req.url().match(/\/recitations\/([^/]+)\/by_ayah\//);
    if (m) byAyahReciters.add(m[1]);
  });

  await page.goto("/progress");

  // Open the recall review over the memorized verses (all due immediately).
  await expect(page.getByRole("heading", { name: "Review memorized verses" })).toBeVisible();
  await page.getByRole("button", { name: "Start Review" }).click();

  const review = page.getByRole("region", { name: "Review memorized verses" });
  await expect(review).toBeVisible();

  // Play the verse under review. playCurrent resolves resolveRevisionReciter(settings)
  // = revisionReciter (7) and passes it as opts.reciter, so the one player engine
  // fetches /recitations/7/by_ayah/1:1 — regardless of the stubbed {} response.
  const audioReq = page.waitForRequest(/\/recitations\/7\/by_ayah\//);
  await review.getByRole("button", { name: "Play this verse" }).click();
  await audioReq;

  // The revision reciter (7) was requested; the browse reciter (12) never was for
  // this recall play, proving the revision surface diverges from the browse reciter.
  expect(byAyahReciters.has("7")).toBe(true);
  expect(byAyahReciters.has("12")).toBe(false);

  expectNoConsoleErrors(consoleErrors);
});
