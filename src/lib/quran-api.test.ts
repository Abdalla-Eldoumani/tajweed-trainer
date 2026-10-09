import { describe, it, expect } from "vitest";
import { toRealVerseWords } from "@/lib/quran-api";

// The pure half of getWordsForChapter, tested by direct import. quran-api.ts is
// coverage-excluded (its network half — fetch/cache/retry — is covered by e2e), so
// only this mapper is exercised here, exactly as audio-api.test.ts imports and
// tests only the pure activeWordIndex.
//
// The Quran.com by_chapter (words=true) response appends a trailing
// char_type_name:"end" pseudo-word carrying the ayah number (verified live:
// 112:1 -> 5 words, the 5th is end = "١"). toRealVerseWords must drop that marker
// and re-index positions 1..N over the surviving real words. The word TEXT in
// these fixtures is a synthetic placeholder ("w1".."w3"): the tests assert SHAPE
// (word count / marker removal / positions), never Quran content, so no verse
// text is authored here.

// The raw word shape as it arrives from the API before mapping. Structurally
// matches the (unexported) RawVerseWord the mapper accepts.
interface RawWord {
  position?: number;
  text_uthmani?: string;
  transliteration?: { text?: string | null } | null;
  translation?: { text?: string | null } | null;
  audio_url?: string | null;
  char_type_name?: string | null;
}

const realWord = (n: number): RawWord => ({
  position: n,
  text_uthmani: `w${n}`,
  transliteration: { text: `t${n}` },
  translation: { text: `g${n}` },
  audio_url: null,
  char_type_name: "word",
});

// The API's ayah-number marker: char_type_name "end", text is the Arabic-Indic
// ayah number ("١" for ayah 1). This is the pseudo-word the mapper filters out.
const endMarker = (position: number): RawWord => ({
  position,
  text_uthmani: "١",
  transliteration: null,
  translation: null,
  audio_url: null,
  char_type_name: "end",
});

describe("toRealVerseWords - drops the trailing ayah-end marker", () => {
  const raw112 = [realWord(1), realWord(2), realWord(3), realWord(4), endMarker(5)];

  it("112:1-shaped: 5 raw (4 word + 1 end) -> 4 real words", () => {
    expect(toRealVerseWords(raw112)).toHaveLength(4);
  });

  it('no surviving word carries the ayah-number text "١"', () => {
    expect(toRealVerseWords(raw112).some((w) => w.textUthmani === "١")).toBe(false);
  });

  it("re-indexes positions contiguously 1..N over the real words", () => {
    expect(toRealVerseWords(raw112).map((w) => w.position)).toEqual([1, 2, 3, 4]);
  });

  it("maps text, transliteration, translation and audio through unchanged", () => {
    const [w] = toRealVerseWords([realWord(1), endMarker(2)]);
    expect(w).toEqual({
      position: 1,
      textUthmani: "w1",
      transliteration: "t1",
      translation: "g1",
      audioUrl: null,
    });
  });
});

describe("toRealVerseWords - short verse and idempotence", () => {
  it("one real word (+ end marker) -> length 1, position 1", () => {
    const words = toRealVerseWords([realWord(1), endMarker(2)]);
    expect(words).toHaveLength(1);
    expect(words[0].position).toBe(1);
  });

  it("no end marker -> passes through in length, positions 1..N", () => {
    const words = toRealVerseWords([realWord(1), realWord(2), realWord(3)]);
    expect(words).toHaveLength(3);
    expect(words.map((w) => w.position)).toEqual([1, 2, 3]);
  });

  it("empty input -> empty output", () => {
    expect(toRealVerseWords([])).toEqual([]);
  });
});
