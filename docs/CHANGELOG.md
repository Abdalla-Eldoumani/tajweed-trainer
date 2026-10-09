# Changelog

## Unreleased

### Corrected Qur'an references

Every lesson example and quiz question was checked against api.quran.com, and the ones whose Arabic was not in the verse they cited were fixed.

- Removed the idgham shafawi example "أَنَّهُمْ مُّبْتَلُونَ" (cited as 68:17) and its four questions. The phrase does not occur in the Qur'an.
- "هُمْ بِهِ" now cites 16:100 instead of 78:3, which reads "هُمْ فِيهِ". Its gloss was written for 78:3 and was removed.
- Other phrases now cite a verse that contains them: يَقُولُونَ 2:79 (was 2:8), آمَنُوا 2:9 (was 2:3), لَهُمْ مَا يَشَاءُونَ 39:34 (was 16:31), مِنْ أَجْرٍ 26:109 (was 36:21), سَمِيعٌۢ بَصِيرٌ 22:61 (was 17:1, which has no iqlab), يَجْعَلُونَ 2:19 (was 6:136), الْقُرْآنَ 4:82 (was 75:18), بِسْمِ اللَّهِ 1:1 (was 3:26), قَالَ اللَّهُ 3:55 (was 2:30).
- الصَّاخَّةُ (80:33) carries the damma the verse has.
- `verify-content.mjs` now fails when a question's Arabic is not in its cited verse.

### Corrected lesson wording

- The ghunnah quiz now uses the four levels the lesson teaches. It had counted five ranks and ranked ikhfaa and iqlab differently from the lesson.
- The mu'anaqah entry says you may stop at one of the two marks but not both; the English lesson had said you must. The marks قلى and صلى are spelled with alef maksura.
- Fixed a wrong letter or label in four quiz items: the alif after the noon in آمَنَّا, noon sakinah (not tanween) in مِنْ ظَهِيرٍ, the word for temporary (عارضة) in the arji'oo question, and the letter count in the makharij explanation (the 28 letters plus hamzah).
- Ikhfaa is described as the most common of the noon sakinah and tanween rules, not of all rules. Quran.com's tajweed markup counts 5,291 ikhfaa, 4,969 idgham and 562 iqlab.
- Removed two claims that did not hold: an incomplete statement of when a sakin raa is heavy, and a circular clause about shortening the madd munfasil to four beats, since the lesson already gives the range as four to five.
- Short notes on the lesson pages say that teachers differ on lip closeness in ikhfaa shafawi and iqlab, on the three levels of qalqalah and the ranking of the heavy letters, and that printed mushafs use different sets of waqf marks. They do not pick a side and point to a local imam or teacher.

### Fixed

- **Restoring a file that is not a backup keeps your progress.** A JSON file with none of the saved keys used to be accepted and replaced stored progress with an empty set. It is now rejected with the usual error and nothing is overwritten.
- **Theme-matched fills and readable lesson labels.** Subtle fills follow pearl, sepia and mihrab instead of one fixed colour, Arabic headings fall back to Amiri, and the lesson labels that fell below 4.5:1 now use body ink (the noon sakinah quick reference keeps its rule colour as a small mark).
- **Example cards no longer scroll by a few pixels,** and their footer wraps on the narrowest phones.
- **Quiz read-aloud skips Qur'anic words.** The read-aloud button no longer voices the vowelled Qur'anic words inside a prompt, since device voices misread them.
- **Repetition counter counts the last listen.** In the tikrar (repetition) drill, an audio-led session that looped a verse N times counted only N−1: the final listen ended the loop without registering. It now counts the full N. The manual count control was always accurate; this aligns the listen-along count with it.

### Changed

- **A home page that opens on the next lesson.** The modules read as a ruled path with a status for each (not started, in progress, complete). The made-up study hours and lesson counts are gone, and overall completion is computed from completed modules.
- **Verse links open the right page.** The daily verse, bookmarks, surah cards and lesson examples go straight to the mushaf page that holds the verse.
- **Madd beat counts read correctly in Arabic.**
- **Dark-theme muted text meets AA.** Muted text resolves from the theme variable instead of an opacity modifier.
- **Quiz questions come only from the authored pool.** The fallback that built questions from lesson examples is removed.
- **Next.js 16.4.0.** Picks up the framework's security fixes released this month. Vitest moves to 4.1.11. Dependencies are pinned to exact versions, and the bundle analyzer and the obsolete interest-cohort header are gone.
- **Alegreya Sans for body text.** It replaces Inter and sits with the Spectral headings and the Amiri Arabic faces. The Latin type scale is a step larger, small text no longer drops below 0.6875rem, and figures are lining.
- **Rub el hizb ornament.** The star marks on the mushaf frame and surah cartouche are one inline mark that follows the theme.
- **Quieter cards.** Cards lose the drop shadow and take a gold border on hover. Rule cards are marked with a small diamond instead of a coloured bar.
- **Layout fixes.** The lesson navigation divider no longer overlaps the buttons, makharij markers no longer collide with their labels, and the reader toolbar wraps instead of clipping.
- **44px touch targets.** Buttons, the language toggle, sidebar links, settings rows, reader and overlay controls and the mini player meet the size, and the inline verse controls have a 44px hit area around a smaller glyph.

## 2.2.1 (2026-07-03)

A small polish release: accessibility, a playback performance fix, and a documentation-accuracy pass. No religious content was generated or edited.

### Fixed

- **The remaining small gold badges meet AA.** The home learning-path step numbers, the learn-dashboard module tiles (icon and order numeral), and the progress-page mastery badge used a gold that sat below 4.5:1 on the light grounds; they now use the same contrast-scoped gold as the surah-index badges, clearing AA on every light theme. Purely a color-token change (no layout, wording, or content moved), and a source guard now holds it in place.
- **Audio controls no longer re-render on every playback tick.** Each per-verse play button tracked the playback clock even when it was not the verse being played, so a lesson page with many examples re-rendered every button several times a second during playback. They now derive their state so only the active control updates; behavior is unchanged.

### Changed

- **Documentation and dependency housekeeping.** The reference documentation was brought back in line with the current code, and an unused test dependency was removed.

## 2.2.0 (2026-07-03)

A memorization milestone. The review side moved from a fixed schedule to a self-graded spaced-repetition model, and a full hifdh suite grew on top of it: chaining across verse, page, and juz seams; splitting a long verse into chunks; typing recall; audio-led and cover-the-page recall with a peek budget; a daily revision dashboard; freshness, error, and streak views; a repetition counter, a timed exam, and a session journal; and hizb and rub' al-hizb progress with a dedicated revision reciter. Underneath, the project gained a real automated test suite and a consolidated set of documentation, and closed with an accessibility, security, and performance pass. No religious content was generated or edited: every recall check compares your own input against the already-stored verified text, and verse text, translations, tafsir, tajweed coloring, and audio still come only from the verified Quran.com API or the bundled snapshots, and the app renders them rather than producing them.

### Added

- **Self-graded recall.** After revealing a verse in review you now rate your recall (again, hard, good, or easy) and an SM-2 scheduler sets the next due date from that rating instead of a fixed ladder. Existing review state carries over losslessly, a memorized verse with no review yet is due, and a balanced-interval modifier in Settings (default 1.0) widens or tightens the whole schedule.
- **Verse chaining.** A chaining drill cues the tail of one unit and asks you to recall the head of the next, across verse-to-verse, page, and juz seams, respecting the Bismillah exceptions and ending cleanly at the last verse. An audio variant plays the tail on the same audio engine.
- **Segment memorization.** Split a long verse at word boundaries into chunks, drill each chunk, then chain them back together. A one-word verse offers no split, and a reciter without word timings degrades gracefully.
- **Typing recall.** Type the next word and it is checked by exact match against the stored verse, with an optional diacritic-insensitive comparison that only affects the check and never rewrites the stored text.
- **Blind and cover-the-page recall.** An audio-led mode plays a verse with the text hidden and reveals it to check; a cover-the-page mode blurs the current page and uncovers it verse by verse on tap. A per-session peek budget (default 3) tracks hints, caps a peeked verse's rating at hard, and disables the hint control at zero, and it survives a reload.
- **Daily revision dashboard.** A muraja'ah queue balances new, recent, and consolidated portions with a daily new-verse cap (default 5), surfaces all due reviews without a cap, and shows a due count on open. An opt-in local reminder is available only when the app is installed and permitted, and the due count still works when permission is denied.
- **Strength, heatmap, and revision streak.** A freshness bar ages toward red since your last successful recall, an error heatmap shows the most-revealed or failed verses by surah, juz, and page, and a memorization revision streak, separate from the practice streak, rolls over across day and timezone boundaries.
- **Repetition counter, exam, and journal.** A tikrar counter logs reps for a target verse across days, a timed no-peek exam over a chosen scope logs a percent-recalled score, and a session journal records the day's memorization and revision with goals and an end-of-session summary, all carried in the existing backup.
- **Hizb and rub' progress, and a revision reciter.** Hizb and rub' al-hizb rings show coverage from the API hizb data and render at zero for a new learner, and a revision reciter setting, separate from the reciter you browse with, is honored by the revision and recall surfaces.

### Changed

- **A real automated test suite.** Vitest unit and integration tests import the shipped modules under jsdom with enforced coverage, and a Playwright and axe end-to-end layer covers the reader, the verse overlay, the memorize-and-review flow, offline and PWA behavior, RTL, and reduced motion. Both run in CI as required checks alongside the production dependency audit; the verify scripts that re-implemented shipped logic were migrated into real-import tests.
- **Consolidated documentation.** The repository root now holds only the README among prose docs, each doc under docs/ owns one topic, and every directory carries a concise directory-local guide. The overview and testing docs match the real suite and commands.

### Fixed

- **An honest accessibility baseline.** The end-to-end accessibility scan now excludes only the verified, immutable mushaf letter colors from the generic contrast rule (a standard, domain-fixed color set, not adjustable UI), while every other element stays under the full AA gate. The genuinely adjustable chrome that failed (the surah-index badges and number chips and the reader's jump-to hint) was corrected to AA, so the whole route map passes clean and deterministically.
- **A stable weekday row.** The practice streak's weekday pills no longer hydrate a stale row when a prerendered page is opened after the week rolls over.

### Security

- **A clean hardening pass.** The production dependency audit stays clear of high and critical advisories, the Content-Security-Policy and response-header cross-check stays green, and the CSP is unchanged. No user data leaves the device: memorization, review, the journal, and every other field the suite adds are local-only and are covered solely by the backup you choose to export.

## 2.1.0 (2026-06-23)

Post-2.0.0 reader refinements. No religious content was generated or edited.

### Changed

- Audio resume is now opt-in. The player no longer restores the last position on load (which could start a different surah's verse when you pressed play); a "Resume listening" control on the Mushaf reader and on the progress page picks up the last verse you played instead.
- The verse overlay now follows the recitation: during continuous playback it advances to the verse being played instead of staying on the verse first tapped.

### Added

- A prominent "Play surah from this point onwards" button in the verse overlay, above the range selection.
- The Warsh narration panel on the Mushaf page now names its reciter, Younes Souilass.

### Fixed

- The verse overlay now closes on Escape and on a click off the dialog, on both the panel and the bottom sheet, not only the close button.
- The tajweed rule popover now dismisses when the pointer leaves the letter, so popovers no longer pile up on the page.

### Removed

- The unused glossary content file and several unused exports, for a leaner tree.

## 2.0.0 (2026-06-22)

A major release. The interface gained five art-directed manuscript themes and a deeper sense of paper and ink; the Mushaf reader's per-verse interaction was rebuilt around a single focused overlay; recitation gained a follow-along layer that highlights the word as it is read; and the progress side gained a forgetting-curve review, a most-missed rule-areas dashboard, and an on-device completion certificate. No religious content was generated or edited: verse text, translations, tafsir, tajweed coloring, and audio still come only from the verified Quran.com API or the bundled snapshots, and the app renders them rather than producing them.

### Added

- **Five themes.** Two light (vellum, pearl) and three dark (night, sepia, mihrab), the same manuscript seen in different light. A theme switcher in Settings previews each with live swatches and crossfades the page when you choose one. This replaces the old dark-mode on/off switch; an existing dark-mode preference carries over.
- **The verse overlay.** Tapping a verse now opens one focused surface (a centered panel on a wide screen, a bottom sheet on a phone or tablet) that holds everything you can do to that verse: play it, play from here, memorize, bookmark, a private note, and its translation, on-demand tafsir, and word-by-word. The page itself stays a clean color-coded Mushaf with no inline buttons. Playback still runs through the one audio engine, with the always-visible mini-player as the transport.
- **Word-range and selection controls in the overlay.** Pick a contiguous range or a hand-picked set of verses and play them as one queue, with a per-verse repeat count, a whole-selection loop, and an inter-verse pause. For reciters with word timings you can also loop a single start-word to end-word range within one verse.
- **Reciter A/B compare and record-and-compare.** Hear the same verse by two reciters back to back, or record your own recitation in the browser and replay it next to the reciter to judge by ear. The recording never leaves the device, is held only in memory, and is never scored.
- **Follow-along.** For reciters that publish word timings, the recited word highlights in time over the verified coloring as the verse plays. A reveal-as-recited mode blurs the verse and uncovers each word as it is read, for memorization self-testing, and a reading-focus mode dims every verse but the active one. Reciters without timings simply show no highlight; nothing about the text is generated.
- **Tap a colored letter for its rule.** Any color-coded letter in the reader names its tajweed rule with its swatch and a link to the lesson that teaches it. An always-available color legend gives the same names and swatches to keyboard users, and the rule-highlight drill dims all but one rule across the page.
- **Reciter roster.** Around 42 reciters in the Hafs 'an 'Asim recitation (twelve from Quran.com, thirty from everyayah.com), grouped by style and searchable, defaulting to Al-Husary in the teaching style. A single per-surah recitation in the Warsh narration (Younes Souilass) is offered behind a disclaimer on the surah index, kept entirely separate from the Hafs experience and the per-verse player.
- **Progress, deeper.** A forgetting-curve review of your memorized verses surfaces in recall; a most-missed rule-areas dashboard reads your quiz history and links each weak area to targeted practice; notes and bookmarks gained tags and a filter; a resume-listening entry returns you to the last verse you played, separate from the last page you read; and finishing a juz or a khatmah draws an on-device certificate you can keep.
- **A reworked first-run tour** covering the v2 experience, with a permanent dismiss and a Settings toggle to replay it whenever you want.

### Changed

- **Paper-and-ink depth.** Surfaces gained a per-theme elevation shadow and a fine gold hairline instead of glass or glow, and route and section changes use the browser's own View Transitions for a calm crossfade. Everything respects the reduced-motion preference.
- **Translation and tafsir are fetched per verse and rendered sanitized**, never generated, and global search returns verses in whichever language you are reading in.
- **The reader's first load stays light.** The overlay's heavier surfaces (reciter compare, record-and-compare, word-by-word, the reading-depth section) and the progress certificate are loaded only when first opened.

### Security

- **A tightened Content-Security-Policy and response headers**, API HTML sanitized at every boundary, and a localStorage sanitizer that rejects prototype-pollution keys on every read. No user data leaves the device: notes, tags, bookmarks, memorization, review state, and insights are all local, and a backup is an explicit export you control.

## 0.6.0 (2026-06-20)

The Companion redesign, plus a production-hardening finalization. Every surface was lifted to the quality of the home page, the mushaf listening experience was rebuilt for small screens and for memorization revision, the in-reader indexes now reflect where you are, and memorization became a real progress system. The finalization added study tools around the reader, a Quran-completion planner, and a layer of resilience. No religious content was generated or edited: verse text, translations, tafsir, tajweed coloring, and audio still come only from the verified Quran.com API or the bundled snapshots, and the app renders them rather than producing them. The only dependency bump was Next 16.2.7 to 16.2.9; the major-version bumps (Tailwind v4, TypeScript 6, ESLint 10) were deferred on purpose to protect the tuned design.

### Added

- **Always-visible playback surface.** A docked, collapsible panel sits beside the page at desktop width (1024px and up) and a bottom sheet takes its place on phone and tablet, so the verse you are playing is never hidden behind the controls. A plain tap on a verse plays just that verse, with an immediate loading state and a quiet marker on the one that is sounding.
- **Multi-verse selection for revision.** Pick a contiguous range or hand-pick a set of verses; either way they play as one auto-advancing queue on the same audio engine, with a per-verse repeat count, a whole-selection loop, and an inter-verse pause. The selection shows as removable chips with a one-action clear.
- **Dynamic in-reader index.** The surah and juz pickers always read out the surah(s) and juz on the open page, even after a deep-linked reload, and update as you turn pages. A Cmd/Ctrl+K quick-jump palette (with a visible button) jumps to any surah, page, or juz.
- **Memorization as a progress system.** Mark verses memorized in bulk by surah, juz, or range, or one at a time, reconciled against the 6236-verse total. The progress page shows a memorized count and percentage with per-surah and per-juz breakdowns, and a review session scoped to your memorized verses runs in recall mode.
- **First-launch onboarding.** A short, skippable welcome on first open explains the Mushaf, recall mode, and the tracker. It is shown once and is covered by reset.
- **Tap a colored letter to learn its rule.** Any color-coded letter in the reader and in the lesson examples opens a popover naming the tajweed rule and its color, with a "Learn more" link to the lesson that teaches it. The rule name and color come from the verified map; nothing is explained in the app's own words.
- **Bookmarked-verses view** at `/mushaf/bookmarks`, linked from the index, listing every saved verse with its text and open / remove actions. Per-surah resume pills on the index jump back to where you left a surah.
- **Private per-verse notes.** The verse panel holds a personal note in the learner's own words. Notes stay on the device, are never transmitted, are never religious content, and are covered by backup and restore.
- **Reciter A/B compare.** The verse panel plays the same verse by two reciters in turn on the one audio engine, so recitation styles can be compared by ear.
- **Khatmah reading planner** on the progress page. Set a target date or pick a 30, 60, or 90-day preset; the planner tracks completion from the reader position and shows the daily pace, the page to reach today, and whether you are ahead or behind. The pace math is a pure library (`src/lib/khatmah.ts`).
- **Search filters.** Search results filter by kind, with an optional facet that narrows verse hits to the ones you have memorized.
- **Gentle backup reminder** in Settings, suggesting a fresh export when there is unsaved progress and no backup in the last 30 days.

### Changed

- **Every surface lifted to the home-page bar.** The mushaf, learn, practice, progress, search, settings, and the navigation chrome were brought up to the visual quality and intentionality of the home page, so the app reads as a crafted Islamic product throughout. The tajweed color system was not touched.
- **Next 16.2.7 to 16.2.9.** The single dependency bump this milestone; security patches track promptly.

### Fixed

- **Listening is reachable on every device.** The old hidden player below the fold is gone; the active-playback surface is always visible, and a tap on a verse plays it immediately rather than requiring a hunt for controls.

### Security and resilience

- **Error boundaries.** A root `error.tsx` and a top-level `global-error.tsx` keep a single failed render from blanking the app.
- **Route loading skeletons** for the learn, practice, progress, settings, and Mushaf routes while data resolves.
- **Production dependency audit in CI.** Every push and pull request runs `npm audit --omit=dev --audit-level=high`, failing the build on a high or critical advisory in the shipped tree.
- **Prototype-pollution guard.** Every keyed map in the localStorage sanitizer skips `__proto__`, `constructor`, and `prototype`, so a crafted backup cannot reach an object prototype.
- **Reduced-motion and scroll-lock helpers.** JS-driven smooth scrolling is gated on `prefers-reduced-motion`, and stacked overlays coordinate a single ref-counted body-scroll lock.

## 0.5.0 (2026-06-12)

A guided learning path, a calmer quiz flow, a minimizable player, and a new visual identity, followed by five feature additions: word-synced highlighting, in-browser recitation self-compare, a per-module rule mastery view, a leaner build, and keyboard, screen-reader, and offline hardening. No religious content was generated or edited: verse text, translations, tafsir, tajweed coloring, and audio still come only from the verified Quran.com API or the bundled snapshots, and the app renders them rather than producing them.

### Added

- **Quiz-gated learning path.** Modules now unlock by finishing the previous module's practice quiz instead of by merely opening a lesson. The rule lives in one place (`src/lib/module-unlock.ts`) and every surface reads it: the learn grid, the practice hub, lesson and quiz routes, the sidebar, and the mobile drawer. Locked screens point at the prerequisite quiz first, with its lessons as the secondary path, and finishing a quiz unlocks the next module live without a reload. There is no pass mark: sitting the quiz is the gate, the score is feedback.
- **Minimizable player pill.** The movable mini-player can collapse to a compact pill that keeps playback running, with the drag handle, a play and pause control, and the current verse label. Minimized state and position persist across navigation and reload, and the pill re-clamps to the viewport when its size changes.
- **Word-synced highlighting.** In the reading panel's word-by-word view, the current word highlights as the reciter speaks, driven only by the per-reciter segment timestamps published alongside the verified audio. Reciters without segment data simply show no highlight; nothing about the text is generated.
- **Recitation self-compare.** The verse reading panel can record your own recitation in the browser's memory so you can replay it next to the reciter and judge by ear. Nothing is uploaded, stored, or scored, the recording lives only in memory, and browsers without recording support hide the control.
- **Rule mastery view.** The progress page shows per-module mastery (quizzes taken, best and latest score, items reviewed and mastered, and what is due), aggregated purely from your own saved progress, with an empty state for new users.
- **Offline notice.** A slim connectivity pill appears while you are offline and clears on reconnect. Lessons and the last Mushaf page you opened stay readable from cache after one visit.

### Changed

- **Quiz feedback waits for you.** Answers no longer auto-advance on a timer. The explanation stays up until Continue, which takes focus so Enter advances; the last question reads "Finish quiz"; and after a wrong answer the lesson link becomes a filled call-to-action for reviewing the rule.
- **Vellum and lapis repalette.** The interface moved from green-on-cream to the manuscript triad of classical Quranic illumination: vellum ivory ground, lapis ink for interaction, gold leaf for ornament, and red ochre as a rare accent. Dark mode is the same manuscript at night, a navy ground with gold-forward controls. The navigation chrome (sidebar, mobile header, drawer, and tab bar) is now a constant illuminated margin in both themes, and headings moved to Spectral. Tajweed letter colors are a separate system and are unchanged.
- **Leaner build.** The home, search, and practice routes defer work that the first paint does not need (the daily verse, the search corpus, and the question-pool computation), the self-hosted fonts are subset with `display: swap` and the Arabic faces carry only the Arabic glyphs, and the offline cache was verified against the built assets. No behavior changed; largest-contentful-paint stays under a second on the measured routes.
- **Accessibility and offline hardening.** Keyboard users get a focus trap and focus return in the mobile drawer, Escape to close the player and verse panels, and visible focus rings throughout; screen-reader users get named controls, distinct navigation landmarks, and corrected heading order; reduced-motion preferences are honored across animations.

### Fixed

- **Playback follows the last action.** Rapid reciter switches mid-playback and closing the player while a verse is still loading no longer resurrect audio or repaint the bar with stale errors: in-flight loads are dropped the moment the player stops or changes course.
- **Stable first render.** All components share one tab-wide progress snapshot, so the sidebar, learn grid, and practice hub always agree about what is unlocked, and storage writes that land during a render no longer trigger React's setState-during-render warning. Settings persist from an effect instead of inside the state updater, so saves cannot run mid-render under StrictMode.

## 0.4.0 (2026-06-07)

Broader reciter choice, a movable audio player, a content-accuracy pass with a new offline check, and visual polish. No religious-content was generated or edited: verse text, translations, tafsir, tajweed coloring, and audio still come only from the verified Quran.com API or the bundled snapshots, and the app renders them rather than producing them.

### Added

- **Seven more reciters** from everyayah.com, bringing the roster to nineteen: Saad al-Ghamdi, Maher al-Muaiqly, Muhammad Ayyoub, Ali al-Hudhaifi, Abdullah Basfar, Yasser al-Dossari, and Abdullah Awad al-Juhani. They live alongside the twelve Quran.com recitations in `src/lib/reciters.ts` (ids prefixed `ea-`). Each per-ayah file was confirmed to resolve before it was added, and the everyayah host is allowlisted in `src/lib/media-url.ts` and the CSP. If an ayah file ever 404s, playback falls back instead of stalling.
- **Movable mini-player.** The mini-player can be dragged by its handle to any corner of the viewport; the position is clamped to stay on screen and persists in user settings, so it stays out of the way of whatever you are reading.
- **Content check** via `scripts/verify-content.mjs`. It reads every practice question, confirms the Arabic fragment appears in the authenticated text of the verse it cites (folding orthographic differences that are not content differences), and hard-fails on structural problems (no valid answer, duplicate id, wrong option count). Offline, no key. See [content-audit.md](content-audit.md).
- **Sourced practice questions** added across noon sakinah, meem sakinah, ghunnah, qalqalah, madd, laam and raa, and tafkheem and tarqeeq, each citing the surah:ayah its fragment comes from.

### Changed

- **Lessons re-checked against sources.** Every rule, letter set, beat count, and mnemonic in the nine lesson files was reviewed against named tajweed authorities for Hafs 'an 'Asim. The accuracy guarantees and the headline references are written up in [content-audit.md](content-audit.md).
- **Quiz answer positions corrected** where the right option had drifted to a predictable slot.
- **Ghunnah ranks regrouped into maratib.** The lesson now presents the ranks of ghunnah as grouped levels (akmal, kamilah, naqisah, anqas) rather than a flat one-to-five list, because the contexts that share a level share the same prominence. See `ghunnah_prominence_ranking_note` in `src/data/content/ghunnah.json`.
- **Visual and Islamic polish.** Calmer surah cartouche and Quran frame, more vertical room for harakat on colored Quran lines, a redesigned color legend, and a refreshed responsive sweep in light and dark.

### Deferred

- **Tafkheem coloring in the Mushaf.** No clean, verified per-letter tafkheem dataset was available without the app classifying tajweed itself, which this project does not do. Coloring is held back rather than approximated. The Tafkheem and Tarqeeq lesson covers the heavy and light letters and stands on its own.

## 0.3.1 (2026-06-01)

A security-hardening and bug-fix pass. No religious-content changes: verse text, translations, tafsir, and audio still come only from the verified Quran.com API.

### Fixed

- **Reading-depth panel is now discoverable.** Tapping any verse in the Mushaf reader opens its translation / tafsir / word-by-word panel, which scrolls into view. The old hover-only per-verse icons (play, memorize, details) were undiscoverable on touch and are gone; play this verse, play from here, memorize, and verse bookmark now live in the panel header.
- **Translations now render.** The previous default translation resource id (131) is no longer served by the Quran.com API and returned nothing, so no translation ever appeared. The default is now Saheeh International (id 20) and the curated list drops the dead id. Footnote markers render as superscripts instead of literal text.

### Security

- **Mutation-XSS hardening.** The verse and tafsir HTML sanitizers (`src/lib/sanitize.ts`) were rewritten to escape every angle bracket before re-creating only known-safe tag shapes, closing a single-pass-regex tag-reassembly bypass (e.g. `<<img onerror=x>img ...>`). `verify-sanitizer.mjs` now imports the real sanitizer and tests the exact bypass payloads (29 cases).
- **Audio URL allowlist.** API-provided audio URLs are constrained to expected hosts (`verses.quran.com`, `*.quranicaudio.com`, `audio.qurancdn.com`) and upgraded to https (`src/lib/media-url.ts`); `getAudioEndpoint` self-clamps surah / ayah.
- **Permissions-Policy** denies every unused device feature (payment, USB, serial, bluetooth, screen capture, sensors).
- **Service worker** caches navigations under a query-stripped key so distinct query strings cannot grow the cache without bound.
- **Dependencies.** `npm audit fix` cleared the picomatch (high) and brace-expansion advisories and bumped the top-level postcss. The remaining advisory is Next's build-time-only nested postcss, which is non-exploitable here: only the app's own CSS passes through postcss, and the deployed artifact is static.

### Changed

- `vercel.json` builds via the canonical `npm run build` script. Security headers, CSP, and caching stay centralized in `next.config.mjs`, which Vercel honors.

## 0.3.0

A platform upgrade plus the production audio/asset fix and continuous playback. Framework, fonts, service worker, and response headers were all reworked; the religious-content rule is unchanged (verse text, translation, tafsir, and audio still come only from the verified Quran.com API or committed snapshots).

### Changed

- **Framework upgrade**. Next.js 14.2 → 16.2.7 (builds run on Turbopack; `turbopack.root` is pinned in `next.config.mjs` so a stray parent lockfile is not inferred as the workspace root). React 18 → 19.2.7 (`react-dom` 19.2.7), `@types/react` → ^19, Node 24. Tailwind stays at 3.4.19 on purpose, since Tailwind v4 is not required by Next 16 and would risk the tuned design.
- **ESLint 9 flat config**. `eslint.config.mjs` spreads `eslint-config-next/core-web-vitals`; `.eslintrc.json` was removed. The lint script is now `eslint .` (not `next lint`, which Next 16 deprecates). `package.json` scripts: `dev`, `build`, `start`, `lint`, `verify`, `verify:scripts`, `verify:ui`.
- **Next 15+ async route APIs**. Dynamic-route `params` is now a Promise, awaited in server routes, unwrapped with React `use()` in client routes (`practice/[module]`). Segment `revalidate` exports use a literal number of seconds (e.g. `86400`, `604800`).
- **Self-hosted fonts via `next/font`**. Inter, Plus Jakarta Sans, JetBrains Mono, Amiri, and Amiri Quran are all self-hosted; the render-blocking Google Fonts `<link>` in `layout.tsx` was removed. Tailwind `fontFamily` tokens reference the `next/font` CSS variables (`var(--font-quran)`, `var(--font-amiri)`, `var(--font-inter)`, etc.).
- **CSP and response headers consolidated** into `next.config.mjs` as the single source; `vercel.json` is trimmed to just `framework` + `buildCommand` (its competing headers removed). `script-src` drops `'unsafe-eval'` in production (kept only in dev for HMR); `style-src`/`font-src` no longer list `fonts.googleapis.com`/`fonts.gstatic.com` (fonts are self-hosted); `connect-src 'self' https://api.quran.com`; `media-src 'self' https://verses.quran.com https://*.quranicaudio.com https://audio.qurancdn.com`.

### Added

- **Build-stamped service worker (production fix)**. The static `public/sw.js` (`CACHE_VERSION = "v1"`) never invalidated caches across deploys, leaving users on a stale shell/assets. It was removed. The worker is now served by a Next route handler `src/app/sw.js/route.ts` (`force-static`) that stamps a unique per-build version into `scripts/sw-template.js`, so each deploy gets fresh cache namespaces and the activate step purges old caches. Scope is limited to the app shell (HTML, network-first) and same-origin static assets (cache-first); it does not intercept cross-origin Quran audio (mp3) or the Quran.com API, so the worker can never break audio playback (the trade-off is no offline Quran content).
- **"Play surah" control** in the Mushaf reader toolbar. Plays the whole surah continuously, auto-advancing ayah to ayah, pausable anywhere.
- **Mini-player mode toggle** between single and full-surah playback. A plain verse tap is single mode; per-verse "play from here" and "Play surah" are continuous.

### Audio provider

- Per-ayah audio comes from the Quran.com API (`/recitations/{id}/by_ayah/{key}`); the returned path resolves to `verses.quran.com` or `*.quranicaudio.com` (e.g. `mirrors.quranicaudio.com`). 12 reciters in `src/lib/reciters.ts`.

## 0.2.1 (2026-05-02)

A second pass on the 0.2.0 branch that picks up the items the original release deliberately left out. Each item is wired with its own atomic commit and a smoke-tested verify script.

### Added

- **Spaced repetition (Leitner)**. Every authored question is tracked by stable id under `progress.reviews`. A correct answer promotes one box (intervals 1, 3, 7, 14, 30 days; max box 5 = mastered); a wrong answer drops to box 1. New: `src/lib/spaced-repetition.ts`, `useReviews` hook, `/practice/review` route, `getDueQuestions(dueIds, count)`, Review Due tile on `/practice` (only renders when `due > 0`), Spaced Review stats card on `/progress`. `QuizSession` accepts a `mode: "random" | "review"` prop and writes through `recordReview` after every answer.
- **Memorization tracker** in the Mushaf reader. Per-verse heart toggle persists to `progress.memorizedVerses` (capped at 6,236 unique `surah:ayah` keys, format-validated). `useMemorization()` hook keeps the UI in sync. The reader toolbar exposes an eye toggle that activates recall mode: every memorized verse on the visible page is blurred (`blur-md`, 60% opacity) with a per-verse Reveal pill. The recall toggle is in-session state, not persisted. Memorization stats card appears on `/progress` once any verse is marked.
- **Global search** at `/search`. Cached index covers all 114 surahs, the 9 lesson modules, every rule (with subtypes), tafkheem subsections, makharij regions, and waqf symbols. Simple ranked search by tokenized substring across title, subtitle, and a denormalized haystack; minimum query length 2. Each hit links to its canonical route (`/learn/<module>#<anchor>` for rules, `/mushaf/surah/<n>` for surahs). New top-level nav entry with a search icon.
- **TTS for question prompts** via the Web Speech API. A small speaker button next to each prompt reads the prompt text aloud (`ar-SA` or `en-US` based on the active locale, rate 0.95). Single-utterance: starting a new readout cancels any in-flight one. The button hides when the browser doesn't expose `speechSynthesis`. **Quranic verse text is never read by TTS**, only UI prompts.
- **Lesson section progress chip**. Each of the 9 lesson pages declares its anchor list, and `<LessonProgress moduleId sections>` mounts an `IntersectionObserver` (40% threshold) to mark sections read in `progress.readSections[moduleId]`. A fixed bottom-right chip shows "X / Y sections read" and links to the next unread anchor; it auto-hides when everything is read. New: `useReadSections` hook, `markSectionRead`, slug-validated against `^[a-z0-9][a-z0-9-]{0,80}$`, capped at 50 per module.
- **Anonymous local analytics** with route and quiz instrumentation. `progress.analytics` is a 1000-event ring buffer keyed by a fixed `AnalyticsEventType` set (`route.view`, `quiz.start`, `quiz.finish`, `review.start`, `memorize.toggle`, `search.query`). Meta payloads are capped at 200 chars. `RouteAnalytics` (mounted in `AppProvider`) records a `route.view` on every navigation. `QuizSession` records `quiz.start` / `review.start` on entry and `quiz.finish` on completion. `/progress` adds an Insights card with quiz starts, finishes, and the top 5 most-visited routes. **Local only, never transmitted.**
- **Backup and restore** in Settings. `exportProgress()` returns a pretty-printed JSON snapshot of the full sanitized progress object; `importProgress(payload)` parses, sanitizes, and replaces. The Settings UI offers Export (downloads `tajweed-trainer-backup-YYYY-MM-DD.json`) and Restore (file picker, soft-reload after success). Failure surfaces a localized error message.
- **Installable PWA**. `app/manifest.ts` (Next.js metadata route) ships the web manifest with a regular and a maskable SVG icon. `public/sw.js` ships a service worker with strategies: network-first for HTML, cache-first for `/icon*` and `/_next/static/*`, stale-while-revalidate for `api.quran.com` and `api.alquran.cloud`, and cache-first with a 50-entry FIFO cap for `cdn.islamic.network` audio. The worker registers via `<PWARegister/>` mounted in `AppProvider` (production builds only). `app/layout.tsx` adds `themeColor`, `applicationName`, `appleWebApp`, and explicit `icons`.

### Changed

- `TajweedProgress` extended with four new fields: `reviews: Record<string, ReviewState>`, `memorizedVerses: string[]`, `readSections: Record<string, string[]>`, `analytics: AnalyticsEvent[]`. All four are sanitized on every read with explicit validators and per-field caps (see `docs/api-integrations.md` "Storage caps").
- `MushafPage` and `MushafReader` accept a `memorizationMode` prop and render the per-verse memorize toggle and the toolbar eye toggle.
- `PracticeQuestion` renders an optional speaker button next to the prompt when the browser supports `speechSynthesis`.
- `AppProvider` mounts `<PWARegister/>` and `<RouteAnalytics/>` once at the app shell level.
- `SearchIcon` added to `nav-data.tsx`; the new `/search` route appears between `/practice` and `/progress` in both the desktop sidebar and the mobile drawer.
- The 9 lesson pages each import `LessonProgress` and declare a top-level `SECTIONS` constant derived from JSON (rule ids, subtype ids, plus the static overview anchors).

### Documentation

- README features list, project layout, and scripts table updated for spaced repetition, memorization, search, TTS, lesson sequencing, analytics, backup, and PWA.
- `docs/architecture.md` lists the new routes, hooks, and library files; updated layer diagrams reflect the spaced-repetition and memorization data flow.
- `docs/api-integrations.md` storage caps table extended with `reviews`, `memorizedVerses`, `readSections`, and `analytics` rows; new section for the local-only data fields.
- `docs/security.md` adds a section explaining that local analytics never leave the device and clarifying the PWA service worker's privacy posture.
- `docs/i18n.md` updated to list the new translation namespaces (`review.*`, `memorize.*`, `search.*`, `speech.*`, `insights.*`, `learn.sectionsRead`, `settings.backup.*`, `mushaf.memorize*`).
- `docs/development.md` documents `verify-newfeatures.mjs` and the new manual smoke checklist for offline / install behavior.

## 0.2.0 (2026-05-02)

### Added

- **Module lock** at `/learn/<module>`. Each module gates on at least one lesson complete in its prerequisite. Sidebar and mobile drawer show a lock icon next to gated module names. The lock indicator is hydration-safe via a `mounted` flag, with the existing `LearnLoading` skeleton bridging the unmount window. Walking the prerequisite chain from Makharij forward unlocks every downstream module. New: `useModuleLock(id)` hook, `LockedModuleScreen` component, `verify-module-lock.mjs` (11/11).
- **Authored question pool**: 270 questions across the nine modules, 30 per module split easy/medium/hard. Each `Question` carries a stable id, prompt, four options, correct option id, an explanation pointing at a `lessonAnchor`, and a `source` (surah:ayah plus translation provenance). Aggregator at `src/lib/question-pool.ts` prefers authored questions over the legacy random-from-examples path for any module that has authored entries. New: `src/data/questions/<module>.ts`, `verify-questions.mjs` (19/19).
- **Practice hub** at `/practice`. Replaces the old module-filter dropdown with a tile grid: nine module tiles plus a Mixed Review tile. Per-module routes at `/practice/<module>` and `/practice/mixed`. Each tile shows last quiz score and quizzes-taken count. New: `PracticeModuleCard`, `getModuleLastScore`.
- **Reciter expansion**. Settings page now shows a language-grouped `<select>` populated from `api.alquran.cloud /edition?format=audio&type=versebyverse`. The two built-in defaults (Husary, Alafasy) are always pinned at the front and rendered even when the API fails. Identifiers validated against `/^[a-z0-9._-]{1,64}$/`. List cached for 24h under `tajweed-trainer-reciters`. Persisted reciter is re-validated against the cached list with a husary fallback for unknown ids. New: `useReciters`, `fetchReciterEditions`, `validateReciterIdentifier`, `verify-reciters.mjs` (9/9).
- **Post-answer feedback** in the practice flow. After answering, the rule name, the authored explanation, and a deep link to `/learn/<moduleId>#<lessonAnchor>` show before the auto-advance fires (3s window, up from 1.5s). Lesson pages have anchor wrappers on the matching sections so the URL fragment scrolls to the relevant card.
- **Practice this module CTA** in `LessonNavigation`. Renders below the prev/next row when the module is unlocked. Hidden while locked. Linked into all nine lesson pages.
- **Sanitizer smoke test**: `verify-sanitizer.mjs` (14/14) exercises the tajweed HTML sanitizer against canonical and adversarial inputs (script tags, iframe, onclick, disallowed classes, javascript: URIs, comments, CDATA).

### Changed

- `ReciterId` type relaxed from a union literal (`"husary" | "alafasy"`) to `string` with runtime identifier validation. The two short aliases (`husary`, `alafasy`) keep working via `resolveReciterIdentifier`. `RECITERS` array kept for legacy imports; production code reads `useReciters().editions` instead.
- Quiz auto-advance bumped from 1.5s to 3s so users have time to read the post-answer feedback panel.
- `verify-questions.mjs` rewritten to assert the practice hub layout, navigate directly to per-module routes, and check the post-answer feedback panel and Practice CTA.
- `storage.sanitizeSettings` validates `reciter` against the cached editions list (`getCachedReciterEditions`) rather than a hardcoded enum.

### Documentation

- `docs/api-integrations.md` extended with the editions endpoint, identifier validation contract, and a table of every storage cap.
- `docs/architecture.md` updated to reflect the new routes, hooks, and library files.
- New: `docs/CONTENT.md`, how to add new questions, lesson anchors, and verse snapshots.
- README features list rewritten to match 0.2.0 capabilities.

### Out of scope (intentionally not added)

PWA / offline support, spaced repetition, memorization tracker, lesson sequencing within a module, accounts / cross-device sync, search, hadith content, audio for question prompts. These were held back to keep the release focused; most landed in 0.2.1.

## 0.1.0

Initial release. Foundation, learning modules, practice quiz, Mushaf reader, progress tracking, bilingual UI, dark mode, ornate Islamic design system. The full pre-0.2.0 feature surface.
