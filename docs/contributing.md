# Contributing

Contributions are welcome. This is a project about Quranic recitation, so accuracy matters more than velocity.

## Before you start

- Read the [README](../README.md) for the project overview.
- Skim [content-schema.md](content-schema.md) if you plan to touch lesson content.
- Skim [development.md](development.md) for local setup.

## Ways to contribute

| What | Where |
|------|-------|
| Fix a typo in lesson content | `src/data/content/*.json` |
| Add a Quranic example to an existing rule | `src/data/content/*.json` (see [content-schema.md](content-schema.md)) |
| Improve an Arabic translation | `src/lib/i18n.ts` and / or `_ar` fields in JSON |
| Improve UI or accessibility | `src/components/*` and pages |
| Improve docs | `docs/*.md` |
| Add a test | `scripts/verify-*.mjs` |
| Report a bug | GitHub Issues |
| Suggest a feature | GitHub Issues |

## Pull request workflow

1. Open an issue first for non-trivial changes. Lets us discuss scope before code.
2. Fork and create a branch named after the change (`fix/iqlab-typo`, `feat/per-page-audio`).
3. Atomic commits. One logical change per commit. Brief, lowercase commit messages that explain why.
4. Run the checks before pushing:
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm run build`
   - `node scripts/verify-mushaf.mjs` (only if you touched the Mushaf)
5. Visual check in EN, AR, light, and dark before opening the PR.
6. Open a PR with the template below.

## PR template

```markdown
## What changed
One sentence describing the change.

## Why
The problem this solves or the use case it enables.

## Verification
- [ ] `npm run lint` clean
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run build` clean
- [ ] Visually checked in EN
- [ ] Visually checked in AR
- [ ] Dark mode looks fine
- [ ] (If Mushaf) `node scripts/verify-mushaf.mjs` 21/21 passing

## Notes for reviewers
Anything unusual, trade-offs you considered, areas you're uncertain about.
```

## Review checklist

For reviewers:

- [ ] **Tajweed content accuracy.** Letter sets, beat counts, and surah:ayah refs match Hafs primary sources.
- [ ] **No fabricated content.** Especially Quranic examples, tajweed coloring, Arabic explanations. If a reviewer can't confirm accuracy, the entry isn't ready.
- [ ] **Bilingual coverage.** New strings have both `en` and `ar`. Components use `useTranslation()` rather than hardcoding language strings.
- [ ] **RTL works.** UI doesn't break under `dir="rtl"`. Logical Tailwind properties (`ms-*`, not `ml-*`).
- [ ] **No hydration warnings.** Browser console clean on every route, including after a localStorage change.
- [ ] **Type-safe.** `npx tsc --noEmit` is clean.
- [ ] **No emoji or marketing-speak adjectives** in code, comments, docs, or commit messages.
- [ ] **Dark mode.** Tajweed colors stay legible. Borders and text have enough contrast.
- [ ] **Accessibility.** Focus states visible, ARIA labels on icon buttons, 44 px minimum height on touch targets.

## Commit message style

```
short imperative phrase

optional longer body explaining the why. wrap at 72.

- bullet point 1
- bullet point 2
```

- Lowercase first letter (consistent with the existing log).
- Imperative mood: "fix the foo", not "fixed the foo" or "fixes the foo".
- No emoji, no marketing-speak adjectives.
- Reference the file or function being changed if it makes the message clearer.

Examples:

- `fix izhar example surah ref in noon-sakinah-tanween.json`
- `add description_ar to learning-path module entries`
- `extend quran-api with getTajweedPage for the mushaf reader`
- `rewrite README to cover bilingual ui and the mushaf reader`

## When in doubt

- **Tajweed accuracy:** when uncertain, omit. An empty `_ar` field is better than a wrong one.
- **Architecture:** stay close to existing patterns. New abstractions need a clear payoff.
- **UX:** visual tweaks merge easily if they don't change semantics; semantic changes need a discussion.

## Code of conduct

This project is about a sacred subject. Be respectful in issues, PRs, and discussions. Disagreements are fine; disrespect isn't.

## Licensing

By contributing, you agree your contributions are licensed under the same terms as the rest of the project (see [LICENSE](../LICENSE)).
