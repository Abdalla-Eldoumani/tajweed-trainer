# Accessibility

A statement of how the app supports assistive technology and varied input, written from the code, not a certification. If you find a barrier, open a GitHub issue.

## Keyboard

- Every interactive control is reachable and operable by keyboard. The Mushaf reader turns pages with `ArrowLeft` / `ArrowRight` (mirrored under RTL), and a Cmd/Ctrl+K palette jumps to any surah, page, or juz.
- Overlays manage focus. The mobile navigation drawer is an `aria-modal` dialog: it traps Tab, wraps from the last focusable element back to the first, returns focus to its opener on close, and closes on Escape. The verse overlay closes on Escape; in the player, Escape collapses the expanded study-options panel and returns focus to its toggle.
- Focus is visible. Interactive elements carry a `focus-visible` ring (the search box, the quick-jump palette input, and the shared UI primitives), so keyboard users can always see where they are. The active navigation link is marked with `aria-current="page"` in both the sidebar and the drawer.

## Names and structure

- Icon-only controls carry accessible names via `aria-label`, so a screen reader announces what each button does.
- Navigation is exposed as landmarks, and heading order is kept meaningful per page.
- Arabic text is rendered only through the Arabic-aware wrappers (`ArabicText` for general Arabic, `TajweedText` for color-coded Quran), which set `dir="rtl"`, `lang="ar"`, and the correct Quranic font, so assistive technology and the browser handle direction and language correctly.

## Motion

- Animations honor `prefers-reduced-motion`: CSS crushes animation and transition durations globally, JS-driven smooth scrolling (`scrollIntoView`) is gated through `prefersReducedMotion()` (instant-jump fallback), and spinners and skeletons add `motion-reduce:animate-none`.

## Contrast and color

- Text meets WCAG AA contrast in all five themes (vellum, pearl, night, sepia, mihrab). The end-to-end axe scan covers the key routes in the default theme, so after any color change run the same scan with each theme and both languages selected. The tajweed letter colors carry a value per theme so coloring stays legible on every ground, and the verse-end numeral pill uses a theme-scoped color that clears AA on its own background in each theme.
- Color is never the only signal. The tajweed coloring is supplementary to the text; lessons name every rule, and the tap-a-letter popover states the rule name alongside its color.

## Right-to-left and bilingual

- The interface is fully bilingual. Switching to Arabic sets `dir="rtl"` and `lang="ar"` and flips the chrome, lesson content, and surah names; layout uses Tailwind logical properties (`ms-*`, `me-*`) so it mirrors under RTL without separate stylesheets. See [i18n.md](i18n.md).

## Touch

- Buttons, toolbar controls, settings rows, the mini player, and the reader's page buttons are at least 44 by 44 CSS pixels. Inline verse controls inside running text keep a smaller glyph with a 44 px tall hit area.

## Offline

- After one visit, the app shell and the last Mushaf page you opened stay readable from cache, and a slim connectivity notice shows while offline and clears on reconnect. Cross-origin Quran audio and the live API are intentionally not cached, so recitation needs a connection.

## Verification

`scripts/verify-accessibility.mjs` is a source-level guard (no browser) for the focus rings, the reduced-motion gating, the scroll-lock coordination, the `aria-current` wiring, and the contrast-scoped numeral color, so these cannot silently regress. It runs as part of `npm run verify:audits` (itself part of the `npm run verify` gate). Visual and screen-reader checks are still done by hand in English, Arabic, light, and dark.
