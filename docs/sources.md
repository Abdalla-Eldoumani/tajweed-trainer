# Sources and attribution

This app stands on the work of others who have made authenticated Quranic text, recitation, and tajweed data freely available. This page records what it uses and credits each source. If you reuse this project, keep these credits and honor each source's own terms.

## Quranic text and tajweed coloring

- **Quran.com Foundation API v4** (`https://api.quran.com/api/v4`). The color-coded tajweed text comes from the `text_uthmani_tajweed` field, which returns the Uthmani verse with `<tajweed class="...">` markup. The app renders this markup as-is, sanitized at the boundary, and never alters the text. Chapter metadata, translations, tafsir, and word-by-word data also come from this API. It is free and needs no key or account.
- **Bundled snapshots.** The color-coded HTML for the verses used in the lessons is snapshotted from the same API into `src/data/verse-snapshots.json`, so lessons render their coloring offline and the data stays fixed and reviewed.

## Recitation audio

- **Quran.com Foundation API v4** for per-ayah audio (`/recitations/{id}/by_ayah/{key}`). The returned paths resolve to the Quran.com audio CDNs (`verses.quran.com` and the `quranicaudio.com` mirrors).
- **EveryAyah** (`https://everyayah.com`) for most of the reciters, served as per-ayah files. Their file paths are built from the folders recorded in `src/lib/reciters.ts`.
- **Warsh narration (separate)** — one per-surah recitation in the Warsh narration (Younes Souilass), offered behind a disclaimer on the surah index and served from `https://server16.mp3quran.net`. It is kept apart from the Hafs reciter roster and the per-verse player; the app's text and tajweed colouring are Hafs an Asim.

The full reciter roster is in `src/lib/reciters.ts`. The default is Mahmoud Khalil Al-Husary in the mu'allim (teaching) style, chosen for being slow and clear for learning.

## Tajweed color scheme

The tajweed letter colors are the "new" (mushaf) scheme from the **Quranic Universal Library (QUL)**, the open data project at `github.com/TarteelAI/quranic-universal-library` that also backs the Quran.com tajweed markup. The values are transcribed verbatim from QUL into `src/lib/tajweed-colors.ts` (the single source of truth), with dark-mode variants checked for contrast.

## Fonts

Arabic is set in **Amiri** and **Amiri Quran** (the latter for Quranic text with full tashkeel). The interface uses Inter, Spectral, and JetBrains Mono. All fonts are self-hosted through `next/font`.

## Religious-content integrity

This project renders pre-verified, human-authored religious content. It never generates, edits, paraphrases, translates, summarizes, or classifies any Quran text, hadith, tajweed rule, or ruling.

- Recitation follows **Hafs 'an 'Asim**, the most widely used qira'ah, with no mixing of qira'aat. Beat counts and letter sets follow Hafs.
- Tajweed rules, letter classifications, and Quranic examples come only from the pre-verified JSON in `src/data/content/`, each example carrying an exact surah:ayah reference. The accuracy guarantees are in [content-audit.md](content-audit.md).
- Arabic text is stored in Uthmani script with full tashkeel; a missing diacritic can change meaning, so when a value cannot be confirmed against a primary source it is omitted rather than guessed.

These constraints exist because tajweed is an oral science transmitted through chains of recitation back to the Prophet, peace be upon him. Synthesized content has no chain of transmission. Treating the verified data as immutable input, with the app as the surface around it, is how the project stays honest.

## License

The application code is MIT licensed (see [LICENSE](../LICENSE)). That license covers this project's own source, not the Quranic text, recitation audio, or third-party data and fonts above, each of which remains under its own source's terms. If you reuse or redistribute, check those terms.
