// Pure Arabic word comparison for the typing-recall drill (TYPE-01/02/03).
// No React/next/storage/DOM imports — framework-agnostic string math, so the
// src/lib coverage gate counts it and word-compare.test.ts exercises it directly.

// Strip Quranic Uthmani combining marks (Unicode general category Mn) only.
// Normalize to the canonical COMPOSED form (NFC), never the decomposed form: the
// decomposed form splits precomposed hamza seats (أ إ ؤ ئ) and alef-madda (آ)
// into base letter + combining hamza/madda, which the Mn strip would then fold to
// bare letters. NFC keeps them precomposed, so the strip never folds a letter.
// Base letters, alef-wasla U+0671 (Lo), and tatweel U+0640 (Lm) are not Mn and
// are left intact. Comparison-only: operates on a copy, never rewrites stored text.
// The `u` flag is mandatory — without it `\p{Mn}` matches the literal "p{Mn}"
// and strips nothing.
export function stripArabicDiacritics(s: string): string {
  return s.normalize("NFC").replace(/\p{Mn}/gu, "");
}

// Compare a typed word to the stored verified word. Exact (the default) is
// canonical string equality (NFC on both sides, comparison-only — the stored
// text_uthmani is not in canonical combining order, so byte-exact === would
// reject a canonically-ordered input). Diacritic-insensitive strips Mn marks from
// BOTH sides. Both sides are trimmed. Never mutates either argument's source.
export function wordsMatch(
  typed: string,
  stored: string,
  opts: { diacriticInsensitive: boolean } = { diacriticInsensitive: false },
): boolean {
  const a = typed.trim();
  const b = stored.trim();
  return opts.diacriticInsensitive
    ? stripArabicDiacritics(a) === stripArabicDiacritics(b)
    : a.normalize("NFC") === b.normalize("NFC");
}
