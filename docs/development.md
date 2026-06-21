# Development guide

How to run, test, and iterate on the project locally.

## Prerequisites

- Node.js 24.
- npm (bundled with Node).
- A modern browser. The Mushaf verify script uses Chromium from `playwright-core`.

## Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Hot reload is on; edits to TS, TSX, CSS, and JSON take effect on save.

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the dev server on `localhost:3000`. |
| `npm run build` | Production build with Turbopack (Next 16). Validates types and SSG. Outputs to `.next/`. |
| `npm start` | Serve the production build. |
| `npm run lint` | Run ESLint over the project (`eslint .`). `next lint` is deprecated in Next 16; the flat config in `eslint.config.mjs` drives it. |
| `npm run verify` | Full non-browser gate: `tsc --noEmit`, then `eslint .`, then `npm run verify:scripts`. |
| `npm run verify:scripts` | The headless verification scripts (tajweed colors, lesson coloring, navigation, reading, reading depth, reciters data, sanitizer, security, study tools, content accuracy, player position, word segments, mastery, the player engine, memorization, khatmah pace, accessibility). No browser required. |
| `npm run verify:ui` | The Playwright browser suites: module lock, Mushaf, new features, questions, reciters, and the audio player. |
| `node scripts/fetch-surah-names.mjs` | One-shot: pulls `/chapters` and patches `surah_name_ar` into rule examples. |
| `node scripts/prefetch-tajweed-snapshots.mjs` | One-shot: snapshots the color-coded tajweed HTML for the lesson example verses into `src/data/verse-snapshots.json`. |
| `node scripts/verify-mushaf.mjs` | End-to-end browser test of the Mushaf reader. |
| `node scripts/verify-module-lock.mjs` | Browser test of module gating. |
| `node scripts/verify-questions.mjs` | Browser test of the practice hub and authored questions. |
| `node scripts/verify-reciters.mjs` | Browser test of the reciter selector. |
| `node scripts/verify-sanitizer.mjs` | Tajweed HTML sanitizer assertions (no browser). |
| `node scripts/verify-khatmah.mjs` | Khatmah pace-math assertions (no browser). |
| `node scripts/verify-accessibility.mjs` | Source-level accessibility guards: focus rings, reduced motion, scroll lock, aria-current, contrast (no browser). |
| `node scripts/verify-newfeatures.mjs` | Browser test of spaced repetition, memorization, search, TTS, and PWA endpoints. |

## Project conventions

### TypeScript

Strict mode. Avoid `any` unless absolutely necessary. New types belong in `src/lib/types.ts`. Optional `_ar` fields are added incrementally and marked `?` so existing JSON keeps validating.

### Components

- Files use `.tsx`.
- Client components (with state, effects, or browser APIs) start with `"use client";`.
- Props are defined inline as `interface FooProps { ... }`.
- Components that render Arabic text must use `<ArabicText>` or `<TajweedText>`, never raw `<span>` or `<p>`.

### Styling

- Tailwind only. No CSS modules, no styled-components.
- Custom CSS lives in `src/app/globals.css` (tajweed colors, mushaf frame, ornaments).
- Use Tailwind logical properties (`ms-*`, `me-*`, `border-s`, `border-e`) so RTL flips correctly.
- Custom fonts: `font-quran` (Amiri Quran), `font-arabic` (Amiri), `font-heading` (Spectral), `font-mono` (JetBrains Mono), default body (Inter).

### State

- localStorage via `useSettings()` (preferences) and `useProgress()` (lesson completion, quiz history). Both are SSR-safe.
- Specialized hooks for the new persistence fields: `useReviews()` (spaced repetition), `useMemorization()` (verse keys), `useReadSections(moduleId, sectionIds)` (lesson scroll progress), `useAnalytics()` (local analytics ring buffer). Each starts with empty initial state and populates from `getProgress()` after mount to keep SSR/CSR in sync.
- `useSpeech()` wraps the Web Speech API for prompt readout; falls back to `supported: false` when unavailable.
- Don't read `localStorage` directly in components. Reach for the hooks instead so the `mounted` pattern is enforced and sanitization fires on read.

### Naming

- Files: PascalCase for components (`MushafPage.tsx`), camelCase for hooks and utilities (`usePlayer.ts`, `quran-api.ts`).
- IDs in JSON: kebab-case (`noon-sakinah`, `madd-tabeeee`).
- Tailwind classes: source order (layout, spacing, color, typography). The `cn()` helper merges duplicates.

### Comments

- Comments explain why, not what. Code is read more than it's written.
- No emoji in code, comments, docs, or commit messages.
- Avoid marketing-speak adjectives like "robust", "seamless", "leverage", "utilize".

## Workflow

1. Make a small, focused change.
2. Run `npx tsc --noEmit` to catch type issues fast.
3. If the change is UI-visible, manually open the affected route in EN, AR, light, and dark.
4. For Mushaf changes, run `node scripts/verify-mushaf.mjs` (with the dev server running in another terminal).
5. Run `npm run build` before committing significant work to catch SSG-time issues.
6. Commit each logical change separately. Brief, lowercase commit messages that explain why.

## Verifying the Mushaf

The Mushaf reader has the most moving parts (data layer, surah-aware conditional rendering, audio, bookmarks, RTL navigation). `scripts/verify-mushaf.mjs` is the regression suite.

```bash
# Terminal 1
npm run dev

# Terminal 2
node scripts/verify-mushaf.mjs
```

A passing run looks like:

```
PASS: Index renders 114 surah cards — actual: 114
PASS: Search 'Fatihah' filters to 1 surah — actual: 1
PASS: Page 1 (Al-Fatihah) has NO standalone BismillahLine — count: 0
PASS: Tap verse triggers audio fetch — url: https://api.quran.com/api/v4/recitations/.../by_ayah/1:1...
...
all checks passed.
```

Screenshots are written to `mushaf-screenshots/` (created on first run): Al-Fatihah, Al-Baqarah's start, At-Tawbah's start, page 604, and the Arabic and dark variants. Skim them after a structural change.

The script uses `playwright-core` and looks for a Chromium binary in the standard `playwright` cache directory for your OS. To install the browser if you don't already have it:

```bash
npx playwright install chromium
```

If your Chromium lives somewhere else, point the script at it with `PLAYWRIGHT_CHROME=/absolute/path node scripts/verify-mushaf.mjs`. The script also accepts `BASE_URL=https://example.com` if you want to run it against a deployment instead of the local server.

## Adding a new translation key

1. Open `src/lib/i18n.ts`.
2. Add `"namespace.key": { en: "English", ar: "Arabic" }` in the appropriate section.
3. Reference it in the component as `t("namespace.key")`.

## Adding a new tajweed example

See [content-schema.md](content-schema.md). In short: edit the relevant JSON, set `verified: true` only after a domain reviewer confirms accuracy, and run `node scripts/fetch-surah-names.mjs` if the example references a new surah.

## Adding a new feature

1. Sketch the data flow and components first. Don't write code until you can describe what each component does in one sentence.
2. Write types. Add or extend types in `src/lib/types.ts`. Keep optional fields optional.
3. Build the data layer. If it needs an API call, add it to `src/lib/quran-api.ts` (or a new wrapper). Test in isolation.
4. Build the components. Start with the leaves (presentational) and work up to composers. Each leaf should render with mocked data.
5. Wire the routes. App Router page files import the JSON or call the API wrapper.
6. Verify in browser. EN, AR, light, dark.
7. Add a test if it's load-bearing. `verify-mushaf.mjs` is the template for browser tests.

## Debugging

- **Hydration warnings.** Almost always a localStorage-vs-server-render mismatch. Use the `mounted` pattern shown in [i18n.md](i18n.md).
- **Tajweed colors missing.** The class name might not be in `tajweed-colors.ts`. Add it.
- **Audio not playing.** Check the network tab for the audio URL. If it's a 404, double-check `surah:ayah` in the example JSON.
- **`Cannot find module '@opentelemetry'`** or similar Next cache errors. Stop the dev server, `rm -rf .next`, and restart.
- **404 on a route that should exist.** Check the file is named `page.tsx`. Next's App Router is strict about it.

## Performance notes

- The Mushaf reader pre-renders 36 SSG pages (page 1, a spread of early surah starts, and one per juz) and ISRs the rest at 24 hours. To extend SSG coverage, expand the array in `generateStaticParams` of `src/app/mushaf/page/[page]/page.tsx`.
- The chapters list cache is 7 days. Audio URLs cache 1 hour. Tajweed pages cache 15 minutes. Tweak in the respective wrapper.
- Heavy, non-critical surfaces are lazy-loaded with `next/dynamic` so the reader and progress first load stay light. In the verse overlay, the reciter compare, record-and-compare, word-by-word, and reading-depth section each split into their own chunk and load on first overlay open; the primary action row and transport stay eager so a verse tap and play are immediate. The progress milestone certificate's canvas loads only when that card renders. The placeholder during a chunk load is reduced-motion-safe.
- Bundle sizes (gzipped, page bundles, not including shared chunks): home is around 5 kB, the largest module page is around 7 kB, and the Mushaf reader is around 5 kB. All comfortably below 200 kB First-Load JS. These are local build figures; measure true Core Web Vitals against the deployed preview, not a dev server.

## Manual smoke checklist for installable / offline behavior

After a structural change, walk through:

1. `npm run build && npm start`. The dev server skips service-worker registration; you need a production build to exercise it.
2. Open `http://localhost:3000` in Chromium. DevTools → Application → Manifest. Confirm `Tajweed Trainer`, the SVG icons, and the `standalone` display mode resolve.
3. Application → Service Workers. Confirm `/sw.js` is registered and active. It is served by the Next route handler `src/app/sw.js/route.ts` (not a static file) with a per-build version stamped from `scripts/sw-template.js`, so each deploy gets fresh cache namespaces. Reload once so the cache populates.
4. Visit `/learn/qalqalah`, scroll, then go offline (DevTools → Network → Offline). Reload — the page still renders. The worker's scope is the app shell (HTML, network-first) and same-origin static assets (cache-first); it deliberately does not intercept the cross-origin Quran audio or the Quran.com API, so verses do not replay offline.
5. Take a quiz, answer two questions. Confirm `progress.reviews` populates in localStorage and the Review Due tile appears on `/practice` after the third refresh.
6. Mark a verse memorized in the Mushaf. Toggle the toolbar eye icon. Confirm the verse blurs with a Reveal pill.
7. `/search` for "qalqalah" and "Al-Fatihah". Both should surface lesson and surah hits.
8. Settings → Backup & Restore → Export. Open the file in a text editor; confirm `reviews`, `memorizedVerses`, and `analytics` are present and well-formed.

## Production deploy

The default Next config builds a server-rendered app and deploys cleanly on Vercel, Netlify, or any Node host. To switch to a static export instead, see Next's docs on `output: "export"` and update `next.config.mjs`.
