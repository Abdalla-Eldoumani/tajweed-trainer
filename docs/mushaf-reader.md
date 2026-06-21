# Mushaf reader

A reproduction of the 604-page Madinan Mushaf, color-coded for tajweed. Tapping a verse opens a focused overlay holding everything you can do to it: playback, memorize, bookmark, a private note, and its translation, tafsir, and word-by-word. Lives at `/mushaf` (index) and `/mushaf/page/[page]/` (reader).

## What it does

- 604 pages mapped 1:1 to the standard Madinan Mushaf.
- A surah index at `/mushaf` listing all 114 surahs as cards (Arabic name, Latin name, verse count, start page, Makkah / Madinah badge). Search by Latin name, filter by revelation place, and a "continue from page X" callout when there's a saved `lastMushafPage`.
- The reader at `/mushaf/page/[page]/`: the Madinan layout with surah cartouche, Bismillah line on surah starts, tajweed-colored verses, gold verse-end markers in Arabic-Indic numerals, and a page / juz footer.
- A surah jump at `/mushaf/surah/[surah]/` that redirects server-side to that surah's start page.
- Tap a verse to open `VerseOverlay`, the single per-verse action hub. It is a focused, centered panel at 1024px and up and a bottom sheet below that (chosen by `useIsDesktop`), opened over a dimmed, inert page. Everything you can do to a verse lives here, in order: the verse reference and its Arabic, a primary action row (play this verse, play from here, memorize, bookmark, note, close), range selection, repeat/loop/gap, a sub-verse word-range loop, inline reciter/speed/translation controls, a two-reciter compare, the private note, and the reading-depth section (translation, on-demand tafsir, word-by-word, record-and-compare). Playback routes through the one `usePlayer` engine (single mode for "play this verse", continuous for "play from here" and the toolbar "Play surah"); there is no second `<audio>`. A plain tap does not auto-play — the overlay's auto-focused "play this verse" plays it. The persistent `MiniPlayer` (mounted once in `AppProvider`) is the transport and carries a single to continuous mode toggle.
- Multi-verse selection: pick a contiguous range or hand-pick a set of verses and play them as one auto-advancing queue, with a per-verse repeat count, a whole-selection loop, and an inter-verse pause from a few presets. The selection shows as removable chips with a one-action clear. A sub-verse loop narrows that to a start-word..end-word range within the open verse for segment-capable reciters.
- A dynamic in-reader index: the surah and juz pickers always read out the surah(s) and juz on the open page, even after a deep-linked reload, and update as you turn pages. A Cmd/Ctrl+K quick-jump palette (with a visible button) jumps to any surah, page, or juz.
- Tap a color-coded letter to open a popover naming its tajweed rule and color, with a "Learn more" link to the lesson that teaches it. Because the popover is pointer/touch only, an always-available color legend toggle gives the same rule names and swatches to keyboard users; the rule-highlight drill dims all but one rule across the page.
- Follow-along for segment-capable reciters: the recited word highlights in time over the verified coloring as a verse plays, and a reveal-as-recited mode blurs the verse and uncovers each word as it is read for memorization self-testing. A reading focus mode dims all but the active verse. Reciters without segment data degrade cleanly to no highlight and a whole-verse reveal.
- Per-page bookmark toggle, persisted to localStorage. Page bookmarks appear on the index as quick-jump chips; verse bookmarks get a full list at `/mushaf/bookmarks` with a tag/text filter and per-row tags, linked from the index. Per-surah resume pills on the index jump back to where you left a surah, and a separate resume-listening entry returns to the last verse you played.
- Keyboard navigation (`ArrowLeft` and `ArrowRight`), mirrored under RTL when the language is set to Arabic.
- Arabic mode and the five themes (two light, three dark) are all supported. Every label translates; the gold frame and tajweed coloring stay legible on every ground.

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

Composes the frame, cartouches, Bismillahs (when applicable), the flowing verses, and the footer. Verses are rendered as inline `<button>` elements wrapping `<TajweedText>`, so each verse is independently focusable (accessibility) and tappable. Tapping calls `onSelectVerse(verseKey)` to open the verse overlay; the page carries no inline per-verse action buttons. The button class is `.mushaf-verse`, which adds a soft hover and focus background without breaking text justification. When `memorizationMode` is on it blurs every memorized verse with a Reveal pill, and in reveal-as-recited mode it uncovers the playing verse word-by-word (falling back to the whole-verse reveal for segment-less reciters).

### `MushafReader`

The client wrapper around `MushafPage`. It holds:

- A prominent "Play surah" toolbar button. `playFullSurah` calls `usePlayer.getState().playSurah(surah, 1, versesCount, opts)` to play the whole surah continuously from verse 1, auto-advancing ayah to ayah; the `MiniPlayer` then pauses / resumes anywhere.
- Prev / next page buttons (auto-disabled at boundaries).
- Surah dropdown — selecting jumps to `/mushaf/surah/[n]`.
- Juz dropdown — selecting jumps to that juz's start page via `pageForJuz`.
- Rule-highlight drill dropdown — greys every tajweed rule except the chosen one (`data-tajweed-drill` plus CSS).
- Color-legend toggle — a non-modal disclosure (reusing `learn/ColorLegend`) in the tab order, the keyboard/all-modes path to the rule names and swatches that the pointer-only letter popover surfaces.
- Memorization-mode (recall) eye toggle (in-session, not persisted) — blurs memorized verses on the page; disabled with a tooltip when nothing is memorized.
- Reading-focus toggle (in-session) — dims every verse but the active one for a calmer read.
- Bookmark toggle (filled gold star icon when bookmarked).
- A Cmd/Ctrl+K quick-jump palette (`ReaderPalette`) with a visible toolbar button, jumping to any surah, page, or juz.
- Keyboard navigation (`ArrowLeft` and `ArrowRight`, mirrored when the language is Arabic).
- One `<VerseOverlay>` for the selected verse, rendered inside `<VerseSelectionProvider>` so its `useVerseSelection()` resolves through the body portal. Translation defaults to Saheeh International (resource id 20); tafsir to Ibn Kathir (169).
- A `useEffect` that writes `lastMushafPage` and `lastRead` to settings on mount. An entry URL of `?v=surah:ayah` scrolls that verse into view and opens its overlay.

The `mounted` flag pattern defers the bookmark filled state until after hydration. The server can't read localStorage, so it always renders unfilled; the client takes over after mount. Without this, React warns about a hydration mismatch on the SVG `fill` attribute.

### `MushafIndex`

The surah grid for `/mushaf`. The route fetches `getChaptersIndex()` server-side and passes `surahs` to a client component that handles the search input and Makkah / Madinah filter via `useState`. Page bookmarks (if any) appear as quick-jump chips above the grid, with a preview of verse bookmarks linking to the full list at `/mushaf/bookmarks`. Each surah card shows a resume pill when `lastReadBySurah` holds a saved position past its first page.

### `MushafBookmarks`

The saved-verse list behind `/mushaf/bookmarks`. The route resolves the surah headers server-side (bundled fallback) so the client view can label each bookmarked verse without a round-trip, then lists every verse bookmark with its text and open / remove actions. A tag/text filter above the list narrows it by the verse's own tags, either surah-name form, or the `surah:ayah` reference (a local substring filter over the user's own entries, not the content search index), and each row carries a `TagEditor` so a verse can be tagged from here as well as from its overlay.

### `TajweedRulePopover`

Opened by `TajweedText` when its `explainRules` prop is on (the reader and the lesson examples). Tapping a color-coded letter names the rule and shows its color from `tajweed-colors.ts`, with a "Learn more" lesson link resolved through `getLessonLinkForClass`. Classes with no single owning module show the name and color without a link. It names the rule from the verified map and never explains it in its own words.

### `VerseOverlay`

The single per-verse action hub, opened by a verse tap. It is a focused, centered panel at 1024px and up and a bottom sheet below that, chosen by `useIsDesktop` (the `READER_PANEL_BREAKPOINT` 1024 boundary in `player-position.ts`). It portals to body over a dimmed, inert page, locks body scroll through the shared `scroll-lock.ts`, traps Tab, captures and restores the opener's focus (so closing returns to the tapped verse), and dismisses via an explicit close, Escape, or a scrim tap. The form entrance is gated until the width resolves so a phone never flashes the centered panel; the sheet adds a grab handle (tap to toggle peek/expanded, drag up to expand, swipe down past a threshold to dismiss without stopping audio).

It holds, in order: the verse reference and its Arabic (read-only, through `TajweedText`), a primary action row (play this verse — auto-focused — play from here, memorize, bookmark, note, close), the transport with range selection and the repeat/loop/gap controls, a sub-verse word-range loop, a reveal-as-recited toggle, the inline reciter/speed/translation controls (`OverlayInlineControls`), reciter A/B compare (`ReciterCompare`), the private note (`VerseNotes`), and the reading-depth section (`ReadingDepth` translation plus on-demand tafsir, `WordByWord` when enabled, `RecitationCompare`). Every playback path commands the one `usePlayer` engine; it constructs no second `<audio>`. The reading-depth section, word-by-word, reciter compare, and record-and-compare are lazy-loaded with `next/dynamic` so the reader's first load stays light (see [development.md](development.md)).

### `VerseNotes` and `ReciterCompare`

`VerseNotes` is the private per-verse note inside the overlay, read and written through `getVerseNote` / `setVerseNote`, with a `TagEditor` for the learner's own short tags beside it. Both stay on the device, are never transmitted, and are never religious content (the learner's own words and labels). `ReciterCompare` plays the same verse by two reciters in turn on the one `usePlayer` engine, so recitation styles can be compared by ear without a second audio element; `RecitationCompare` records the learner's own recitation into its own in-memory clip to replay next to the reciter (the lone allowed extra audio, never uploaded or scored).

### `VerseEndMarker`

Currently unused. The API embeds verse-end markers as `<span class="end">N</span>` inside `text_uthmani_tajweed`, and styling is in CSS. The component remains in the codebase as a fallback in case we ever want to render markers manually.

## Routes

- `src/app/mushaf/page.tsx` — server component. Calls `getChaptersIndex()` and passes the result to `<MushafIndex/>`.
- `src/app/mushaf/page/[page]/page.tsx` — server component. `params` is a Promise (Next 16) and is awaited. `generateStaticParams()` pre-renders a spread of common entry points (page 1 and one per juz) at build time; the rest fall through to ISR (`export const revalidate = 86400`, a literal number of seconds). Calls `getTajweedPage` and `getChaptersIndex` and passes both to `<MushafReader/>`.
- `src/app/mushaf/surah/[surah]/page.tsx` — server component. Looks up the surah's start page from the bundled index and `redirect`s. Pure server-side; no client JS.
- `src/app/mushaf/bookmarks/page.tsx`: server component. Resolves the surah headers and renders `<MushafBookmarks/>`.
- `src/app/mushaf/loading.tsx` and `src/app/mushaf/page/[page]/loading.tsx`: route loading skeletons shown while a page resolves.

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
                    <button class=mushaf-verse onClick=onSelectVerse>  (opens VerseOverlay)
                      <TajweedText tajweedHtml={...}/>
                    </button>

        <VerseOverlay verseKey={selected}>   (portal to body; commands usePlayer)
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

## Recitation self-compare (privacy)

The verse overlay's reading-depth section includes a record-and-compare control:
you can record your own recitation of the verse and replay it next to the
reciter's audio to compare by ear. **The recording never leaves your device.** It
is held only in memory as a local object URL, revoked as soon as you re-record or
close the overlay, and is never uploaded, saved to disk, or transmitted anywhere.
The app
does not evaluate, score, or judge the recitation — it only lets you listen to
both and decide for yourself. If the browser cannot record, or microphone
access is blocked, the control explains the situation or hides itself.

## What's intentionally not here

- **Always-on per-word translation overlay.** Word-level meaning and tafsir live in the verse overlay's on-demand reading-depth section (tap a verse), not as a persistent overlay on the page. The page itself stays a clean color-coded Mushaf.
- **Multiple Mushaf layouts (Indo-Pak, etc.).** The Madinan layout is the most widely used; supporting variants would require a separate index and a verse-to-line mapping per script style.
