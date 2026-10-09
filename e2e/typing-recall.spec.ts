import { test, expect, seedProgress, expectNoConsoleErrors } from "./support/fixtures";
import wordsByChapter from "./fixtures/words-by-chapter.json";
import { stripArabicDiacritics } from "../src/lib/word-compare";

// E2E: the typing-recall drill on /progress — the FOURTH keyboard
// drill. The unit layer (word-compare) proves the pure exact / stripped
// comparison; these prove the composed behavior a learner sees: type each word,
// grade once, a wrong input that writes nothing, and the diacritic toggle flipping
// a marks-only-different input.
//
// The verse under test is 1:2 (Al-Fatihah): the stub serves the captured
// by_chapter words=true payload (words-by-chapter.json), whose 1:2 entry has FOUR
// real words plus the trailing char_type_name:"end" ayah-number pseudo-word. 1:2
// has a bundled tajweed snapshot, so the drill resolves its text offline with no
// extra fetch. Every locator is scoped to the drill's role="region" (named by
// typing.title) so the four keyboard drills' shared labels never collide.
//
// Arabic content rule: every word literal is read FROM the same fixture the stub
// serves, or derived by the shipped stripArabicDiacritics transform — no Arabic is
// hand-authored in the spec (the wrong-input case appends one letter to a real
// word, which is never the stored word).

// The captured real word text for 1:2, read from the SAME fixture the stub serves
// (never hand-authored). The trailing "end" marker is dropped, so these are the
// four words the drill checks in order. Word 0 "ٱلْحَمْدُ" carries tashkeel and
// strips to "ٱلحمد", making it the deterministic diacritic-toggle word.
const WORDS_1_2 = (wordsByChapter.verses.find((v) => v.verse_key === "1:2")?.words ?? [])
  .filter((w) => w.char_type_name !== "end")
  .map((w) => w.text_uthmani);

const REGION = "Type the next word from memory"; // typing.title
const START = "Start typing recall"; // typing.startDrill
const INPUT_LABEL = "Type the word here"; // typing.inputLabel
const WRONG_FEEDBACK = "Not quite. Try again"; // typing.wrong
const GRADE_PROMPT = "Grade this verse (optional)"; // typing.gradePrompt

function readProgress(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("tajweed-trainer-progress") || "{}"),
  );
}

// Click the pre-start CTA (a plain card, no region yet) and return the now-live
// drill region. Waiting for the Start button is the hydration gate: the picker
// only renders its CTA once useMemorization has mounted with the seeded set.
async function startDrill(page: import("@playwright/test").Page) {
  const start = page.getByRole("button", { name: START });
  await expect(start).toBeVisible();
  await start.click();
  const region = page.getByRole("region", { name: REGION });
  await expect(region).toBeVisible();
  return region;
}

test("types the verse word by word by exact match and records one grade", async ({
  page,
  context,
  consoleErrors,
}) => {
  // Default settings → diacriticInsensitive false, so exact match is required.
  await seedProgress(context, { seenOnboarding: true, memorizedVerses: ["1:2"] });
  await page.goto("/progress");

  const region = await startDrill(page);
  const input = region.getByRole("textbox", { name: INPUT_LABEL });

  // Type each word exactly; each match advances the word-progress line and clears
  // the input. fill (not pressSequentially) is atomic — no Arabic
  // combining-order fragility.
  for (let i = 0; i < WORDS_1_2.length; i++) {
    await expect(region.getByText(`Word ${i + 1} of ${WORDS_1_2.length}`)).toBeVisible();
    await input.fill(WORDS_1_2[i]);
    await input.press("Enter");
    if (i < WORDS_1_2.length - 1) {
      await expect(region.getByText(`Word ${i + 2} of ${WORDS_1_2.length}`)).toBeVisible();
      await expect(input).toHaveValue("");
    }
  }

  // After the final word the drill moves to the single end-of-verse grade.
  await expect(region.getByText(GRADE_PROMPT)).toBeVisible();
  const good = region.getByRole("button", { name: /^Good\b/ });
  await expect(good).toBeVisible();
  await good.click();

  // One grade per verse: exactly the one verseKey lands in the shared
  // memorizationReviews SM-2 keyspace (never per word).
  await expect
    .poll(async () => Object.keys((await readProgress(page)).memorizationReviews || {}))
    .toEqual(["1:2"]);

  expectNoConsoleErrors(consoleErrors);
});

test("a wrong input does not advance and mutates no content", async ({
  page,
  context,
  consoleErrors,
}) => {
  await seedProgress(context, { seenOnboarding: true, memorizedVerses: ["1:2"] });
  await page.goto("/progress");

  const region = await startDrill(page);
  const input = region.getByRole("textbox", { name: INPUT_LABEL });

  // A real word plus one extra letter — never the stored word (no hand-authored
  // Arabic; the base is the captured fixture word).
  const wrong = WORDS_1_2[0] + "خ";
  await input.fill(wrong);
  await input.press("Enter");

  // No advance: the wrong-feedback line shows and the progress stays on word 1.
  await expect(region.getByText(WRONG_FEEDBACK)).toBeVisible();
  await expect(region.getByText(`Word 1 of ${WORDS_1_2.length}`)).toBeVisible();

  // the wrong attempt writes nothing — no review entry, and the attempt
  // never appears anywhere in the stored progress blob (the ONLY write in the
  // whole component is the eventual end-of-verse grade).
  const progress = await readProgress(page);
  expect(progress.memorizationReviews ?? {}).toEqual({});
  expect(JSON.stringify(progress)).not.toContain(wrong);

  expectNoConsoleErrors(consoleErrors);
});

test("diacritic-insensitive OFF: a marks-only-different input does not advance", async ({
  page,
  context,
  consoleErrors,
}) => {
  await seedProgress(context, {
    seenOnboarding: true,
    memorizedVerses: ["1:2"],
    settings: { diacriticInsensitive: false },
  });
  await page.goto("/progress");

  const region = await startDrill(page);
  const input = region.getByRole("textbox", { name: INPUT_LABEL });

  // The marks-stripped form of word 1, derived by the shipped transform (no Arabic
  // hand-authored). Guard that word 1 really carries marks, then confirm the toggle
  // OFF rejects a marks-only-different input.
  const stripped = stripArabicDiacritics(WORDS_1_2[0]);
  expect(stripped).not.toBe(WORDS_1_2[0]);
  await input.fill(stripped);
  await input.press("Enter");

  await expect(region.getByText(WRONG_FEEDBACK)).toBeVisible();
  await expect(region.getByText(`Word 1 of ${WORDS_1_2.length}`)).toBeVisible();

  expectNoConsoleErrors(consoleErrors);
});

test("diacritic-insensitive ON: the same marks-only-different input advances", async ({
  page,
  context,
  consoleErrors,
}) => {
  await seedProgress(context, {
    seenOnboarding: true,
    memorizedVerses: ["1:2"],
    settings: { diacriticInsensitive: true },
  });
  await page.goto("/progress");

  const region = await startDrill(page);
  const input = region.getByRole("textbox", { name: INPUT_LABEL });

  // The SAME marks-stripped input the OFF test rejected — with the toggle ON it IS
  // accepted, so the drill advances and the input clears.
  await input.fill(stripArabicDiacritics(WORDS_1_2[0]));
  await input.press("Enter");

  await expect(region.getByText(`Word 2 of ${WORDS_1_2.length}`)).toBeVisible();
  await expect(input).toHaveValue("");

  expectNoConsoleErrors(consoleErrors);
});
