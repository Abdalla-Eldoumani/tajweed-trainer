# Changelog

## 0.4.0 — 2026-06-07

Broader reciter choice, a movable audio player, a content-accuracy pass with a new offline check, and visual polish. No religious-content was generated or edited: verse text, translations, tafsir, tajweed coloring, and audio still come only from the verified Quran.com API or the bundled snapshots, and the app renders them rather than producing them.

### Added

- **Seven more reciters** from everyayah.com, bringing the roster to nineteen: Saad al-Ghamdi, Maher al-Muaiqly, Muhammad Ayyoub, Ali al-Hudhaifi, Abdullah Basfar, Yasser al-Dossari, and Abdullah Awad al-Juhani. They live alongside the twelve Quran.com recitations in `src/lib/reciters.ts` (ids prefixed `ea-`). Each per-ayah file was confirmed to resolve before it was added, and the everyayah host is allowlisted in `src/lib/media-url.ts` and the CSP. If an ayah file ever 404s, playback falls back instead of stalling.
- **Movable mini-player.** The mini-player can be dragged by its handle to any corner of the viewport; the position is clamped to stay on screen and persists in user settings, so it stays out of the way of whatever you are reading.
- **Content check** via `scripts/verify-content.mjs`. It reads every practice question, confirms the Arabic fragment appears in the authenticated text of the verse it cites (folding orthographic differences that are not content differences), and hard-fails on structural problems (no valid answer, duplicate id, wrong option count). Offline, no key. See [content-audit.md](content-audit.md).
- **Sourced practice questions** added across noon sakinah, meem sakinah, ghunnah, qalqalah, madd, laam and raa, and tafkheem and tarqeeq, each citing the surah:ayah its fragment comes from.

### Changed

- **Lessons re-checked against sources.** Every rule, letter set, beat count, and mnemonic in the nine lesson files was reviewed against named tajweed authorities for Hafs 'an 'Asim. The accuracy guarantees and the headline references are written up in [content-audit.md](content-audit.md).
- **Quiz answer positions corrected** where the right option had drifted to a predictable slot.
- **Ghunnah ranks regrouped into maratib.** The lesson now presents the ranks of ghunnah as grouped levels (akmal, kamilah, naqisah, anqas) rather than a flat one-to-five list, because the contexts that share a level share the same prominence. See `ghunnah_prominence_ranking_note` in `src/data/content/ghunnah.json`.
- **Visual and Islamic polish.** Calmer surah cartouche and Quran frame, more vertical room for harakat on colored Quran lines, a redesigned color legend, and a refreshed responsive sweep in light and dark.

### Deferred

- **Tafkheem coloring in the Mushaf.** No clean, verified per-letter tafkheem dataset was available without the app classifying tajweed itself, which this project does not do. Coloring is held back rather than approximated. The Tafkheem and Tarqeeq lesson covers the heavy and light letters and stands on its own.

## 0.3.1 — 2026-06-01

A security-hardening and bug-fix pass. No religious-content changes — verse text, translations, tafsir, and audio still come only from the verified Quran.com API.

### Fixed

- **Reading-depth panel is now discoverable.** Tapping any verse in the Mushaf reader opens its translation / tafsir / word-by-word panel, which scrolls into view. The old hover-only per-verse icons (play, memorize, details) were undiscoverable on touch and are gone; play this verse, play from here, memorize, and verse bookmark now live in the panel header.
- **Translations now render.** The previous default translation resource id (131) is no longer served by the Quran.com API and returned nothing, so no translation ever appeared. The default is now Saheeh International (id 20) and the curated list drops the dead id. Footnote markers render as superscripts instead of literal text.

### Security

- **Mutation-XSS hardening.** The verse and tafsir HTML sanitizers (`src/lib/sanitize.ts`) were rewritten to escape every angle bracket before re-creating only known-safe tag shapes, closing a single-pass-regex tag-reassembly bypass (e.g. `<<img onerror=x>img ...>`). `verify-sanitizer.mjs` now imports the real sanitizer and tests the exact bypass payloads (29 cases).
- **Audio URL allowlist.** API-provided audio URLs are constrained to expected hosts (`verses.quran.com`, `*.quranicaudio.com`, `audio.qurancdn.com`) and upgraded to https (`src/lib/media-url.ts`); `getAudioEndpoint` self-clamps surah / ayah.
- **Permissions-Policy** denies every unused device feature (payment, USB, serial, bluetooth, screen capture, sensors).
- **Service worker** caches navigations under a query-stripped key so distinct query strings cannot grow the cache without bound.
- **Dependencies.** `npm audit fix` cleared the picomatch (high) and brace-expansion advisories and bumped the top-level postcss. The remaining advisory is Next's build-time-only nested postcss, which is non-exploitable here: only the app's own CSS passes through postcss, and the deployed artifact is static.

### Changed

- `vercel.json` builds via the canonical `npm run build` script. Security headers, CSP, and caching stay centralized in `next.config.mjs`, which Vercel honors.

## 0.3.0

A platform upgrade plus the production audio/asset fix and continuous playback. Framework, fonts, service worker, and response headers were all reworked; the religious-content rule is unchanged (verse text, translation, tafsir, and audio still come only from the verified Quran.com API or committed snapshots).

### Changed

- **Framework upgrade**. Next.js 14.2 → 16.2.7 (builds run on Turbopack; `turbopack.root` is pinned in `next.config.mjs` so a stray parent lockfile is not inferred as the workspace root). React 18 → 19.2.7 (`react-dom` 19.2.7), `@types/react` → ^19, Node 24. Tailwind stays at 3.4.19 on purpose — Tailwind v4 is not required by Next 16 and would risk the tuned design.
- **ESLint 9 flat config**. `eslint.config.mjs` spreads `eslint-config-next/core-web-vitals`; `.eslintrc.json` was removed. The lint script is now `eslint .` (not `next lint`, which Next 16 deprecates). `package.json` scripts: `dev`, `build`, `start`, `lint`, `verify`, `verify:scripts`, `verify:ui`.
- **Next 15+ async route APIs**. Dynamic-route `params` is now a Promise — awaited in server routes, unwrapped with React `use()` in client routes (`practice/[module]`). Segment `revalidate` exports use a literal number of seconds (e.g. `86400`, `604800`).
- **Self-hosted fonts via `next/font`**. Inter, Plus Jakarta Sans, JetBrains Mono, Amiri, and Amiri Quran are all self-hosted; the render-blocking Google Fonts `<link>` in `layout.tsx` was removed. Tailwind `fontFamily` tokens reference the `next/font` CSS variables (`var(--font-quran)`, `var(--font-amiri)`, `var(--font-inter)`, etc.).
- **CSP and response headers consolidated** into `next.config.mjs` as the single source; `vercel.json` is trimmed to just `framework` + `buildCommand` (its competing headers removed). `script-src` drops `'unsafe-eval'` in production (kept only in dev for HMR); `style-src`/`font-src` no longer list `fonts.googleapis.com`/`fonts.gstatic.com` (fonts are self-hosted); `connect-src 'self' https://api.quran.com`; `media-src 'self' https://verses.quran.com https://*.quranicaudio.com https://audio.qurancdn.com`.

### Added

- **Build-stamped service worker (production fix)**. The static `public/sw.js` (`CACHE_VERSION = "v1"`) never invalidated caches across deploys, leaving users on a stale shell/assets. It was removed. The worker is now served by a Next route handler `src/app/sw.js/route.ts` (`force-static`) that stamps a unique per-build version into `scripts/sw-template.js`, so each deploy gets fresh cache namespaces and the activate step purges old caches. Scope is limited to the app shell (HTML, network-first) and same-origin static assets (cache-first); it does not intercept cross-origin Quran audio (mp3) or the Quran.com API, so the worker can never break audio playback (the trade-off is no offline Quran content).
- **"Play surah" control** in the Mushaf reader toolbar. Plays the whole surah continuously, auto-advancing ayah to ayah, pausable anywhere.
- **Mini-player mode toggle** between single and full-surah playback. A plain verse tap is single mode; per-verse "play from here" and "Play surah" are continuous.

### Audio provider

- Per-ayah audio comes from the Quran.com API (`/recitations/{id}/by_ayah/{key}`); the returned path resolves to `verses.quran.com` or `*.quranicaudio.com` (e.g. `mirrors.quranicaudio.com`). 12 reciters in `src/lib/reciters.ts`.

## 0.2.1 — 2026-05-02

A second pass on the 0.2.0 branch that picks up the items the original release deliberately left out. Each item is wired with its own atomic commit and a smoke-tested verify script.

### Added

- **Spaced repetition (Leitner)**. Every authored question is tracked by stable id under `progress.reviews`. A correct answer promotes one box (intervals 1, 3, 7, 14, 30 days; max box 5 = mastered); a wrong answer drops to box 1. New: `src/lib/spaced-repetition.ts`, `useReviews` hook, `/practice/review` route, `getDueQuestions(dueIds, count)`, Review Due tile on `/practice` (only renders when `due > 0`), Spaced Review stats card on `/progress`. `QuizSession` accepts a `mode: "random" | "review"` prop and writes through `recordReview` after every answer.
- **Memorization tracker** in the Mushaf reader. Per-verse heart toggle persists to `progress.memorizedVerses` (capped at 6,236 unique `surah:ayah` keys, format-validated). `useMemorization()` hook keeps the UI in sync. The reader toolbar exposes an eye toggle that activates recall mode: every memorized verse on the visible page is blurred (`blur-md`, 60% opacity) with a per-verse Reveal pill. The recall toggle is in-session state, not persisted. Memorization stats card appears on `/progress` once any verse is marked.
- **Global search** at `/search`. Cached index covers all 114 surahs, the 9 lesson modules, every rule (with subtypes), tafkheem subsections, makharij regions, and waqf symbols. Simple ranked search by tokenized substring across title, subtitle, and a denormalized haystack; minimum query length 2. Each hit links to its canonical route (`/learn/<module>#<anchor>` for rules, `/mushaf/surah/<n>` for surahs). New top-level nav entry with a search icon.
- **TTS for question prompts** via the Web Speech API. A small speaker button next to each prompt reads the prompt text aloud (`ar-SA` or `en-US` based on the active locale, rate 0.95). Single-utterance: starting a new readout cancels any in-flight one. The button hides when the browser doesn't expose `speechSynthesis`. **Quranic verse text is never read by TTS** — only UI prompts.
- **Lesson section progress chip**. Each of the 9 lesson pages declares its anchor list, and `<LessonProgress moduleId sections>` mounts an `IntersectionObserver` (40% threshold) to mark sections read in `progress.readSections[moduleId]`. A fixed bottom-right chip shows "X / Y sections read" and links to the next unread anchor; it auto-hides when everything is read. New: `useReadSections` hook, `markSectionRead`, slug-validated against `^[a-z0-9][a-z0-9-]{0,80}$`, capped at 50 per module.
- **Anonymous local analytics** with route and quiz instrumentation. `progress.analytics` is a 1000-event ring buffer keyed by a fixed `AnalyticsEventType` set (`route.view`, `quiz.start`, `quiz.finish`, `review.start`, `memorize.toggle`, `search.query`). Meta payloads are capped at 200 chars. `RouteAnalytics` (mounted in `AppProvider`) records a `route.view` on every navigation. `QuizSession` records `quiz.start` / `review.start` on entry and `quiz.finish` on completion. `/progress` adds an Insights card with quiz starts, finishes, and the top 5 most-visited routes. **Local-only — never transmitted.**
- **Backup and restore** in Settings. `exportProgress()` returns a pretty-printed JSON snapshot of the full sanitized progress object; `importProgress(payload)` parses, sanitizes, and replaces. The Settings UI offers Export (downloads `tajweed-trainer-backup-YYYY-MM-DD.json`) and Restore (file picker, soft-reload after success). Failure surfaces a localized error message.
- **Installable PWA**. `app/manifest.ts` (Next.js metadata route) ships the web manifest with a regular and a maskable SVG icon. `public/sw.js` ships a service worker with strategies: network-first for HTML, cache-first for `/icon*` and `/_next/static/*`, stale-while-revalidate for `api.quran.com` and `api.alquran.cloud`, and cache-first with a 50-entry FIFO cap for `cdn.islamic.network` audio. The worker registers via `<PWARegister/>` mounted in `AppProvider` (production builds only). `app/layout.tsx` adds `themeColor`, `applicationName`, `appleWebApp`, and explicit `icons`.

### Changed

- `TajweedProgress` extended with four new fields: `reviews: Record<string, ReviewState>`, `memorizedVerses: string[]`, `readSections: Record<string, string[]>`, `analytics: AnalyticsEvent[]`. All four are sanitized on every read with explicit validators and per-field caps (see `docs/api-integrations.md` "Storage caps").
- `MushafPage` and `MushafReader` accept a `memorizationMode` prop and render the per-verse memorize toggle and the toolbar eye toggle.
- `PracticeQuestion` renders an optional speaker button next to the prompt when the browser supports `speechSynthesis`.
- `AppProvider` mounts `<PWARegister/>` and `<RouteAnalytics/>` once at the app shell level.
- `SearchIcon` added to `nav-data.tsx`; the new `/search` route appears between `/practice` and `/progress` in both the desktop sidebar and the mobile drawer.
- The 9 lesson pages each import `LessonProgress` and declare a top-level `SECTIONS` constant derived from JSON (rule ids, subtype ids, plus the static overview anchors).

### Documentation

- README features list, project layout, and scripts table updated for spaced repetition, memorization, search, TTS, lesson sequencing, analytics, backup, and PWA.
- `docs/architecture.md` lists the new routes, hooks, and library files; updated layer diagrams reflect the spaced-repetition and memorization data flow.
- `docs/api-integrations.md` storage caps table extended with `reviews`, `memorizedVerses`, `readSections`, and `analytics` rows; new section for the local-only data fields.
- `docs/security.md` adds a section explaining that local analytics never leave the device and clarifying the PWA service worker's privacy posture.
- `docs/i18n.md` updated to list the new translation namespaces (`review.*`, `memorize.*`, `search.*`, `speech.*`, `insights.*`, `learn.sectionsRead`, `settings.backup.*`, `mushaf.memorize*`).
- `docs/development.md` documents `verify-newfeatures.mjs` and the new manual smoke checklist for offline / install behavior.

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

PWA / offline support, spaced repetition, memorization tracker, lesson sequencing within a module, accounts / cross-device sync, search, hadith content, audio for question prompts. These were held back to keep the release focused; most landed in 0.2.1.

## 0.1.0

Initial release. Foundation, learning modules, practice quiz, Mushaf reader, progress tracking, bilingual UI, dark mode, ornate Islamic design system. The full pre-0.2.0 feature surface.
