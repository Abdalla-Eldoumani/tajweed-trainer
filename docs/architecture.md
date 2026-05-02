# Architecture

How the app is wired together, top-down.

## High-level

```
+-------------------------------------------------------------------+
|                          Browser                                  |
|  +-------------------------------------------------------------+  |
|  |  Next.js App Router (server + client components)            |  |
|  |                                                             |  |
|  |   AppProvider (SettingsProvider + SettingsSync)             |  |
|  |   +-- useSettings()       <-- localStorage (SSR-safe)       |  |
|  |   +-- useProgress()       <-- localStorage                  |  |
|  |   +-- useReciters()       <-- localStorage (24h cache)      |  |
|  |   +-- useModuleLock(id)   --> { locked, mounted, prereq }   |  |
|  |   +-- useTranslation()    --> { t, lang, isAr, dir }        |  |
|  |                                                             |  |
|  |   Routes:                                                   |  |
|  |   /                       Home                              |  |
|  |   /learn                  Module index                      |  |
|  |   /learn/[module]         Lesson page (lock-aware)          |  |
|  |   /mushaf                 114-surah index                   |  |
|  |   /mushaf/page/[page]     Page reader (1..604)              |  |
|  |   /mushaf/surah/[surah]   Redirect to start page            |  |
|  |   /practice               Hub of module tiles               |  |
|  |   /practice/[module]      Per-module quiz                   |  |
|  |   /practice/mixed         Random across all modules         |  |
|  |   /progress               Stats and streak                  |  |
|  |   /settings               Preferences (incl. reciter list)  |  |
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

- **types.ts** — every TypeScript type used by the app. Optional `_ar` fields on the content types are additive so existing JSON keeps validating during translation work.
- **quran-api.ts** — wraps Quran.com v4. Exposes `getTajweedSurah(n)`, `getTajweedPage(n)`, `getChaptersIndex()` (with bundled fallback), and `getStartPageForSurah(n)`. Memory cache (15 minutes by default, 7 days for chapters), exponential backoff. 4xx fails fast; 5xx and network errors retry.
- **audio-api.ts** — wraps Al Quran Cloud. `fetchAudioUrl(surah, ayah, reciter)` with a 1-hour cache. `fetchReciterEditions()` pulls the full audio editions list from `/edition?format=audio&type=versebyverse`, validates each entry against `RECITER_IDENTIFIER_PATTERN`, and pins Husary and Alafasy at the front via `mergeWithDefaults`. `resolveReciterIdentifier()` aliases the legacy short ids (`husary`, `alafasy`) to the full alquran.cloud identifiers so persisted settings keep working.
- **tajweed-colors.ts** — CSS-class to hex map for every tajweed rule the API emits, including dark-mode variants. Used by `TajweedText` and `ColorLegend`.
- **storage.ts** — SSR-safe localStorage wrapper. `getSettings`, `setSettings`, `getProgress`, `setProgress`. Default settings include `lastMushafPage: 1` and `mushafBookmarks: []`.
- **i18n.ts** — flat `key -> { en, ar }` dictionary, a `t(key, lang)` lookup, and the `useTranslation()` hook that pulls `lang` from settings and returns `{ t, lang, isAr, dir }`.
- **utils.ts** — `cn()` for class merging, `formatSurahReference(name | { en, ar }, surah, ayah, locale)`, and `toArabicIndic(n)` for Arabic-Indic numerals.
- **question-pool.ts** — collects every example across the rule files into a flat pool, builds a `RULE_AR_MAP` (English `rule_applied` to Arabic `rule_applied_ar`), and exposes `getRandomQuestions` with parallel `options` / `optionsAr` arrays. Authored Phase-2 questions in `src/data/questions/<module>.ts` take precedence over the legacy random-from-examples pool. `getModuleLastScore(progress, moduleId)` returns the most recent quiz score and total quizzes-taken count for the practice hub.

### `src/data/content/` — the source of truth

JSON files. Each entry that ships to the UI carries `verified: true`. The schema is documented in [content-schema.md](content-schema.md).

### `src/components/`

- **ui/** — primitive widgets (`Card`, `Button`, `Badge`, `ProgressBar`), Arabic-aware text wrappers (`ArabicText`, `TajweedText`), audio (`AudioPlayer`), Islamic ornaments (`Ornament`), framing (`QuranFrame`, `SectionBanner`), and the language switch (`LanguageToggle`).
- **layout/** — `Sidebar` (desktop), `Header` and `MobileDrawer` (mobile), `AppProvider` (sets `<html dir lang>` from settings), and `nav-data` (single source for nav items and icons).
- **learn/** — domain components for module pages: `ModuleCard`, `RuleCard`, `ExampleCard`, `LetterGrid`, `LetterCard`, `MakhrajDiagram`, `ColorLegend`, `LessonNavigation`.
- **practice/** — `PracticeQuestion` (now with post-answer feedback that surfaces the rule name, the authored explanation, and a link to `/learn/<moduleId>#<lessonAnchor>`), `QuizSession`, `StreakCounter`, and `PracticeModuleCard` (the tiles on the new `/practice` hub).
- **mushaf/** — the 604-page reader:
  - `MushafFrame` is the outer ornate frame; the multi-color geometric band lives in CSS (`.mushaf-frame::after`).
  - `SurahCartouche` is the banner shown when a surah starts on the current page.
  - `BismillahLine` is the standalone Bismillah; suppressed for surah 9 (At-Tawbah, no Bismillah at all) and surah 1 (Al-Fatihah, where Bismillah is verse 1).
  - `MushafPage` composes the above with flowing tajweed-colored verse buttons that play audio on tap.
  - `MushafReader` is the toolbar (prev / next, surah dropdown, bookmark) and keyboard navigation. RTL-aware.
  - `MushafIndex` is the 114-surah grid with search, Makkah / Madinah filter, and the "continue from page X" callout.

### `src/app/` — routes

Next.js App Router. Most pages are server components that hydrate into client components for interaction. The Mushaf page route uses `generateStaticParams` for pages 1 through 50 and ISR (`revalidate: 60 * 60 * 24`) for the rest.

### `scripts/`

- **fetch-surah-names.mjs** — one-shot dev script. Pulls `/chapters` from Quran.com, writes `src/data/content/surah-index.json` (114 entries with `name_arabic`, `pages`, `bismillah_pre`, `revelation_place`), and patches `surah_name_ar` into every example by surah number across the rule files. Re-run when you add an example referencing a new surah. Don't run at build time.
- **verify-mushaf.mjs** — drives a real Chromium against `npm run dev` and runs 21 assertions against the Mushaf flow. See [development.md](development.md).

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

### Settings sync

1. `SettingsProvider` reads localStorage on mount (after hydration to avoid SSR mismatches).
2. `SettingsSync` (in `AppProvider.tsx`) sets `document.documentElement.lang` and `dir` whenever the language changes; it also toggles the `dark` class for theme.
3. Components consume `useSettings()` to read; `updateSettings(partial)` writes back to both state and localStorage.

## Invariants

- `<TajweedText>` is the only place that renders the API's tajweed HTML. The markup is API-controlled; never mix it with user input.
- `<ArabicText>` is the only place that renders non-Quranic Arabic. It enforces `dir="rtl"`, `lang="ar"`, and the right font.
- `useTranslation()` is the only source of locale. Don't read `settings.language` directly in components; that bypasses the SSR-safe wrapper and causes hydration mismatches.
- JSON in `src/data/content/` is the source of truth. Components never hardcode rule names, letter lists, or examples.
