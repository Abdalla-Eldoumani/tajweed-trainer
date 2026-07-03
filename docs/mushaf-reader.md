# Mushaf reader

A reproduction of the 604-page Madinan Mushaf, color-coded for tajweed, at `/mushaf` (index) and `/mushaf/page/[page]/` (reader).

## What it does

- 604 pages mapped 1:1 to the standard Madinan Mushaf, color-coded for tajweed across the five themes, with keyboard navigation, full Arabic mode, and a gold frame legible on every ground.
- A searchable surah index (`/mushaf`), the reader (`/mushaf/page/[page]/`, Madinan layout with cartouche, Bismillah on surah starts, tajweed-colored verses, gold Arabic-Indic verse-end markers, page / juz footer), and a `/mushaf/surah/[surah]/` server redirect to a surah's start page.
- Tapping a verse opens `VerseOverlay`, the single per-verse action hub (a plain tap never auto-plays); multi-verse selection plays a range or hand-picked set as one auto-advancing queue.
- Follow-along word highlighting, a reveal-as-recited memorization mode, a dynamic in-reader index, and a Cmd/Ctrl+K quick-jump palette.

The component sections below own the detail.

## Components

All under `src/components/mushaf/`.

### `MushafFrame`

The outer wrapper: three nested CSS layers (`globals.css`) drawing the multi-color ornamental border of a real Madinan Mushaf. `.mushaf-frame` is the outer gold rule (cream ground), `::before` the inner gold rule, and `::after` a multi-color repeating geometric band (gold/red/blue) as a `repeating-linear-gradient` border.

### `SurahCartouche`

The surah-start banner: the surah name in `font-quran` plus the Latin name, verse count, and Makkah / Madinah badge, flanked by two 8-pointed star ornaments (CSS pseudo-elements).

### `BismillahLine`

A standalone Bismillah with ornamental dividers. Suppressed for surah 1 (Al-Fatihah, where Bismillah is verse 1) and surah 9 (At-Tawbah, which has no Bismillah); the only two cases in the Mushaf, both asserted by the verifier.

### `MushafPage`

Composes the frame, cartouches, conditional Bismillahs, the flowing verses, and the footer. Verses render as inline `<button>`s wrapping `<TajweedText>` (each focusable and tappable); a tap calls `onSelectVerse(verseKey)` to open the overlay, and the page has no inline per-verse buttons. The `.mushaf-verse` class adds a soft hover/focus background without breaking justification. `memorizationMode` blurs every memorized verse behind a Reveal pill; reveal-as-recited uncovers the playing verse word-by-word (whole-verse fallback for segment-less reciters).

### `MushafReader`

The client wrapper around `MushafPage`, holding:

- A "Play surah" button: `playFullSurah` calls `usePlayer.getState().playSurah(surah, 1, versesCount, opts)` for continuous playback from verse 1, auto-advancing ayah to ayah; `MiniPlayer` pauses / resumes.
- A `MushafResumeBar` opt-in "Resume listening" banner reads the persisted `playerResume` record (shared with the `/progress` `ResumeListeningCard`) and plays it via `usePlayer.playVerse`; the player never auto-restores on load, and the banner shows only when a record exists and nothing is playing.
- Prev / next page buttons (disabled at boundaries), a surah dropdown to `/mushaf/surah/[n]`, and a juz dropdown to that juz's start page via `pageForJuz`.
- Rule-highlight drill dropdown: greys every tajweed rule except the chosen one (`data-tajweed-drill` plus CSS).
- Color-legend toggle: a non-modal disclosure (reusing `learn/ColorLegend`) in the tab order, the keyboard path to the rule names and swatches.
- In-session toggles: memorization/recall (eye icon; blurs memorized verses, disabled when nothing is memorized), reading-focus (dims all but the active verse), and a bookmark toggle (filled gold star when bookmarked).
- A Cmd/Ctrl+K quick-jump palette (`ReaderPalette`, with a visible button) to any surah, page, or juz.
- Keyboard navigation (`ArrowLeft` / `ArrowRight`, mirrored in Arabic).
- One `<VerseOverlay>` for the selected verse inside `<VerseSelectionProvider>` so `useVerseSelection()` resolves through the body portal. Translation defaults to Saheeh International (id 20), tafsir to Ibn Kathir (169).
- A `useEffect` writes `lastMushafPage` and `lastRead` to settings on mount; an entry URL `?v=surah:ayah` scrolls that verse into view and opens its overlay.

The `mounted` flag defers the bookmark filled state until after hydration (the server renders unfilled), avoiding a hydration mismatch on the SVG `fill`.

### `MushafIndex`

The surah grid for `/mushaf`. The route fetches `getChaptersIndex()` server-side and passes `surahs` to a client component handling search and the Makkah / Madinah filter. Page bookmarks appear as quick-jump chips above the grid, with a preview of verse bookmarks linking to `/mushaf/bookmarks`. Each card shows a resume pill when `lastReadBySurah` holds a position past its first page.

### `MushafBookmarks`

The saved-verse list behind `/mushaf/bookmarks`. The route resolves surah headers server-side (bundled fallback) so the client labels each verse without a round-trip, then lists every verse bookmark with its text and open / remove actions. A tag/text filter narrows by the verse's own tags, surah-name form, or `surah:ayah` (a local substring filter over the user's entries, not the content search index), and each row carries a `TagEditor`.

### `TajweedRulePopover`

Opened by `TajweedText` when `explainRules` is on (reader and lesson examples): on hover for pointers, on a deliberate long-press for touch. It names the rule from the verified map (never in its own words) and shows its color from `tajweed-colors.ts`, with a "Learn more" link via `getLessonLinkForClass`; classes with no single owning module show name and color without a link. A pointer popover dismisses shortly after the pointer leaves (a brief grace reaches the link, and hovering the card holds it open) so popovers never stack; a touch popover dismisses on an outside tap, Escape, or scroll.

### `VerseOverlay`

The single per-verse action hub: a centered panel at 1024px and up, a bottom sheet below, chosen by `useIsDesktop` (the `READER_PANEL_BREAKPOINT` 1024 boundary in `player-position.ts`). It portals to body over a dimmed, inert page, locks scroll via the shared `scroll-lock.ts`, traps Tab, and restores focus on close; it dismisses on close, Escape, or a click off the dialog (the container is `pointer-events-none` so the outside click reaches the dismiss scrim). Entrance is gated until the width resolves so a phone never flashes the panel; the sheet adds a grab handle (tap to peek/expand, drag up to expand, swipe down to dismiss without stopping audio).

In order: the verse reference and its Arabic (read-only `TajweedText`); a primary action row (play this verse [auto-focused], play from here, memorize, bookmark, note, close); the transport; a full-width "Play surah from this point onwards" button (calling `playFromVerse`) above the range selection; the range selection and repeat/loop/gap controls; a sub-verse word-range loop; a reveal-as-recited toggle; the inline reciter/speed/translation controls (`OverlayInlineControls`); reciter A/B compare (`ReciterCompare`); the private note (`VerseNotes`); and the reading-depth section (`ReadingDepth` translation plus on-demand tafsir, `WordByWord` when enabled, `RecitationCompare`). Every playback path commands the one `usePlayer` engine and constructs no second `<audio>`. The heavier parts (reading-depth, word-by-word, both compares) lazy-load with `next/dynamic`, keeping the reader's first load light.

### `VerseNotes` and `ReciterCompare`

`VerseNotes` is the private per-verse note, read and written through `getVerseNote` / `setVerseNote`, with a `TagEditor` for the learner's own short tags; both stay on-device, never transmitted, never religious content. `ReciterCompare` plays the verse by two reciters in turn on the one `usePlayer` engine, no second audio element. `RecitationCompare` records the learner into an in-memory clip to replay next to the reciter (the lone allowed extra audio, never uploaded or scored); the clip is an object URL revoked on re-record or close, and the control hides when recording is unsupported or the microphone is blocked.

### `VerseEndMarker`

Currently unused: the API embeds verse-end markers as `<span class="end">N</span>` inside `text_uthmani_tajweed` (styled in CSS). The component remains as a manual-render fallback.

## Routes

- `src/app/mushaf/page.tsx`: server component; calls `getChaptersIndex()` and renders `<MushafIndex/>`.
- `src/app/mushaf/page/[page]/page.tsx`: server component; `params` is an awaited Promise (Next 16). `generateStaticParams()` pre-renders page 1 and one page per juz, the rest via ISR (`export const revalidate = 86400`). Calls `getTajweedPage` and `getChaptersIndex`, passing both to `<MushafReader/>`.
- `src/app/mushaf/surah/[surah]/page.tsx`: server component; looks up the surah's start page from the bundled index and `redirect`s. No client JS.
- `src/app/mushaf/bookmarks/page.tsx`: server component; resolves the surah headers and renders `<MushafBookmarks/>`.
- `src/app/mushaf/loading.tsx` and `src/app/mushaf/page/[page]/loading.tsx`: route loading skeletons.

## Data flow

The server route (`page/[page]/page.tsx`) fetches `getTajweedPage` + `getChaptersIndex` and renders `<MushafReader>` -> `<MushafPage>` (`MushafFrame`, per-surah `SurahCartouche` / conditional `BismillahLine`, and per-verse `<button class="mushaf-verse" onClick=onSelectVerse>` wrapping `<TajweedText>`), plus one `<VerseOverlay>` portaled to body that commands `usePlayer`. Full wiring: [architecture.md](architecture.md#reading-the-mushaf).

## Edge cases

| Case | Behavior |
|------|----------|
| Page 1 (Al-Fatihah) | Cartouche, no separate `BismillahLine`; the Bismillah is verse 1, rendered inside `TajweedText`. |
| Page 187 (At-Tawbah start) | Cartouche, no `BismillahLine`. At-Tawbah has no Bismillah. |
| Page 1 prev / page 604 next | Buttons disabled (`aria-disabled="true"`, `pointer-events-none`). |
| Network failure on `/verses/by_page` or `/chapters` | Retry/backoff then error, or the bundled `surah-index.json` fallback; see [api-integrations.md](api-integrations.md#failure-modes). |
| `lastMushafPage` written before hydration | Hidden behind the `mounted` flag. |
| Tajweed class not in our color map | CSS falls back to default ink color; the component logs a dev-only warning. |

## Verification

`scripts/verify-mushaf.mjs` drives a real Chromium against the dev server and runs 21 assertions after any Mushaf change (see [development.md](development.md) for the invocation). It prints `21/21 checks passed.`; a failing assertion lists the file path and actual vs. expected. Screenshots land in `mushaf-screenshots/` covering Al-Fatihah, Al-Baqarah's start, At-Tawbah's start, page 604, and the Arabic and dark variants; skim them after a structural change.

## What's intentionally not here

- **Always-on per-word translation overlay.** Word-level meaning and tafsir live in the overlay's on-demand reading-depth section (tap a verse), not as a persistent overlay; the page stays a clean color-coded Mushaf.
- **Multiple Mushaf layouts (Indo-Pak, etc.).** The Madinan layout is the most widely used; variants would need a separate index and a verse-to-line mapping per script style.
