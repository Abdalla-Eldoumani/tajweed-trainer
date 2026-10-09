import { test, expect, seedProgress, expectNoConsoleErrors } from "./support/fixtures";
import wordsByChapter from "./fixtures/words-by-chapter.json";

// E2E: the segment (chunk) drill on /progress plus the WordByWord
// ripple from the end-marker filter. The unit layer proves the splitter, the
// filter, and the reveal prop; these prove the composed behavior a learner sees.
//
// The verse under test is 1:7 (Al-Fatihah): the stub serves the captured
// by_chapter words=true payload (words-by-chapter.json), whose 1:7 entry has NINE
// real words plus the trailing char_type_name:"end" ayah-number pseudo-word (٧).
// Nine real words split into three chunks at the default chunk size (4), and 1:7
// has a bundled tajweed snapshot, so the drill resolves its text offline with no
// extra fetch. Every SegmentDrill locator is scoped to its role="region" (named by
// segment.title) so the three keyboard drills' shared labels never collide.
//
// Reveal tier note: the bundled snapshots carry mid-word <tajweed> spans, so the
// drill's whitespace-derived visual-word count (19 for 1:7) does not equal the real
// word count (9); canAlign is false and the drill renders Tier 2 — the verified
// word text of the revealed window through ArabicText, isolating exactly the
// current chunk's words. So "revealed vs not-yet-revealed" is asserted by which
// words show, not by a per-word blur class (which only Tier 1 emits).

// The captured real word text for 1:7, read from the SAME fixture the stub serves
// (never hand-authored). toRealVerseWords drops the trailing "end" marker, so these
// are the nine words the drill splits and reveals.
const WORDS_1_7 = (wordsByChapter.verses.find((v) => v.verse_key === "1:7")?.words ?? [])
  .filter((w) => w.char_type_name !== "end")
  .map((w) => w.text_uthmani);
const FIRST_CHUNK_WORD = WORDS_1_7[2]; // in chunk 0 (words 0..3)
const LAST_WORD = WORDS_1_7[WORDS_1_7.length - 1]; // final word, only shown once the prefix reaches it

const REGION = "Drill a verse in chunks"; // segment.title

function readProgress(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("tajweed-trainer-progress") || "{}"),
  );
}

test("the segment drill splits a memorized verse, drills each chunk, chains them, and records one whole-verse grade", async ({
  page,
  context,
  consoleErrors,
}) => {
  // One memorized verse, so the picker defaults to it (mushaf-order first). 1:7 is
  // splittable and snapshotted.
  await seedProgress(context, { seenOnboarding: true, memorizedVerses: ["1:7"] });
  await page.goto("/progress");

  // Pre-start the drill lives in a plain card (no region yet); start it.
  const start = page.getByRole("button", { name: "Start chunk drill" });
  await expect(start).toBeVisible();
  await start.click();

  // The drill card now carries role="region"; scope every locator to it.
  const region = page.getByRole("region", { name: REGION });
  await expect(region).toBeVisible();

  // Phase A — drilling chunks: the current chunk's words show and later words do
  // not (the chunk is revealed in isolation).
  await expect(region.getByText("Drilling chunks")).toBeVisible();
  const shownInChunk0 = (await region.locator('[lang="ar"]').allInnerTexts()).join(" ");
  expect(shownInChunk0).toContain(FIRST_CHUNK_WORD); // a revealed word
  expect(shownInChunk0).not.toContain(LAST_WORD); // a not-yet-revealed word

  // Step through the three chunks: two "Next chunk"s, then "Chain the chunks".
  await region.getByRole("button", { name: "Next chunk" }).click();
  await region.getByRole("button", { name: "Next chunk" }).click();
  await region.getByRole("button", { name: "Chain the chunks" }).click();

  // Phase B — chaining: reveal the growing prefix, advance, reveal again, finish.
  await expect(region.getByText("Chaining chunks")).toBeVisible();
  await region.getByRole("button", { name: "Reveal chunk" }).click();
  await region.getByRole("button", { name: "Next chunk" }).click();
  await region.getByRole("button", { name: "Reveal chunk" }).click();
  await region.getByRole("button", { name: "Finish" }).click();

  // Phase C — the single optional whole-verse grade. Match on the leading grade
  // word so the interval-preview number never makes the selector brittle.
  await expect(region.getByText("Grade the whole verse (optional)")).toBeVisible();
  const good = region.getByRole("button", { name: /^Good\b/ });
  await expect(good).toBeVisible();
  await good.click();

  // Grading records the WHOLE verse (1:7) ONCE into the shared memorizationReviews
  // SM-2 keyspace, then returns to the picker (a single entry, never per chunk).
  await expect
    .poll(async () => Object.keys((await readProgress(page)).memorizationReviews || {}))
    .toEqual(["1:7"]);

  expectNoConsoleErrors(consoleErrors);
});

test("with misaligned segments the drill offers whole-verse play and keeps the chunks drillable", async ({
  page,
  context,
  consoleErrors,
}) => {
  // The stub's by_key segments (four) never match 1:7's nine real words, so
  // canAlign is false: per-chunk audio degrades to a plain whole-verse play with no
  // fabricated sub-verse bounds (degrade), and the text stays drillable.
  await seedProgress(context, { seenOnboarding: true, memorizedVerses: ["1:7"] });
  await page.goto("/progress");

  await page.getByRole("button", { name: "Start chunk drill" }).click();
  const region = page.getByRole("region", { name: REGION });
  await expect(region.getByText("Drilling chunks")).toBeVisible();

  // The play control targets the whole verse. Player state is asserted byte-free:
  // playVerse builds a queue and leaves "idle", so the mini-player region (aria-
  // hidden while idle, so getByRole cannot match it) becomes reachable.
  await region.getByRole("button", { name: "Play this verse" }).click();
  await expect(page.getByRole("region", { name: "Play" }).first()).toBeVisible();

  // The text is still drillable despite no aligned segments: stepping advances.
  await region.getByRole("button", { name: "Next chunk" }).click();
  await expect(region.getByRole("button", { name: "Next chunk" })).toBeVisible();

  expectNoConsoleErrors(consoleErrors);
});

test("a short verse shows the no-split note and presents the verse whole", async ({
  page,
  context,
  consoleErrors,
}) => {
  // 1:3 has two real words (<= the chunk size), so it yields a single chunk: the
  // drill skips straight to the optional grade, shows the no-split note, and
  // presents the verse whole (no-split messaging). No fabricated boundary.
  await seedProgress(context, { seenOnboarding: true, memorizedVerses: ["1:3"] });
  await page.goto("/progress");

  await page.getByRole("button", { name: "Start chunk drill" }).click();
  const region = page.getByRole("region", { name: REGION });
  await expect(region).toBeVisible();

  await expect(region.getByText("This verse is short. No split needed.")).toBeVisible();
  await expect(region.getByRole("button", { name: "Play this verse" })).toBeVisible();
  await expect(region.getByText("Grade the whole verse (optional)")).toBeVisible();

  // Skipping grading records nothing and returns to the picker.
  await region.getByRole("button", { name: "Skip grading" }).click();
  await expect(page.getByRole("button", { name: "Start chunk drill" })).toBeVisible();
  expect((await readProgress(page)).memorizationReviews ?? {}).toEqual({});

  expectNoConsoleErrors(consoleErrors);
});

test("the reading-depth word-by-word renders only real words after the ayah-end marker filter", async ({
  page,
  context,
  consoleErrors,
}) => {
  // The end-marker ripple, proven end-to-end: WordByWord maps getWordsForChapter through
  // toRealVerseWords, which drops the trailing char_type_name:"end" pseudo-word
  // (whose text is the Arabic-Indic ayah number). Open the reader, open a verse
  // overlay, expand reading depth, and assert the rendered cells are the REAL words
  // only — no digit-only marker cell.
  await seedProgress(context, { seenOnboarding: true, settings: { showWordByWord: true } });
  await page.goto("/mushaf/page/1");

  // Hydration gate: the recall toggle takes its nothing-memorized label after mount,
  // proving the verse controls' handlers are wired before we click.
  await expect(
    page.getByRole("button", { name: "Mark verses as memorized first" }),
  ).toBeVisible();

  // Open the overlay from the always-present per-verse details control (never a
  // colored letter, so it can never fire the rule popover) for verse 1:7.
  await page
    .getByRole("button", { name: "Translation, tafsir, and verse actions (1:7)" })
    .click();
  const overlay = page.getByRole("dialog").filter({
    has: page.getByRole("button", { name: "Play this verse" }),
  });
  await expect(overlay).toBeVisible();

  // Expand the reading-depth disclosure; WordByWord renders because the seed turned
  // it on.
  await overlay.getByRole("button", { name: "Translation and tafsir" }).click();
  const heading = overlay.getByRole("heading", { name: "Word by word" });
  await expect(heading).toBeVisible();

  // The word cells live in the div beside the heading. 1:7 has nine real words; a
  // tenth cell would be the leaked ayah-number marker.
  const wordByWord = heading.locator("xpath=..");
  const wordCells = wordByWord.getByRole("button");
  await expect(wordCells).toHaveCount(WORDS_1_7.length);
  expect(WORDS_1_7.length).toBe(9);

  // The filtered marker's gloss is "(7)"; it must not render as a cell, and no
  // cell's Arabic is a lone Arabic-Indic digit.
  await expect(overlay.getByRole("button", { name: "(7)" })).toHaveCount(0);
  const arabicCells = await wordByWord.locator('[lang="ar"]').allInnerTexts();
  for (const cell of arabicCells) {
    expect(cell.trim()).not.toMatch(/^[٠-٩۰-۹]+$/);
  }

  expectNoConsoleErrors(consoleErrors);
});
