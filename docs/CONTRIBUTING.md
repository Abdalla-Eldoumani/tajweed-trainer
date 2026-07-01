# Contributing

Contributions are welcome. This project is about Quranic recitation, so accuracy comes before speed; read this guide first.

## Prerequisites

- Node 24, pinned in `.nvmrc` and `engines.node`, so `nvm use` picks it up.
- npm (bundled with Node).

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. No accounts, server, or environment variables; state lives in `localStorage`, and the only network calls read from the Quran APIs.

## Checks

Run these before opening a pull request:

```bash
npx tsc --noEmit          # type check
npm run lint              # eslint .
npm run verify            # tsc + eslint + verify:scripts
npm run build             # production build
npm run verify:ui         # browser tests against a running server
```

`npm run verify` wraps the type check, lint, and offline `verify:scripts` suite. `npm run verify:ui` needs a running server and is not in the CI gate; run it for UI changes in EN, AR, light, and dark. See [development.md](development.md) for the full list.

## Conventions

This codebase has one path for each shared concern. Reuse it; do not fork a second.

- Storage writes go through `src/lib/storage.ts`, the only write path, where every read is sanitized.
- Tajweed colors come only from `src/lib/tajweed-colors.ts`. Change the map, never a hex by hand.
- Module unlocking lives in `src/lib/module-unlock.ts`. Never reimplement the gating rule inline.
- Audio plays through the single player store (`usePlayer` / `PlayerHost`), reusing one audio element.

Render Arabic through the wrappers (`ArabicText` for general Arabic, `TajweedText` for color-coded Quran text), never raw, and use logical Tailwind properties (`ms-*`, `me-*`) so the UI holds under `dir="rtl"`. Branch off `main` with a descriptive name (`fix/iqlab-typo`, `feat/per-page-audio`).

## Content accuracy

The app renders pre-verified content and never generates, edits, paraphrases, translates, or classifies it. The full rule lives in the [project README](../README.md), with detail in [content-audit.md](content-audit.md) and [CONTENT.md](CONTENT.md): `src/data/` and `src/lib/tajweed-colors.ts` are verified data; do not hand-edit them. When unsure, omit.

## How CI gates a pull request

A pull request against `main` runs CI on Node 24: a production dependency audit (`npm audit --omit=dev --audit-level=high`), type check, lint, the offline verify scripts, and a build. It must be green before review; `npm run verify` and `npm run build` mirror most of it locally.

## Ways to contribute

| What | Where |
|------|-------|
| Fix a typo in lesson content | `src/data/content/*.json` |
| Add a Quranic example to a rule | `src/data/content/*.json` (see [content-schema.md](content-schema.md)) |
| Improve an Arabic translation | `src/lib/i18n.ts` and / or `_ar` fields in JSON |
| Improve UI or accessibility | `src/components/*` and pages |
| Improve docs | `docs/*.md` |
| Add a test | `scripts/verify-*.mjs` |
| Report a bug or suggest a feature | GitHub Issues |

## PR template

```markdown
## What changed
One sentence describing the change.

## Why
The problem this solves or the use case it enables.

## Verification
- [ ] `npm run verify` clean
- [ ] `npm run build` clean
- [ ] `npm audit --omit=dev --audit-level=high` clean
- [ ] Visually checked in EN and AR, light and dark
- [ ] (If UI) `npm run verify:ui` passing

## Notes for reviewers
Anything unusual or uncertain.
```

## Review checklist

For reviewers:

- [ ] **Content accuracy.** Letter sets, beat counts, and surah:ayah refs match Hafs sources.
- [ ] **No fabricated content**, especially Quranic examples, coloring, or Arabic explanations.
- [ ] **Bilingual coverage.** New strings have `en` and `ar` via `useTranslation()`, not hardcoded.
- [ ] **RTL works.** No breakage under `dir="rtl"`; logical properties (`ms-*`, not `ml-*`).
- [ ] **No hydration warnings** on any route, including after a localStorage change.
- [ ] **Type-safe.** `npx tsc --noEmit` is clean.
- [ ] **No emoji or marketing-speak** in code, comments, docs, or commits.
- [ ] **Dark mode.** Tajweed colors stay legible; borders and text have enough contrast.
- [ ] **Accessibility.** Visible focus, ARIA labels on icon buttons, 44 px touch targets.

## Commit message style

```
short imperative phrase

optional body, wrapped at 72.
```

- Lowercase, imperative: "fix the foo", not "fixed" or "fixes".
- No emoji, no marketing-speak adjectives.

Examples:

- `fix izhar example surah ref in noon-sakinah-tanween.json`
- `add description_ar to learning-path module entries`

## When in doubt

- **Accuracy:** when uncertain, omit. An empty `_ar` field is better than a wrong one.
- **Architecture:** stay close to existing patterns. New abstractions need a clear payoff.
- **UX:** visual tweaks merge easily; semantic changes need a discussion.

## Code of conduct

This project is about a sacred subject. Be respectful in issues, PRs, and discussions. Disagreements are fine; disrespect isn't.

## Licensing

By contributing, you agree your contributions are licensed under the same terms as the rest of the project (see [LICENSE](../LICENSE)).
