import type {
  TajweedProgress,
  UserSettings,
  ModuleProgress,
  Language,
  ReviewState,
  ReviewBox,
  AnalyticsEvent,
  AnalyticsEventType,
  PlayerResume,
  VerseLocation,
  KhatmahPlan,
} from "./types";
import { normalizeReciterId, DEFAULT_RECITER_ID } from "./reciters";
import { sanitizePlayerPosition, type PlayerPosition } from "./player-position";
import { emitProgressChanged } from "./progress-events";

export const STORAGE_KEY = "tajweed-trainer-progress";

export const DEFAULT_SETTINGS: UserSettings = {
  reciter: DEFAULT_RECITER_ID,
  playbackSpeed: 1.0,
  fontSize: "normal",
  darkMode: false,
  showTransliteration: true,
  showTranslation: true,
  language: "en",
  lastMushafPage: 1,
  mushafBookmarks: [],
  translationId: 20,
  tafsirId: 169,
  showWordByWord: false,
  playerMinimized: false,
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
  memorizationReviews: {},
  readSections: {},
  verseNotes: {},
  analytics: [],
  bookmarks: [],
  lastRead: null,
  lastReadBySurah: {},
  khatmah: null,
  seenOnboarding: false,
  lastBackupAt: "",
};

// Callers mutate what getProgress() returns before writing it back, so every
// handout of the default state must be a fresh clone. Sharing (or freezing)
// the literal breaks a first visit: the very first analytics write mutates
// the object it was handed.
function cloneDefaultProgress(): TajweedProgress {
  return structuredClone(DEFAULT_PROGRESS);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

// Stable reference handed to useSyncExternalStore as the server snapshot. It
// must be the same object on every call or React re-renders forever during
// hydration. Deep-frozen on its own clone so nothing can pollute the shared
// empty state; live reads go through cloneDefaultProgress() instead.
export const EMPTY_PROGRESS: TajweedProgress = deepFreeze(structuredClone(DEFAULT_PROGRESS));

// Caps protect against pathological inputs from a tampered localStorage —
// e.g. a 100,000-entry bookmarks array that bloats every render.
const MAX_BOOKMARKS = 200;
const MAX_LESSONS_PER_MODULE = 200;
const MAX_QUIZ_SCORES_PER_MODULE = 500;
const MAX_MODULES = 100;
const MAX_REVIEWS = 2000;
const MAX_MEMORIZED = 6236;
const MAX_VERSE_BOOKMARKS = 500;
const MAX_LAST_READ_BY_SURAH = 114;
const VERSE_KEY_PATTERN = /^\d{1,3}:\d{1,3}$/;
// Per-verse private notes: a realistic ceiling on how many verses one learner
// annotates (well under the 6,236-verse maximum) and a per-note length so a
// tampered store cannot bloat every read. Notes are trimmed and empty ones are
// dropped, so the count only grows with real annotations.
const MAX_VERSE_NOTES = 2000;
const MAX_VERSE_NOTE_LENGTH = 1000;
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
    translationId: pickNumber(input.translationId, DEFAULT_SETTINGS.translationId ?? 20, 1, 1_000_000),
    tafsirId: pickNumber(input.tafsirId, DEFAULT_SETTINGS.tafsirId ?? 169, 1, 1_000_000),
    showWordByWord:
      typeof input.showWordByWord === "boolean" ? input.showWordByWord : (DEFAULT_SETTINGS.showWordByWord ?? false),
    // Validated for shape only; the live viewport clamp runs at mount, since
    // storage cannot know the viewport a value was saved on.
    playerPosition: sanitizePlayerPosition(input.playerPosition),
    playerMinimized:
      typeof input.playerMinimized === "boolean" ? input.playerMinimized : false,
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
        .slice(-MAX_QUIZ_SCORES_PER_MODULE)
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
    if (id === "__proto__" || id === "constructor" || id === "prototype") continue;
    if (typeof id !== "string" || id.length === 0 || id.length >= 200) continue;
    const review = sanitizeReview(value);
    if (review) out[id] = review;
  }
  return out;
}

// Memorized-verse review state. Mirrors sanitizeReviews but the key is a
// verseKey (not a rule-quiz questionId), so it validates against
// VERSE_KEY_PATTERN and caps at MAX_MEMORIZED — a separate keyspace that can
// never collide with `reviews`. A stored object without this field reads back
// as {} (lossless migration).
function sanitizeMemorizationReviews(input: unknown): Record<string, ReviewState> {
  if (!isObject(input)) return {};
  const out: Record<string, ReviewState> = {};
  const entries = Object.entries(input).slice(0, MAX_MEMORIZED);
  for (const [verseKey, value] of entries) {
    if (verseKey === "__proto__" || verseKey === "constructor" || verseKey === "prototype") continue;
    if (!VERSE_KEY_PATTERN.test(verseKey)) continue;
    const review = sanitizeReview(value);
    if (review) out[verseKey] = review;
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
    if (moduleId === "__proto__" || moduleId === "constructor" || moduleId === "prototype") continue;
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

// Per-verse private study notes. Keys are verseKeys (validated against
// VERSE_KEY_PATTERN); values are the learner's own text, trimmed and capped at
// MAX_VERSE_NOTE_LENGTH. Empty notes are dropped (an empty note is "no note"),
// the dangerous prototype keys are skipped like every other keyed-map loop, and
// the whole map caps at MAX_VERSE_NOTES. A stored object without this field
// reads back as {} (lossless migration).
function sanitizeVerseNotes(input: unknown): Record<string, string> {
  if (!isObject(input)) return {};
  const out: Record<string, string> = {};
  let count = 0;
  for (const [verseKey, value] of Object.entries(input)) {
    if (verseKey === "__proto__" || verseKey === "constructor" || verseKey === "prototype") continue;
    if (!VERSE_KEY_PATTERN.test(verseKey)) continue;
    if (typeof value !== "string") continue;
    const text = value.trim().slice(0, MAX_VERSE_NOTE_LENGTH);
    if (text.length === 0) continue;
    out[verseKey] = text;
    count += 1;
    if (count >= MAX_VERSE_NOTES) break;
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

function sanitizePlayerResume(input: unknown): PlayerResume | null {
  if (!isObject(input)) return null;
  const surah = pickNumber(input.surah, 0, 1, 114);
  const ayah = pickNumber(input.ayah, 0, 1, 286);
  if (surah < 1 || ayah < 1) return null;
  return {
    surah,
    ayah,
    mode: pickEnum(input.mode, ["single", "continuous"] as const, "single"),
    offset: pickNumber(input.offset, 0, 0, 100000),
    reciter: normalizeReciterId(input.reciter),
  };
}

function sanitizeBookmarks(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out = new Set<string>();
  for (const v of input) {
    if (typeof v !== "string" || !VERSE_KEY_PATTERN.test(v)) continue;
    out.add(v);
    if (out.size >= MAX_VERSE_BOOKMARKS) break;
  }
  return Array.from(out);
}

function sanitizeVerseLocation(input: unknown): VerseLocation | null {
  if (!isObject(input)) return null;
  if (typeof input.verseKey !== "string" || !VERSE_KEY_PATTERN.test(input.verseKey)) return null;
  const page = pickNumber(input.page, 1, 1, 604);
  const ts = typeof input.ts === "string" && input.ts.length <= 32 ? input.ts : "";
  return { verseKey: input.verseKey, page, ts };
}

function sanitizeLastRead(input: unknown): VerseLocation | null {
  return sanitizeVerseLocation(input);
}

// Calendar-date shape (YYYY-MM-DD) plus a real-date round-trip, so "2026-02-31"
// or "2026-13-01" is rejected, not silently kept. Parsing in UTC keeps the
// check timezone-independent: only the date components are validated here.
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(ms)) return false;
  // Reject inputs the Date parser normalizes (e.g. month 13 -> next year): the
  // canonical YYYY-MM-DD of the parsed instant must equal the input.
  return new Date(ms).toISOString().slice(0, 10) === value;
}

// The opt-in khatmah plan. Both dates must be real ISO calendar dates with the
// target on or after the start (a same-day plan is allowed; the pace lib guards
// the zero-day divide). startPage is bounded to the 604-page mushaf. Anything
// malformed or absent reads back as null (no plan), so a tampered store can
// never strand a broken plan in the UI. A stored object without this field reads
// back as null (lossless migration).
function sanitizeKhatmah(input: unknown): KhatmahPlan | null {
  if (!isObject(input)) return null;
  if (!isValidIsoDate(input.startDate) || !isValidIsoDate(input.targetDate)) return null;
  if (input.targetDate < input.startDate) return null;
  if (
    typeof input.startPage !== "number" ||
    !Number.isInteger(input.startPage) ||
    input.startPage < 1 ||
    input.startPage > 604
  ) {
    return null;
  }
  return { startDate: input.startDate, targetDate: input.targetDate, startPage: input.startPage };
}

// Per-surah last-read map. Keys are surah numbers 1..114 (validated as integers
// in range); values are VerseLocation records validated like lastRead. Guards
// the prototype-pollution keys and caps at 114 entries, mirroring the other map
// sanitizers. A stored object without this field reads back as {} (lossless
// migration).
function sanitizeLastReadBySurah(input: unknown): Record<number, VerseLocation> {
  if (!isObject(input)) return {};
  const out: Record<number, VerseLocation> = {};
  let count = 0;
  for (const [key, value] of Object.entries(input)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    const surah = Number(key);
    if (!Number.isInteger(surah) || surah < 1 || surah > 114) continue;
    const location = sanitizeVerseLocation(value);
    if (!location) continue;
    out[surah] = location;
    count += 1;
    if (count >= MAX_LAST_READ_BY_SURAH) break;
  }
  return out;
}

export function sanitizeProgress(input: unknown): TajweedProgress {
  if (!isObject(input)) return cloneDefaultProgress();
  const modules: Record<string, ModuleProgress> = {};
  if (isObject(input.modules)) {
    const entries = Object.entries(input.modules).slice(0, MAX_MODULES);
    for (const [id, mod] of entries) {
      if (id === "__proto__" || id === "constructor" || id === "prototype") continue;
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
    : { ...DEFAULT_PROGRESS.streaks };
  return {
    modules,
    settings: sanitizeSettings(input.settings),
    streaks,
    reviews: sanitizeReviews(input.reviews),
    memorizedVerses: sanitizeMemorized(input.memorizedVerses),
    memorizationReviews: sanitizeMemorizationReviews(input.memorizationReviews),
    readSections: sanitizeReadSections(input.readSections),
    verseNotes: sanitizeVerseNotes(input.verseNotes),
    analytics: sanitizeAnalytics(input.analytics),
    playerResume: sanitizePlayerResume(input.playerResume),
    bookmarks: sanitizeBookmarks(input.bookmarks),
    lastRead: sanitizeLastRead(input.lastRead),
    lastReadBySurah: sanitizeLastReadBySurah(input.lastReadBySurah),
    khatmah: sanitizeKhatmah(input.khatmah),
    seenOnboarding: typeof input.seenOnboarding === "boolean" ? input.seenOnboarding : false,
    lastBackupAt: typeof input.lastBackupAt === "string" && input.lastBackupAt.length <= 32 ? input.lastBackupAt : "",
  };
}

export function getProgress(): TajweedProgress {
  if (!isBrowser()) return cloneDefaultProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaultProgress();
    return sanitizeProgress(JSON.parse(raw));
  } catch {
    return cloneDefaultProgress();
  }
}

export function getPlayerResume(): PlayerResume | null {
  return getProgress().playerResume ?? null;
}

export function setPlayerResume(resume: PlayerResume | null): void {
  setProgress({ ...getProgress(), playerResume: resume });
}

export function getPlayerPosition(): PlayerPosition | null {
  return getProgress().settings.playerPosition ?? null;
}

// Persist the dragged player's top-left corner inside the consolidated settings
// so export / import / reset cover it (no standalone localStorage key). The
// stored value is shape-checked here and on read; the on-screen clamp against
// the live viewport is the caller's job at mount.
export function setPlayerPosition(position: PlayerPosition | null): void {
  const progress = getProgress();
  progress.settings = { ...progress.settings, playerPosition: position };
  setProgress(progress);
}

export function setProgress(progress: TajweedProgress): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    // Same-tab subscribers (useProgress and friends) re-read on this signal;
    // the browser's own "storage" event covers other tabs.
    emitProgressChanged();
  } catch {
    // Storage full or unavailable
  }
}

export function getPlayerMinimized(): boolean {
  return getProgress().settings.playerMinimized ?? false;
}

export function setPlayerMinimized(minimized: boolean): void {
  const progress = getProgress();
  progress.settings = { ...progress.settings, playerMinimized: minimized };
  setProgress(progress);
}

// First-launch onboarding seen flag. Lives on the consolidated progress object
// (not an ad-hoc key) so export / import / reset cover it; the default-false in
// DEFAULT_PROGRESS makes resetProgress re-show onboarding. The setter writes
// through setProgress, which fires the change bus.
export function getOnboardingSeen(): boolean {
  return getProgress().seenOnboarding ?? false;
}

export function setOnboardingSeen(value: boolean): void {
  const progress = getProgress();
  progress.seenOnboarding = value;
  setProgress(progress);
}

// The opt-in khatmah plan funnel. Lives on the consolidated progress model
// (field `khatmah`, not an ad-hoc key) so export / import / reset cover it; the
// default-null in DEFAULT_PROGRESS makes resetProgress clear any plan. Reads and
// writes go through the same sanitizer the store applies, so a malformed plan is
// stored as null (no plan) rather than a broken one. All three setters write
// through setProgress, which fires the change bus.
export function getKhatmah(): KhatmahPlan | null {
  return getProgress().khatmah ?? null;
}

export function setKhatmah(plan: KhatmahPlan): void {
  if (!isBrowser()) return;
  const sanitized = sanitizeKhatmah(plan);
  if (!sanitized) return;
  const progress = getProgress();
  progress.khatmah = sanitized;
  setProgress(progress);
}

export function clearKhatmah(): void {
  if (!isBrowser()) return;
  const progress = getProgress();
  progress.khatmah = null;
  setProgress(progress);
}

export function getSettings(): UserSettings {
  return getProgress().settings;
}

export function setSettings(settings: UserSettings): void {
  const progress = getProgress();
  progress.settings = settings;
  setProgress(progress);
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

// Memorized-verse review funnel: mirrors getReviews/setReview but over the
// separate memorizationReviews map (keyed by verseKey, never colliding with the
// rule-quiz reviews keyspace). The key is validated so a tampered call can't
// write a non-verseKey entry.
export function getMemorizationReviews(): Record<string, ReviewState> {
  return getProgress().memorizationReviews;
}

export function setMemorizationReview(verseKey: string, state: ReviewState): void {
  if (!isBrowser()) return;
  if (!VERSE_KEY_PATTERN.test(verseKey)) return;
  const progress = getProgress();
  progress.memorizationReviews[verseKey] = state;
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
// read, so untrusted fields are stripped. Stamps lastBackupAt so the snapshot
// and the stored state agree on when this backup was taken; that timestamp also
// dismisses the backup reminder. On the server (no window) it returns the
// snapshot without persisting.
export function exportProgress(): string {
  const progress = getProgress();
  progress.lastBackupAt = new Date().toISOString();
  setProgress(progress);
  return JSON.stringify(progress, null, 2);
}

export function getLastBackupAt(): string {
  return getProgress().lastBackupAt ?? "";
}

const BACKUP_REMINDER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// True when the user has done enough to be worth backing up. Kept here next to
// the data model so the "meaningful" definition has one home. Any completed
// lesson, quiz score, memorized verse, bookmark, or an active streak counts.
export function hasMeaningfulProgress(progress: TajweedProgress): boolean {
  if (progress.memorizedVerses.length > 0) return true;
  if (progress.bookmarks.length > 0) return true;
  if (progress.streaks.currentStreak > 0) return true;
  for (const mod of Object.values(progress.modules)) {
    if (mod.lessonsCompleted.length > 0 || mod.quizScores.length > 0) return true;
  }
  return false;
}

// Whether to nudge the user to back up: there is meaningful progress AND either
// no backup was ever taken or the last one is older than the reminder window.
// `now` is injected so callers (and tests) control the clock.
export function shouldRemindBackup(progress: TajweedProgress, now: Date): boolean {
  if (!hasMeaningfulProgress(progress)) return false;
  const last = progress.lastBackupAt ?? "";
  if (!last) return true;
  const lastMs = Date.parse(last);
  if (Number.isNaN(lastMs)) return true;
  return now.getTime() - lastMs > BACKUP_REMINDER_DAYS * DAY_MS;
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

export function getVerseNote(verseKey: string): string {
  return getProgress().verseNotes[verseKey] ?? "";
}

// Write (or clear) a learner's private note for one verse, through the change
// bus. The text is trimmed and capped; an empty result deletes the entry (an
// empty note is "no note"). A tampered verseKey is rejected. Adding a brand-new
// note past the cap is a no-op (editing or clearing an existing note always
// works, so the user is never stuck unable to fix a note).
export function setVerseNote(verseKey: string, text: string): void {
  if (!isBrowser()) return;
  if (!VERSE_KEY_PATTERN.test(verseKey)) return;
  const progress = getProgress();
  const trimmed = text.trim().slice(0, MAX_VERSE_NOTE_LENGTH);
  if (trimmed.length === 0) {
    if (!(verseKey in progress.verseNotes)) return;
    delete progress.verseNotes[verseKey];
  } else {
    const isNew = !(verseKey in progress.verseNotes);
    if (isNew && Object.keys(progress.verseNotes).length >= MAX_VERSE_NOTES) return;
    progress.verseNotes[verseKey] = trimmed;
  }
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

// Batched mark/unmark over a list of verseKeys: one read, one Set mutation
// across the whole list, one write (so the change bus fires exactly once
// regardless of list length — a whole surah is one write, not 286). Set
// semantics give union for mark (overlapping marks never double count) and
// difference for unmark. The 6236 cap is checked inside the loop and invalid
// keys are skipped. Returns the new memorized count so the caller can update
// without re-reading. Mirrors toggleMemorizedVerse; the single-verse helper
// stays for per-verse toggles.
export function setMemorizedVerses(verseKeys: string[], memorize: boolean): number {
  if (!isBrowser()) return 0;
  const progress = getProgress();
  const set = new Set(progress.memorizedVerses);
  for (const key of verseKeys) {
    if (!VERSE_KEY_PATTERN.test(key)) continue;
    if (memorize) {
      if (set.size >= MAX_MEMORIZED && !set.has(key)) continue;
      set.add(key);
    } else {
      set.delete(key);
    }
  }
  progress.memorizedVerses = Array.from(set);
  setProgress(progress);
  return progress.memorizedVerses.length;
}

export function getBookmarks(): string[] {
  return getProgress().bookmarks;
}

// Returns the new bookmarked state (true if added, false if removed).
export function toggleVerseBookmark(verseKey: string): boolean {
  if (!isBrowser()) return false;
  if (!VERSE_KEY_PATTERN.test(verseKey)) return false;
  const progress = getProgress();
  const set = new Set(progress.bookmarks);
  let nowBookmarked: boolean;
  if (set.has(verseKey)) {
    set.delete(verseKey);
    nowBookmarked = false;
  } else {
    if (set.size >= MAX_VERSE_BOOKMARKS) return progress.bookmarks.includes(verseKey);
    set.add(verseKey);
    nowBookmarked = true;
  }
  progress.bookmarks = Array.from(set);
  setProgress(progress);
  return nowBookmarked;
}

export function getLastRead(): VerseLocation | null {
  return getProgress().lastRead ?? null;
}

// The saved position within one surah, or null if the surah was never opened
// past its first page. Reading code clamps the surah; callers pass a real surah
// number from the bundled index.
export function getLastReadForSurah(surah: number): VerseLocation | null {
  return getProgress().lastReadBySurah?.[surah] ?? null;
}

export function setLastRead(verseKey: string, page: number): void {
  if (!isBrowser()) return;
  if (!VERSE_KEY_PATTERN.test(verseKey)) return;
  const progress = getProgress();
  const location: VerseLocation = { verseKey, page, ts: new Date().toISOString() };
  progress.lastRead = location;
  // Record the same location under its surah so reopening that surah resumes
  // here. The surah is the first verseKey segment, already in 1..114 because the
  // pattern above bounds it to three digits and the map sanitizer re-checks the
  // range on every read.
  const surah = Number(verseKey.split(":")[0]);
  if (Number.isInteger(surah) && surah >= 1 && surah <= 114) {
    const bySurah = progress.lastReadBySurah ?? {};
    bySurah[surah] = location;
    progress.lastReadBySurah = bySurah;
  }
  setProgress(progress);
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
    ...cloneDefaultProgress(),
    settings: progress.settings,
  });
}

export function updateStreak(): void {
  const progress = getProgress();
  const today = new Date().toLocaleDateString("en-CA");
  const lastDate = progress.streaks.lastPracticeDate;

  if (lastDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("en-CA");

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
