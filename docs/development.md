# Development guide

How to run, test, and iterate on the project locally.

## Prerequisites

- Node.js 24, and npm (bundled with it).
- A modern browser; the Mushaf verify script uses Chromium from `playwright-core`.

## Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Hot reload applies TS, TSX, CSS, and JSON edits on save.

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Dev server on `localhost:3000`. |
| `npm run build` | Production build (Turbopack, Next 16); validates types and SSG into `.next/`. |
| `npm start` | Serve the production build. |
| `npm run lint` | ESLint (`eslint .`) via the flat `eslint.config.mjs` (not the deprecated `next lint`). |
| `npm run verify` | Non-browser gate: `tsc --noEmit`, `eslint .`, then `npm run verify:scripts`. |
| `npm run verify:scripts` | Headless checks (no browser) across tajweed colors, coloring, navigation, reading, reciters, sanitizer, security, study tools, content accuracy, the player, word segments, mastery, memorization, khatmah pace, and accessibility. |
| `npm run verify:ui` | Playwright browser suites: module lock, Mushaf, new features, questions, reciters, audio player. |
| `node scripts/fetch-surah-names.mjs` | One-shot: pulls `/chapters`, patches `surah_name_ar` into rule examples. |
| `node scripts/prefetch-tajweed-snapshots.mjs` | One-shot: snapshots tajweed HTML for lesson verses into `src/data/verse-snapshots.json`. |
| `node scripts/verify-mushaf.mjs` | End-to-end browser test of the Mushaf reader. |
| `node scripts/verify-module-lock.mjs` | Browser test of module gating. |
| `node scripts/verify-questions.mjs` | Browser test of the practice hub and authored questions. |
| `node scripts/verify-reciters.mjs` | Browser test of the reciter selector. |
| `node scripts/verify-sanitizer.mjs` | Tajweed HTML sanitizer assertions (no browser). |
| `node scripts/verify-khatmah.mjs` | Khatmah pace-math assertions (no browser). |
| `node scripts/verify-accessibility.mjs` | Source-level accessibility guards, no browser (see [accessibility.md](accessibility.md)). |
| `node scripts/verify-newfeatures.mjs` | Browser test: spaced repetition, memorization, search, TTS, PWA endpoints. |

## Project conventions

### TypeScript

Strict mode; avoid `any`. New types go in `src/lib/types.ts`. Optional `_ar` fields are marked `?` so existing JSON keeps validating.

### Components

- `.tsx` files; client components (state, effects, or browser APIs) start with `"use client";`.
- Props inline as `interface FooProps { ... }`.
- Arabic text renders only through `<ArabicText>` or `<TajweedText>`, never raw `<span>`/`<p>`.

### Styling

- Tailwind only (no CSS modules or styled-components); custom CSS lives in `src/app/globals.css` (tajweed colors, mushaf frame, ornaments).
- Tailwind logical properties (`ms-*`, `me-*`, `border-s`, `border-e`) so RTL flips correctly.
- Fonts: `font-quran` (Amiri Quran), `font-arabic` (Amiri), `font-heading` (Spectral), `font-mono` (JetBrains Mono), default body (Inter).

### State

- localStorage via `useSettings()` (preferences) and `useProgress()` (lesson completion, quiz history), both SSR-safe.
- Specialized hooks for the newer fields: `useReviews()`, `useMemorization()`, `useReadSections(moduleId, sectionIds)`, and `useAnalytics()`. Each starts empty and populates from `getProgress()` after mount to keep SSR/CSR in sync.
- `useSpeech()` wraps the Web Speech API for prompt readout; falls back to `supported: false` when unavailable.
- Never read `localStorage` directly in components; use the hooks so the `mounted` pattern is enforced and sanitization fires on read.

### Naming

- Files: PascalCase components (`MushafPage.tsx`), camelCase hooks/utilities (`usePlayer.ts`, `quran-api.ts`).
- IDs in JSON: kebab-case (`noon-sakinah`, `madd-tabeeee`).
- Tailwind classes in source order (layout, spacing, color, typography); `cn()` merges duplicates.

### Comments

- Comments explain why, not what; no emoji in code, comments, docs, or commit messages.
- Avoid marketing-speak adjectives ("robust", "seamless", "leverage", "utilize").

## Workflow

1. Make a small, focused change.
2. Run `npx tsc --noEmit` to catch type issues fast.
3. For a UI-visible change, open the route in EN, AR, light, and dark.
4. For Mushaf changes, run `node scripts/verify-mushaf.mjs` (dev server in another terminal).
5. Run `npm run build` before committing significant work (catches SSG-time issues).
6. Commit each logical change separately with a brief, lowercase message explaining why.

## Verifying the Mushaf

`scripts/verify-mushaf.mjs` is the Mushaf regression suite. Run it against a live dev server:

```bash
npm run dev                     # terminal 1
node scripts/verify-mushaf.mjs  # terminal 2
```

Each assertion prints `PASS`, ending in `all checks passed.`; screenshots land in `mushaf-screenshots/` (see [mushaf-reader.md](mushaf-reader.md)).

It uses `playwright-core` and finds Chromium in the standard `playwright` cache directory; install it with `npx playwright install chromium`. Set `PLAYWRIGHT_CHROME=/absolute/path` to point at Chromium elsewhere, or `BASE_URL=https://example.com` to run against a deployment.

## Adding a new translation key

Add the key to `src/lib/i18n.ts` and reference it via `t("namespace.key")`. See [i18n.md](i18n.md) for the dictionary model and the `_ar` content fields.

## Adding a new tajweed example

See [content-schema.md](content-schema.md): edit the JSON, set `verified: true` only after a domain reviewer confirms accuracy, and run `node scripts/fetch-surah-names.mjs` for a new surah.

## Adding a new feature

Sketch the data flow first. Add types in `src/lib/types.ts` (optional fields optional); build the data layer, putting any API call in `src/lib/quran-api.ts` (or a new wrapper); build components leaves-first with mocked data; then wire the App Router page. Verify in EN, AR, light, and dark, and add a browser test if it's load-bearing (`verify-mushaf.mjs` is the template).

## Debugging

- **Hydration warnings.** Usually a localStorage-vs-server mismatch; use the `mounted` pattern in [i18n.md](i18n.md).
- **Tajweed colors missing.** The class name is probably absent from `tajweed-colors.ts`; add it.
- **Audio not playing.** Check the network tab; on a 404, verify `surah:ayah` in the example JSON.
- **`Cannot find module '@opentelemetry'`** or similar Next cache errors. Stop the dev server, `rm -rf .next`, restart.
- **404 on a route that should exist.** The file must be named `page.tsx`; the App Router is strict.

## Performance notes

- The Mushaf reader pre-renders 36 SSG pages (page 1, early surah starts, one per juz) and ISRs the rest at 24 hours. Extend coverage via the array in `generateStaticParams` of `src/app/mushaf/page/[page]/page.tsx`.
- Caches: the chapters list 7 days, audio URLs 1 hour, tajweed pages 15 minutes. Tweak in the respective wrapper.
- Heavy, non-critical surfaces lazy-load with `next/dynamic`: in the verse overlay the reciter compare, record-and-compare, word-by-word, and reading-depth section each load on first open, while the primary action row and transport stay eager so a tap and play are immediate. The progress certificate's canvas loads only with its card. Load placeholders are reduced-motion-safe.
- Bundle sizes (gzipped page bundles, excluding shared chunks): home ~5 kB, largest module page ~7 kB, Mushaf reader ~5 kB, all well under 200 kB First-Load JS. These are local figures; measure true Core Web Vitals against the deployed preview.

## Manual smoke checklist for installable / offline behavior

After a structural change, walk through:

1. `npm run build && npm start` (dev skips service-worker registration, so a production build is needed to exercise it).
2. In Chromium, DevTools → Application → Manifest: confirm `Tajweed Trainer`, the SVG icons, and `standalone` display mode.
3. Application → Service Workers: confirm `/sw.js` is registered and active, then reload so the cache populates.
4. Visit `/learn/qalqalah`, scroll, go offline (Network → Offline), and reload; the page renders, recitation audio does not (by design; see [security.md](security.md) for the worker's scope).
5. Take a quiz (two questions); confirm `progress.reviews` populates and the Review Due tile appears on `/practice` after the third refresh.
6. Mark a verse memorized, toggle the toolbar eye icon, and confirm it blurs with a Reveal pill.
7. `/search` "qalqalah" and "Al-Fatihah"; both should surface lesson and surah hits.
8. Settings → Backup & Restore → Export; confirm `reviews`, `memorizedVerses`, and `analytics` are present and well-formed.

## Production deploy

The default config builds a server-rendered app that deploys on Vercel, Netlify, or any Node host. For a static export, see Next's `output: "export"` docs and update `next.config.mjs`.
