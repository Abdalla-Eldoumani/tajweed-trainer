# Changelog

## 0.2.0 — 2026-05-02

### Added

- **Module lock** at `/learn/<module>`. Each module gates on at least one lesson complete in its prerequisite. Sidebar and mobile drawer show a lock icon next to gated module names. The lock indicator is hydration-safe via a `mounted` flag, with the existing `LearnLoading` skeleton bridging the unmount window. Walking the prerequisite chain from Makharij forward unlocks every downstream module. New: `useModuleLock(id)` hook, `LockedModuleScreen` component, `verify-module-lock.mjs` (11/11).
- **Authored question pool**: 270 questions across the nine modules, 30 per module split easy/medium/hard. Each `Question` carries a stable id, prompt, four options, correct option id, an explanation pointing at a `lessonAnchor`, and a `source` (surah:ayah plus translation provenance). Aggregator at `src/lib/question-pool.ts` prefers authored questions over the legacy random-from-examples path for any module that has authored entries. New: `src/data/questions/<module>.ts`, `verify-questions.mjs` (19/19).
- **Practice hub** at `/practice`. Replaces the old module-filter dropdown with a tile grid: nine module tiles plus a Mixed Review tile. Per-module routes at `/practice/<module>` and `/practice/mixed`. Each tile shows last quiz score and quizzes-taken count. New: `PracticeModuleCard`, `getModuleLastScore`.
- **Reciter expansion**. Settings page now shows a language-grouped `<select>` populated from `api.alquran.cloud /edition?format=audio&type=versebyverse`. The two built-in defaults (Husary, Alafasy) are always pinned at the front and rendered even when the API fails. Identifiers validated against `/^[a-z0-9._-]{1,64}$/`. List cached for 24h under `tajweed-trainer-reciters`. Persisted reciter is re-validated against the cached list with a husary fallback for unknown ids. New: `useReciters`, `fetchReciterEditions`, `validateReciterIdentifier`, `verify-reciters.mjs` (9/9).
- **Post-answer feedback** in the practice flow. After answering, the rule name, the authored explanation, and a deep link to `/learn/<moduleId>#<lessonAnchor>` show before the auto-advance fires (3s window, up from 1.5s). Lesson pages have anchor wrappers on the matching sections so the URL fragment scrolls to the relevant card.
- **Practice this module CTA** in `LessonNavigation`. Renders below the prev/next row when the module is unlocked. Hidden while locked. Linked into all nine lesson pages.
- **Sanitizer smoke test** — `verify-sanitizer.mjs` (14/14) exercises the tajweed HTML sanitizer against canonical and adversarial inputs (script tags, iframe, onclick, disallowed classes, javascript: URIs, comments, CDATA).

### Changed

- `ReciterId` type relaxed from a union literal (`"husary" | "alafasy"`) to `string` with runtime identifier validation. The two short aliases (`husary`, `alafasy`) keep working via `resolveReciterIdentifier`. `RECITERS` array kept for legacy imports; production code reads `useReciters().editions` instead.
- Quiz auto-advance bumped from 1.5s to 3s so users have time to read the post-answer feedback panel.
- `verify-questions.mjs` rewritten to assert the practice hub layout, navigate directly to per-module routes, and check the post-answer feedback panel and Practice CTA.
- `storage.sanitizeSettings` validates `reciter` against the cached editions list (`getCachedReciterEditions`) rather than a hardcoded enum.

### Documentation

- `docs/api-integrations.md` extended with the editions endpoint, identifier validation contract, and a table of every storage cap.
- `docs/architecture.md` updated to reflect the new routes, hooks, and library files.
- New: `docs/CONTENT.md` — how to add new questions, lesson anchors, and verse snapshots.
- README features list rewritten to match 0.2.0 capabilities.

### Out of scope (intentionally not added)

PWA / offline support, spaced repetition, memorization tracker, lesson sequencing within a module, accounts / cross-device sync, search, hadith content, audio for question prompts. See `.agent/HANDOFF.md` for the reasoning.

## 0.1.0

Initial release. Foundation, learning modules, practice quiz, Mushaf reader, progress tracking, bilingual UI, dark mode, ornate Islamic design system. The full pre-0.2.0 feature surface.
