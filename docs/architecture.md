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
- **ESLint 9, flat config:** `eslint.config.mjs` spreads `eslint-config-next/core-web-vitals`. The lint script is `eslint .`, not the deprecated `next lint`. `package.json` scripts: `dev` / `build` / `start` / `lint` / `verify` / `verify:scripts` / `verify:ui`.
- **Next 15+ async APIs:** dynamic route `params` is a Promise (see routes below); `export const revalidate` uses a literal seconds value (e.g. `86400`, `604800`).
- **Fonts:** self-hosted via `next/font` (Inter, Spectral, JetBrains Mono, Amiri, Amiri Quran); no Google Fonts `<link>`. Tailwind `fontFamily` tokens reference the `next/font` variables (`var(--font-quran)`, `var(--font-amiri)`).
- **Headers / CSP:** all response headers and the CSP are assembled once in `next.config.mjs` (`headers()` applies them to every path); `vercel.json` carries only `framework` + `buildCommand`. See [security.md](security.md#content-security-policy) for the directive table and origins.
- Project version is **2.0.0**.

## Layers

### `src/lib/`: pure logic, no React

- **types.ts**: every app type; optional `_ar` content fields are additive. Includes `ReviewBox`, `ReviewState`, `AnalyticsEvent`, `AnalyticsEventType`.
- **quran-api.ts**: wraps Quran.com v4. `getTajweedSurah(n)`, `getTajweedPage(n)`, `getChaptersIndex()` (bundled fallback), `getStartPageForSurah(n)`. Memory cache (15 min, 7 days for chapters), exponential backoff; 4xx fails fast, 5xx and network errors retry.
- **audio-api.ts**: wraps Quran.com per-ayah audio (`/recitations/{id}/by_ayah/{surah}:{ayah}`) and builds deterministic EveryAyah URLs for `ea-*` reciters. `fetchAudioUrl(surah, ayah, reciter)` (1-hour cache); `toSafeAudioUrl` normalizes to an https URL on an allowlisted host. Catalogue is static in `reciters.ts` (`RECITATIONS`, 42 Hafs: 12 Quran.com + 30 EveryAyah; `DEFAULT_RECITER_ID` is Al-Husary muallim). `normalizeReciterId()` migrates legacy alquran.cloud ids (`husary`, `ar.husary`, `alafasy`, `ar.alafasy`).
- **tajweed-colors.ts**: CSS-class to hex map for every tajweed rule the API emits, with dark-mode variants. Used by `TajweedText` and `ColorLegend`.
- **storage.ts**: SSR-safe localStorage wrapper and the only write funnel; reads run `sanitizeProgress`, writes emit through `progress-events.ts`. `getSettings`, `setSettings`, `getProgress`, `setProgress`. `TajweedProgress` carries `reviews`, `memorizedVerses`, `memorizationReviews`, `readSections`, `verseNotes`, `analytics`, `bookmarks`, `lastRead`, `lastReadBySurah`, `khatmah`, `playerResume`, `seenOnboarding`, `lastBackupAt`, each sanitized and capped ([api-integrations.md](api-integrations.md#storage-caps-and-validation-contract) holds the caps). Keyed maps reject `__proto__`, `constructor`, `prototype`. Helpers: `getReviews/setReview`, `toggleMemorizedVerse/setMemorizedVerses`, `getReadSections/markSectionRead`, `getVerseNote/setVerseNote`, `getLastRead/getLastReadForSurah/setLastRead`, `getKhatmah/setKhatmah/clearKhatmah`, `getOnboardingSeen/setOnboardingSeen`, `getAnalytics/recordAnalyticsEvent`, `exportProgress/importProgress`, `getLastBackupAt/shouldRemindBackup`.
- **i18n.ts**: flat `key -> { en, ar }` dictionary, `t(key, lang)`, and `useTranslation()` -> `{ t, lang, isAr, dir }`.
- **utils.ts**: `cn()`, `formatSurahReference(name | { en, ar }, surah, ayah, locale)`, `toArabicIndic(n)`.
- **question-pool.ts**: flattens rule-file examples into a pool, builds `RULE_AR_MAP`, exposes `getRandomQuestions` with parallel `options` / `optionsAr`. Authored `src/data/questions/<module>.ts` take precedence. `getModuleLastScore(progress, moduleId)` and `getDueQuestions(dueIds, count)` feed the hub and review route.
- **spaced-repetition.ts**: pure Leitner. `LEITNER_INTERVALS` (1/3/7/14/30 days); `nextStateForAnswer(prev, correct)` promotes one box (clamp `MASTERY_BOX = 5`) or resets to 1; `recordReview(questionId, correct)` writes through; `getDueQuestionIds` and `getReviewStats` are read-only.
- **search.ts**: builds and caches the global search index (surahs, modules, rules with subtypes, tafkheem subsections, makharij regions, waqf symbols). `search(query, limit)` tokenized substring match with score ranking; minimum length 2.
- **khatmah.ts**: pure pace math. `computeKhatmahPace(plan, currentPage, today)` (clamped snapshot) and `targetDateForDuration(startDate, days)`. Linear by mushaf page, no React/storage/next, so `scripts/verify-khatmah.mjs` exercises it.
- **tajweed-rule-links.ts**: structural navigation only; maps each tajweed API CSS class to its lesson route for the popover "Learn more". No rule content; classes with no owning module are absent. `scripts/verify-study-tools.mjs` checks every key against the color map.
- **reduced-motion.ts**: `prefersReducedMotion()`, an SSR-safe read gating JS-driven `scrollIntoView({ behavior })` that CSS cannot cover.
- **scroll-lock.ts**: ref-counted body-scroll lock (`lockBodyScroll` / `unlockBodyScroll`) shared by stacked overlays.
- **player-engine.ts**: pure playback-queue and advance arithmetic behind `usePlayer` (next/prev index, range and set queues, repeat/loop/gap). No React or `<audio>`; `scripts/verify-player-engine.mjs` exercises it.
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
- **layout/**: `Sidebar` (desktop), `Header` and `MobileDrawer` (mobile), `AppProvider` (sets `<html dir lang>`, mounts `PWARegister` and `RouteAnalytics`), `PWARegister` (registers `/sw.js` in production), `RouteAnalytics` (route-view events, local-only), and `nav-data` (single source for nav items and icons, including `SearchIcon`).
- **learn/**: `ModuleCard`, `RuleCard`, `ExampleCard`, `LetterGrid`, `LetterCard`, `MakhrajDiagram`, `ColorLegend`, `LessonNavigation`, `LessonProgress` (the section-progress chip wired to `useReadSections`).
- **practice/**: `PracticeQuestion` (feedback plus an optional Web-Speech TTS button), `QuizSession` (`mode: "random" | "review"`, instruments analytics), `StreakCounter`, `PracticeModuleCard` (the `/practice` tiles, including the conditional Review Due tile).
- **mushaf/**: the 604-page reader.
  - `MushafFrame` is the outer ornate frame (the geometric band is CSS, `.mushaf-frame::after`); `SurahCartouche` is the surah-start banner; `BismillahLine` is the standalone Bismillah, suppressed for surah 9 (At-Tawbah) and surah 1 (Al-Fatihah, where it is verse 1).
  - `MushafPage` composes these with flowing tajweed-colored verse buttons. Tapping a verse opens the overlay (no inline controls); `memorizationMode` blurs memorized verses behind a Reveal pill, and reveal-as-recited uncovers the playing verse word-by-word.
  - `MushafReader` is the toolbar (prev / next, surah and juz dropdowns, rule-highlight drill, color-legend toggle, memorization/recall eye toggle, reading-focus toggle, bookmark, Cmd/Ctrl+K palette), keyboard navigation, and the one `VerseOverlay` (inside `VerseSelectionProvider`). RTL-aware.
  - `VerseOverlay` is the single per-verse action hub: a centered panel at 1024px and up, a bottom sheet below (`useIsDesktop`), over a dimmed inert page. It holds the per-verse actions (play this verse / play from here / memorize / bookmark / note), range selection with repeat/loop/gap, a sub-verse word-range loop, a reveal-as-recited toggle, inline reciter/speed/translation controls, reciter A/B compare, and the reading-depth section (translation, tafsir, word-by-word, record-and-compare). Heavy surfaces lazy-load with `next/dynamic`.
  - `ReaderPalette` is the Cmd/Ctrl+K quick-jump palette (surah, page, juz). `VerseNotes` is the private note (with a `TagEditor`); `ReciterCompare` plays the verse by two reciters on the one engine; `RecitationCompare` records the user and replays it next to the reciter (in-memory only). `MushafBookmarks` is the list behind `/mushaf/bookmarks`. `MushafIndex` is the 114-surah grid with search, Makkah / Madinah filter, a resume callout, a bookmarks preview, and per-surah resume pills.
- **khatmah/**: `KhatmahCard`, the completion planner on `/progress`.

### `src/app/`: routes

Next.js App Router (Next 16). Most pages are server components that hydrate into client components. The Mushaf page route uses `generateStaticParams` for common entry pages and ISR (`export const revalidate = 86400`) for the rest. `params` is a Promise: server routes `await` it; the client `practice/[module]` route uses React `use()`. `error.tsx` and `global-error.tsx` are the error boundaries; `loading.tsx` files give the learn, practice, progress, settings, and Mushaf routes skeletons.

### `scripts/`

- **fetch-surah-names.mjs**: one-shot dev script. Pulls `/chapters`, writes `src/data/content/surah-index.json` (114 entries: `name_arabic`, `pages`, `bismillah_pre`, `revelation_place`), and patches `surah_name_ar` into every example. Re-run when an example references a new surah; not a build step.
- **verify-mushaf.mjs**: drives a real Chromium against `npm run dev` for 21 assertions on the Mushaf flow. See [development.md](development.md).
- **verify-newfeatures.mjs**: smoke-tests spaced repetition, memorization tracker / mode, global search, the TTS button, and the PWA endpoint against `npm run dev`.

## Data flow

### Reading a lesson

`src/app/learn/[module]/page.tsx` is a client component that imports the rule JSON directly. `useTranslation()` picks the locale; `RuleCard`, `ExampleCard`, and friends read `_ar` or English by `isAr`. `TajweedText` renders tajweed markup, else `ArabicText` renders plain Arabic in `Amiri Quran`.

### Reading the Mushaf

`src/app/mushaf/page/[page]/page.tsx` (server) calls `getTajweedPage(parseInt(params.page))` and `getChaptersIndex()` through `fetchWithCache` and `fetchWithRetry` (cache hits skip the network; `getChaptersIndex()` falls back to bundled `surah-index.json`), `await`s `params`, and passes the data to the client `MushafReader`, which renders `MushafPage` and the toolbar. Tapping a verse opens `VerseOverlay` (panel or bottom sheet by `useIsDesktop`) over a dimmed inert page; it portals to body, locks scroll through `scroll-lock.ts`, traps Tab, and restores focus on close. Playback runs from the overlay or the toolbar "Play surah" through `usePlayer` (zustand) -> `fetchAudioUrl` -> the Quran.com audio CDN, auto-advancing ayah to ayah (a plain tap does not auto-play); `MiniPlayer` toggles single <-> full-surah mode. Multi-verse selection plays a range or hand-picked set as one queue with per-verse repeat, whole-selection loop, inter-verse pause, and a sub-verse word-range loop for segment-capable reciters. The surah and juz pickers read out the open page and update as pages turn; Cmd/Ctrl+K opens `ReaderPalette`.

### Tap-a-letter rule popover

`TajweedText`'s opt-in `explainRules` prop turns each colored letter into a button that opens `TajweedRulePopover`, naming the rule, showing its color from `tajweed-colors.ts`, and resolving a "Learn more" link via `getLessonLinkForClass` in `tajweed-rule-links.ts`. Classes with no owning module show no link. No rule text is generated.

### Per-verse notes and bookmarks view

The overlay renders `VerseNotes` (the learner's own words) with a `TagEditor`, both through the funnel (`getVerseNote` / `setVerseNote`, `entryTags`): local-only, capped, never transmitted, never religious content. `/mushaf/bookmarks` renders `MushafBookmarks` (open / remove actions, a tag/text filter); the index previews a few and its resume pills read `lastReadBySurah`.

### Reciter A/B compare

`ReciterCompare` in the overlay plays the verse by two reciters in turn on the one `usePlayer` engine, with no second audio element.

### Khatmah planner

`KhatmahCard` on `/progress` reads the plan via `getKhatmah` and the position from `lastRead.page`, calls `computeKhatmahPace(plan, currentPage, today)` in `khatmah.ts`, and writes through `setKhatmah` (which re-sanitizes). `today` comes from `new Date()`, keeping the library deterministic.

### First-launch onboarding

A skippable welcome shows once. The `seenOnboarding` flag on `TajweedProgress` (`getOnboardingSeen` / `setOnboardingSeen`) is covered by export / import / reset, and a reset re-shows it.

### Spaced repetition (Leitner)

Answering in `QuizSession` calls `recordReview(questionId, correct)` from `useReviews()` (delegating to `nextStateForAnswer` in `spaced-repetition.ts`), which promotes one box on correct (max 5) or resets to 1 via `setReview`. `/practice` uses `useReviews().stats()` for `{ total, mastered, due }` (the Review Due tile shows only when `due > 0`); `/practice/review` calls `getDueQuestions(useReviews().dueIds(), 10)` then runs `<QuizSession mode="review"/>`.

### Memorization tracker

Toggling memorize calls `useMemorization().toggle(verseKey)` -> `toggleMemorizedVerse(verseKey)`, validating `^\d{1,3}:\d{1,3}$` and capping at 6,236; the hook mirrors a local `Set<string>` for O(1) re-renders. The toolbar eye button flips an in-session `memorizationMode`, blurring memorized verses behind a per-verse Reveal pill.

### Lesson section progress

`LessonProgress` mounts with the page's `sections: string[]`; after `mounted`, an `IntersectionObserver` watches each element whose id matches a slug and at 40% visibility calls `markSectionRead(moduleId, slug)` (slug `^[a-z0-9][a-z0-9-]{0,80}$`, capped 50 per module). The chip shows `readCount` and a next-unread anchor, auto-hiding when all are read.

### Anonymous local analytics

`RouteAnalytics` reads `usePathname()` and calls `recordAnalyticsEvent("route.view", pathname)` per navigation; `QuizSession` records `quiz.start` / `review.start` and `quiz.finish` (`${moduleKey}:${percentage}`). `recordAnalyticsEvent` appends to `progress.analytics`, trimmed to 1000 (FIFO), each `{ type, meta?, ts }`. `/progress` reads via `useAnalytics()` for an Insights card. **Nothing is transmitted off-device.**

### Backup and restore

`exportProgress()` returns `JSON.stringify(getProgress(), null, 2)`; Settings wraps it in a `Blob` and downloads it as `tajweed-trainer-backup-YYYY-MM-DD.json`. `importProgress(payload)` runs the full `sanitizeProgress` validator before writing; invalid input returns `false` with a localized error. A successful import reloads after 600 ms so hooks re-read.

### PWA

`app/manifest.ts` serves `/manifest.webmanifest`; `app/layout.tsx` sets `themeColor`, `appleWebApp`, `icons`. `<PWARegister/>` registers `/sw.js` after `load` in production (dev skips). `/sw.js` is served by `src/app/sw.js/route.ts` (`dynamic = "force-static"`), stamping a per-build `BUILD_VERSION` into `scripts/sw-template.js` for fresh caches per deploy. See [security.md](security.md#pwa-service-worker) for the same-origin scope, network-first HTML, cache-first assets, and why cross-origin audio and the API are never intercepted.

### Settings sync

`SettingsProvider` reads localStorage on mount (after hydration). `SettingsSync` (in `AppProvider.tsx`) mirrors `settings.language` to `document.documentElement.lang` / `dir` and `settings.theme` to `data-theme` on `<html>` (one of five themes). A pre-paint inline script in `layout.tsx` sets theme/dir/lang before first paint (no flash); the sync applies later changes, and a theme change crossfades through the View Transitions API. Components read via `useSettings()`; `updateSettings(partial)` writes to state and localStorage.

## Invariants

- `<TajweedText>` is the only place that renders the API's tajweed HTML. The markup is API-controlled; never mix it with user input.
- `<ArabicText>` is the only place that renders non-Quranic Arabic. It enforces `dir="rtl"`, `lang="ar"`, and the right font.
- `useTranslation()` is the only source of locale. Do not read `settings.language` directly in components; that bypasses the SSR-safe wrapper and causes hydration mismatches.
- JSON in `src/data/content/` is the source of truth. Components never hardcode rule names, letter lists, or examples.
