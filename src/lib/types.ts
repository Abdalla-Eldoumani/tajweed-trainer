export interface ArabicLetter {
  arabic: string;
  name_ar?: string;
  name_en: string;
  transliteration?: string;
  condition?: string;
  note?: string;
}

export interface QuranicExample {
  arabic: string;
  transliteration: string;
  translation: string;
  surah: number;
  ayah: number;
  surah_name_en: string;
  highlight_word: string;
  rule_applied: string;
}

export interface TajweedRule {
  id: string;
  order: number;
  title_en: string;
  title_ar: string;
  category?: string;
  description: string;
  arabic_definition?: string;
  letters?: ArabicLetter[];
  letters_description?: string;
  subtypes?: TajweedSubtype[];
  examples: QuranicExample[];
  audio_tip?: string;
  common_mistakes?: string[];
  mnemonic_ar?: string;
  mnemonic_en?: string;
  verified: true;
}

export interface TajweedSubtype {
  id: string;
  title_en: string;
  title_ar?: string;
  description: string;
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
  modules: LearningModule[];
  verified: true;
}

export interface MakhrajRegion {
  id: string;
  order: number;
  title_en: string;
  title_ar: string;
  description: string;
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
}

export interface MakhrajData {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  introduction: string;
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
  rules: TajweedRule[];
  summary_table: {
    description: string;
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
  rules: TajweedRule[];
  verified: true;
}

export interface QalqalahLevel {
  id: string;
  order: number;
  title_en: string;
  title_ar: string;
  description: string;
  examples: QuranicExample[];
  verified: true;
}

export interface QalqalahData {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  introduction: string;
  letters: ArabicLetter[];
  mnemonic_ar: string;
  mnemonic_en: string;
  levels: QalqalahLevel[];
  common_mistakes: string[];
  verified: true;
}

export interface MaddType {
  id: string;
  order: number;
  title_en: string;
  title_ar: string;
  beats: number | string;
  obligation: string;
  description: string;
  trigger: string;
  examples?: QuranicExample[];
  subtypes?: { id: string; title_en: string; description: string; example_arabic?: string; example_surah?: number; example_ayah?: number }[];
  verified: true;
}

export interface MaddData {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  introduction: string;
  madd_letters: { arabic: string; name_en: string; condition: string }[];
  types: MaddType[];
  summary_table: Record<string, { type: string; beats: number | string; trigger: string }>;
  verified: true;
}

export interface GhunnahData {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  introduction: string;
  definition: string;
  duration: string;
  rules: TajweedRule[];
  ghunnah_prominence_ranking: { rank: number; context: string; prominence: string; beats: number }[];
  common_mistakes: string[];
  verified: true;
}

export interface LaamRaaData {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  sections: {
    id: string;
    title_en: string;
    title_ar: string;
    description: string;
    subtypes?: {
      id: string;
      title_en: string;
      title_ar: string;
      description: string;
      letters: string;
      letter_count: number;
      mnemonic_ar?: string;
      example_words?: string[];
      examples?: QuranicExample[];
    }[];
    rules?: {
      condition: string;
      result: string;
      examples: string[];
    }[];
    tafkheem_cases?: { condition: string; example: string; note: string }[];
    tarqeeq_cases?: { condition: string; example: string; note: string }[];
  }[];
  verified: true;
}

export interface TafkheemTarqeeqData {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  introduction: string;
  always_heavy: {
    title_en: string;
    title_ar: string;
    letters: ArabicLetter[];
    mnemonic_ar: string;
    mnemonic_en: string;
    count: number;
    tafkheem_levels: string[];
  };
  always_light: {
    title_en: string;
    title_ar: string;
    description: string;
    letters: string;
    note: string;
  };
  variable_letters: {
    title_en: string;
    title_ar: string;
    letters: {
      arabic: string;
      name_en: string;
      rule: string;
      heavy_example?: string;
      light_example?: string;
    }[];
  };
  common_mistakes: string[];
  verified: true;
}

export interface WaqfSymbol {
  id: string;
  symbol: string;
  title_en: string;
  title_ar: string;
  description: string;
}

export interface WaqfData {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  introduction: string;
  symbols: WaqfSymbol[];
  stopping_effects: string[];
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

export type ReciterId = 'husary' | 'alafasy';

export interface UserSettings {
  reciter: ReciterId;
  playbackSpeed: number;
  fontSize: 'normal' | 'large' | 'xlarge';
  darkMode: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;
}

export interface ModuleProgress {
  lessonsCompleted: string[];
  quizScores: { lessonId: string; score: number; date: string }[];
  lastAccessed: string;
}

export interface TajweedProgress {
  modules: Record<string, ModuleProgress>;
  settings: UserSettings;
  streaks: {
    currentStreak: number;
    longestStreak: number;
    lastPracticeDate: string;
  };
}

export interface QuranApiVerse {
  id: number;
  verse_key: string;
  text_uthmani_tajweed: string;
}

export interface QuranApiResponse {
  verses: QuranApiVerse[];
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
  options: string[];
  moduleId: string;
}
