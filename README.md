# Tajweed Trainer

A bilingual (English / Arabic) web app for learning Tajweed, the rules of proper Quran recitation. It combines structured lessons, color-coded examples, and a 604-page Madinan Mushaf reader with tap-to-play audio.

All rules follow Hafs 'an 'Asim, the most widely used Qira'ah globally. Quranic text and recitation come from established APIs; rule explanations and examples come from JSON files that are reviewed against primary sources before they're marked verified.

## Features

- **Mushaf reader** at `/mushaf`. The full 604-page Madinan Quran with tajweed coloring and tap-to-play audio. Surah index with search and a Makkah/Madinah filter, page bookmarks, surah-aware navigation. The reader follows the Madinan layout: ornate gold/red/blue border, decorative cartouche on each surah header, separate Bismillah line on surah starts (with the two correct exceptions: Al-Fatihah, where the Bismillah is verse 1, and At-Tawbah, which has no Bismillah).
- **Nine learning modules**: Makharij Al-Huroof (articulation points), Noon Sakinah & Tanween, Meem Sakinah, Ghunnah, Qalqalah, Madd, Laam & Raa, Tafkheem & Tarqeeq, and Waqf.
- **Bilingual UI and content**. Every visible English string has an Arabic counterpart. The language pill in the sidebar flips chrome, lesson content, common-mistake lists, surah names, weekday letters, and the 404 page. RTL handled correctly.
- **Color-coded Quran text** rendered from the Quran.com Foundation API's `text_uthmani_tajweed` field, using the standard Tajweed-Mushaf palette.
- **Audio playback** from Al Quran Cloud. Two reciters: Al-Husary mu'allim (slow and clear, default for learning) and Mishary Alafasy (melodic).
- **Practice quizzes** built only from verified examples. Multiple-choice "identify the rule" with parallel English and Arabic option sets.
- **Progress tracking** in `localStorage`: lesson completion, quiz history, daily streaks, Mushaf bookmarks, last page read.
- **Dark mode** with adjusted tajweed colors so contrast holds up.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

```bash
npm run build      # production build
npm run lint       # eslint via next lint
node scripts/verify-mushaf.mjs   # browser test of the Mushaf reader
```

The verify script needs the dev server running. It drives Chromium and runs 21 assertions against the Mushaf flow. See [docs/development.md](docs/development.md) for setup.

## How it stays accurate

Tajweed is an oral science traced through chains of recitation back to the Prophet ﷺ. A missing diacritic or a wrong letter classification can change meaning, so the project enforces a few hard rules:

1. **No fabricated tajweed content.** Rules, letter classifications, and Quranic examples live in pre-reviewed JSON in `src/data/content/`. Each example carries a surah:ayah reference. See [docs/content-schema.md](docs/content-schema.md).
2. **Color-coded Quran text comes from the API.** The Quran.com Foundation `text_uthmani_tajweed` field carries the full color markup, sanitized at the API boundary. We render it as-is and never mix it with user-supplied text. See [docs/api-integrations.md](docs/api-integrations.md).
3. **Hafs 'an 'Asim only.** No mixing of qira'aat. Beat counts and letter sets follow Hafs.
4. **When in doubt, omit.** It's better to leave an Arabic field empty and fall back to English than to ship an unreviewed translation.

## Tech

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3.4 |
| State | localStorage (SSR-safe via `useSettings` and `useProgress`) |
| Tajweed text | [Quran.com Foundation API v4](https://api.quran.com/api/v4) |
| Audio | [Al Quran Cloud](https://api.alquran.cloud/v1) |
| Browser test | playwright-core against a locally cached Chromium |

The Mushaf reader pre-renders a handful of the most-trafficked pages at build time and falls through to Incremental Static Regeneration (24-hour revalidation) for the rest.

## Project layout

```
src/
  app/                       App Router routes
    page.tsx                 Home
    learn/                   9 module pages
    practice/                Quiz session
    progress/                Progress and streak history
    settings/                User preferences
    mushaf/                  604-page reader
      page.tsx               Surah index
      page/[page]/           /mushaf/page/{1..604}
      surah/[surah]/         /mushaf/surah/{1..114} -> redirect
  components/
    ui/                      ArabicText, TajweedText, AudioPlayer, Card, Ornament, ...
    layout/                  Sidebar, Header, MobileDrawer, AppProvider, nav-data
    learn/                   ModuleCard, RuleCard, ExampleCard, LetterGrid, MakhrajDiagram, ...
    practice/                PracticeQuestion, QuizSession, StreakCounter
    mushaf/                  MushafFrame, SurahCartouche, BismillahLine, MushafPage, MushafReader, MushafIndex
  hooks/                     useAudio, useSettings, useProgress, useLocalStorage
  lib/                       types, i18n, quran-api, audio-api, tajweed-colors, storage, utils, question-pool
  data/content/              Reviewed tajweed JSON (rule files, glossary, learning-path, surah-index)
  app/globals.css            Tajweed colors, Mushaf frame, Islamic patterns
scripts/
  fetch-surah-names.mjs      One-shot: pulls /chapters and patches surah_name_ar
  verify-mushaf.mjs          21-check browser test for the Mushaf reader
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
