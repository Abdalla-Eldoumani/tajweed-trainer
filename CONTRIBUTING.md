# Contributing

Contributions are welcome. This is a project about Quranic recitation, so accuracy comes before speed. Read the rules below before you open a pull request; the content rule in particular is non-negotiable.

For the full review checklist and PR template, see [docs/contributing.md](docs/contributing.md). For the content rules in depth, see [docs/content-audit.md](docs/content-audit.md) and [docs/CONTENT.md](docs/CONTENT.md). This file is the short entry point.

## Prerequisites

- Node 24. The version is pinned in `.nvmrc` and `engines.node`, so `nvm use` picks it up.
- npm (bundled with Node).

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. No accounts, no server, no environment variables. State lives in `localStorage`, and the only network calls are read-only fetches to the Quran APIs.

## Checks

Run these before opening a pull request. They are exactly what a reviewer expects to pass.

```bash
npx tsc --noEmit          # type check
npm run lint              # eslint .
npm run verify            # tsc + eslint + verify:scripts
npm run verify:scripts    # the offline verify-*.mjs suite on its own
npm run build             # production build
npm run verify:ui         # browser tests against a running server
```

`npm run verify` wraps the type check, the lint, and `npm run verify:scripts` (the offline `scripts/verify-*.mjs` suite: tajweed-color parity, lesson coloring, navigation, reading, reciter data, the sanitizer, security, study tools, content accuracy, the player engine, memorization, and accessibility). `npm run verify:ui` is separate: it drives Chromium against a running server and is not part of the CI gate. Run it when you change the UI, and check your change in English, Arabic, light, and dark.

## Conventions

Keep changes small and focused. One logical change per commit, with brief lowercase messages.

This codebase has one path for each shared concern. Reuse it; do not fork a second.

- Storage writes go through `src/lib/storage.ts`. It is the only write path, and every read is sanitized there.
- Tajweed colors come only from `src/lib/tajweed-colors.ts`. Change the map, never a hex in CSS by hand.
- Module unlocking lives in `src/lib/module-unlock.ts`. Never reimplement the gating rule inline.
- All audio plays through the single player store (`usePlayer` / `PlayerHost`). There is one reused audio element.

Render Arabic through the Arabic-aware text wrappers (`ArabicText` for general Arabic, `TajweedText` for color-coded Quran text), never raw. Use Tailwind logical properties (`ms-*`, `me-*`) so the UI holds up under `dir="rtl"`.

## The content rule

The app renders pre-verified, human-authored content. It never generates, edits, paraphrases, translates, summarizes, or classifies religious content.

- Rules, letter classifications, and Quranic examples come only from the pre-verified JSON in `src/data/content/`, each example carrying an exact surah:ayah reference.
- Recitation follows Hafs an Asim only. No mixing of qira'aat.
- When in doubt, omit. An empty Arabic field that falls back to English is better than an unreviewed one.

`src/data/` and `src/lib/tajweed-colors.ts` are verified data and are not edited in a normal contribution. If you cannot confirm a piece of religious content against a primary source, leave it out.

## How CI gates a pull request

Opening or updating a pull request against `main` runs the CI workflow. It installs on Node 24 and runs the type check, the lint, the offline verify scripts (`npm run verify:scripts`), and a production build. A pull request must be green before review. Running `npm run verify` and `npm run build` locally mirrors the gate.
