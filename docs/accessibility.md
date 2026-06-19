# Accessibility

This is a statement of how the app supports assistive technology and varied input, written from the code. It is not a certification. If you find a barrier, open a GitHub issue.

## Keyboard

- Every interactive control is reachable and operable by keyboard. The Mushaf reader turns pages with `ArrowLeft` and `ArrowRight` (mirrored under RTL), and a Cmd/Ctrl+K palette jumps to any surah, page, or juz from anywhere in the reader.
- Overlays manage focus. The mobile navigation drawer is an `aria-modal` dialog: it traps Tab inside while open, wraps from the last focusable element back to the first, returns focus to the control that opened it on close, and closes on Escape. The player and the verse panels also close on Escape.
- Focus is visible. Interactive elements carry a `focus-visible` ring (the search box, the quick-jump palette input, and the shared UI primitives), so keyboard users can always see where they are. The active navigation link is marked with `aria-current="page"` in both the sidebar and the drawer.

## Names and structure

- Icon-only controls carry accessible names through `aria-label`, so a screen reader announces what each button does rather than reading an empty control.
- Navigation is exposed as landmarks, and heading order is kept meaningful per page.
- Arabic text is rendered only through the Arabic-aware wrappers (`ArabicText` for general Arabic, `TajweedText` for color-coded Quran), which set `dir="rtl"`, `lang="ar"`, and the correct Quranic font, so assistive technology and the browser handle direction and language correctly.

## Motion

- Animations honor `prefers-reduced-motion`. CSS crushes animation and transition durations globally, and JavaScript-driven smooth scrolling (`scrollIntoView`) is gated through `prefersReducedMotion()` so it falls back to an instant jump. Loading spinners and skeletons add `motion-reduce:animate-none`.

## Contrast and color

- Text meets WCAG AA contrast in both light and dark themes. The tajweed letter colors carry a separate dark-mode value so coloring stays legible at night, and the verse-end numeral pill uses a theme-scoped color that clears AA on its own background in each theme.
- Color is never the only signal. The tajweed coloring is supplementary to the text; lessons name every rule, and the tap-a-letter popover states the rule name alongside its color.

## Right-to-left and bilingual

- The interface is fully bilingual (English and Arabic). Switching to Arabic sets `dir="rtl"` and `lang="ar"` on the document and flips the chrome, lesson content, surah names, and the rest. Layout uses Tailwind logical properties (`ms-*`, `me-*`) so it mirrors correctly under RTL without separate stylesheets.

## Touch

- Interactive targets are sized for touch, and the controls that matter on a phone (verse taps, the playback sheet, navigation) are reachable without precise pointing.

## Offline

- After one visit, the app shell and the last Mushaf page you opened stay readable from cache, and a slim connectivity notice appears while you are offline and clears on reconnect. Cross-origin Quran audio and the live API are intentionally not cached, so recitation audio needs a connection.

## Verification

`scripts/verify-accessibility.mjs` is a source-level guard (no browser) for the focus rings, the reduced-motion gating, the scroll-lock coordination, the `aria-current` wiring, and the contrast-scoped numeral color, so these cannot silently regress. It runs as part of `npm run verify:scripts`. Visual and screen-reader checks are still done by hand in English, Arabic, light, and dark.
