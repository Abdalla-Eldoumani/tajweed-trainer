# Tajweed Trainer

A bilingual (English / Arabic) web app for learning Tajweed, the rules of proper Quran recitation. It combines structured lessons, color-coded examples, and a 604-page Madinan Mushaf reader with tap-to-play audio.

All rules follow Hafs 'an 'Asim, the most widely used Qira'ah globally. Quranic text and recitation come from established APIs; rule explanations and examples come from JSON files that are reviewed against primary sources before they're marked verified.

## Features

- **Mushaf reader** at `/mushaf`. The full 604-page Madinan Quran with tajweed coloring and tap-to-play audio. A prominent **Play surah** control in the toolbar plays the whole surah continuously, auto-advancing ayah to ayah and pausable anywhere. Surah index with search and a Makkah/Madinah filter, page bookmarks, surah-aware navigation. The reader follows the Madinan layout: ornate gold/red/blue border, decorative cartouche on each surah header, separate Bismillah line on surah starts (with the two correct exceptions: Al-Fatihah, where the Bismillah is verse 1, and At-Tawbah, which has no Bismillah).
- **Always-visible playback surface** in the reader. A docked, collapsible panel sits beside the page at desktop width (1024px and up) and a bottom sheet takes its place on phone and tablet, so the verse you are playing is never hidden behind the controls. A plain tap on a verse plays just that verse, with an immediate loading state and a quiet marker on the one that is sounding.
- **Multi-verse selection for revision**. Pick a contiguous range or hand-pick a set of verses; either way they play as one auto-advancing queue on the same audio engine. Set a per-verse repeat count, loop the whole selection, and choose an inter-verse pause from a few presets. The selection shows as removable chips with a one-action clear.
- **Dynamic in-reader index**. The surah and juz pickers always read out the surah(s) and juz on the open page, even straight after a deep-linked reload, and they update as you turn pages. A Cmd/Ctrl+K quick-jump palette (with a visible button) jumps to any surah, page, or juz.
- **Tap a colored letter to learn its rule**. Any color-coded letter in the reader (and in the lesson examples) opens a small popover naming the tajweed rule and its color, with a "Learn more" link to the lesson that teaches it. The popover names the rule from the verified color map and never explains it in its own words.
- **Bookmarked verses** at `/mushaf/bookmarks`, linked from the surah index. Every verse you bookmark in the reader is listed with its text and quick links to open or remove it. Per-surah resume: the index shows a "resume" pill for any surah you left partway through, jumping back to your last position.
- **Private per-verse notes**. The verse panel holds a personal note in your own words for any verse. Notes stay on the device, are never transmitted, and are covered by backup and restore.
- **Reciter A/B compare**. The verse panel can play the same verse by two reciters back to back on the one audio engine, so you can hear the difference between recitation styles for yourself.
- **Memorization tracker** on the progress page and in the reader. Mark verses memorized in bulk by surah, juz, or range, or one at a time, reconciled against the 6236-verse total. A headline shows your memorized count and percentage of 6236, with a per-surah and per-juz breakdown. A review session scoped to your memorized verses runs in recall mode, which blurs each verse so you can test yourself, with per-verse reveal and multi-verse playback on hand.
- **Khatmah reading planner** on the progress page. Set a target date or pick a 30, 60, or 90-day preset and the planner tracks completion from your reader position, showing the daily pace, the page you should reach today, and whether you are ahead or behind. The pace math is a small pure library (`src/lib/khatmah.ts`).
- **First-launch onboarding**. A short, skippable welcome on first open explains the Mushaf, recall mode, and the tracker. It is shown once.
- **Nine learning modules**: Makharij Al-Huroof (articulation points), Noon Sakinah & Tanween, Meem Sakinah, Ghunnah, Qalqalah, Madd, Laam & Raa, Tafkheem & Tarqeeq, and Waqf.
- **Bilingual UI and content**. Every visible English string has an Arabic counterpart. The language pill in the sidebar flips chrome, lesson content, common-mistake lists, surah names, weekday letters, and the 404 page. RTL handled correctly.
- **Color-coded Quran text** rendered from the Quran.com Foundation API's `text_uthmani_tajweed` field, using the standard Tajweed-Mushaf palette.
- **Audio playback** from the Quran.com Foundation API (`/recitations/{id}/by_ayah/{key}`, resolving to verses.quran.com or the quranicaudio.com mirrors). Nineteen reciters in `src/lib/reciters.ts`: twelve from Quran.com and seven from everyayah.com, defaulting to Al-Husary in the muallim (teaching) style; the picker in Settings is grouped by recitation style. Each everyayah file was confirmed to resolve, the host is allowlisted in `src/lib/media-url.ts` and the CSP, and a missing ayah file falls back instead of stalling. Playback runs through a global player: a plain verse tap plays just that verse (single mode), while "play from here" and **Play surah** play continuously, with a single-verse <-> full-surah mode toggle in the mini-player. The mini-player can be dragged by its handle to any corner; its position is clamped to the viewport and saved in settings.
- **Practice hub** at `/practice` with a tile per module (280 authored questions across 9 modules), a Mixed Review tile drawing from every module, and a Review Due tile when spaced-repetition reviews are pending. Each module has its own route at `/practice/<module>`; spaced reviews live at `/practice/review`.
- **Spaced repetition** with a Leitner box scheduler. Every answered question is tracked by stable id; correct answers promote one box (intervals 1, 3, 7, 14, 30 days), wrong answers reset to box 1.
- **Module lock** in `/learn`: each module is gated by completing one lesson in its prerequisite. Locked URLs render a dedicated screen with a CTA to the prerequisite, never lesson content.
- **Post-answer feedback** in the practice flow: every answer surfaces the rule name, a one-line explanation, and a deep link to the matching lesson section. Optional Web Speech API readout of the question text (UI text only, never the verse).
- **Lesson section progress** chip on every lesson page. An IntersectionObserver counts how many anchored sections you've scrolled through; the floating chip shows "X / Y sections read" and jumps to the next unread one on tap.
- **Global search** at `/search` across surahs, lesson modules, tajweed rules, and waqf symbols. Matches title and body fields, returns ranked results, and filters them by kind with an optional facet that narrows verse hits to the ones you have memorized.
- **Progress tracking** in `localStorage`: lesson completion, quiz history per module, daily streaks, Mushaf bookmarks, last page read, spaced-review boxes, memorized verses, read sections, and a 1000-event ring buffer of anonymous local insights (route views and quiz starts/finishes).
- **Backup and restore**. Export your entire progress to a JSON file from Settings, or import a backup to roll forward when switching browsers or devices. A gentle reminder in Settings suggests a fresh export when you have unsaved progress and have not backed up in a while. No server involved.
- **Installable PWA**. The app ships a web manifest, maskable icon, and a service worker (network-first HTML, cache-first same-origin static assets) so it can be installed and works offline for previously-visited shell content. The worker is served by a Next route handler (`src/app/sw.js/route.ts`) that stamps a unique per-build cache version, so each deploy gets fresh cache namespaces and the activate step purges old caches. It deliberately does not intercept cross-origin Quran audio or the Quran.com API, so the worker can never break playback (offline Quran content is the trade-off).
- **Manuscript visual identity** in light and dark. A vellum-ivory ground, lapis ink for interaction, gold-leaf ornament, and an illuminated-margin navigation band, carried by a shared set of UI primitives across every page.
- **Dark mode** with adjusted tajweed colors so contrast holds up.
- **Resilient by default**. A root error boundary keeps a single failed render from blanking the app, the reader shows loading skeletons while a page resolves, the localStorage sanitizer rejects prototype-pollution keys, and motion and scroll-lock helpers keep overlays and animations well-behaved. CI runs a production dependency audit on every push and pull request. Accessibility details are in [docs/accessibility.md](docs/accessibility.md).

## Quick start

You need Node 24. The version is pinned in `.nvmrc` and `engines.node`, so `nvm use` picks it up.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. No accounts, no server, no environment variables. The app is fully client-side: state lives in `localStorage`, and the only network calls are read-only fetches to the Quran APIs.

## Checks

```bash
npx tsc --noEmit                  # type check
npm run lint                      # eslint . (flat config; Next 16 deprecates `next lint`)
npm run verify                    # tsc + eslint + verify:scripts (the offline suite)
npm run verify:scripts            # the offline verify-*.mjs suite on its own
npm run build                     # production build (Turbopack)
npm run verify:ui                 # browser tests against a running server (Chromium)
```

`npm run verify:scripts` runs the offline `scripts/verify-*.mjs` suite that needs no browser (tajweed-color parity, lesson coloring, navigation, reading, reading depth, reciter data, sanitizer, security, study tools, content accuracy, player position, word segments, mastery, the player engine, memorization, khatmah pace, and accessibility), and `npm run verify` wraps it after the type check and lint. The type check, lint, the offline verify scripts, and the build are what runs in CI on every push and pull request, so a green `npm run verify` plus `npm run build` mirrors the gate. `npm run verify:ui` is separate: it drives Chromium against a running server and is not part of the CI gate, so run it when you change the UI rather than on every commit. See [docs/development.md](docs/development.md) for setup and [docs/content-audit.md](docs/content-audit.md) for the content check.

## How it stays accurate

Tajweed is an oral science traced through chains of recitation back to the Prophet ﷺ. A missing diacritic or a wrong letter classification can change meaning, so the project enforces a few hard rules:

1. **No fabricated tajweed content.** Rules, letter classifications, and Quranic examples live in pre-reviewed JSON in `src/data/content/`. Each example carries a surah:ayah reference. `node scripts/verify-content.mjs` confirms every practice question's Arabic fragment appears in the authenticated text of the verse it cites. See [docs/content-schema.md](docs/content-schema.md) and [docs/content-audit.md](docs/content-audit.md).
2. **Color-coded Quran text comes from the API.** The Quran.com Foundation `text_uthmani_tajweed` field carries the full color markup, sanitized at the API boundary. We render it as-is and never mix it with user-supplied text. See [docs/api-integrations.md](docs/api-integrations.md).
3. **Hafs 'an 'Asim only.** No mixing of qira'aat. Beat counts and letter sets follow Hafs.
4. **When in doubt, omit.** It's better to leave an Arabic field empty and fall back to English than to ship an unreviewed translation.

The same rule is why per-letter tafkheem coloring in the Mushaf is not shipped: the Quran.com API does not emit a tafkheem class for these letters, and there was no clean verified dataset to drive it without the app classifying tajweed on its own, which the project does not do. The Tafkheem and Tarqeeq lesson covers the heavy and light letters and stands on its own.

## Tech

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI runtime | React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3.4 |
| Lint | ESLint 9 (flat config, `eslint.config.mjs`) |
| Fonts | Self-hosted via `next/font` (Inter, Spectral, JetBrains Mono, Amiri, Amiri Quran) |
| Node | 24 |
| State | localStorage (SSR-safe via `useSettings` and `useProgress`) |
| Tajweed text | [Quran.com Foundation API v4](https://api.quran.com/api/v4) |
| Audio | [Quran.com Foundation API v4](https://api.quran.com/api/v4) (verses.quran.com / quranicaudio.com mirrors) and [everyayah.com](https://everyayah.com) for seven added reciters |
| Browser test | playwright-core against a locally cached Chromium |

The Mushaf reader pre-renders a handful of the most-trafficked pages at build time and falls through to Incremental Static Regeneration (24-hour revalidation) for the rest.

### Data sources

- **Quran.com Foundation API v4** for color-coded tajweed text (the `text_uthmani_tajweed` field) and per-ayah audio. No key, no auth.
- **everyayah.com** for the seven added reciters. Their per-ayah file paths are built in `src/lib/audio-api.ts` from the folders in `src/lib/reciters.ts`; the host is allowlisted in `src/lib/media-url.ts` and the CSP.
- **Bundled verified snapshots** in `src/data/` for lesson content and the daily verse, so lessons render without a network round-trip and the tajweed/lesson data stays fixed and reviewed.

## Deploy

The app deploys to Vercel as a static client-side build with no server runtime or secrets. The Content Security Policy and the other response headers live in `next.config.mjs` (the single source); `vercel.json` carries only the framework and build command. See [docs/security.md](docs/security.md) for the header and CSP details.

## Project layout

```
src/
  app/                       App Router routes
    page.tsx                 Home
    learn/                   9 module pages (with section-progress chip)
    practice/                Hub of module tiles
      [module]/              Per-module quiz
      mixed/                 Random across all modules
      review/                Spaced-repetition review queue
    progress/                Progress, streak, review/memorize stats, insights
    settings/                User preferences (incl. backup / restore)
    search/                  Global search across surahs, modules, rules, waqf
    mushaf/                  604-page reader (with memorization toggles)
      page.tsx               Surah index
      page/[page]/           /mushaf/page/{1..604}
      surah/[surah]/         /mushaf/surah/{1..114} -> redirect
      bookmarks/             Saved-verse list
    manifest.ts              PWA web manifest (metadata route)
    sw.js/route.ts           Service worker route handler (per-build cache version)
    error.tsx                Root error boundary
    global-error.tsx         Top-level error boundary (catches layout failures)
  components/
    ui/                      ArabicText, TajweedText, AudioPlayer, Card, Ornament, ...
    layout/                  Sidebar, Header, MobileDrawer, AppProvider, nav-data
    learn/                   ModuleCard, RuleCard, ExampleCard, LetterGrid, MakhrajDiagram, ...
    practice/                PracticeQuestion, QuizSession, StreakCounter
    mushaf/                  MushafFrame, SurahCartouche, BismillahLine, MushafPage, MushafReader, MushafIndex
  hooks/                     usePlayer, useSettings, useProgress, useReviews, useMemorization, useReadSections, useAnalytics, useSpeech, useModuleLock, useBookmarks
  lib/                       types, i18n, quran-api, audio-api, tajweed-colors, storage, utils, question-pool, search, spaced-repetition, khatmah, tajweed-rule-links, reduced-motion, scroll-lock
  data/content/              Reviewed tajweed JSON (rule files, glossary, learning-path, surah-index)
  app/globals.css            Tajweed colors, Mushaf frame, Islamic patterns
public/
  icon.svg                   PWA icon (any purpose)
  icon-maskable.svg          PWA icon (maskable purpose)
scripts/
  fetch-surah-names.mjs      One-shot: pulls /chapters and patches surah_name_ar
  prefetch-tajweed-snapshots.mjs  One-shot: pulls verified tajweed snapshots
  sw-template.js             Service worker template (stamped with a per-build version)
  verify-*.mjs               The offline content and behavior suite (run by verify:scripts)
  verify-mushaf.mjs          Browser suite for the Mushaf reader (run by verify:ui)
  capture-responsive.mjs     Screenshots routes at 375/768/1440
docs/
  architecture.md            System architecture and data flow
  content-schema.md          JSON content format and how to add a rule
  content-audit.md           Content accuracy guarantees and the content check
  CONTENT.md                 How to author practice questions and lesson anchors
  api-integrations.md        Quran APIs, caching, retries, fallbacks
  mushaf-reader.md           Mushaf design and component breakdown
  advanced-features.md       Feasibility notes for larger optional features
  i18n.md                    Bilingual approach (EN + AR)
  accessibility.md           Keyboard, focus, contrast, RTL, and offline behavior
  security.md                Sanitization, CSP, and the local-only data posture
  development.md             Dev workflow, scripts, testing
  contributing.md            How to contribute and review checklist
  sources.md                 Data sources, attribution, and religious-content stance
```

## Documentation

- [Architecture](docs/architecture.md): the layers, what lives where, request and data flow.
- [Content schema](docs/content-schema.md): every JSON file explained, how to add a rule or example.
- [Content accuracy](docs/content-audit.md): the guarantees behind the tajweed content and the content check.
- [Content authoring](docs/CONTENT.md): how to add practice questions, lesson anchors, and verse snapshots.
- [API integrations](docs/api-integrations.md): endpoints, response shapes, caching, retries.
- [Mushaf reader](docs/mushaf-reader.md): how the 604-page reader is built, edge cases, verification.
- [Advanced features](docs/advanced-features.md): feasibility notes for larger optional features and why each was built or deferred.
- [i18n](docs/i18n.md): the bilingual approach, where Arabic comes from, RTL handling.
- [Accessibility](docs/accessibility.md): keyboard operability, focus, contrast, RTL, and offline behavior.
- [Security](docs/security.md): sanitization, headers, and why the local data never leaves the device.
- [Development](docs/development.md): local setup, scripts, debugging, performance notes.
- [Contributing](docs/contributing.md): code style, review checklist, PR template.
- [Sources and attribution](docs/sources.md): the data sources, credits, and the religious-content stance.

## Contributing

Contributions are welcome. The short version:

1. Clone, then `npm install` and `npm run dev`.
2. Make a small, focused change. One logical change per commit, lowercase commit messages.
3. Run the checks: `npx tsc --noEmit`, `npm run lint`, `npm run verify`, and `npm run build`. If you touched the UI, run `npm run verify:ui` against a running server and check it in English, Arabic, light, and dark.
4. Open a pull request describing what changed and why.

One rule overrides the rest: all Quran text and tajweed annotations come from verified sources and are rendered, never generated, paraphrased, or edited. If you cannot confirm a piece of religious content against a source, leave it out. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full setup, conventions, and how CI gates a pull request; the review checklist and PR template are in [docs/contributing.md](docs/contributing.md), with the content rules in [docs/content-audit.md](docs/content-audit.md) and [docs/CONTENT.md](docs/CONTENT.md).

## License

MIT. See [LICENSE](LICENSE). By contributing you agree your work is licensed under the same terms.
