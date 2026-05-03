# Architecture

How the app is wired together, top-down.

## High-level

```
+-------------------------------------------------------------------+
|                          Browser                                  |
|  +-------------------------------------------------------------+  |
|  |  Next.js App Router (server + client components)            |  |
|  |                                                             |  |
|  |   AppProvider (SettingsProvider + PWARegister                |  |
|  |                + RouteAnalytics + SettingsSync)             |  |
|  |   +-- useSettings()       <-- localStorage (SSR-safe)       |  |
|  |   +-- useProgress()       <-- localStorage                  |  |
|  |   +-- useReciters()       <-- localStorage (24h cache)      |  |
|  |   +-- useReviews()        <-- localStorage (Leitner)        |  |
|  |   +-- useMemorization()   <-- localStorage (verse keys)     |  |
|  |   +-- useReadSections()   <-- localStorage + Observer       |  |
|  |   +-- useAnalytics()      <-- localStorage (1000-event buf) |  |
|  |   +-- useSpeech()         <-- Web Speech API (UI prompts)   |  |
|  |   +-- useModuleLock(id)   --> { locked, mounted, prereq }   |  |
|  |   +-- useTranslation()    --> { t, lang, isAr, dir }        |  |
|  |                                                             |  |
|  |   Routes:                                                   |  |
|  |   /                       Home                              |  |
|  |   /learn                  Module index                      |  |
|  |   /learn/[module]         Lesson page (lock-aware,           |  |
|  |                            section-progress chip)            |  |
|  |   /mushaf                 114-surah index                   |  |
|  |   /mushaf/page/[page]     Page reader (memorization mode)    |  |
|  |   /mushaf/surah/[surah]   Redirect to start page            |  |
|  |   /practice               Hub: module tiles + Mixed +       |  |
|  |                            Review Due (when due > 0)         |  |
|  |   /practice/[module]      Per-module quiz                   |  |
|  |   /practice/mixed         Random across all modules         |  |
|  |   /practice/review        Spaced-repetition queue           |  |
|  |   /search                 Global search                     |  |
|  |   /progress               Stats, streak, reviews, memorize, |  |
|  |                            insights                          |  |
|  |   /settings               Preferences, reciter, backup      |  |
|  |   /manifest.webmanifest   PWA manifest (metadata route)     |  |
|  +-------------------------------------------------------------+  |
|                            |                                      |
|  +-------------------------+----------------------------------+   |
|  |  Audio: <audio> elements driven by useAudio()              |   |
|  +------------------------------------------------------------+   |
+-------------------------------------------------------------------+
                              |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
+---------------+    +---------------+    +-------------------+
| Quran.com     |    | Al Quran      |    | Bundled JSON      |
| Foundation v4 |    | Cloud API     |    | (reviewed content)|
|               |    |               |    |                   |
| /chapters     |    | /ayah/{key}/  |    | rule files,       |
| /verses/      |    |  ar.husary    |    | surah-index,      |
|  by_page/N    |    |  ar.alafasy   |    | glossary,         |
|               |    |               |    | learning-path     |
+---------------+    +---------------+    +-------------------+
```

## Layers

### `src/lib/` — pure logic, no React

- **types.ts** — every TypeScript type used by the app. Optional `_ar` fields on the content types are additive so existing JSON keeps validating during translation work. Includes `ReviewBox`, `ReviewState`, `AnalyticsEvent`, and `AnalyticsEventType` for the local-only persistence fields.
- **quran-api.ts** — wraps Quran.com v4. Exposes `getTajweedSurah(n)`, `getTajweedPage(n)`, `getChaptersIndex()` (with bundled fallback), and `getStartPageForSurah(n)`. Memory cache (15 minutes by default, 7 days for chapters), exponential backoff. 4xx fails fast; 5xx and network errors retry.
- **audio-api.ts** — wraps Al Quran Cloud. `fetchAudioUrl(surah, ayah, reciter)` with a 1-hour cache. `fetchReciterEditions()` pulls the full audio editions list from `/edition?format=audio&type=versebyverse`, validates each entry against `RECITER_IDENTIFIER_PATTERN`, and pins Husary and Alafasy at the front via `mergeWithDefaults`. `resolveReciterIdentifier()` aliases the legacy short ids (`husary`, `alafasy`) to the full alquran.cloud identifiers so persisted settings keep working.
- **tajweed-colors.ts** — CSS-class to hex map for every tajweed rule the API emits, including dark-mode variants. Used by `TajweedText` and `ColorLegend`.
- **storage.ts** — SSR-safe localStorage wrapper. `getSettings`, `setSettings`, `getProgress`, `setProgress`. Default settings include `lastMushafPage: 1` and `mushafBookmarks: []`. Adds `reviews`, `memorizedVerses`, `readSections`, and `analytics` fields to `TajweedProgress`, each with its own sanitizer and cap. Helpers: `getReviews/setReview`, `toggleMemorizedVerse`, `getReadSections/markSectionRead`, `getAnalytics/recordAnalyticsEvent`, `exportProgress/importProgress`.
- **i18n.ts** — flat `key -> { en, ar }` dictionary, a `t(key, lang)` lookup, and the `useTranslation()` hook that pulls `lang` from settings and returns `{ t, lang, isAr, dir }`.
- **utils.ts** — `cn()` for class merging, `formatSurahReference(name | { en, ar }, surah, ayah, locale)`, and `toArabicIndic(n)` for Arabic-Indic numerals.
- **question-pool.ts** — collects every example across the rule files into a flat pool, builds a `RULE_AR_MAP` (English `rule_applied` to Arabic `rule_applied_ar`), and exposes `getRandomQuestions` with parallel `options` / `optionsAr` arrays. Authored Phase-2 questions in `src/data/questions/<module>.ts` take precedence over the legacy random-from-examples pool. `getModuleLastScore(progress, moduleId)` returns the most recent quiz score and total quizzes-taken count for the practice hub. `getDueQuestions(dueIds, count)` filters the authored pool by stable id for the spaced-repetition route.
- **spaced-repetition.ts** — pure Leitner-box logic. `LEITNER_INTERVALS` (1/3/7/14/30 days), `nextStateForAnswer(prev, correct)` promotes one box on correct (clamped at `MASTERY_BOX = 5`) or resets to box 1 on incorrect. `recordReview(questionId, correct)` writes through to storage; `getDueQuestionIds(reviews)` and `getReviewStats(reviews)` are read-only queries used by the UI. Pure-functional; no React imports.
- **search.ts** — builds and caches the global search index across surahs, modules, rules (with subtypes), tafkheem subsections, makharij regions, and waqf symbols. `search(query, limit)` does tokenized substring matching against title and a denormalized haystack with score-based ranking. Minimum query length 2.

### `src/data/content/` — the source of truth

JSON files. Each entry that ships to the UI carries `verified: true`. The schema is documented in [content-schema.md](content-schema.md).

### `src/components/`

- **ui/** — primitive widgets (`Card`, `Button`, `Badge`, `ProgressBar`), Arabic-aware text wrappers (`ArabicText`, `TajweedText`), audio (`AudioPlayer`), Islamic ornaments (`Ornament`), framing (`QuranFrame`, `SectionBanner`), and the language switch (`LanguageToggle`).
- **layout/** — `Sidebar` (desktop), `Header` and `MobileDrawer` (mobile), `AppProvider` (sets `<html dir lang>` from settings; mounts `PWARegister` and `RouteAnalytics`), `PWARegister` (registers `/sw.js` in production), `RouteAnalytics` (records a `route.view` event on every navigation; local-only), and `nav-data` (single source for nav items and icons; includes `SearchIcon`).
- **learn/** — domain components for module pages: `ModuleCard`, `RuleCard`, `ExampleCard`, `LetterGrid`, `LetterCard`, `MakhrajDiagram`, `ColorLegend`, `LessonNavigation`, `LessonProgress` (the floating section-progress chip wired to `useReadSections`).
- **practice/** — `PracticeQuestion` (post-answer feedback panel plus optional Web-Speech TTS button for the prompt), `QuizSession` (accepts `mode: "random" | "review"`, instruments analytics events on start and finish), `StreakCounter`, and `PracticeModuleCard` (the tiles on the `/practice` hub, including the conditional Review Due tile).
- **mushaf/** — the 604-page reader:
  - `MushafFrame` is the outer ornate frame; the multi-color geometric band lives in CSS (`.mushaf-frame::after`).
  - `SurahCartouche` is the banner shown when a surah starts on the current page.
  - `BismillahLine` is the standalone Bismillah; suppressed for surah 9 (At-Tawbah, no Bismillah at all) and surah 1 (Al-Fatihah, where Bismillah is verse 1).
  - `MushafPage` composes the above with flowing tajweed-colored verse buttons that play audio on tap. Renders the per-verse memorize toggle (a small heart icon) and, when `memorizationMode` is on, blurs every memorized verse with a Reveal pill.
  - `MushafReader` is the toolbar (prev / next, surah dropdown, eye toggle for memorization mode, bookmark) and keyboard navigation. RTL-aware.
  - `MushafIndex` is the 114-surah grid with search, Makkah / Madinah filter, and the "continue from page X" callout.

### `src/app/` — routes

Next.js App Router. Most pages are server components that hydrate into client components for interaction. The Mushaf page route uses `generateStaticParams` for pages 1 through 50 and ISR (`revalidate: 60 * 60 * 24`) for the rest.

### `scripts/`

- **fetch-surah-names.mjs** — one-shot dev script. Pulls `/chapters` from Quran.com, writes `src/data/content/surah-index.json` (114 entries with `name_arabic`, `pages`, `bismillah_pre`, `revelation_place`), and patches `surah_name_ar` into every example by surah number across the rule files. Re-run when you add an example referencing a new surah. Don't run at build time.
- **verify-mushaf.mjs** — drives a real Chromium against `npm run dev` and runs 21 assertions against the Mushaf flow. See [development.md](development.md).
- **verify-newfeatures.mjs** — smoke-tests the spaced-repetition, memorization tracker / mode, global search, TTS button, and PWA endpoint additions against `npm run dev`.

## Data flow

### Reading a lesson

1. `src/app/learn/[module]/page.tsx` is a client component.
2. It imports the relevant JSON file directly (`import noonData from "@/data/content/noon-sakinah-tanween.json"`).
3. `useTranslation()` picks the locale from settings.
4. `RuleCard`, `ExampleCard`, and friends read either `_ar` or English fields based on `isAr`.
5. `TajweedText` renders only when the example has tajweed markup; otherwise `ArabicText` renders plain Arabic with the `Amiri Quran` font.

### Reading the Mushaf

1. `src/app/mushaf/page/[page]/page.tsx` is a server component. It calls `getTajweedPage(parseInt(params.page))` and `getChaptersIndex()`.
2. Both functions go through `fetchWithCache` and `fetchWithRetry`. Cache hits skip the network entirely. `getChaptersIndex()` falls back to the bundled `surah-index.json` if the network fails.
3. The server component passes the resolved data to the client `MushafReader`, which renders `MushafPage` plus the toolbar.
4. Tap a verse: `MushafPage.handleVerseTap(surah, ayah)` -> `useAudio().play(...)` -> `fetchAudioUrl` -> Al Quran Cloud CDN.

### Spaced repetition (Leitner)

1. The user answers a question in `QuizSession`. `handleAnswer(correct)` calls `recordReview(questionId, correct)` from `useReviews()` (which delegates to `nextStateForAnswer` in `lib/spaced-repetition.ts`).
2. `nextStateForAnswer` reads the previous box from `progress.reviews[id]`, promotes one box on correct (max 5) or resets to box 1 on wrong, and writes back via `setReview`.
3. `/practice` calls `useReviews().stats()` to compute `{ total, mastered, due }`. The Review Due tile renders only when `due > 0`.
4. `/practice/review` calls `getDueQuestions(useReviews().dueIds(), 10)` to materialize the queue, then runs `<QuizSession mode="review"/>`.

### Memorization tracker

1. The user taps the heart on a verse in `MushafPage`. `useMemorization().toggle(verseKey)` calls `toggleMemorizedVerse(verseKey)` in storage, which validates against `^\d{1,3}:\d{1,3}$` and caps the set at 6,236.
2. The hook keeps a local `Set<string>` mirror so re-renders are O(1).
3. The toolbar eye button in `MushafReader` flips an in-session `memorizationMode` flag; `MushafPage` blurs every memorized verse and renders a Reveal pill that toggles a per-verse `revealed` set.

### Lesson section progress

1. `LessonProgress` mounts on each lesson page with the page's `sections: string[]`. After `mounted`, an `IntersectionObserver` watches every element whose id matches a section slug.
2. When a section reaches 40% visibility, the observer calls `markSectionRead(moduleId, slug)`, which validates the slug against `^[a-z0-9][a-z0-9-]{0,80}$`, caps at 50 per module, and writes through.
3. The chip computes `readCount` and the next unread anchor on every render; auto-hides when every section is read.

### Anonymous local analytics

1. `RouteAnalytics` (in `AppProvider`) reads `usePathname()` and calls `recordAnalyticsEvent("route.view", pathname)` on every navigation.
2. `QuizSession` records `quiz.start` / `review.start` on `startQuiz()` and `quiz.finish` (with `${moduleKey}:${percentage}`) on completion.
3. `recordAnalyticsEvent` appends to `progress.analytics`, trimmed to the most recent 1000 entries (FIFO ring buffer). Each entry carries `{ type, meta?, ts }`.
4. `/progress` reads via `useAnalytics()` and renders an Insights card with quiz counts and the top 5 routes by view count. **Nothing is transmitted off-device.**

### Backup and restore

1. `exportProgress()` returns `JSON.stringify(getProgress(), null, 2)`. The Settings page wraps this in a `Blob`, generates a download URL, and clicks an anchor with `download="tajweed-trainer-backup-YYYY-MM-DD.json"`.
2. `importProgress(payload)` parses and runs the full `sanitizeProgress` validator before writing. Invalid JSON or shape returns `false`; the UI surfaces a localized error.
3. After a successful import, the page reloads after 600 ms so all hooks re-read fresh state.

### PWA

1. `app/manifest.ts` (Next metadata route) serves `/manifest.webmanifest`. `app/layout.tsx` sets `themeColor`, `appleWebApp`, and `icons`.
2. `<PWARegister/>` (mounted in `AppProvider`) registers `/sw.js` after the `load` event in production builds. Dev skips registration so HMR isn't fighting a stale precached shell.
3. `public/sw.js` strategies: network-first for HTML, cache-first for `/icon*` and `/_next/static/*`, stale-while-revalidate for `api.quran.com` / `api.alquran.cloud`, and cache-first with a 50-entry FIFO cap for `cdn.islamic.network` audio.

### Settings sync

1. `SettingsProvider` reads localStorage on mount (after hydration to avoid SSR mismatches).
2. `SettingsSync` (in `AppProvider.tsx`) sets `document.documentElement.lang` and `dir` whenever the language changes; it also toggles the `dark` class for theme.
3. Components consume `useSettings()` to read; `updateSettings(partial)` writes back to both state and localStorage.

## Invariants

- `<TajweedText>` is the only place that renders the API's tajweed HTML. The markup is API-controlled; never mix it with user input.
- `<ArabicText>` is the only place that renders non-Quranic Arabic. It enforces `dir="rtl"`, `lang="ar"`, and the right font.
- `useTranslation()` is the only source of locale. Don't read `settings.language` directly in components; that bypasses the SSR-safe wrapper and causes hydration mismatches.
- JSON in `src/data/content/` is the source of truth. Components never hardcode rule names, letter lists, or examples.
