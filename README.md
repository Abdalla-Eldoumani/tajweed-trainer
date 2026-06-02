# Tajweed Trainer

A bilingual (English / Arabic) web app for learning Tajweed, the rules of proper Quran recitation. It combines structured lessons, color-coded examples, and a 604-page Madinan Mushaf reader with tap-to-play audio.

All rules follow Hafs 'an 'Asim, the most widely used Qira'ah globally. Quranic text and recitation come from established APIs; rule explanations and examples come from JSON files that are reviewed against primary sources before they're marked verified.

## Features

- **Mushaf reader** at `/mushaf`. The full 604-page Madinan Quran with tajweed coloring and tap-to-play audio. A prominent **Play surah** control in the toolbar plays the whole surah continuously, auto-advancing ayah to ayah and pausable anywhere. Surah index with search and a Makkah/Madinah filter, page bookmarks, surah-aware navigation. The reader follows the Madinan layout: ornate gold/red/blue border, decorative cartouche on each surah header, separate Bismillah line on surah starts (with the two correct exceptions: Al-Fatihah, where the Bismillah is verse 1, and At-Tawbah, which has no Bismillah).
- **Nine learning modules**: Makharij Al-Huroof (articulation points), Noon Sakinah & Tanween, Meem Sakinah, Ghunnah, Qalqalah, Madd, Laam & Raa, Tafkheem & Tarqeeq, and Waqf.
- **Bilingual UI and content**. Every visible English string has an Arabic counterpart. The language pill in the sidebar flips chrome, lesson content, common-mistake lists, surah names, weekday letters, and the 404 page. RTL handled correctly.
- **Color-coded Quran text** rendered from the Quran.com Foundation API's `text_uthmani_tajweed` field, using the standard Tajweed-Mushaf palette.
- **Audio playback** from the Quran.com Foundation API (`/recitations/{id}/by_ayah/{key}`, resolving to verses.quran.com or the quranicaudio.com mirrors). Twelve verified reciters in `src/lib/reciters.ts`, defaulting to Al-Husary in the muallim (teaching) style; the picker in Settings is grouped by recitation style. Playback runs through a global player: a plain verse tap plays just that verse (single mode), while "play from here" and **Play surah** play continuously, with a single-verse <-> full-surah mode toggle in the mini-player.
- **Practice hub** at `/practice` with a tile per module (270 authored questions across 9 modules), a Mixed Review tile drawing from every module, and a Review Due tile when spaced-repetition reviews are pending. Each module has its own route at `/practice/<module>`; spaced reviews live at `/practice/review`.
- **Spaced repetition** with a Leitner box scheduler. Every answered question is tracked by stable id; correct answers promote one box (intervals 1, 3, 7, 14, 30 days), wrong answers reset to box 1.
- **Memorization tracker** in the Mushaf reader. Tap the heart icon next to a verse to mark it memorized; tap the eye toggle in the toolbar to enter recall mode, which blurs every memorized verse so you can test yourself, with per-verse reveal.
- **Module lock** in `/learn`: each module is gated by completing one lesson in its prerequisite. Locked URLs render a dedicated screen with a CTA to the prerequisite, never lesson content.
- **Post-answer feedback** in the practice flow: every answer surfaces the rule name, a one-line explanation, and a deep link to the matching lesson section. Optional Web Speech API readout of the question prompt (UI text only, never the verse).
- **Lesson section progress** chip on every lesson page. An IntersectionObserver counts how many anchored sections you've scrolled through; the floating chip shows "X / Y sections read" and jumps to the next unread one on tap.
- **Global search** at `/search` across surahs, lesson modules, tajweed rules, and waqf symbols. Matches title and body fields, returns ranked results.
- **Progress tracking** in `localStorage`: lesson completion, quiz history per module, daily streaks, Mushaf bookmarks, last page read, spaced-review boxes, memorized verses, read sections, and a 1000-event ring buffer of anonymous local insights (route views and quiz starts/finishes).
- **Backup and restore**. Export your entire progress to a JSON file from Settings, or import a backup to roll forward when switching browsers or devices. No server involved.
- **Installable PWA**. The app ships a web manifest, maskable icon, and a service worker (network-first HTML, cache-first same-origin static assets) so it can be installed and works offline for previously-visited shell content. The worker is served by a Next route handler (`src/app/sw.js/route.ts`) that stamps a unique per-build cache version, so each deploy gets fresh cache namespaces and the activate step purges old caches. It deliberately does not intercept cross-origin Quran audio or the Quran.com API, so the worker can never break playback (offline Quran content is the trade-off).
- **Dark mode** with adjusted tajweed colors so contrast holds up.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

```bash
npm run build          # production build (Turbopack)
npm run lint           # eslint . (flat config; Next 16 deprecates `next lint`)
npm run verify         # tsc --noEmit + eslint + the non-browser verify scripts
npm run verify:ui      # browser tests (Chromium) for mushaf, practice, reciters, module lock, new features
```

The `verify:ui` scripts need the dev server running. They drive Chromium against the live app. See [docs/development.md](docs/development.md) for setup.

## How it stays accurate

Tajweed is an oral science traced through chains of recitation back to the Prophet ﷺ. A missing diacritic or a wrong letter classification can change meaning, so the project enforces a few hard rules:

1. **No fabricated tajweed content.** Rules, letter classifications, and Quranic examples live in pre-reviewed JSON in `src/data/content/`. Each example carries a surah:ayah reference. See [docs/content-schema.md](docs/content-schema.md).
2. **Color-coded Quran text comes from the API.** The Quran.com Foundation `text_uthmani_tajweed` field carries the full color markup, sanitized at the API boundary. We render it as-is and never mix it with user-supplied text. See [docs/api-integrations.md](docs/api-integrations.md).
3. **Hafs 'an 'Asim only.** No mixing of qira'aat. Beat counts and letter sets follow Hafs.
4. **When in doubt, omit.** It's better to leave an Arabic field empty and fall back to English than to ship an unreviewed translation.

## Tech

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI runtime | React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3.4 |
| Lint | ESLint 9 (flat config, `eslint.config.mjs`) |
| Fonts | Self-hosted via `next/font` (Inter, Plus Jakarta Sans, JetBrains Mono, Amiri, Amiri Quran) |
| Node | 24 |
| State | localStorage (SSR-safe via `useSettings` and `useProgress`) |
| Tajweed text | [Quran.com Foundation API v4](https://api.quran.com/api/v4) |
| Audio | [Quran.com Foundation API v4](https://api.quran.com/api/v4) (verses.quran.com / quranicaudio.com mirrors) |
| Browser test | playwright-core against a locally cached Chromium |

The Mushaf reader pre-renders a handful of the most-trafficked pages at build time and falls through to Incremental Static Regeneration (24-hour revalidation) for the rest.

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
    manifest.ts              PWA web manifest (metadata route)
    sw.js/route.ts           Service worker route handler (per-build cache version)
  components/
    ui/                      ArabicText, TajweedText, AudioPlayer, Card, Ornament, ...
    layout/                  Sidebar, Header, MobileDrawer, AppProvider, nav-data
    learn/                   ModuleCard, RuleCard, ExampleCard, LetterGrid, MakhrajDiagram, ...
    practice/                PracticeQuestion, QuizSession, StreakCounter
    mushaf/                  MushafFrame, SurahCartouche, BismillahLine, MushafPage, MushafReader, MushafIndex
  hooks/                     useAudio, useSettings, useProgress, useReciters, useReviews, useMemorization, useReadSections, useAnalytics, useSpeech, useModuleLock
  lib/                       types, i18n, quran-api, audio-api, tajweed-colors, storage, utils, question-pool, search, spaced-repetition
  data/content/              Reviewed tajweed JSON (rule files, glossary, learning-path, surah-index)
  app/globals.css            Tajweed colors, Mushaf frame, Islamic patterns
public/
  icon.svg                   PWA icon (any purpose)
  icon-maskable.svg          PWA icon (maskable purpose)
scripts/
  fetch-surah-names.mjs      One-shot: pulls /chapters and patches surah_name_ar
  sw-template.js             Service worker template (stamped with a per-build version)
  verify-mushaf.mjs          Browser test for the Mushaf reader
  verify-module-lock.mjs     Browser test for module gating
  verify-questions.mjs       Browser test for the practice hub
  verify-reciters.mjs        Browser test for reciter selector
  verify-sanitizer.mjs       Sanitizer tests, no browser
  verify-newfeatures.mjs     Browser test for spaced repetition, memorization, search, TTS, PWA
  capture-responsive.mjs     screenshots routes at 375/768/1440
docs/
  architecture.md            System architecture and data flow
  content-schema.md          JSON content format and how to add a rule
  api-integrations.md        Quran APIs, caching, retries, fallbacks
  mushaf-reader.md           Mushaf design and component breakdown
  i18n.md                    Bilingual approach (EN + AR)
  development.md             Dev workflow, scripts, testing
  contributing.md            How to contribute and review checklist
```

## Documentation

- [Architecture](docs/architecture.md): the layers, what lives where, request and data flow.
- [Content schema](docs/content-schema.md): every JSON file explained, how to add a rule or example.
- [API integrations](docs/api-integrations.md): endpoints, response shapes, caching, retries.
- [Mushaf reader](docs/mushaf-reader.md): how the 604-page reader is built, edge cases, verification.
- [i18n](docs/i18n.md): the bilingual approach, where Arabic comes from, RTL handling.
- [Development](docs/development.md): local setup, scripts, debugging, performance notes.
- [Contributing](docs/contributing.md): code style, review checklist, PR template.

## License

MIT. See [LICENSE](LICENSE). Contributions welcome — see [docs/contributing.md](docs/contributing.md) before opening a PR.
