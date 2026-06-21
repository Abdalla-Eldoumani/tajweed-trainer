import type { PlayerPosition } from "./player-position";

export type Language = 'en' | 'ar';

// The five art-directed themes. The value is the `[data-theme="..."]` attribute
// set on <html>; each name has a matching token block in globals.css.
export type Theme = 'vellum' | 'pearl' | 'night' | 'sepia' | 'mihrab';

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
  ghunnah_prominence_ranking_note?: string;
  ghunnah_prominence_ranking_note_ar?: string;
  ghunnah_prominence_ranking: { level: number; maratib_en: string; maratib_ar?: string; contexts: string[]; contexts_ar?: string[]; prominence: string; prominence_ar?: string; beats: number | string }[];
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

// Reciter id is the Quran.com recitation id as a string (for example "7" =
// Alafasy, "12" = Al-Husary muallim). Validated against the RECITATIONS list in
// src/lib/reciters.ts; legacy alquran.cloud identifiers (husary, ar.alafasy,
// ...) are migrated by normalizeReciterId so persisted settings still resolve.
export type ReciterId = string;

// A recitation from the Quran.com recitations resource.
export interface Recitation {
  id: string; // Quran.com recitation id, e.g. "7"
  nameEn: string; // reciter name, transliterated
  nameAr: string; // reciter name in Arabic
  style: string | null; // "Murattal" | "Mujawwad" | "Muallim" | null, verbatim from the API
}

// A translation or tafsir resource from the Quran.com /resources endpoints. Used
// to populate the settings selectors and to validate a stored id at runtime.
export interface TranslationResource {
  id: number;
  name: string;
  authorName: string;
  languageName: string;
}

export type TafsirResource = TranslationResource;

// One word of a verse from the word-by-word endpoint: its Uthmani text, optional
// transliteration and gloss, and its own audio clip. All from the API.
export interface VerseWord {
  position: number;
  textUthmani: string;
  transliteration: string | null;
  translation: string | null;
  audioUrl: string | null;
}

export interface UserSettings {
  reciter: ReciterId;
  playbackSpeed: number;
  fontSize: 'normal' | 'large' | 'xlarge';
  theme: Theme;
  // Retained only for backward-compatible import this release: the sanitizer
  // migrates a stored darkMode into `theme`, and old backups still carry it.
  darkMode: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;
  language: Language;
  lastMushafPage?: number;
  mushafBookmarks?: number[];
  // Reading-depth resource ids (Quran.com translation/tafsir resources) plus the
  // word-by-word toggle. Confirmed against /resources/* at runtime; defaulted and
  // clamped by sanitizeSettings so a tampered value can never reach a URL raw.
  translationId?: number;
  tafsirId?: number;
  showWordByWord?: boolean;
  // Top-left corner of the dragged mini-player in viewport pixels. Absent means
  // the player sits at its default dock. Re-clamped to the live viewport on
  // load, so a value saved on a larger screen can never strand the player
  // off-screen. Lives here so export / import / reset cover it.
  playerPosition?: PlayerPosition | null;
  // Collapsed state of the mini-player. Minimizing keeps playback running and
  // the pill draggable; only the explicit stop control dismisses the player.
  playerMinimized?: boolean;
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

export type PlayerMode = "single" | "continuous";
export type PlaybackStatus = "idle" | "loading" | "playing" | "paused";

// Enough to restore playback after a reload: which verse, in which mode, how far
// into it, and with which reciter. Stored in the consolidated progress model.
export interface PlayerResume {
  surah: number;
  ayah: number;
  mode: PlayerMode;
  offset: number; // seconds into the current ayah
  reciter: ReciterId;
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
  // Per-verseKey Leitner state for memorized-verse review. A separate keyspace
  // from `reviews` (keyed by rule-quiz questionId) so a verseKey never collides
  // with a questionId and mixes two unrelated review timelines.
  memorizationReviews: Record<string, ReviewState>;
  // moduleId -> set of section anchor slugs the user has scrolled past.
  readSections: Record<string, string[]>;
  // verseKey ("surah:ayah") -> the user's own private study note. Local-only,
  // never transmitted, and never religious content (the learner's own words).
  // An empty note deletes the entry; capped in count and per-note length by the
  // storage sanitizer.
  verseNotes: Record<string, string>;
  // verseKey ("surah:ayah") -> the learner's own short labels for organizing
  // notes and bookmarks. Local-only, never transmitted, and never religious
  // content (the user's own words, like a personal sticky note). An empty tag
  // set deletes the entry; bounded in count, per-entry tag count, and per-tag
  // length by the storage sanitizer. Additive optional for lossless migration.
  entryTags?: Record<string, string[]>;
  analytics: AnalyticsEvent[];
  // Last playback position, so the mini-player can resume after a reload.
  playerResume?: PlayerResume | null;
  // Verse bookmarks ("surah:ayah") and the last-read location, for navigation.
  // Kept inside this consolidated model so export / import / reset cover them.
  bookmarks: string[];
  lastRead?: VerseLocation | null;
  // Per-surah last-read location, keyed by surah number (1..114). The global
  // lastRead above answers "where was I anywhere"; this answers "where was I in
  // this surah" so reopening a surah lands at the saved position. Same
  // VerseLocation shape; capped at 114 entries.
  lastReadBySurah?: Record<number, VerseLocation>;
  // The learner's opt-in Quran-completion (khatmah) plan, or null when none is
  // set. A single plan at a time; tracked from lastRead.page. Cleared by reset.
  khatmah?: KhatmahPlan | null;
  // A small bounded record of memorization milestones the learner generated a
  // certificate for (one per juz or the khatmah). The image is NEVER stored
  // (EDGE_CASES_V2 line 50), only this record. Additive optional for lossless
  // migration; deduped per milestone and capped by the storage sanitizer.
  certificates?: CertificateRecord[];
  // Whether the first-launch onboarding has been shown and dismissed. Cleared by
  // reset so onboarding re-shows.
  seenOnboarding: boolean;
  // Whether the Warsh "different narration" disclaimer has been acknowledged.
  // Local-only; cleared by reset so the disclaimer re-shows.
  warshNarrationAck: boolean;
  // ISO timestamp of the last successful export, stamped by exportProgress().
  // Empty until the first backup. Drives the gentle backup reminder in Settings;
  // cleared by reset so the reminder logic restarts with progress.
  lastBackupAt?: string;
}

// Where the reader last was, so the home screen can offer "continue reading".
export interface VerseLocation {
  verseKey: string; // "surah:ayah"
  page: number;     // mushaf page 1..604
  ts: string;       // ISO timestamp
}

// A small bounded record that the learner reached (and generated a certificate
// for) a memorization milestone. The certificate image is rendered and
// downloaded on-device and is NEVER stored (EDGE_CASES_V2 line 50); only this
// record persists, so the count grows by at most one per milestone. `ref` is the
// juz number (1..30) for a juz milestone, null for the whole-Quran khatmah.
export interface CertificateRecord {
  kind: "juz" | "khatmah";
  ref: number | null;
  dateIso: string; // ISO date (YYYY-MM-DD) the milestone was recorded
}

// An opt-in plan to finish reading the whole Quran by a target date. Progress is
// read from the reader position the app already records (lastRead.page), so
// reading the mushaf advances the plan with no manual logging. The pace model is
// linear by mushaf page: page N of 604 is N/604 complete (see src/lib/khatmah.ts
// for the full derivation). startPage is where the reader was when the plan
// began, so a learner who is already partway in is not counted as starting over.
export interface KhatmahPlan {
  startDate: string;  // ISO date (YYYY-MM-DD) the plan began
  targetDate: string; // ISO date (YYYY-MM-DD) to finish by; >= startDate
  startPage: number;  // mushaf page 1..604 the reader was on at the start
}

// Local-only insights ring buffer. Never sent over the network. The fixed set
// of event types keeps callers honest and lets the progress page summarize
// usage without a query DSL.
export type AnalyticsEventType =
  | "route.view"
  | "quiz.start"
  | "quiz.finish"
  | "review.start"
  | "memorize.toggle"
  | "search.query";

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  // Optional small string payload (path, moduleId, search term). Capped at
  // 200 chars by the sanitizer so a tampered storage entry can't bloat memory.
  meta?: string;
  ts: string; // ISO timestamp
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

export interface PracticeQuestion {
  example: QuranicExample;
  correctAnswer: string;
  correctAnswerAr?: string;
  options: string[];
  optionsAr?: string[];
  moduleId: string;
  // Optional fields populated when this PracticeQuestion was derived from an
  // authored Question record. The runtime UI may render `prompt` instead of the
  // static "identify the rule" header. The reader surfaces `explanation` after the
  // user answers; for now it is carried through so authored data isn't lost.
  prompt?: { en: string; ar?: string };
  explanation?: { en: string; ar?: string; lessonAnchor: string };
  questionId?: string;
}

// Authored question record for the per-module question files in
// src/data/questions/. Richer than PracticeQuestion (the runtime UI shape) so
// The reader can surface the explanation and lesson anchor without a re-author.
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

// Verse snapshot record stored in src/data/verse-snapshots.json, keyed
// "<surah>:<ayah>" at the top level. Populated by
// scripts/prefetch-tajweed-snapshots.mjs from the authenticated Quran.com API.
export interface VerseSnapshot {
  // text_uthmani_tajweed HTML; sanitized at render to color lesson example
  // verses exactly like the mushaf.
  tajweedHtml: string;
  // Plain uthmani text (tags stripped) for reference and provenance.
  arabic: string;
  // ISO timestamp of the fetch; preserved across idempotent re-runs.
  fetchedAt: string | null;
  // Provenance, e.g. "api.quran.com/api/v4 uthmani_tajweed".
  source: string;
  // Optional gloss for snapshot-fetched question verses (see docs/CONTENT.md).
  gloss?: string;
  glossEditionId?: number | null;
}
