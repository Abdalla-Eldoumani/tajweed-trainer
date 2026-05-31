import type {
  TajweedProgress,
  UserSettings,
  ModuleProgress,
  Language,
  ReviewState,
  ReviewBox,
  AnalyticsEvent,
  AnalyticsEventType,
} from "./types";
import { normalizeReciterId, DEFAULT_RECITER_ID } from "./reciters";

const STORAGE_KEY = "tajweed-trainer-progress";

const DEFAULT_SETTINGS: UserSettings = {
  reciter: DEFAULT_RECITER_ID,
  playbackSpeed: 1.0,
  fontSize: "normal",
  darkMode: false,
  showTransliteration: true,
  showTranslation: true,
  language: "en",
  lastMushafPage: 1,
  mushafBookmarks: [],
};

const DEFAULT_PROGRESS: TajweedProgress = {
  modules: {},
  settings: DEFAULT_SETTINGS,
  streaks: {
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: "",
  },
  reviews: {},
  memorizedVerses: [],
  readSections: {},
  analytics: [],
};

// Caps protect against pathological inputs from a tampered localStorage —
// e.g. a 100,000-entry bookmarks array that bloats every render.
const MAX_BOOKMARKS = 200;
const MAX_LESSONS_PER_MODULE = 200;
const MAX_QUIZ_SCORES_PER_MODULE = 500;
const MAX_MODULES = 100;
const MAX_REVIEWS = 2000;
const MAX_MEMORIZED = 6236;
const VERSE_KEY_PATTERN = /^\d{1,3}:\d{1,3}$/;
const MAX_READ_SECTIONS_PER_MODULE = 50;
const SECTION_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,80}$/;
const MAX_ANALYTICS = 1000;
const VALID_ANALYTICS_TYPES: readonly AnalyticsEventType[] = [
  "route.view",
  "quiz.start",
  "quiz.finish",
  "review.start",
  "memorize.toggle",
  "search.query",
];

const VALID_BOXES: readonly ReviewBox[] = [1, 2, 3, 4, 5];

const VALID_LANGUAGES: readonly Language[] = ["en", "ar"];
const VALID_FONT_SIZES = ["normal", "large", "xlarge"] as const;

// Resolves any stored value to a known Quran.com recitation id, migrating legacy
// alquran.cloud identifiers and replacing anything unknown or tampered with the
// default so the app never references a reciter that does not exist. See
// src/lib/reciters.ts.
function pickReciter(value: unknown): string {
  return normalizeReciterId(value);
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickEnum<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function pickNumber(value: unknown, fallback: number, min?: number, max?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  if (min !== undefined && value < min) return fallback;
  if (max !== undefined && value > max) return fallback;
  return value;
}

function sanitizeSettings(input: unknown): UserSettings {
  if (!isObject(input)) return DEFAULT_SETTINGS;
  const bookmarks = Array.isArray(input.mushafBookmarks)
    ? Array.from(
        new Set(
          (input.mushafBookmarks as unknown[])
            .filter((n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 604),
        ),
      )
        .slice(0, MAX_BOOKMARKS)
        .sort((a, b) => a - b)
    : [];
  return {
    reciter: pickReciter(input.reciter),
    playbackSpeed: ([0.5, 0.75, 1.0] as const).includes(input.playbackSpeed as 0.5 | 0.75 | 1.0)
      ? (input.playbackSpeed as number)
      : DEFAULT_SETTINGS.playbackSpeed,
    fontSize: pickEnum(input.fontSize, VALID_FONT_SIZES, DEFAULT_SETTINGS.fontSize),
    darkMode: typeof input.darkMode === "boolean" ? input.darkMode : DEFAULT_SETTINGS.darkMode,
    showTransliteration:
      typeof input.showTransliteration === "boolean" ? input.showTransliteration : DEFAULT_SETTINGS.showTransliteration,
    showTranslation:
      typeof input.showTranslation === "boolean" ? input.showTranslation : DEFAULT_SETTINGS.showTranslation,
    language: pickEnum(input.language, VALID_LANGUAGES, DEFAULT_SETTINGS.language),
    lastMushafPage: pickNumber(input.lastMushafPage, 1, 1, 604),
    mushafBookmarks: bookmarks,
  };
}

function sanitizeModule(input: unknown): ModuleProgress {
  if (!isObject(input)) return { lessonsCompleted: [], quizScores: [], lastAccessed: "" };
  const lessonsCompleted = Array.isArray(input.lessonsCompleted)
    ? (input.lessonsCompleted as unknown[])
        .filter((s): s is string => typeof s === "string" && s.length > 0 && s.length < 100)
        .slice(0, MAX_LESSONS_PER_MODULE)
    : [];
  const quizScores = Array.isArray(input.quizScores)
    ? (input.quizScores as unknown[])
        .filter((q): q is { lessonId: string; score: number; date: string } =>
          isObject(q) &&
          typeof q.lessonId === "string" &&
          typeof q.score === "number" &&
          Number.isFinite(q.score) &&
          typeof q.date === "string",
        )
        .slice(0, MAX_QUIZ_SCORES_PER_MODULE)
    : [];
  const lastAccessed = typeof input.lastAccessed === "string" ? input.lastAccessed : "";
  return { lessonsCompleted, quizScores, lastAccessed };
}

function sanitizeReview(input: unknown): ReviewState | null {
  if (!isObject(input)) return null;
  const box = VALID_BOXES.includes(input.box as ReviewBox) ? (input.box as ReviewBox) : 1;
  const nextDueDate = typeof input.nextDueDate === "string" && input.nextDueDate.length <= 32 ? input.nextDueDate : "";
  const lastSeenDate = typeof input.lastSeenDate === "string" && input.lastSeenDate.length <= 32 ? input.lastSeenDate : "";
  const timesSeen = pickNumber(input.timesSeen, 0, 0, 100000);
  const timesCorrect = pickNumber(input.timesCorrect, 0, 0, 100000);
  return { box, nextDueDate, lastSeenDate, timesSeen, timesCorrect };
}

function sanitizeReviews(input: unknown): Record<string, ReviewState> {
  if (!isObject(input)) return {};
  const out: Record<string, ReviewState> = {};
  const entries = Object.entries(input).slice(0, MAX_REVIEWS);
  for (const [id, value] of entries) {
    if (typeof id !== "string" || id.length === 0 || id.length >= 200) continue;
    const review = sanitizeReview(value);
    if (review) out[id] = review;
  }
  return out;
}

function sanitizeAnalytics(input: unknown): AnalyticsEvent[] {
  if (!Array.isArray(input)) return [];
  const out: AnalyticsEvent[] = [];
  // Take the most recent MAX_ANALYTICS — older events get evicted as the
  // ring buffer fills up.
  const recent = input.slice(-MAX_ANALYTICS);
  for (const item of recent) {
    if (!isObject(item)) continue;
    const type = item.type;
    if (typeof type !== "string" || !VALID_ANALYTICS_TYPES.includes(type as AnalyticsEventType)) continue;
    const ts = typeof item.ts === "string" && item.ts.length <= 32 ? item.ts : "";
    if (!ts) continue;
    const meta = typeof item.meta === "string" && item.meta.length <= 200 ? item.meta : undefined;
    out.push({ type: type as AnalyticsEventType, ts, meta });
  }
  return out;
}

function sanitizeReadSections(input: unknown): Record<string, string[]> {
  if (!isObject(input)) return {};
  const out: Record<string, string[]> = {};
  for (const [moduleId, value] of Object.entries(input)) {
    if (typeof moduleId !== "string" || moduleId.length === 0 || moduleId.length >= 100) continue;
    if (!Array.isArray(value)) continue;
    const slugs = new Set<string>();
    for (const slug of value) {
      if (typeof slug !== "string") continue;
      if (!SECTION_SLUG_PATTERN.test(slug)) continue;
      slugs.add(slug);
      if (slugs.size >= MAX_READ_SECTIONS_PER_MODULE) break;
    }
    out[moduleId] = Array.from(slugs);
  }
  return out;
}

function sanitizeMemorized(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out = new Set<string>();
  for (const v of input) {
    if (typeof v !== "string") continue;
    if (!VERSE_KEY_PATTERN.test(v)) continue;
    out.add(v);
    if (out.size >= MAX_MEMORIZED) break;
  }
  return Array.from(out);
}

function sanitizeProgress(input: unknown): TajweedProgress {
  if (!isObject(input)) return DEFAULT_PROGRESS;
  const modules: Record<string, ModuleProgress> = {};
  if (isObject(input.modules)) {
    const entries = Object.entries(input.modules).slice(0, MAX_MODULES);
    for (const [id, mod] of entries) {
      if (typeof id === "string" && id.length > 0 && id.length < 100) {
        modules[id] = sanitizeModule(mod);
      }
    }
  }
  const streaks = isObject(input.streaks)
    ? {
        currentStreak: pickNumber(input.streaks.currentStreak, 0, 0, 100000),
        longestStreak: pickNumber(input.streaks.longestStreak, 0, 0, 100000),
        lastPracticeDate: typeof input.streaks.lastPracticeDate === "string" ? input.streaks.lastPracticeDate : "",
      }
    : DEFAULT_PROGRESS.streaks;
  return {
    modules,
    settings: sanitizeSettings(input.settings),
    streaks,
    reviews: sanitizeReviews(input.reviews),
    memorizedVerses: sanitizeMemorized(input.memorizedVerses),
    readSections: sanitizeReadSections(input.readSections),
    analytics: sanitizeAnalytics(input.analytics),
  };
}

export function getProgress(): TajweedProgress {
  if (!isBrowser()) return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    return sanitizeProgress(JSON.parse(raw));
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function setProgress(progress: TajweedProgress): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage full or unavailable
  }
}

export function getSettings(): UserSettings {
  return getProgress().settings;
}

export function setSettings(settings: UserSettings): void {
  const progress = getProgress();
  progress.settings = settings;
  setProgress(progress);
}

export function getModuleProgress(moduleId: string): ModuleProgress {
  const progress = getProgress();
  return progress.modules[moduleId] ?? {
    lessonsCompleted: [],
    quizScores: [],
    lastAccessed: "",
  };
}

export function markLessonComplete(moduleId: string, lessonId: string): void {
  const progress = getProgress();
  if (!progress.modules[moduleId]) {
    progress.modules[moduleId] = {
      lessonsCompleted: [],
      quizScores: [],
      lastAccessed: "",
    };
  }
  if (!progress.modules[moduleId].lessonsCompleted.includes(lessonId)) {
    progress.modules[moduleId].lessonsCompleted.push(lessonId);
  }
  progress.modules[moduleId].lastAccessed = new Date().toISOString();
  setProgress(progress);
}

export function getReviews(): Record<string, ReviewState> {
  return getProgress().reviews;
}

export function setReview(questionId: string, state: ReviewState): void {
  if (!isBrowser()) return;
  const progress = getProgress();
  progress.reviews[questionId] = state;
  setProgress(progress);
}

export function getAnalytics(): AnalyticsEvent[] {
  return getProgress().analytics;
}

export function recordAnalyticsEvent(type: AnalyticsEventType, meta?: string): void {
  if (!isBrowser()) return;
  if (!VALID_ANALYTICS_TYPES.includes(type)) return;
  const progress = getProgress();
  const safeMeta = typeof meta === "string" ? meta.slice(0, 200) : undefined;
  const next: AnalyticsEvent[] = [
    ...progress.analytics.slice(-MAX_ANALYTICS + 1),
    { type, meta: safeMeta, ts: new Date().toISOString() },
  ];
  progress.analytics = next;
  setProgress(progress);
}

// Returns a JSON snapshot of the entire progress object suitable for download
// as a backup file. The snapshot already passes through sanitizeProgress on
// read, so untrusted fields are stripped.
export function exportProgress(): string {
  return JSON.stringify(getProgress(), null, 2);
}

// Replaces stored progress with the parsed payload after sanitization. Returns
// false when the input isn't valid JSON or doesn't deserialize to an object;
// the caller surfaces that failure to the user.
export function importProgress(payload: string): boolean {
  if (!isBrowser()) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return false;
  }
  const sanitized = sanitizeProgress(parsed);
  setProgress(sanitized);
  return true;
}

export function getReadSections(moduleId: string): string[] {
  return getProgress().readSections[moduleId] ?? [];
}

export function markSectionRead(moduleId: string, sectionId: string): void {
  if (!isBrowser()) return;
  if (!SECTION_SLUG_PATTERN.test(sectionId)) return;
  const progress = getProgress();
  const current = progress.readSections[moduleId] ?? [];
  if (current.includes(sectionId)) return;
  if (current.length >= MAX_READ_SECTIONS_PER_MODULE) return;
  progress.readSections[moduleId] = [...current, sectionId];
  setProgress(progress);
}

// Returns the new memorized state (true if marked, false if cleared) so the
// caller can update its UI without reading back from storage.
export function toggleMemorizedVerse(verseKey: string): boolean {
  if (!isBrowser()) return false;
  if (!VERSE_KEY_PATTERN.test(verseKey)) return false;
  const progress = getProgress();
  const set = new Set(progress.memorizedVerses);
  let nowMemorized: boolean;
  if (set.has(verseKey)) {
    set.delete(verseKey);
    nowMemorized = false;
  } else {
    if (set.size >= MAX_MEMORIZED) return progress.memorizedVerses.includes(verseKey);
    set.add(verseKey);
    nowMemorized = true;
  }
  progress.memorizedVerses = Array.from(set);
  setProgress(progress);
  return nowMemorized;
}

export function saveQuizScore(moduleId: string, lessonId: string, score: number): void {
  const progress = getProgress();
  if (!progress.modules[moduleId]) {
    progress.modules[moduleId] = {
      lessonsCompleted: [],
      quizScores: [],
      lastAccessed: "",
    };
  }
  progress.modules[moduleId].quizScores.push({
    lessonId,
    score,
    date: new Date().toISOString(),
  });
  progress.modules[moduleId].lastAccessed = new Date().toISOString();
  setProgress(progress);
}

export function resetProgress(): void {
  if (!isBrowser()) return;
  const progress = getProgress();
  // Keep settings, reset everything else
  setProgress({
    ...DEFAULT_PROGRESS,
    settings: progress.settings,
  });
}

export function updateStreak(): void {
  const progress = getProgress();
  const today = new Date().toISOString().split("T")[0];
  const lastDate = progress.streaks.lastPracticeDate;

  if (lastDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (lastDate === yesterdayStr) {
    progress.streaks.currentStreak += 1;
  } else {
    progress.streaks.currentStreak = 1;
  }

  if (progress.streaks.currentStreak > progress.streaks.longestStreak) {
    progress.streaks.longestStreak = progress.streaks.currentStreak;
  }

  progress.streaks.lastPracticeDate = today;
  setProgress(progress);
}
