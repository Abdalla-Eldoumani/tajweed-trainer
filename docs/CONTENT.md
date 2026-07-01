# Content authoring guide

This guide covers adding or revising practice questions, lesson anchors, and tajweed rule data, where a modified verse is a violation, not just a bug.

## The content rule

Religious content is reviewed input the app renders, never produced or rewritten in place. The canonical rule is in [../README.md](../README.md#how-it-stays-accurate); the accuracy guarantees behind the data are in [content-audit.md](content-audit.md). Every claim in a question explanation must trace to the lesson page at `src/app/learn/<module>/page.tsx` or an entry in `src/data/content/`.

## Where the data lives

The reviewed rule files sit in `src/data/content/`; the [Files table in content-schema.md](content-schema.md#files) lists them all. Two more paths back the authoring flow: `src/data/questions/` (authored quiz questions, one TS file per module) and `src/data/verse-snapshots.json` (color-coded tajweed snapshots of the lesson verses; see [Pulling new verses](#pulling-new-verses)).

## Adding a new practice question

1. **Pick the module.** Open `src/data/questions/<module>.ts`. Each file exports a `questions: Question[]` array.

2. **Pick a verified example.** The verse fragment, gloss, and surah:ayah must come from `src/data/content/<module>.json`. For a verse not already there, add it to the rule JSON and snapshot its coloring (see "Pulling new verses"). Never hand-author Arabic.

3. **Construct the `Question` record.** The full type is in `src/lib/types.ts:Question`. Required fields:

   ```ts
   {
     id: "<module>-<difficulty>-<short-slug>",  // stable, unique across the file
     moduleId: "<module>",
     difficulty: "easy" | "medium" | "hard",
     prompt: { en: "...?", ar: "...؟" },
     arabicText: "<verse fragment>",       // matches a verified example
     englishGloss: "<one-word or short>",
     options: [
       { id: "opt-a", label: { en: "...", ar: "..." } },
       // opt-b..opt-d, same shape (four options total)
     ],
     correctOptionId: "opt-b",
     explanation: {
       en: "<one or two sentences>",
       ar: "<Arabic translation>",
       lessonAnchor: "<slug-on-the-lesson-page>",
     },
     source: {
       surah: 1, ayah: 1,
       translationEditionId: null,           // null = reused in-repo; else a numbered Quran.com edition (20 = Saheeh International)
       provenance: "src/data/content/<module>.json",
     },
   }
   ```

4. **Pick the lesson anchor.** `explanation.lessonAnchor` is a slug like `"izhar-halqi"` (no `/learn/` prefix, no `#`). The runtime composes `/learn/<moduleId>#<lessonAnchor>` for the Practice "Open the lesson section" link; it must match an `id` on the lesson page ([Adding a new lesson anchor](#adding-a-new-lesson-anchor)).

5. **Difficulty mix per module: roughly 10 easy / 12 medium / 8 hard**; the pool is 280 across nine modules. Easy = definition recall; medium = identify-the-rule from a fragment; hard = judgment calls, edge cases, or multi-step. Weight it toward easy and medium.

6. **Verify.** With the dev server running, `node scripts/verify-questions.mjs` asserts every module renders with its count, each route works, the feedback panel shows the rule name and a lesson link, and no console errors. 19/19.

## Adding a new lesson anchor

The anchor must exist on the lesson page for the URL fragment to scroll. Pattern:

```tsx
<Card id="my-new-anchor" className="scroll-mt-20">
  ...
</Card>
```

When wrapping a `RuleCard` from a `.map()`, put the `id` and `scroll-mt-20` on a wrapping `<div key={rule.id} id={rule.id}>`. `scroll-mt-20` (Tailwind `scroll-margin-top`) keeps the anchor clear of the sticky header.

## Pulling new verses

Lessons render color-coded tajweed from `src/data/verse-snapshots.json`, a snapshot of every verse a lesson example cites. `scripts/prefetch-tajweed-snapshots.mjs` pulls it once from the Quran.com Foundation API, so the build needs no live request and coloring works offline: it reads the example verse keys from `src/data/content/*.json`, fetches each surah's `text_uthmani_tajweed` (batched per chapter), and writes the file keyed by `"<surah>:<ayah>"`. It is idempotent: an unchanged example set re-writes the same bytes and keeps the existing `fetchedAt`.

The snapshot file shape is:

```jsonc
{
  "<surah>:<ayah>": {
    "arabic": "<verse text from API>",
    "tajweedHtml": "<color-coded text_uthmani_tajweed markup>",
    "fetchedAt": "2026-06-07T00:00:00.000Z",
    "source": "api.quran.com/api/v4 uthmani_tajweed"
  }
}
```

To add a verse not yet in-repo: add the example to the rule JSON with its exact `surah:ayah`, then run the prefetch script (not part of the build; the stored HTML is sanitized again at render). Religious text comes only from the authenticated API, never generated.

## Adding a new tajweed rule (rare)

The most invasive content change:

1. Add the rule entry to `src/data/content/<module>.json`; every entry needs `verified: true`.
2. New module (not just a rule in an existing file): create the JSON file, add its top-level type in `src/lib/types.ts`, and add a `learning-path.json` entry. New field on an existing shape: just update `src/lib/types.ts`.
3. Render the rule in `src/app/learn/<module>/page.tsx`; a new module needs its own route importing the JSON and rendering rule cards.
4. If the rule has a tajweed CSS class the API emits, add it to `src/lib/tajweed-colors.ts`.
5. Add any new UI strings to `src/lib/i18n.ts`; add a new module to `nav-data.tsx` for the sidebar.
6. Add at least one practice question in `src/data/questions/<module>.ts` with an `explanation.lessonAnchor` pointing at the new section.
7. Run `node scripts/verify-questions.mjs` and `node scripts/verify-mushaf.mjs`, then verify in the browser in EN and AR.

## Verification checklist before merging content

```bash
# Build (fails on type errors)
npm run build

# Pure tests (no browser)
node scripts/verify-sanitizer.mjs            # all cases pass

# Browser tests (dev server running)
node scripts/verify-mushaf.mjs               # 21/21
node scripts/verify-module-lock.mjs          # 11/11
node scripts/verify-questions.mjs            # 19/19
node scripts/verify-reciters.mjs             # 9/9
```

## Why these constraints

The reasoning (tajweed as an oral science with no chain of transmission for synthesized content) is in [content-audit.md](content-audit.md#why-these-constraints).
