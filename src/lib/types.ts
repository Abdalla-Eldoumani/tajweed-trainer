export type Language = 'en' | 'ar';

export interface ArabicLetter {
  arabic: string;
  name_ar?: string;
  name_en: string;
  transliteration?: string;
  condition?: string;
  condition_ar?: string;
  note?: string;
  note_ar?: string;
}

export interface QuranicExample {
  arabic: string;
  transliteration: string;
  translation: string;
  translation_ar?: string;
  surah: number;
  ayah: number;
  surah_name_en: string;
  surah_name_ar?: string;
  highlight_word: string;
  rule_applied: string;
  rule_applied_ar?: string;
}

export interface TajweedRule {
  id: string;
  order: number;
  title_en: string;
  title_ar: string;
  category?: string;
  description: string;
  description_ar?: string;
  arabic_definition?: string;
  letters?: ArabicLetter[];
  letters_description?: string;
  letters_description_ar?: string;
  subtypes?: TajweedSubtype[];
  examples: QuranicExample[];
  audio_tip?: string;
  audio_tip_ar?: string;
  common_mistakes?: string[];
  common_mistakes_ar?: string[];
  mnemonic_ar?: string;
  mnemonic_en?: string;
  verified: true;
}

export interface TajweedSubtype {
  id: string;
  title_en: string;
  title_ar?: string;
  description: string;
  description_ar?: string;
  letters?: ArabicLetter[];
  mnemonic_en?: string;
  examples?: QuranicExample[];
}

export interface LearningModule {
  id: string;
  order: number;
  title_en: string;
  title_ar: string;
  description: string;
  description_ar?: string;
  estimated_hours: number;
  lessons_count: number;
  prerequisite: string | null;
  icon: string;
}

export interface LearningPath {
  id: string;
  title_en: string;
  title_ar: string;
  description: string;
  description_ar?: string;
  modules: LearningModule[];
  verified: true;
}

export interface MakhrajRegion {
  id: string;
  order: number;
  title_en: string;
  title_ar: string;
  description: string;
  description_ar?: string;
  points_count: number;
  letters?: ArabicLetter[];
  sub_points?: MakhrajSubPoint[];
}

export interface MakhrajSubPoint {
  id: string;
  title_en: string;
  title_ar?: string;
  letters: ArabicLetter[];
  note?: string;
  note_ar?: string;
}

export interface MakhrajData {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  introduction: string;
  introduction_ar?: string;
  regions: MakhrajRegion[];
  total_points: number;
  total_letters: number;
  verified: true;
}

export interface NoonSakinahData {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  introduction: string;
  introduction_ar?: string;
  rules: TajweedRule[];
  summary_table: {
    description: string;
    description_ar?: string;
    izhar_letters: string;
    izhar_count: number;
    idgham_with_ghunnah_letters: string;
    idgham_without_ghunnah_letters: string;
    idgham_count: number;
    iqlab_letters: string;
    iqlab_count: number;
    ikhfaa_letters: string;
    ikhfaa_count: number;
    total_arabic_letters_covered: number;
  };
  verified: true;
}

export interface MeemSakinahData {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  introduction: string;
  introduction_ar?: string;
  rules: TajweedRule[];
  verified: true;
}

export interface QalqalahLevel {
  id: string;
  order: number;
  title_en: string;
  title_ar: string;
  description: string;
  description_ar?: string;
  examples: QuranicExample[];
  verified: true;
}

export interface QalqalahData {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  introduction: string;
  introduction_ar?: string;
  letters: ArabicLetter[];
  mnemonic_ar: string;
  mnemonic_en: string;
  levels: QalqalahLevel[];
  common_mistakes: string[];
  common_mistakes_ar?: string[];
  verified: true;
}

export interface MaddType {
  id: string;
  order: number;
  title_en: string;
  title_ar: string;
  beats: number | string;
  obligation: string;
  obligation_ar?: string;
  description: string;
  description_ar?: string;
  trigger: string;
  trigger_ar?: string;
  examples?: QuranicExample[];
  subtypes?: { id: string; title_en: string; title_ar?: string; description: string; description_ar?: string; example_arabic?: string; example_surah?: number; example_ayah?: number }[];
  verified: true;
}

export interface MaddData {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  introduction: string;
  introduction_ar?: string;
  madd_letters: { arabic: string; name_en: string; name_ar?: string; condition: string; condition_ar?: string }[];
  types: MaddType[];
  summary_table: Record<string, { type: string; type_ar?: string; beats: number | string; trigger: string; trigger_ar?: string }>;
  verified: true;
}

export interface GhunnahData {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  introduction: string;
  introduction_ar?: string;
  definition: string;
  definition_ar?: string;
  duration: string;
  duration_ar?: string;
  rules: TajweedRule[];
  ghunnah_prominence_ranking: { rank: number; context: string; context_ar?: string; prominence: string; prominence_ar?: string; beats: number }[];
  common_mistakes: string[];
  common_mistakes_ar?: string[];
  verified: true;
}

export interface LaamRaaData {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  introduction?: string;
  introduction_ar?: string;
  sections: {
    id: string;
    title_en: string;
    title_ar: string;
    description: string;
    description_ar?: string;
    subtypes?: {
      id: string;
      title_en: string;
      title_ar: string;
      description: string;
      description_ar?: string;
      letters: string;
      letter_count: number;
      mnemonic_ar?: string;
      example_words?: string[];
      examples?: QuranicExample[];
    }[];
    rules?: {
      condition: string;
      condition_ar?: string;
      result: string;
      result_ar?: string;
      examples: string[];
    }[];
    tafkheem_cases?: { condition: string; condition_ar?: string; example: string; note: string; note_ar?: string }[];
    tarqeeq_cases?: { condition: string; condition_ar?: string; example: string; note: string; note_ar?: string }[];
  }[];
  verified: true;
}

export interface TafkheemTarqeeqData {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  introduction: string;
  introduction_ar?: string;
  always_heavy: {
    title_en: string;
    title_ar: string;
    letters: ArabicLetter[];
    mnemonic_ar: string;
    mnemonic_en: string;
    count: number;
    tafkheem_levels: string[];
    tafkheem_levels_ar?: string[];
  };
  always_light: {
    title_en: string;
    title_ar: string;
    description: string;
    description_ar?: string;
    letters: string;
    note: string;
    note_ar?: string;
  };
  variable_letters: {
    title_en: string;
    title_ar: string;
    letters: {
      arabic: string;
      name_en: string;
      name_ar?: string;
      rule: string;
      rule_ar?: string;
      heavy_example?: string;
      light_example?: string;
    }[];
  };
  common_mistakes: string[];
  common_mistakes_ar?: string[];
  verified: true;
}

export interface WaqfSymbol {
  id: string;
  symbol: string;
  title_en: string;
  title_ar: string;
  description: string;
  description_ar?: string;
}

export interface WaqfData {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  introduction: string;
  introduction_ar?: string;
  symbols: WaqfSymbol[];
  stopping_effects: string[];
  stopping_effects_ar?: string[];
  verified: true;
}

export interface GlossaryTerm {
  term_ar: string;
  term_en: string;
  definition: string;
}

export interface GlossaryData {
  id: string;
  title_en: string;
  title_ar: string;
  terms: GlossaryTerm[];
  verified: true;
}

// Reciter id is the Al Quran Cloud edition `identifier` field. We constrain
// it to the alquran.cloud format at runtime (`^[a-z0-9._-]+$`, length 1-64) in
// `validateReciterIdentifier`. The two defaults (husary, alafasy) are aliased
// to their full alquran.cloud identifiers (`ar.husary`, `ar.alafasy`) by the
// resolver so persisted settings from before this expansion still work.
export type ReciterId = string;

// Built-in default reciter identifiers, kept as a const tuple so existing
// code paths that compared against `"husary" | "alafasy"` keep working.
export const DEFAULT_RECITER_IDS = ["husary", "alafasy"] as const;
export type DefaultReciterId = (typeof DEFAULT_RECITER_IDS)[number];

// Validation regex for a reciter identifier from the editions API.
export const RECITER_IDENTIFIER_PATTERN = /^[a-z0-9._-]{1,64}$/;

export interface ReciterEdition {
  identifier: string;     // e.g. "ar.husary", "ar.alafasy"
  language: string;       // ISO 639-1, e.g. "ar"
  name: string;           // Native name
  englishName: string;    // English transliteration of the reciter
  format: "audio";
  type: "versebyverse";
}

export interface UserSettings {
  reciter: ReciterId;
  playbackSpeed: number;
  fontSize: 'normal' | 'large' | 'xlarge';
  darkMode: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;
  language: Language;
  lastMushafPage?: number;
  mushafBookmarks?: number[];
}

export interface ModuleProgress {
  lessonsCompleted: string[];
  quizScores: { lessonId: string; score: number; date: string }[];
  lastAccessed: string;
}

// Leitner box for spaced repetition. Each authored Question is tracked by its
// stable id. Correct answer promotes one box (max 5); wrong resets to box 1.
export type ReviewBox = 1 | 2 | 3 | 4 | 5;

export interface ReviewState {
  box: ReviewBox;
  nextDueDate: string;   // ISO YYYY-MM-DD; due when today >= this
  lastSeenDate: string;
  timesSeen: number;
  timesCorrect: number;
}

export interface TajweedProgress {
  modules: Record<string, ModuleProgress>;
  settings: UserSettings;
  streaks: {
    currentStreak: number;
    longestStreak: number;
    lastPracticeDate: string;
  };
  reviews: Record<string, ReviewState>;
  // Stable verseKeys ("surah:ayah") the user has marked memorized.
  memorizedVerses: string[];
  // moduleId -> set of section anchor slugs the user has scrolled past.
  readSections: Record<string, string[]>;
}

export interface QuranApiVerse {
  id: number;
  verse_key: string;
  text_uthmani_tajweed: string;
  page_number?: number;
  juz_number?: number;
  ruku_number?: number;
  hizb_number?: number;
  sajdah_number?: number | null;
}

export interface QuranApiResponse {
  verses: QuranApiVerse[];
}

export type RevelationPlace = 'makkah' | 'madinah';

export interface SurahHeader {
  number: number;
  nameSimple: string;
  nameArabic: string;
  versesCount: number;
  pages: [number, number];
  bismillahPre: boolean;
  revelationPlace: RevelationPlace;
}

export interface VerseTajweed {
  verseKey: string;
  surah: number;
  ayah: number;
  tajweedHtml: string;
  juzNumber: number;
}

export interface MushafPageData {
  pageNumber: number;
  juzNumber: number;
  verses: VerseTajweed[];
  surahsOnPage: SurahHeader[];
}

export interface AlQuranCloudResponse {
  code: number;
  status: string;
  data: {
    audio: string;
    audioSecondary?: string[];
    text: string;
    edition: {
      identifier: string;
      name: string;
    };
    surah: { number: number; name: string };
    numberInSurah: number;
  };
}

export interface PracticeQuestion {
  example: QuranicExample;
  correctAnswer: string;
  correctAnswerAr?: string;
  options: string[];
  optionsAr?: string[];
  moduleId: string;
  // Optional fields populated when this PracticeQuestion was derived from an
  // authored Question record. The runtime UI may render `prompt` instead of the
  // static "identify the rule" header. Phase 6 surfaces `explanation` after the
  // user answers; for now it is carried through so authored data isn't lost.
  prompt?: { en: string; ar?: string };
  explanation?: { en: string; ar?: string; lessonAnchor: string };
  questionId?: string;
}

// Authored question record for the per-module question files in
// src/data/questions/. Richer than PracticeQuestion (the runtime UI shape) so
// Phase 6 can surface the explanation and lesson anchor without a re-author.
// The aggregator maps Question -> PracticeQuestion for current consumers.
export type QuestionDifficulty = "easy" | "medium" | "hard";

export interface QuestionOption {
  id: string;
  label: { en: string; ar?: string };
}

export interface QuestionSource {
  surah: number;
  ayah: number;
  // ID of the Quran.com translation edition the gloss comes from. Null when
  // the gloss is reused from an existing src/data/content/*.json example whose
  // translation was hand-authored by the maintainer (not pulled from a
  // numbered edition).
  translationEditionId: number | null;
  // Free-text origin marker. Either a path inside src/data/content/ for reused
  // examples, or "quran.com api" / similar for snapshot-fetched verses.
  provenance: string;
}

export interface Question {
  id: string;
  moduleId: string;
  difficulty: QuestionDifficulty;
  prompt: { en: string; ar?: string };
  arabicText: string;
  englishGloss: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: {
    en: string;
    ar?: string;
    lessonAnchor: string;
  };
  source: QuestionSource;
}

// Verse snapshot record stored in src/data/verse-snapshots.json. Keyed
// "<surah>:<ayah>" at the top level.
export interface VerseSnapshot {
  arabic: string;
  gloss: string;
  glossEditionId: number | null;
  fetchedAt: string | null;
  source: string;
}
