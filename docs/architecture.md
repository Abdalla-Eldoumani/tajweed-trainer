# Architecture

How the app is wired together, top-down.

## High-level

```
+-----------------------------------------------------------+
|                        Browser                            |
|  Next.js App Router (server + client components)          |
|                                                           |
|  AppProvider = SettingsProvider + PWARegister             |
|              + RouteAnalytics + SettingsSync              |
|  Hooks over localStorage (SSR-safe): useSettings,         |
|    useProgress, useReviews, useMemorization,              |
|    useReadSections, useAnalytics; plus useSpeech          |
|    (Web Speech), useModuleLock, useTranslation            |
|                                                           |
|  Audio: one reused <audio> via usePlayer (zustand)        |
|         + PlayerHost; MiniPlayer carries transport        |
+-----------------------------------------------------------+
                          |
        +-----------------+-----------------+
        v                 v                 v
  Quran.com          Audio CDN         Bundled JSON
  Foundation v4      (from API):       (reviewed):
  /chapters,         verses.quran.com, rule files,
  /verses/by_page,   *.quranicaudio    surah-index,
  /recitations/                        learning-path
    {id}/by_ayah
```

Routes: `/`, `/learn`, `/learn/[module]`, `/mushaf`, `/mushaf/page/[page]`, `/mushaf/surah/[surah]`, `/mushaf/bookmarks`, `/practice`, `/practice/[module]`, `/practice/mixed`, `/practice/review`, `/search`, `/progress`, `/settings`, `/manifest.webmanifest`.

## Platform and build

- **Framework:** Next.js 16.2.9 on React 19.2.7 (`react-dom` 19.2.7). Turbopack builds; `turbopack.root` in `next.config.mjs` pins the workspace root.
- **TypeScript** strict, `@types/react` ^19. **Tailwind** stays at 3.4.19 on purpose (v4 deferred). Node 24.
- **ESLint 9, flat config:** `eslint.config.mjs` spreads `eslint-config-next/core-web-vitals`. The lint script is `eslint .`, not the deprecated `next lint`. Scripts are listed in [development.md](development.md#scripts).
- **Next 15+ async APIs:** dynamic route `params` is a Promise (see routes below); `export const revalidate` uses a literal seconds value (e.g. `86400`, `604800`).
- **Fonts:** self-hosted via `next/font` (Inter, Spectral, JetBrains Mono, Amiri, Amiri Quran); no Google Fonts `<link>`. Tailwind `fontFamily` tokens map to the `next/font` variables.
- **Headers / CSP:** all response headers and the CSP are assembled once in `next.config.mjs` (`headers()` applies them to every path); see [security.md](security.md#content-security-policy) for the directive table and origins.
- Project version is **2.0.0**.

## Layers

### `src/lib/`: pure logic, no React

- **types.ts**: every app type; optional `_ar` content fields are additive. Includes `ReviewBox`, `ReviewState`, `AnalyticsEvent`, `AnalyticsEventType`.
- **quran-api.ts**: wraps Quran.com v4. `getTajweedSurah(n)`, `getTajweedPage(n)`, `getChaptersIndex()` (bundled fallback), `getStartPageForSurah(n)`, all backed by `fetchWithCache` + `fetchWithRetry` (TTLs and retry policy in [api-integrations.md](api-integrations.md#caching)).
- **audio-api.ts**: wraps Quran.com per-ayah audio and builds deterministic EveryAyah URLs for `ea-*` reciters. `fetchAudioUrl(surah, ayah, reciter)` (1-hour cache); `toSafeAudioUrl` normalizes to an https URL on an allowlisted host. Catalogue is static in `reciters.ts` (`RECITATIONS`, 42 Hafs: 12 Quran.com + 30 EveryAyah; `DEFAULT_RECITER_ID` is Al-Husary muallim). `normalizeReciterId()` migrates legacy alquran.cloud ids.
- **tajweed-colors.ts**: CSS-class to hex map for every tajweed rule the API emits, with dark-mode variants. Used by `TajweedText` and `ColorLegend`.
- **storage.ts**: SSR-safe localStorage wrapper and the only write funnel; reads run `sanitizeProgress`, writes emit through `progress-events.ts`. `getSettings`, `setSettings`, `getProgress`, `setProgress`. Beyond the core lesson/quiz/settings state, `TajweedProgress` carries the memorization, review, notes, bookmark, resume, khatmah, onboarding, and analytics fields, each sanitized and capped ([api-integrations.md](api-integrations.md#storage-caps-and-validation-contract) holds the full field list and caps). Keyed maps reject `__proto__`, `constructor`, `prototype`. Helpers: `getReviews/setReview`, `toggleMemorizedVerse/setMemorizedVerses`, `getReadSections/markSectionRead`, `getVerseNote/setVerseNote`, `getLastRead/getLastReadForSurah/setLastRead`, `getKhatmah/setKhatmah/clearKhatmah`, `getOnboardingSeen/setOnboardingSeen`, `getAnalytics/recordAnalyticsEvent`, `exportProgress/importProgress`, `getLastBackupAt/shouldRemindBackup`.
- **i18n.ts**: flat `key -> { en, ar }` dictionary, `t(key, lang)`, and `useTranslation()` -> `{ t, lang, isAr, dir }`.
- **utils.ts**: `cn()`, `formatSurahReference(name | { en, ar }, surah, ayah, locale)`, `toArabicIndic(n)`.
- **question-pool.ts**: flattens rule-file examples into a pool, builds `RULE_AR_MAP`, exposes `getRandomQuestions` with parallel `options` / `optionsAr`. Authored `src/data/questions/<module>.ts` take precedence. `getModuleLastScore(progress, moduleId)` and `getDueQuestions(dueIds, count)` feed the hub and review route.
- **spaced-repetition.ts**: pure Leitner. `LEITNER_INTERVALS` (1/3/7/14/30 days); `nextStateForAnswer(prev, correct)` promotes one box (clamp `MASTERY_BOX = 5`) or resets to 1; `recordReview(questionId, correct)` writes through; `getDueQuestionIds` and `getReviewStats` are read-only.
- **search.ts**: builds and caches the global search index (surahs, modules, rules with subtypes, tafkheem subsections, makharij regions, waqf symbols). `search(query, limit)` tokenized substring match with score ranking; minimum length 2.
- **khatmah.ts**: pure pace math. `computeKhatmahPace(plan, currentPage, today)` (clamped snapshot) and `targetDateForDuration(startDate, days)`. Linear by mushaf page, no React/storage/next.
- **tajweed-rule-links.ts**: structural navigation only; maps each tajweed API CSS class to its lesson route for the popover "Learn more". No rule content; classes with no owning module are absent.
- **reduced-motion.ts**: `prefersReducedMotion()`, an SSR-safe read gating JS-driven `scrollIntoView` that CSS cannot cover.
- **scroll-lock.ts**: ref-counted body-scroll lock (`lockBodyScroll` / `unlockBodyScroll`) shared by stacked overlays.
- **player-engine.ts**: pure playback-queue and advance arithmetic behind `usePlayer` (next/prev index, range and set queues, repeat/loop/gap). No React or `<audio>`.
- **player-position.ts**: mini-player clamp math and overlay offsets (`sheetBottomOffset`, `keyboardBottomOffset`), plus `READER_PANEL_BREAKPOINT` (1024) read by `useIsDesktop`.
- **follow-along.ts**: pure helpers mapping playback time to the active word index from per-reciter timestamps, with `rangeBounds` resolving a word range to a millisecond span.
- **motion.ts**: `withViewTransition()`, a feature-detected, reduced-motion-gated wrapper over the View Transitions API. No animation library.
- **memorization-scope.ts**: pure verse-scope enumeration and breakdown math (per-surah, per-juz, against 6,236).
- **memorization-review.ts**: the forgetting-curve schedule for memorized verses, separate from the quiz Leitner boxes.
- **weak-rules.ts**: aggregates quiz history into the most-missed rule areas. Read-only.
- **certificate.ts**: pure data for the on-device milestone certificate; the canvas render is a lazy component.

### `src/data/content/`: the source of truth

JSON files. Each entry that ships to the UI carries `verified: true`. The schema is documented in [content-schema.md](content-schema.md).

### `src/components/`

- **ui/**: primitives (`Card`, `Button`, `Badge`, `ProgressBar`), Arabic-aware text (`ArabicText`, `TajweedText`), `AudioPlayer`, `Ornament`, framing (`QuranFrame`, `SectionBanner`), `LanguageToggle`, and `TajweedRulePopover` (the tapped-letter rule popover).
- **layout/**: `Sidebar` (desktop), `Header` and `MobileDrawer` (mobile), `AppProvider` (sets `<html dir lang>`, mounts `PWARegister` and `RouteAnalytics`), and `nav-data` (single source for nav items and icons, including `SearchIcon`).
- **learn/**: `ModuleCard`, `RuleCard`, `ExampleCard`, `LetterGrid`, `LetterCard`, `MakhrajDiagram`, `ColorLegend`, `LessonNavigation`, `LessonProgress` (the section-progress chip wired to `useReadSections`).
- **practice/**: `PracticeQuestion` (feedback plus an optional Web-Speech TTS button), `QuizSession` (`mode: "random" | "review"`, instruments analytics), `StreakCounter`, `PracticeModuleCard` (the `/practice` tiles, including the conditional Review Due tile).
- **mushaf/**: the 604-page reader. `MushafFrame`, `SurahCartouche`, `BismillahLine` (the standalone Bismillah, suppressed for surah 1 Al-Fatihah and surah 9 At-Tawbah), `MushafPage`, `MushafReader` (toolbar, keyboard nav, and the one `VerseOverlay` inside `VerseSelectionProvider`), `VerseOverlay` (the single per-verse action hub; heavy surfaces lazy-load with `next/dynamic`), `ReaderPalette`, `VerseNotes`, `ReciterCompare`, `RecitationCompare`, `MushafBookmarks`, and `MushafIndex`. Each is documented in [mushaf-reader.md](mushaf-reader.md).
- **khatmah/**: `KhatmahCard`, the completion planner on `/progress`.

### `src/app/`: routes

Next.js App Router (Next 16). Most pages are server components that hydrate into client components. `params` is a Promise: server routes `await` it; the client `practice/[module]` route uses React `use()`. The Mushaf page uses `generateStaticParams` + ISR (see [mushaf-reader.md](mushaf-reader.md#routes)). `error.tsx` and `global-error.tsx` are the error boundaries; `loading.tsx` files give the learn, practice, progress, settings, and Mushaf routes skeletons.

### `scripts/`

- **fetch-surah-names.mjs**: one-shot dev script. Pulls `/chapters`, writes `src/data/content/surah-index.json` (114 entries: `name_arabic`, `pages`, `bismillah_pre`, `revelation_place`), and patches `surah_name_ar` into every example. Re-run when an example references a new surah; not a build step.
- **verify-mushaf.mjs**: drives a real Chromium against `npm run dev` for 21 assertions on the Mushaf flow. See [development.md](development.md).
- **verify-newfeatures.mjs**: smoke-tests spaced repetition, memorization tracker / mode, global search, the TTS button, and the PWA endpoint against `npm run dev`.

## Data flow

### Reading a lesson

`src/app/learn/[module]/page.tsx` is a client component that imports the rule JSON directly. `useTranslation()` picks the locale; `RuleCard`, `ExampleCard`, and friends read `_ar` or English by `isAr`. `TajweedText` renders tajweed markup, else `ArabicText` renders plain Arabic in `Amiri Quran`.

### Reading the Mushaf

`src/app/mushaf/page/[page]/page.tsx` (server) calls `getTajweedPage(parseInt(params.page))` and `getChaptersIndex()` (bundled fallback), `await`s `params`, and passes the data to the client `MushafReader`. Playback runs from the overlay or the toolbar "Play surah" through `usePlayer` (zustand) -> `fetchAudioUrl` -> the Quran.com audio CDN, auto-advancing ayah to ayah; `MiniPlayer` toggles single <-> full-surah mode. The reader UX (the `VerseOverlay` hub, multi-verse selection, the in-reader index, and the `ReaderPalette`) is owned by [mushaf-reader.md](mushaf-reader.md).

### Study tools (popover, notes, bookmarks, compare)

`TajweedText`'s opt-in `explainRules` opens `TajweedRulePopover`, whose "Learn more" link resolves via `getLessonLinkForClass` in `tajweed-rule-links.ts` (no rule text). The overlay renders `VerseNotes` (with a `TagEditor`) through the funnel (`getVerseNote` / `setVerseNote`, `entryTags`): local-only, capped, never transmitted, never religious content. `/mushaf/bookmarks` renders `MushafBookmarks`; the index resume pills read `lastReadBySurah`. `ReciterCompare` and `RecitationCompare` run on the one `usePlayer` engine with no second `<audio>`. See [mushaf-reader.md](mushaf-reader.md) for all four.

### Feature wiring

- **Practice / review:** `QuizSession` calls `recordReview(questionId, correct)` via `useReviews()` (delegating to `nextStateForAnswer` in `spaced-repetition.ts`, writing through `setReview`); `/practice` reads `useReviews().stats()` for the Review Due tile (when `due > 0`), and `/practice/review` runs `getDueQuestions(useReviews().dueIds(), 10)` through `<QuizSession mode="review"/>`.
- **Memorization:** `useMemorization().toggle(verseKey)` -> `toggleMemorizedVerse(verseKey)`; the hook mirrors a local `Set<string>` for O(1) re-renders, and the toolbar eye flips an in-session `memorizationMode` (blur behind a Reveal pill).
- **Lesson progress:** `LessonProgress` watches the page's sections with an `IntersectionObserver` (40% visibility) and calls `markSectionRead(moduleId, slug)`, showing `readCount` and a next-unread anchor, auto-hiding when all are read.
- **Khatmah:** `KhatmahCard` on `/progress` reads `getKhatmah` and `lastRead.page`, calls `computeKhatmahPace` in `khatmah.ts`, and writes `setKhatmah` (which re-sanitizes).

### Anonymous local analytics

`RouteAnalytics` reads `usePathname()` and calls `recordAnalyticsEvent("route.view", pathname)` per navigation; `QuizSession` records `quiz.start` / `review.start` and `quiz.finish` (`${moduleKey}:${percentage}`). `/progress` reads via `useAnalytics()` for an Insights card. **Nothing is transmitted off-device.**

### Backup and restore

`exportProgress()` returns `JSON.stringify(getProgress(), null, 2)`; Settings wraps it in a `Blob` and downloads it as `tajweed-trainer-backup-YYYY-MM-DD.json`. `importProgress(payload)` runs the full `sanitizeProgress` validator before writing; invalid input returns `false` with a localized error. A successful import reloads after 600 ms so hooks re-read.

### PWA

`app/manifest.ts` serves `/manifest.webmanifest`; `app/layout.tsx` sets `themeColor`, `appleWebApp`, `icons`. `<PWARegister/>` registers `/sw.js` after `load` in production (dev skips). `/sw.js` is served by `src/app/sw.js/route.ts` (`dynamic = "force-static"`), stamping a per-build `BUILD_VERSION` into `scripts/sw-template.js` for fresh caches per deploy. See [security.md](security.md#pwa-service-worker) for the worker's same-origin scope and why cross-origin audio and the API are never intercepted.

### Settings sync

`SettingsProvider` reads localStorage on mount (after hydration). `SettingsSync` (in `AppProvider.tsx`) mirrors `settings.language` to `document.documentElement.lang` / `dir` and `settings.theme` to `data-theme` on `<html>` (one of five themes). A pre-paint inline script in `layout.tsx` sets theme/dir/lang before first paint (no flash); the sync applies later changes, and a theme change crossfades through the View Transitions API. Components read via `useSettings()`; `updateSettings(partial)` writes to state and localStorage.

## Invariants

- `<TajweedText>` is the only place that renders the API's tajweed HTML. The markup is API-controlled; never mix it with user input.
- `<ArabicText>` is the only place that renders non-Quranic Arabic. It enforces `dir="rtl"`, `lang="ar"`, and the right font.
- `useTranslation()` is the only source of locale. Do not read `settings.language` directly in components; that bypasses the SSR-safe wrapper and causes hydration mismatches.
- JSON in `src/data/content/` is the source of truth. Components never hardcode rule names, letter lists, or examples.
