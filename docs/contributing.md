# Contributing: review checklist and PR template

This is the review-side companion to the root [CONTRIBUTING.md](../CONTRIBUTING.md), which covers setup, the checks, the single-source conventions, the content rule, and how CI gates a pull request. Start there for the workflow; this page holds the pull-request template and the reviewer's checklist, plus where to make common changes and the commit-message style.

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

## PR template

```markdown
## What changed
One sentence describing the change.

## Why
The problem this solves or the use case it enables.

## Verification
- [ ] `npm run verify` clean (tsc, lint, the offline verify scripts)
- [ ] `npm run build` clean
- [ ] `npm audit --omit=dev --audit-level=high` clean
- [ ] Visually checked in EN
- [ ] Visually checked in AR
- [ ] Dark mode looks fine
- [ ] (If UI) `npm run verify:ui` passing against a running server

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
