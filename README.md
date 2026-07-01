# Tajweed Trainer

A bilingual (English / Arabic) web app for learning Tajweed, the rules of proper Quran recitation. It pairs nine color-coded lesson modules and practice quizzes with a full 604-page Madinan Mushaf reader, where tapping a verse opens a focused overlay for playback, memorization, notes, and meaning, and a follow-along highlights each word as it is recited. It ships in five art-directed manuscript themes and runs entirely in the browser: no account, no server, and offline as an installed app, with progress kept in `localStorage`.

All recitation follows Hafs 'an 'Asim, the most widely used Qira'ah. Quranic text and audio come from established APIs; the rule explanations and examples come from JSON that is reviewed against primary sources before it is marked verified.

## How it stays accurate

Tajweed is an oral science traced through chains of recitation back to the Prophet ﷺ. A missing diacritic or a wrong letter classification can change meaning, so the project holds to a few hard rules:

1. **No fabricated tajweed content.** Rules, letter classifications, and Quranic examples live in pre-reviewed JSON under `src/data/content/`, each example carrying a surah:ayah reference. The app renders this data and never generates, edits, paraphrases, translates, or classifies it. See [docs/content-schema.md](docs/content-schema.md) and [docs/content-audit.md](docs/content-audit.md).
2. **Color-coded text comes from the API.** The Quran.com Foundation `text_uthmani_tajweed` field carries the full color markup, sanitized at the boundary and rendered as-is, never mixed with user text. See [docs/api-integrations.md](docs/api-integrations.md).
3. **Hafs 'an 'Asim only.** No mixing of qira'aat; beat counts and letter sets follow Hafs.
4. **When in doubt, omit.** It is better to fall back to English than to ship an unreviewed translation.

The same rule is why per-letter tafkheem coloring is not shipped: the API emits no tafkheem class for those letters, and there is no verified per-letter dataset to drive it without the app classifying tajweed itself.

## Quick start

You need Node 24, pinned in `.nvmrc` and `engines.node`, so `nvm use` picks it up.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. There are no accounts, no server, and no environment variables: the app is fully client-side, state lives in `localStorage`, and the only network calls are read-only fetches to the Quran APIs. For the full list of checks and scripts, and how they mirror CI, see [docs/development.md](docs/development.md).

## Documentation

| Topic | Doc |
|-------|-----|
| Architecture (layers, wiring, tech stack, the source tree) | [docs/architecture.md](docs/architecture.md) |
| Development (setup, scripts, checks, CI) | [docs/development.md](docs/development.md) |
| Contributing (conventions, review checklist, PR template) | [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) |
| Content schema (JSON shape, how to add a rule) | [docs/content-schema.md](docs/content-schema.md) |
| Content accuracy (the guarantees and the content check) | [docs/content-audit.md](docs/content-audit.md) |
| Content authoring (questions, lesson anchors, snapshots) | [docs/CONTENT.md](docs/CONTENT.md) |
| API integrations (endpoints, response shapes, caching, retries) | [docs/api-integrations.md](docs/api-integrations.md) |
| Mushaf reader (the 604-page reader design and edge cases) | [docs/mushaf-reader.md](docs/mushaf-reader.md) |
| Accessibility (keyboard, focus, contrast, RTL, offline) | [docs/accessibility.md](docs/accessibility.md) |
| Security (sanitization, CSP, headers, local-only data) | [docs/security.md](docs/security.md) |
| i18n (the bilingual EN/AR model and RTL handling) | [docs/i18n.md](docs/i18n.md) |
| Advanced features (feasibility notes and deferrals) | [docs/advanced-features.md](docs/advanced-features.md) |
| Sources & attribution (text, audio, and color-scheme credits) | [docs/sources.md](docs/sources.md) |
| Changelog (release history) | [docs/CHANGELOG.md](docs/CHANGELOG.md) |

## License

MIT. See [LICENSE](LICENSE). By contributing you agree your work is licensed under the same terms.
