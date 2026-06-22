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
|  |   /mushaf/bookmarks       Saved-verse list                  |  |
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
|  |  Audio: one reused <audio> driven by usePlayer (zustand)   |   |
|  |         + PlayerHost; MiniPlayer carries transport         |   |
|  +------------------------------------------------------------+   |
+-------------------------------------------------------------------+
                              |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
+---------------+    +---------------+    +-------------------+
| Quran.com     |    | Audio CDN     |    | Bundled JSON      |
| Foundation v4 |    | (from API)    |    | (reviewed content)|
|               |    |               |    |                   |
| /chapters     |    | verses.quran  |    | rule files,       |
| /verses/      |    |  .com,        |    | surah-index,      |
|  by_page/N    |    | *.quranic-    |    | learning-path     |
| /recitations/ |    |  audio.com    |    |                   |
|  {id}/by_ayah |    |               |    |                   |
+---------------+    +---------------+    +-------------------+
```

## Platform and build

- **Framework:** Next.js 16.2.9 on React 19.2.7 (`react-dom` 19.2.7). Builds use Turbopack; the workspace root is pinned via `turbopack.root` in `next.config.mjs` so a stray parent-directory lockfile isn't inferred as the root.
- **TypeScript** strict mode, `@types/react` ^19. **Tailwind** is kept at 3.4.19 on purpose (Tailwind v4 is deferred; Next 16 doesn't require it and the migration would risk the tuned design). Node 24.
- **ESLint 9, flat config:** `eslint.config.mjs` spreads `eslint-config-next/core-web-vitals` directly (the old `.eslintrc.json` was removed). The lint script is `eslint .` — not `next lint`, which Next 16 deprecates. `package.json` scripts: `dev` / `build` / `start` / `lint` / `verify` / `verify:scripts` / `verify:ui`.
- **Next 15+ async APIs:** dynamic route `params` is a Promise — `await`ed in server routes, unwrapped with React `use()` in the client `practice/[module]` route. Segment `export const revalidate` uses a literal seconds value (e.g. `86400`, `604800`).
- **Fonts:** all fonts are self-hosted via `next/font` (Inter, Spectral, JetBrains Mono, Amiri, Amiri Quran). There is no render-blocking Google Fonts `<link>` in `layout.tsx`; Tailwind `fontFamily` tokens reference the `next/font` CSS variables (`var(--font-quran)`, `var(--font-amiri)`, `var(--font-inter)`, etc.).
- **Headers / CSP, single source:** all response headers and the Content-Security-Policy are assembled once in `next.config.mjs` (`headers()` applies them to every path); `vercel.json` is trimmed to `framework` + `buildCommand` (its competing headers removed). CSP highlights: `script-src` drops `'unsafe-eval'` in production (kept only in dev for HMR); `style-src` / `font-src` no longer list `fonts.googleapis.com` / `fonts.gstatic.com` (fonts are self-hosted); `connect-src 'self' https://api.quran.com`; `media-src 'self' https://verses.quran.com https://*.quranicaudio.com https://audio.qurancdn.com https://everyayah.com https://server16.mp3quran.net`.
- Project version is **2.0.0**.

## Layers

### `src/lib/` — pure logic, no React

- **types.ts** — every TypeScript type used by the app. Optional `_ar` fields on the content types are additive so existing JSON keeps validating during translation work. Includes `ReviewBox`, `ReviewState`, `AnalyticsEvent`, and `AnalyticsEventType` for the local-only persistence fields.
- **quran-api.ts** — wraps Quran.com v4. Exposes `getTajweedSurah(n)`, `getTajweedPage(n)`, `getChaptersIndex()` (with bundled fallback), and `getStartPageForSurah(n)`. Memory cache (15 minutes by default, 7 days for chapters), exponential backoff. 4xx fails fast; 5xx and network errors retry.
- **audio-api.ts** — wraps Quran.com per-ayah audio (`/recitations/{id}/by_ayah/{surah}:{ayah}`) and builds deterministic EveryAyah URLs for the `ea-*` reciters. `fetchAudioUrl(surah, ayah, reciter)` with a 1-hour cache; `toSafeAudioUrl` normalizes the API's relative or protocol-relative path to an absolute https URL on an allowlisted audio host (`verses.quran.com` / the `quranicaudio.com` mirrors / `everyayah.com`). The reciter catalogue is static in `reciters.ts` (`RECITATIONS`, 42 Hafs reciters: 12 Quran.com + 30 EveryAyah; `DEFAULT_RECITER_ID` is Al-Husary muallim). `normalizeReciterId()` migrates legacy alquran.cloud ids (`husary`, `ar.husary`, `alafasy`, `ar.alafasy`) to the Quran.com recitation ids so persisted settings keep working.
- **tajweed-colors.ts** — CSS-class to hex map for every tajweed rule the API emits, including dark-mode variants. Used by `TajweedText` and `ColorLegend`.
- **storage.ts**: SSR-safe localStorage wrapper and the only write funnel; every read runs through `sanitizeProgress`, and every successful write emits a change through `progress-events.ts`. `getSettings`, `setSettings`, `getProgress`, `setProgress`. The consolidated `TajweedProgress` carries `reviews`, `memorizedVerses`, `memorizationReviews`, `readSections`, `verseNotes`, `analytics`, `bookmarks`, `lastRead`, `lastReadBySurah`, `khatmah`, `playerResume`, `seenOnboarding`, and `lastBackupAt`, each with its own sanitizer and cap. Keyed maps reject the prototype-pollution keys (`__proto__`, `constructor`, `prototype`). Helpers: `getReviews/setReview`, `toggleMemorizedVerse/setMemorizedVerses`, `getReadSections/markSectionRead`, `getVerseNote/setVerseNote`, `getLastRead/getLastReadForSurah/setLastRead`, `getKhatmah/setKhatmah/clearKhatmah`, `getOnboardingSeen/setOnboardingSeen`, `getAnalytics/recordAnalyticsEvent`, `exportProgress/importProgress`, and `getLastBackupAt/shouldRemindBackup` for the backup reminder.
- **i18n.ts** — flat `key -> { en, ar }` dictionary, a `t(key, lang)` lookup, and the `useTranslation()` hook that pulls `lang` from settings and returns `{ t, lang, isAr, dir }`.
- **utils.ts** — `cn()` for class merging, `formatSurahReference(name | { en, ar }, surah, ayah, locale)`, and `toArabicIndic(n)` for Arabic-Indic numerals.
- **question-pool.ts** — collects every example across the rule files into a flat pool, builds a `RULE_AR_MAP` (English `rule_applied` to Arabic `rule_applied_ar`), and exposes `getRandomQuestions` with parallel `options` / `optionsAr` arrays. Authored questions in `src/data/questions/<module>.ts` take precedence over the legacy random-from-examples pool. `getModuleLastScore(progress, moduleId)` returns the most recent quiz score and total quizzes-taken count for the practice hub. `getDueQuestions(dueIds, count)` filters the authored pool by stable id for the spaced-repetition route.
- **spaced-repetition.ts** — pure Leitner-box logic. `LEITNER_INTERVALS` (1/3/7/14/30 days), `nextStateForAnswer(prev, correct)` promotes one box on correct (clamped at `MASTERY_BOX = 5`) or resets to box 1 on incorrect. `recordReview(questionId, correct)` writes through to storage; `getDueQuestionIds(reviews)` and `getReviewStats(reviews)` are read-only queries used by the UI. Pure-functional; no React imports.
- **search.ts** — builds and caches the global search index across surahs, modules, rules (with subtypes), tafkheem subsections, makharij regions, and waqf symbols. `search(query, limit)` does tokenized substring matching against title and a denormalized haystack with score-based ranking. Minimum query length 2.
- **khatmah.ts**: pure pace math for the opt-in Quran-completion planner. `computeKhatmahPace(plan, currentPage, today)` returns a clamped snapshot (days elapsed/remaining, pages read/remaining, daily pace, the page to reach today, ahead/behind, percent complete); `targetDateForDuration(startDate, days)` resolves the 30/60/90-day presets. No React, storage, or next imports, so `scripts/verify-khatmah.mjs` exercises it directly. The model is linear by mushaf page (page N of 604 is N/604 complete) and is documented as such in the file.
- **tajweed-rule-links.ts**: structural navigation only. It maps each tajweed API CSS class to the lesson route that teaches it, for the tap-a-letter popover's "Learn more" link. It holds no rule descriptions or classifications; classes with no single owning module are deliberately absent (the popover then shows the rule name and color without a link). `scripts/verify-study-tools.mjs` asserts every key exists in the tajweed color map.
- **reduced-motion.ts**: `prefersReducedMotion()`, an SSR-safe read of the `prefers-reduced-motion` media query. CSS handles motion globally, but JS-driven `scrollIntoView({ behavior })` is not covered by that CSS, so callers gate smooth vs. auto scrolling through this.
- **scroll-lock.ts**: ref-counted body-scroll lock (`lockBodyScroll` / `unlockBodyScroll`) so stacked overlays (drawer, palette, verse overlay sheet, onboarding) coordinate; the body stays locked until the last overlay releases.
- **player-engine.ts**: the pure playback-queue and advance arithmetic behind `usePlayer` (next/prev index math, range and set queue building, repeat/loop/inter-verse-gap resolution). No React or `<audio>`; `scripts/verify-player-engine.mjs` exercises it.
- **player-position.ts**: the mini-player clamp math and the overlay's bottom-sheet offset helpers (`sheetBottomOffset`, `keyboardBottomOffset`), plus the `READER_PANEL_BREAKPOINT` (1024) that `useIsDesktop` reads to pick the overlay's panel vs. sheet form.
- **follow-along.ts**: pure helpers for the recited-word highlight and the sub-verse word loop — mapping a playback time to the active word index from the per-reciter segment timestamps, and `rangeBounds` resolving a start..end word range to a millisecond span. No generated text.
- **motion.ts**: `withViewTransition()`, a feature-detected and reduced-motion-gated wrapper over the browser View Transitions API used for page/section crossfades (e.g. the theme change). No animation library.
- **memorization-scope.ts**: pure verse-scope enumeration and breakdown math for the memorization tracker (per-surah and per-juz counts against the 6,236 total).
- **memorization-review.ts**: the forgetting-curve schedule for memorized verses surfaced in recall, kept separate from the quiz Leitner boxes.
- **weak-rules.ts**: aggregates quiz history into the most-missed rule areas for the progress dashboard, each linking to targeted practice. Read-only over saved progress.
- **certificate.ts**: pure data for the on-device milestone certificate (a completed juz or khatmah); the canvas render is a lazy-loaded component.

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
  - `MushafPage` composes the above with flowing tajweed-colored verse buttons. Tapping a verse opens the verse overlay (no inline per-verse controls); when `memorizationMode` is on it blurs every memorized verse with a Reveal pill, and in reveal-as-recited mode it uncovers the playing verse word-by-word.
  - `MushafReader` is the toolbar (prev / next, surah and juz dropdowns, the rule-highlight drill, the color-legend toggle, the eye toggle for memorization/recall, the reading-focus toggle, bookmark, the Cmd/Ctrl+K palette button), keyboard navigation, and the one `VerseOverlay` for the selected verse (inside `VerseSelectionProvider`). RTL-aware.
  - `VerseOverlay` is the single per-verse action hub: a focused centered panel at 1024px and up, a bottom sheet below that (chosen by `useIsDesktop`), over a dimmed inert page. It holds play this verse / play from here / memorize / bookmark / note / close, range selection with repeat/loop/gap, a sub-verse word-range loop, a reveal-as-recited toggle, inline reciter/speed/translation controls, reciter A/B compare, the private note, and the reading-depth section (translation, tafsir, word-by-word, record-and-compare). It replaced the deleted docked `PlaybackSurface`. The heavy reading-depth, word-by-word, reciter-compare, and record-and-compare surfaces are lazy-loaded with `next/dynamic`.
  - `ReaderPalette` is the Cmd/Ctrl+K quick-jump palette (surah, page, juz).
  - `VerseNotes` is the private per-verse note in the overlay (with a `TagEditor` for the learner's own tags beside it); `ReciterCompare` plays the verse by two reciters in turn on the one engine; `RecitationCompare` records the user and replays it next to the reciter (in-memory only).
  - `MushafBookmarks` is the saved-verse list behind `/mushaf/bookmarks`.
  - `MushafIndex` is the 114-surah grid with search, Makkah / Madinah filter, the "continue from page X" callout, a bookmarks preview, and per-surah resume pills.
- **ui/** also holds `TajweedRulePopover`, opened by `TajweedText` when `explainRules` is on, naming a tapped letter's rule and color with a "Learn more" lesson link.
- **khatmah/**: `KhatmahCard`, the Quran-completion planner on `/progress`.

### `src/app/` — routes

Next.js App Router (Next 16). Most pages are server components that hydrate into client components for interaction. The Mushaf page route uses `generateStaticParams` for the common entry pages and ISR (`export const revalidate = 86400`, a literal seconds value) for the rest. Dynamic route `params` is now a Promise: server routes `await params`; the client `practice/[module]` route unwraps it with React `use()`. `error.tsx` and `global-error.tsx` are the error boundaries (a single failed render never blanks the app), and `loading.tsx` files give the learn, practice, progress, settings, and Mushaf routes skeletons while data resolves.

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
3. The server component `await`s its Promise `params`, then passes the resolved data to the client `MushafReader`, which renders `MushafPage` plus the toolbar (including the prominent "Play surah" control).
4. Tap a verse: it opens `VerseOverlay`, a focused panel at 1024px and up and a bottom sheet below that (chosen by `useIsDesktop`), over a dimmed inert page. Playback is triggered from the overlay (play this verse / play from here) or the toolbar "Play surah" button, routing through the global `usePlayer` (zustand) store -> `fetchAudioUrl` -> the Quran.com audio CDN, auto-advancing ayah to ayah in continuous mode. A plain tap does not auto-play; the overlay's auto-focused "play this verse" does. `MiniPlayer` exposes a single <-> full-surah mode toggle.
5. The overlay portals to body, locks body scroll through the shared `scroll-lock.ts`, traps Tab, and returns focus to the tapped verse on close (Escape, scrim tap, or the explicit close). Its heavy sections (reading-depth, word-by-word, reciter compare, record-and-compare) are lazy-loaded with `next/dynamic`.
6. Multi-verse selection lets the reader pick a contiguous range or a hand-picked set; the selection plays as one auto-advancing queue on the same engine, with a per-verse repeat count, whole-selection loop, and an inter-verse pause, and a sub-verse word-range loop within the open verse for segment-capable reciters.
7. The surah and juz pickers read out the surah(s) and juz on the open page (derived from the page data, correct even after a deep-linked reload) and update as pages turn. Cmd/Ctrl+K opens `ReaderPalette` to jump to any surah, page, or juz.

### Tap-a-letter rule popover

1. `TajweedText` takes an opt-in `explainRules` prop (on in the reader and the lesson examples). When set, each colored letter becomes a button.
2. Tapping one opens `TajweedRulePopover`, which names the rule and shows its color from `tajweed-colors.ts` (the verified map) and resolves a "Learn more" lesson link through `getLessonLinkForClass` in `tajweed-rule-links.ts`. Classes with no single owning module show the name and color without a link. No rule text is generated.

### Per-verse notes and bookmarks view

1. The verse overlay renders `VerseNotes`, a private note in the learner's own words, with a `TagEditor` for the learner's own tags beside it. Both read and write through the storage funnel (`getVerseNote` / `setVerseNote`, `entryTags`); both are local-only, capped, never transmitted, and never religious content.
2. `/mushaf/bookmarks` resolves the surah headers server-side and renders `MushafBookmarks`, listing every bookmarked verse with its text and open / remove actions, above a tag/text filter over the user's own entries. The index links to it and previews a few bookmarks inline; per-surah resume pills read `lastReadBySurah`.

### Reciter A/B compare

1. `ReciterCompare` in the verse overlay plays the same verse by two reciters in turn on the one `usePlayer` engine, so styles can be compared by ear. It adds no second audio element.

### Khatmah planner

1. `KhatmahCard` on `/progress` reads the opt-in plan via `getKhatmah` and the reader position from `lastRead.page`.
2. It calls `computeKhatmahPace(plan, currentPage, today)` in `khatmah.ts` for the pace snapshot (daily pace, the page to reach today, ahead/behind, percent complete) and writes a new plan through `setKhatmah`, which re-sanitizes before persisting. `today` is computed in the component with `new Date()` so the library stays deterministic.

### First-launch onboarding

1. A short, skippable welcome shows once on first open. The seen-once flag lives on `TajweedProgress` as `seenOnboarding` (via `getOnboardingSeen` / `setOnboardingSeen`), so export / import / reset cover it and a reset re-shows it.

### Spaced repetition (Leitner)

1. The user answers a question in `QuizSession`. `handleAnswer(correct)` calls `recordReview(questionId, correct)` from `useReviews()` (which delegates to `nextStateForAnswer` in `lib/spaced-repetition.ts`).
2. `nextStateForAnswer` reads the previous box from `progress.reviews[id]`, promotes one box on correct (max 5) or resets to box 1 on wrong, and writes back via `setReview`.
3. `/practice` calls `useReviews().stats()` to compute `{ total, mastered, due }`. The Review Due tile renders only when `due > 0`.
4. `/practice/review` calls `getDueQuestions(useReviews().dueIds(), 10)` to materialize the queue, then runs `<QuizSession mode="review"/>`.

### Memorization tracker

1. The user taps a verse to open its overlay and toggles the memorize button there. `useMemorization().toggle(verseKey)` calls `toggleMemorizedVerse(verseKey)` in storage, which validates against `^\d{1,3}:\d{1,3}$` and caps the set at 6,236.
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
3. `/sw.js` is served by a Next route handler (`src/app/sw.js/route.ts`, `dynamic = "force-static"`) that reads `scripts/sw-template.js` and stamps a unique per-build `BUILD_VERSION` into the cache namespaces. Each deploy therefore gets fresh caches and the `activate` step purges every cache that isn't part of the current build. (The old static `public/sw.js` with a fixed `CACHE_VERSION` never invalidated across deploys — the production stale-shell/asset bug — and was removed.)
4. Worker scope is deliberately limited to same-origin requests: network-first with cache fallback for HTML navigations (the app shell), cache-first for same-origin static assets (hashed `_next` files, icons, fonts). It does **not** intercept cross-origin Quran audio (mp3) or the Quran.com API — those stream/fetch natively, so the worker can never break audio playback (offline Quran content is the trade-off).

### Settings sync

1. `SettingsProvider` reads localStorage on mount (after hydration to avoid SSR mismatches).
2. `SettingsSync` (in `AppProvider.tsx`) mirrors `settings.language` to `document.documentElement.lang` / `dir` and `settings.theme` to the `data-theme` attribute on `<html>` (one of the five themes, two light and three dark). A pre-paint inline script in `layout.tsx` sets the same theme/dir/lang from storage before first paint, so the sync only applies subsequent changes and there is no flash; a theme change crossfades the page through the View Transitions API.
3. Components consume `useSettings()` to read; `updateSettings(partial)` writes back to both state and localStorage.

## Invariants

- `<TajweedText>` is the only place that renders the API's tajweed HTML. The markup is API-controlled; never mix it with user input.
- `<ArabicText>` is the only place that renders non-Quranic Arabic. It enforces `dir="rtl"`, `lang="ar"`, and the right font.
- `useTranslation()` is the only source of locale. Don't read `settings.language` directly in components; that bypasses the SSR-safe wrapper and causes hydration mismatches.
- JSON in `src/data/content/` is the source of truth. Components never hardcode rule names, letter lists, or examples.
