# Mushaf reader

A reproduction of the 604-page Madinan Mushaf, color-coded for tajweed, with tap-to-play audio. Lives at `/mushaf` (index) and `/mushaf/page/[page]/` (reader).

## What it does

- 604 pages mapped 1:1 to the standard Madinan Mushaf.
- A surah index at `/mushaf` listing all 114 surahs as cards (Arabic name, Latin name, verse count, start page, Makkah / Madinah badge). Search by Latin name, filter by revelation place, and a "continue from page X" callout when there's a saved `lastMushafPage`.
- The reader at `/mushaf/page/[page]/`: the Madinan layout with surah cartouche, Bismillah line on surah starts, tajweed-colored verses, gold verse-end markers in Arabic-Indic numerals, and a page / juz footer.
- A surah jump at `/mushaf/surah/[surah]/` that redirects server-side to that surah's start page.
- Tap a verse to play it. Tap routes through the global zustand player store (`usePlayer.getState().playVerse(surah, ayah, opts)`) in single mode, with the user's reciter and speed from settings. A per-verse "play from here" control and the toolbar "Play surah" button start continuous surah playback instead (`playSurah`). The persistent `MiniPlayer` (mounted once in `AppProvider`) is the transport and carries a single ↔ continuous mode toggle.
- Per-page bookmark toggle, persisted to localStorage. Bookmarks appear on the index as quick-jump chips.
- Keyboard navigation (`ArrowLeft` and `ArrowRight`), mirrored under RTL when the language is set to Arabic.
- Arabic mode and dark mode are both supported. Every label translates; the gold frame stays legible on dark cream.

## Components

All under `src/components/mushaf/`.

### `MushafFrame`

The outer wrapper. Three nested layers, all in CSS (`globals.css`):

- `.mushaf-frame`: outer gold rule with cream background.
- `.mushaf-frame::before`: inner gold rule.
- `.mushaf-frame::after`: a multi-color repeating geometric band (gold, red, blue) implemented as a `repeating-linear-gradient` border.

Together they give the multi-color ornamental border seen on every page of a real Madinan Mushaf.

### `SurahCartouche`

The banner shown when a surah starts on the page. Renders the surah name in `font-quran` plus the Latin name, verse count, and Makkah / Madinah badge in a smaller line. Two 8-pointed star ornaments flank the cartouche left and right (CSS pseudo-elements).

### `BismillahLine`

A standalone Bismillah surrounded by ornamental dividers. Suppressed for surah 1 (Al-Fatihah, where Bismillah is verse 1) and surah 9 (At-Tawbah, which has no Bismillah). These are the only two cases in the entire Mushaf and the verifier asserts both.

### `MushafPage`

Composes the frame, cartouches, Bismillahs (when applicable), the flowing verses, and the footer. Verses are rendered as inline `<button>` elements wrapping `<TajweedText>`, so each verse is independently focusable (accessibility) and tappable (audio). The button class is `.mushaf-verse`, which adds a soft hover and focus background without breaking text justification.

### `MushafReader`

The client wrapper around `MushafPage`. It holds:

- A prominent "Play surah" toolbar button. `playFullSurah` calls `usePlayer.getState().playSurah(surah, 1, versesCount, opts)` to play the whole surah continuously from verse 1, auto-advancing ayah to ayah; the `MiniPlayer` then pauses / resumes anywhere.
- Prev / next page buttons (auto-disabled at boundaries).
- Surah dropdown — selecting jumps to `/mushaf/surah/[n]`.
- Juz dropdown — selecting jumps to that juz's start page via `pageForJuz`.
- Rule-highlight drill dropdown — greys every tajweed rule except the chosen one (`data-tajweed-drill` plus CSS).
- Memorization-mode eye toggle (in-session, not persisted) — blurs memorized verses on the page.
- Bookmark toggle (filled gold star icon when bookmarked).
- Keyboard navigation (`ArrowLeft` and `ArrowRight`, mirrored when the language is Arabic).
- A reading-depth panel that opens below the page when a verse's "details" control is tapped (translation, tafsir, optional word-by-word) with a per-verse bookmark toggle.
- A `useEffect` that writes `lastMushafPage` and `lastRead` to settings on mount. An entry URL of `?v=surah:ayah` scrolls that verse into view and starts it in single mode.

The `mounted` flag pattern defers the bookmark filled state until after hydration. The server can't read localStorage, so it always renders unfilled; the client takes over after mount. Without this, React warns about a hydration mismatch on the SVG `fill` attribute.

### `MushafIndex`

The surah grid for `/mushaf`. The route fetches `getChaptersIndex()` server-side and passes `surahs` to a client component that handles the search input and Makkah / Madinah filter via `useState`. Bookmarks (if any) appear as quick-jump chips above the grid.

### `VerseEndMarker`

Currently unused. The API embeds verse-end markers as `<span class="end">N</span>` inside `text_uthmani_tajweed`, and styling is in CSS. The component remains in the codebase as a fallback in case we ever want to render markers manually.

## Routes

- `src/app/mushaf/page.tsx` — server component. Calls `getChaptersIndex()` and passes the result to `<MushafIndex/>`.
- `src/app/mushaf/page/[page]/page.tsx` — server component. `params` is a Promise (Next 16) and is awaited. `generateStaticParams()` pre-renders a spread of common entry points (page 1 and one per juz) at build time; the rest fall through to ISR (`export const revalidate = 86400`, a literal number of seconds). Calls `getTajweedPage` and `getChaptersIndex` and passes both to `<MushafReader/>`.
- `src/app/mushaf/surah/[surah]/page.tsx` — server component. Looks up the surah's start page from the bundled index and `redirect`s. Pure server-side; no client JS.

## Data flow

```
Browser --> /mushaf/page/47
              |
              v
        Next.js server component (page.tsx)
              |
              +-- getTajweedPage(47)                +----------------+
              |     |                               | Quran.com API  |
              |     +-- fetchWithCache  ----------> | /verses/by_page|
              |     |     (15 min TTL)              | /47            |
              |     +-- shape into MushafPageData   +----------------+
              |
              +-- getChaptersIndex()                +----------------+
              |     |                               | Quran.com API  |
              |     +-- fetchWithCache  ----------> | /chapters      |
              |     |     (7 day TTL)               +----------------+
              |     +-- falls back to bundled
              |         surah-index.json on error
              |
              v
        <MushafReader page={47} data={...} surahs={...}>
              |
              v
        <MushafPage data={...}>
              +-- <MushafFrame>               (CSS-driven gold band)
              +-- for each surah on the page:
              |     <SurahCartouche surah={...}/>
              |     <BismillahLine surahNumber={...}/>   (conditional)
              +-- for each verse:
                    <button class=mushaf-verse onClick=playVerse>  (single mode, via usePlayer)
                      <TajweedText tajweedHtml={...}/>
                    </button>
```

## Edge cases

| Case | Behavior |
|------|----------|
| Page 1 (Al-Fatihah) | Cartouche, but no separate `BismillahLine`. The Bismillah is verse 1 and renders inside `TajweedText`. |
| Page 187 (At-Tawbah start) | Cartouche, no `BismillahLine`. At-Tawbah has no Bismillah. |
| Page 1 prev / page 604 next | Buttons disabled (`aria-disabled="true"`, `pointer-events-none`). |
| Network failure on `/verses/by_page` | Two retries with backoff. If still failing, the error bubbles to the route. |
| Network failure on `/chapters` | Falls back to bundled `surah-index.json`. |
| `lastMushafPage` written before hydration | Hidden behind the `mounted` flag. |
| Tajweed class not in our color map | CSS falls back to default ink color; the component logs a dev-only warning. |

## Verification

`scripts/verify-mushaf.mjs` drives a real Chromium against the dev server and runs 21 assertions. Run it after any Mushaf change:

```bash
npm run dev          # in one terminal
node scripts/verify-mushaf.mjs   # in another
```

Output:

```
21/21 checks passed.
```

A failing assertion lists the file path and the actual vs. expected value. Screenshots are written to `mushaf-screenshots/` (created if missing) covering Al-Fatihah, Al-Baqarah's start, At-Tawbah's start, page 604, and the Arabic and dark variants. Skim them after a structural change.

## What's intentionally not here

- **Always-on per-word translation overlay.** Word-level meaning and tafsir live in the on-demand reading-depth panel (tap a verse's "details" control), not as a persistent overlay on the page. The page itself stays a clean color-coded Mushaf.
- **Multiple Mushaf layouts (Indo-Pak, etc.).** The Madinan layout is the most widely used; supporting variants would require a separate index and a verse-to-line mapping per script style.
