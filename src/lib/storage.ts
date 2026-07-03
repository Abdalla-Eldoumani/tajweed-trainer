import type {
  TajweedProgress,
  UserSettings,
  ModuleProgress,
  Language,
  Theme,
  ReviewState,
  ReviewBox,
  Sm2State,
  AnalyticsEvent,
  AnalyticsEventType,
  PlayerResume,
  VerseLocation,
  KhatmahPlan,
  CertificateRecord,
} from "./types";
import { normalizeReciterId, DEFAULT_RECITER_ID } from "./reciters";
import { sanitizePlayerPosition, type PlayerPosition } from "./player-position";
import { emitProgressChanged } from "./progress-events";
// The migration function and the SM-2 bounds live with the pure recall curve;
// storage -> recall-scheduler is one-directional (the lib imports only a type),
// so there is no cycle. Importing MIN_EF/MAX_EF/MAX_INTERVAL keeps the SM-2
// bounds single-sourced rather than re-hardcoding them at the trust boundary.
import { migrateLeitnerToSm2, INITIAL_EF, MIN_EF, MAX_EF, MAX_INTERVAL } from "./recall-scheduler";

export const STORAGE_KEY = "tajweed-trainer-progress";

export const DEFAULT_SETTINGS: UserSettings = {
  reciter: DEFAULT_RECITER_ID,
  playbackSpeed: 1.0,
  fontSize: "normal",
  theme: "vellum",
  darkMode: false,
  showTransliteration: true,
  showTranslation: true,
  language: "en",
  lastMushafPage: 1,
  mushafBookmarks: [],
  translationId: 20,
  tafsirId: 169,
  showWordByWord: false,
  diacriticInsensitive: false,
  playerMinimized: false,
  reviewIntervalModifier: 1.0,
  peekBudget: 3,
  newVerseCap: 5,
  revisionRemindersEnabled: false,
  tikrarTarget: 5,
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
  entryTags: {},
  sessionPeekUsed: {},
  analytics: [],
  bookmarks: [],
  lastRead: null,
  lastReadBySurah: {},
  khatmah: null,
  certificates: [],
  seenOnboarding: false,
  warshNarrationAck: false,
  lastBackupAt: "",
  dailyNewVersesTracking: { date: "", count: 0 },
  memorizationStreak: { currentStreak: 0, longestStreak: 0, lastRevisionDate: "" },
  tikrarLog: {},
  examLog: [],
  sessionJournal: {},
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

// Caps protect against pathological inputs from a tampered localStorage,
// e.g. a 100,000-entry bookmarks array that bloats every render.
const MAX_BOOKMARKS = 200;
const MAX_LESSONS_PER_MODULE = 200;
const MAX_QUIZ_SCORES_PER_MODULE = 500;
const MAX_MODULES = 100;
const MAX_REVIEWS = 2000;
const MAX_MEMORIZED = 6236;
// Per-call ceiling on tikrar reps: a single logTikrarReps call can add at most
// this many reps to a verse's running total (the total itself caps at
// MAX_MEMORIZED entries and 100000 reps per entry). A tamper/typo guard, not a
// real session length.
const MAX_TIKRAR_PER_CALL = 100;
// The timed-exam attempt log is a capped, most-recent-first ring: a tampered
// store cannot bloat every read past this many attempts, and legitimate use keeps
// only the recent history (older attempts age off the tail).
const MAX_EXAM_LOG = 100;
// The session journal holds one entry per day; a leap year of daily entries is
// 366, so this ceiling bounds a tampered store while never clipping a real
// year-long streak of daily use (cap-on-new keeps existing days editable).
const MAX_JOURNAL_DAYS = 366;
const MAX_VERSE_BOOKMARKS = 500;
const MAX_LAST_READ_BY_SURAH = 114;
// Milestone certificate records: one per juz (30) plus the khatmah is 31 at most,
// and the kind+ref dedupe holds the total there, so this cap is effectively
// unreachable headroom against a tampered store, not a real limit reached in use.
const MAX_CERTIFICATES = 60;
const VERSE_KEY_PATTERN = /^\d{1,3}:\d{1,3}$/;
// Per-verse private notes: a realistic ceiling on how many verses one learner
// annotates (well under the 6,236-verse maximum) and a per-note length so a
// tampered store cannot bloat every read. Notes are trimmed and empty ones are
// dropped, so the count only grows with real annotations.
const MAX_VERSE_NOTES = 2000;
const MAX_VERSE_NOTE_LENGTH = 1000;
// The learner's own short labels per verse. Same ceiling on annotated verses as
// the notes map (MAX_TAG_ENTRIES mirrors MAX_VERSE_NOTES); a per-entry tag count
// and a per-tag length so a tampered store cannot bloat every read. Tags are
// trimmed, deduped, and empty ones dropped, so counts only grow with real use.
const MAX_TAG_ENTRIES = 2000;
const MAX_TAGS_PER_ENTRY = 12;
const MAX_TAG_LENGTH = 40;
const MAX_READ_SECTIONS_PER_MODULE = 50;
// Per-session peek/hint counts, keyed by verseKey. These are tamper-defense
// ceilings, not real limits: the peek budget caps real use at <= 10 distinct
// verses per session, so a legitimate map is tiny. MAX_PEEK_ENTRIES bounds the
// map against a huge injected object; MAX_PEEK_PER_VERSE bounds a single count
// (only "> 0" is meaningful — a peeked verse is capped at "hard").
const MAX_PEEK_ENTRIES = 500;
const MAX_PEEK_PER_VERSE = 99;
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
const VALID_THEMES: readonly Theme[] = ["vellum", "pearl", "night", "sepia", "mihrab"];

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

// Clamp (do not reject) a numeric field to [min, max]; a non-number or non-finite
// value falls back. Unlike pickNumber, which rejects an out-of-band value to the
// fallback, this pins a tampered out-of-band number to the nearest bound. That is
// what the SM-2 bounds and the interval modifier want: a tampered easeFactor of
// 1e9 becomes MAX_EF (5.0), not the 2.5 fallback, and a modifier of 5 becomes 2.0.
function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// Resolve the theme on read/import. An explicit valid theme always wins; when it
// is absent or unknown, migrate the legacy darkMode flag (true -> night) and fall
// back to the safe default (vellum) for everything else. The darkMode branch must
// take precedence over the plain default, so it is consulted here rather than
// leaning on DEFAULT_SETTINGS.theme.
function resolveTheme(input: Record<string, unknown>): Theme {
  if (VALID_THEMES.includes(input.theme as Theme)) return input.theme as Theme;
  return input.darkMode === true ? "night" : "vellum";
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
    theme: resolveTheme(input),
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
    // Comparison-only typing-recall toggle (TYPE-02). Boolean coercion mirroring
    // showWordByWord: a tampered non-boolean falls back to the default false so a
    // restored backup can never carry a non-boolean here. Changes nothing stored.
    diacriticInsensitive:
      typeof input.diacriticInsensitive === "boolean"
        ? input.diacriticInsensitive
        : (DEFAULT_SETTINGS.diacriticInsensitive ?? false),
    // Validated for shape only; the live viewport clamp runs at mount, since
    // storage cannot know the viewport a value was saved on.
    playerPosition: sanitizePlayerPosition(input.playerPosition),
    playerMinimized:
      typeof input.playerMinimized === "boolean" ? input.playerMinimized : false,
    // Balanced SM-2 review-interval modifier: clamp to the [0.5, 2.0] band (0.5
    // halves the gaps between reviews, 2.0 doubles them); a non-number / NaN /
    // absent value falls back to 1.0. Clamp to the nearest bound rather than
    // reject, so a tampered 5 becomes 2.0. This scales only the memorized-verse
    // due date, never the SM-2 easeFactor.
    reviewIntervalModifier: clampNumber(input.reviewIntervalModifier, 1.0, 0.5, 2.0),
    // Per-session recall peek/hint budget (BLIND-03). Clamp to [1, 10] rather
    // than reject, so a tampered 999 pins to 10 (mirroring reviewIntervalModifier);
    // Math.round because peeks are whole. A non-number / NaN / absent value falls
    // back to 3. Kept by resetProgress (it preserves settings).
    peekBudget: Math.round(clampNumber(input.peekBudget, 3, 1, 10)),
    // Daily NEW-verse cap for the murajaah revision queue (REV-01). Clamp to
    // [1, 10] rather than reject, so a tampered 999 pins to 10 (verbatim the
    // peekBudget pattern); Math.round because a cap is a whole verse count. A
    // non-number / NaN / absent value falls back to 5. Kept by resetProgress.
    newVerseCap: Math.round(clampNumber(input.newVerseCap, 5, 1, 10)),
    // Opt-in local revision reminder flag (REV-04). Boolean coercion mirroring
    // showWordByWord / diacriticInsensitive: a tampered non-boolean falls back to
    // the default false so a restored backup can never carry a non-boolean here.
    revisionRemindersEnabled:
      typeof input.revisionRemindersEnabled === "boolean"
        ? input.revisionRemindersEnabled
        : (DEFAULT_SETTINGS.revisionRemindersEnabled ?? false),
    // Default per-session tikrar rep target (EXAM-01). Clamp to [1, 20] rather
    // than reject, so a tampered 999 pins to 20 (verbatim the peekBudget /
    // newVerseCap pattern); Math.round because a rep target is whole. A
    // non-number / NaN / absent value falls back to 5. Kept by resetProgress.
    tikrarTarget: Math.round(clampNumber(input.tikrarTarget, 5, 1, 20)),
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

// Bounds one SM-2 recall state at the trust boundary. Every field is clamped,
// not rejected wholesale (T-04-04): a tampered easeFactor / intervalDays pins to
// its nearest bound rather than nuking the whole entry. Mirrors sanitizeReview's
// style. easeFactor uses the algorithm's [MIN_EF, MAX_EF] band (a non-number ->
// the neutral INITIAL_EF); intervalDays is a whole day count in [1, MAX_INTERVAL]
// (a non-number -> 1); repetitions/timesSeen/timesCorrect/lapses match
// sanitizeReview's [0, 100000] count ceiling. This function is idempotent: a
// value already in band round-trips to itself, so re-sanitizing never drifts.
function sanitizeSm2(input: Record<string, unknown>): Sm2State {
  const nextDueDate =
    typeof input.nextDueDate === "string" && input.nextDueDate.length <= 32 ? input.nextDueDate : "";
  const lastReviewedDate =
    typeof input.lastReviewedDate === "string" && input.lastReviewedDate.length <= 32 ? input.lastReviewedDate : "";
  return {
    repetitions: pickNumber(input.repetitions, 0, 0, 100000),
    easeFactor: clampNumber(input.easeFactor, INITIAL_EF, MIN_EF, MAX_EF),
    intervalDays: Math.round(clampNumber(input.intervalDays, 1, 1, MAX_INTERVAL)),
    nextDueDate,
    lastReviewedDate,
    timesSeen: pickNumber(input.timesSeen, 0, 0, 100000),
    timesCorrect: pickNumber(input.timesCorrect, 0, 0, 100000),
    lapses: pickNumber(input.lapses, 0, 0, 100000),
  };
}

// Memorized-verse review state, now SM-2 (see Sm2State). The key is a verseKey
// (not a rule-quiz questionId), so it validates against VERSE_KEY_PATTERN and
// caps at MAX_MEMORIZED, a separate keyspace that can never collide with
// `reviews` (which stays Leitner, untouched). This is the single trust boundary
// that BOTH bounds the new shape AND migrates legacy box-based entries, so the
// migration runs on read (getProgress) and on import (importProgress) with no
// separate code path. Per entry, inside the existing prototype-key skip +
// verseKey check + cap:
//   - a numeric easeFactor => already SM-2: pass through sanitizeSm2 (idempotent).
//   - else a valid Leitner box => bound the preserved fields via sanitizeReview
//     first (so the migration cannot become a bounds-bypass, T-04-06), then
//     migrateLeitnerToSm2 (nextDueDate copied verbatim; box-5 does not regress).
//   - else drop it (a memorized verse with no entry is due anyway, SCHED-03).
// A tampered entry carrying BOTH easeFactor and box takes the SM-2 branch. A
// stored object without this field reads back as {} (lossless migration).
function sanitizeMemorizationReviews(input: unknown): Record<string, Sm2State> {
  if (!isObject(input)) return {};
  const out: Record<string, Sm2State> = {};
  const entries = Object.entries(input).slice(0, MAX_MEMORIZED);
  for (const [verseKey, value] of entries) {
    if (verseKey === "__proto__" || verseKey === "constructor" || verseKey === "prototype") continue;
    if (!VERSE_KEY_PATTERN.test(verseKey)) continue;
    if (!isObject(value)) continue;
    if (typeof value.easeFactor === "number") {
      out[verseKey] = sanitizeSm2(value);
    } else if (VALID_BOXES.includes(value.box as ReviewBox)) {
      const review = sanitizeReview(value);
      if (review) out[verseKey] = migrateLeitnerToSm2(review);
    }
  }
  return out;
}

function sanitizeAnalytics(input: unknown): AnalyticsEvent[] {
  if (!Array.isArray(input)) return [];
  const out: AnalyticsEvent[] = [];
  // Take the most recent MAX_ANALYTICS, older events get evicted as the
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

// Normalize one verse's tag list: trim each tag, drop empties, cap each tag's
// length, dedupe case-insensitively (keeping the first-seen casing so the user's
// own capitalization is preserved), and cap the count. Shared by the sanitizer
// and setTags so a stored list and a freshly written list are bounded the same
// way.
function normalizeTags(input: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const tag = raw.trim().slice(0, MAX_TAG_LENGTH);
    if (tag.length === 0) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_TAGS_PER_ENTRY) break;
  }
  return out;
}

// The learner's own short tags per verse. Keys are verseKeys (validated against
// VERSE_KEY_PATTERN); values are string arrays of the user's own labels, each
// trimmed/length-capped, deduped, and capped in count by normalizeTags. An entry
// with no surviving tags is dropped (an empty tag set is "no tags"), the
// dangerous prototype keys are skipped like every other keyed-map loop, and the
// whole map caps at MAX_TAG_ENTRIES. A stored object without this field reads
// back as {} (lossless migration). Tags are never religious content.
function sanitizeEntryTags(input: unknown): Record<string, string[]> {
  if (!isObject(input)) return {};
  const out: Record<string, string[]> = {};
  let count = 0;
  for (const [verseKey, value] of Object.entries(input)) {
    if (verseKey === "__proto__" || verseKey === "constructor" || verseKey === "prototype") continue;
    if (!VERSE_KEY_PATTERN.test(verseKey)) continue;
    if (!Array.isArray(value)) continue;
    const tags = normalizeTags(value);
    if (tags.length === 0) continue;
    out[verseKey] = tags;
    count += 1;
    if (count >= MAX_TAG_ENTRIES) break;
  }
  return out;
}

// Per-session peek/hint counts, keyed by verseKey. Mirrors sanitizeVerseNotes /
// sanitizeEntryTags exactly, only the value is numeric: the dangerous prototype
// keys are skipped, keys must match VERSE_KEY_PATTERN, each count is clamped to
// [0, MAX_PEEK_PER_VERSE] and rounded to a whole peek, a count < 1 is dropped (a
// zero / NaN / non-number peek is "no peek"), and the whole map caps at
// MAX_PEEK_ENTRIES. A stored object without this field reads back as {} (lossless
// migration).
function sanitizeSessionPeeks(input: unknown): Record<string, number> {
  if (!isObject(input)) return {};
  const out: Record<string, number> = {};
  let count = 0;
  for (const [verseKey, value] of Object.entries(input)) {
    if (verseKey === "__proto__" || verseKey === "constructor" || verseKey === "prototype") continue;
    if (!VERSE_KEY_PATTERN.test(verseKey)) continue;
    const n = Math.round(clampNumber(value, 0, 0, MAX_PEEK_PER_VERSE));
    if (n < 1) continue;
    out[verseKey] = n;
    count += 1;
    if (count >= MAX_PEEK_ENTRIES) break;
  }
  return out;
}

// Cumulative tikrar (repetition) rep log, keyed by verseKey. Mirrors
// sanitizeSessionPeeks structurally, only the value is an object: the dangerous
// prototype keys are skipped, keys must match VERSE_KEY_PATTERN, `reps` is clamped
// to [0, 100000] and `lastRepDate` must be a real ISO date (else ""). A non-object
// value is dropped, and the whole map caps at MAX_MEMORIZED (cap-on-new). Separate
// from the SM-2 memorizationReviews schedule. A stored object without this field
// reads back as {} (lossless migration).
function sanitizeTikrarLog(input: unknown): Record<string, { reps: number; lastRepDate: string }> {
  if (!isObject(input)) return {};
  const out: Record<string, { reps: number; lastRepDate: string }> = {};
  let count = 0;
  for (const [verseKey, value] of Object.entries(input)) {
    if (verseKey === "__proto__" || verseKey === "constructor" || verseKey === "prototype") continue;
    if (!VERSE_KEY_PATTERN.test(verseKey)) continue;
    if (!isObject(value)) continue;
    out[verseKey] = {
      reps: pickNumber(value.reps, 0, 0, 100000),
      lastRepDate: isValidIsoDate(value.lastRepDate) ? value.lastRepDate : "",
    };
    count += 1;
    if (count >= MAX_MEMORIZED) break;
  }
  return out;
}

// The per-day session journal (EXAM-03), a keyed map like sanitizeSessionPeeks so
// the dangerous prototype keys are skipped — but the KEY here must be a real
// YYYY-MM-DD day (isValidIsoDate), not a verseKey. Each value's four counters are
// clamped to [0, 100000]; a non-object value is dropped; the map caps at
// MAX_JOURNAL_DAYS (cap-on-new). Separate from the SM-2 memorizationReviews
// schedule. A stored object without this field reads back as {} (lossless
// migration).
function sanitizeSessionJournal(
  input: unknown,
): Record<string, { memorizeGoal: number; reviseGoal: number; memorized: number; revised: number }> {
  if (!isObject(input)) return {};
  const out: Record<string, { memorizeGoal: number; reviseGoal: number; memorized: number; revised: number }> = {};
  let count = 0;
  for (const [dateIso, value] of Object.entries(input)) {
    if (dateIso === "__proto__" || dateIso === "constructor" || dateIso === "prototype") continue;
    if (!isValidIsoDate(dateIso)) continue;
    if (!isObject(value)) continue;
    out[dateIso] = {
      memorizeGoal: pickNumber(value.memorizeGoal, 0, 0, 100000),
      reviseGoal: pickNumber(value.reviseGoal, 0, 0, 100000),
      memorized: pickNumber(value.memorized, 0, 0, 100000),
      revised: pickNumber(value.revised, 0, 0, 100000),
    };
    count += 1;
    if (count >= MAX_JOURNAL_DAYS) break;
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

// The bounded milestone-certificate record list. Each entry must be an object
// with `kind` in {"juz","khatmah"}, a real ISO `dateIso` (isValidIsoDate), and a
// `ref` that is an integer 1..30 for a juz or null for a khatmah; malformed
// entries are dropped. Records are deduped by kind+ref (one per milestone, so the
// list cannot grow past ~31), then capped at MAX_CERTIFICATES as a final ceiling.
// The image is NEVER part of this record (EDGE_CASES_V2 line 50), only the fact
// that the milestone was reached/exported. This is an array, not a keyed map, so
// it carries no prototype-pollution-key guard (there are no attacker-controlled
// object keys to rebuild). A stored object without this field reads back as []
// (lossless migration).
function sanitizeCertificates(input: unknown): CertificateRecord[] {
  if (!Array.isArray(input)) return [];
  const out: CertificateRecord[] = [];
  const seen = new Set<string>();
  for (const entry of input) {
    if (!isObject(entry)) continue;
    if (entry.kind !== "juz" && entry.kind !== "khatmah") continue;
    if (!isValidIsoDate(entry.dateIso)) continue;
    let ref: number | null;
    if (entry.kind === "juz") {
      if (
        typeof entry.ref !== "number" ||
        !Number.isInteger(entry.ref) ||
        entry.ref < 1 ||
        entry.ref > 30
      ) {
        continue;
      }
      ref = entry.ref;
    } else {
      // A khatmah record carries no juz number.
      if (entry.ref !== null && entry.ref !== undefined) continue;
      ref = null;
    }
    const dedupeKey = `${entry.kind}:${ref ?? ""}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push({ kind: entry.kind, ref, dateIso: entry.dateIso });
    if (out.length >= MAX_CERTIFICATES) break;
  }
  return out;
}

// The timed no-peek exam attempt log (EXAM-02). Mirrors sanitizeCertificates
// (the capped-object-array precedent): each entry must be an object; its fields
// are coerced (scope trimmed and <=80 chars, dateIso a real ISO date else "",
// percent rounded and clamped to [0,100], total clamped to [0,6236]); a non-object
// entry is dropped; the array caps at MAX_EXAM_LOG. This is an array, not a keyed
// map, so it carries no prototype-pollution-key guard and no dedupe (repeat
// attempts on the same scope are legitimate history). Never SM-2. A stored object
// without this field reads back as [] (lossless migration).
function sanitizeExamLog(input: unknown): { scope: string; dateIso: string; percent: number; total: number }[] {
  if (!Array.isArray(input)) return [];
  const out: { scope: string; dateIso: string; percent: number; total: number }[] = [];
  for (const entry of input) {
    if (!isObject(entry)) continue;
    const scope = String(entry.scope ?? "").trim().slice(0, 80);
    const dateIso = isValidIsoDate(entry.dateIso) ? entry.dateIso : "";
    const percent = Math.round(clampNumber(entry.percent, 0, 0, 100));
    const total = pickNumber(entry.total, 0, 0, 6236);
    out.push({ scope, dateIso, percent, total });
    if (out.length >= MAX_EXAM_LOG) break;
  }
  return out;
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

// The daily NEW-verse introduction counter (REV-01). A fixed-shape object, NOT a
// keyed map, so there is NO attacker-controlled key and NO prototype-pollution-key
// guard is needed. `date` is bounded to a <=10-char string (a YYYY-MM-DD day, or
// "" when never set); `count` is clamped to [0, 100000] like the other counters.
// A malformed or absent value reads back as the default { date: "", count: 0 }.
function sanitizeDailyNewVerses(input: unknown): { date: string; count: number } {
  if (!isObject(input)) return { date: "", count: 0 };
  return {
    date: typeof input.date === "string" && input.date.length <= 10 ? input.date : "",
    count: pickNumber(input.count, 0, 0, 100000),
  };
}

// The memorization REVISION streak (STAT-03). A fixed-shape object, NOT a keyed
// map, so there is NO attacker-controlled key and NO prototype-pollution-key
// guard is needed (mirrors sanitizeDailyNewVerses and the `streaks` sanitizer).
// Both counters are clamped to [0, 100000] like the practice streak; a tampered
// out-of-band value falls back to 0 via pickNumber. `lastRevisionDate` is bounded
// to a <=10-char string (a YYYY-MM-DD day, or "" when never set). A malformed or
// absent value reads back as the default { currentStreak: 0, longestStreak: 0,
// lastRevisionDate: "" }.
function sanitizeMemorizationStreak(
  input: unknown,
): { currentStreak: number; longestStreak: number; lastRevisionDate: string } {
  if (!isObject(input)) return { currentStreak: 0, longestStreak: 0, lastRevisionDate: "" };
  return {
    currentStreak: pickNumber(input.currentStreak, 0, 0, 100000),
    longestStreak: pickNumber(input.longestStreak, 0, 0, 100000),
    lastRevisionDate:
      typeof input.lastRevisionDate === "string" && input.lastRevisionDate.length <= 10
        ? input.lastRevisionDate
        : "",
  };
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
    entryTags: sanitizeEntryTags(input.entryTags),
    sessionPeekUsed: sanitizeSessionPeeks(input.sessionPeekUsed),
    analytics: sanitizeAnalytics(input.analytics),
    playerResume: sanitizePlayerResume(input.playerResume),
    bookmarks: sanitizeBookmarks(input.bookmarks),
    lastRead: sanitizeLastRead(input.lastRead),
    lastReadBySurah: sanitizeLastReadBySurah(input.lastReadBySurah),
    khatmah: sanitizeKhatmah(input.khatmah),
    certificates: sanitizeCertificates(input.certificates),
    seenOnboarding: typeof input.seenOnboarding === "boolean" ? input.seenOnboarding : false,
    warshNarrationAck: typeof input.warshNarrationAck === "boolean" ? input.warshNarrationAck : false,
    lastBackupAt: typeof input.lastBackupAt === "string" && input.lastBackupAt.length <= 32 ? input.lastBackupAt : "",
    dailyNewVersesTracking: sanitizeDailyNewVerses(input.dailyNewVersesTracking),
    memorizationStreak: sanitizeMemorizationStreak(input.memorizationStreak),
    tikrarLog: sanitizeTikrarLog(input.tikrarLog),
    examLog: sanitizeExamLog(input.examLog),
    sessionJournal: sanitizeSessionJournal(input.sessionJournal),
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

// The Warsh "different narration" disclaimer acknowledged flag. Same shape as
// the onboarding flag: lives on the consolidated progress object (not an ad-hoc
// key) so export / import / reset cover it; the default-false in DEFAULT_PROGRESS
// makes resetProgress re-show the disclaimer. The setter writes through
// setProgress, which fires the change bus.
export function getWarshDisclaimerAck(): boolean {
  return getProgress().warshNarrationAck ?? false;
}

export function setWarshDisclaimerAck(value: boolean): void {
  const progress = getProgress();
  progress.warshNarrationAck = value;
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

// The milestone-certificate record funnel. Lives on the consolidated progress
// model (field `certificates`, not an ad-hoc key) so export / import / reset cover
// it; the default-[] in DEFAULT_PROGRESS makes resetProgress clear the records.
// This records only that a milestone was reached and a certificate generated; it
// NEVER stores the image (EDGE_CASES_V2 line 50).
export function getCertificates(): CertificateRecord[] {
  return getProgress().certificates ?? [];
}

// Append one milestone record, through the change bus. The record is re-validated
// the same way the sanitizer validates a stored one (a malformed record is
// rejected). A record for the same kind+ref already present is a no-op (one
// certificate per milestone). The cap is a final ceiling: a genuinely new record
// once already at MAX_CERTIFICATES is a no-op, though the kind+ref dedupe holds
// the total at ~31 so the cap is effectively unreachable.
export function recordCertificate(rec: CertificateRecord): void {
  if (!isBrowser()) return;
  // Re-validate the single record by running it through the array sanitizer.
  const [valid] = sanitizeCertificates([rec]);
  if (!valid) return;
  const progress = getProgress();
  const current = progress.certificates ?? [];
  if (current.some((c) => c.kind === valid.kind && c.ref === valid.ref)) return;
  if (current.length >= MAX_CERTIFICATES) return;
  progress.certificates = [...current, valid];
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
export function getMemorizationReviews(): Record<string, Sm2State> {
  return getProgress().memorizationReviews;
}

export function setMemorizationReview(verseKey: string, state: Sm2State): void {
  if (!isBrowser()) return;
  if (!VERSE_KEY_PATTERN.test(verseKey)) return;
  const progress = getProgress();
  progress.memorizationReviews[verseKey] = state;
  setProgress(progress);
}

// How many NEW memorized verses were introduced to revision today (REV-01), for
// the murajaah queue's daily cap. SIDE-EFFECT-FREE by design: when the stored
// day is stale it returns 0 WITHOUT writing or emitting the change bus, so a pure
// render read never triggers a re-render loop. Do NOT "helpfully" add a reset
// write here — the day roll happens on the next recordNewVerseIntroduced. `now`
// is injected so tests control the clock; the day boundary is the app-wide
// toLocaleDateString("en-CA") convention (see updateStreak / recall-scheduler).
export function getNewVersesIntroducedToday(now: Date = new Date()): number {
  const t = getProgress().dailyNewVersesTracking;
  if (!t) return 0;
  return t.date === now.toLocaleDateString("en-CA") ? t.count : 0;
}

// Record that one NEW memorized verse entered revision today (REV-01). One write,
// one emitProgressChanged(): a same-day call increments the count, a stale (or
// empty) stored day rolls to { date: today, count: 1 }. `now` is injected so
// tests control the clock. Day boundary is the app-wide en-CA local date.
export function recordNewVerseIntroduced(now: Date = new Date()): void {
  if (!isBrowser()) return;
  const progress = getProgress();
  const today = now.toLocaleDateString("en-CA");
  const t = progress.dailyNewVersesTracking;
  progress.dailyNewVersesTracking =
    t && t.date === today ? { date: today, count: t.count + 1 } : { date: today, count: 1 };
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

// Read the verse's tags as the user's own labels. Lossless migration: a store
// written before this field reads back as [] (the map is `?? {}` before lookup).
export function getTags(verseKey: string): string[] {
  return getProgress().entryTags?.[verseKey] ?? [];
}

// Write (or clear) a learner's own tags for one verse, through the change bus.
// The list is normalized the same way the sanitizer does (trim, length-cap,
// dedupe, count-cap); an empty result deletes the entry (an empty tag set is "no
// tags"). A tampered verseKey is rejected. Adding tags to a brand-new verse past
// the entry cap is a no-op (editing or clearing an existing entry always works,
// mirroring setVerseNote, so the user is never stuck unable to fix tags).
export function setTags(verseKey: string, tags: string[]): void {
  if (!isBrowser()) return;
  if (!VERSE_KEY_PATTERN.test(verseKey)) return;
  const progress = getProgress();
  const map = progress.entryTags ?? {};
  const normalized = normalizeTags(tags);
  if (normalized.length === 0) {
    if (!(verseKey in map)) return;
    delete map[verseKey];
  } else {
    const isNew = !(verseKey in map);
    if (isNew && Object.keys(map).length >= MAX_TAG_ENTRIES) return;
    map[verseKey] = normalized;
  }
  progress.entryTags = map;
  setProgress(progress);
}

// Per-session peek/hint state funnel. The map lives on the consolidated progress
// model (field `sessionPeekUsed`, not an ad-hoc key) so export / import / reset
// cover it; the default-{} in DEFAULT_PROGRESS makes resetProgress clear it while
// keeping the peekBudget setting. All three helpers write through setProgress, so
// the change bus fires and every mounted consumer re-reads. Lossless migration: a
// store written before this field reads back as {} (the field is `?? {}`).
export function getSessionPeeks(): Record<string, number> {
  return getProgress().sessionPeekUsed ?? {};
}

// Record one peek/hint for a verse this session, through the change bus. A
// tampered verseKey is rejected. A brand-new key past MAX_PEEK_ENTRIES is a no-op
// (mirrors setVerseNote's cap-on-new); an existing key's count increments, clamped
// at MAX_PEEK_PER_VERSE.
export function recordPeek(verseKey: string): void {
  if (!isBrowser()) return;
  if (!VERSE_KEY_PATTERN.test(verseKey)) return;
  const progress = getProgress();
  const map = progress.sessionPeekUsed ?? {};
  const isNew = !(verseKey in map);
  if (isNew && Object.keys(map).length >= MAX_PEEK_ENTRIES) return;
  map[verseKey] = Math.min((map[verseKey] ?? 0) + 1, MAX_PEEK_PER_VERSE);
  progress.sessionPeekUsed = map;
  setProgress(progress);
}

// Clear the per-session peek map (the review's finish transition calls this;
// resetProgress also clears it via the default clone). Early-returns when the map
// is already empty, so a change-bus re-entry on the finished transition cannot
// loop (Pitfall 4) and a redundant reset is a no-op.
export function resetSessionPeeks(): void {
  if (!isBrowser()) return;
  if (Object.keys(getSessionPeeks()).length === 0) return;
  const progress = getProgress();
  progress.sessionPeekUsed = {};
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
  // Count a real ADD toward today's journal `memorized` tally (EXAM-03), never an
  // unmark, folded into this same single write + emit.
  if (nowMemorized) {
    bumpJournalEntry(progress, new Date().toLocaleDateString("en-CA"), { memorized: 1 });
  }
  setProgress(progress);
  return nowMemorized;
}

// Batched mark/unmark over a list of verseKeys: one read, one Set mutation
// across the whole list, one write (so the change bus fires exactly once
// regardless of list length, a whole surah is one write, not 286). Set
// semantics give union for mark (overlapping marks never double count) and
// difference for unmark. The 6236 cap is checked inside the loop and invalid
// keys are skipped. Returns the new memorized count so the caller can update
// without re-reading. Mirrors toggleMemorizedVerse; the single-verse helper
// stays for per-verse toggles.
export function setMemorizedVerses(verseKeys: string[], memorize: boolean): number {
  if (!isBrowser()) return 0;
  const progress = getProgress();
  const set = new Set(progress.memorizedVerses);
  const beforeSize = set.size;
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
  // On the mark path only, count the net-added verses toward today's journal
  // `memorized` tally (EXAM-03): re-marking an already-memorized verse adds 0, and
  // the unmark path never touches the journal. Folded into this same single write.
  if (memorize) {
    const netAdded = progress.memorizedVerses.length - beforeSize;
    if (netAdded > 0) {
      bumpJournalEntry(progress, new Date().toLocaleDateString("en-CA"), { memorized: netAdded });
    }
  }
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

// The memorization REVISION streak roller (STAT-03). A structural mirror of
// updateStreak, but over `memorizationStreak` / `lastRevisionDate` — it NEVER
// reads or writes `progress.streaks`, so grading a recall and finishing a
// practice quiz keep two independent streaks. Idempotent per local day: the
// first grade of the day advances the streak, later grades are no-ops. Day
// boundary is the app-wide toLocaleDateString("en-CA"), so it rolls over
// correctly across day and timezone boundaries. `now` is injected so tests
// control the clock (the caller in recordReview uses the default new Date()).
export function updateMemorizationStreak(now: Date = new Date()): void {
  if (!isBrowser()) return;
  const progress = getProgress();
  const today = now.toLocaleDateString("en-CA");
  const streak = progress.memorizationStreak ?? { currentStreak: 0, longestStreak: 0, lastRevisionDate: "" };

  if (streak.lastRevisionDate === today) return;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("en-CA");

  if (streak.lastRevisionDate === yesterdayStr) {
    streak.currentStreak += 1;
  } else {
    streak.currentStreak = 1;
  }

  if (streak.currentStreak > streak.longestStreak) {
    streak.longestStreak = streak.currentStreak;
  }

  streak.lastRevisionDate = today;
  progress.memorizationStreak = streak;
  setProgress(progress);
}

// Log tikrar (repetition) reps for a verse (EXAM-01), ADDING to the cumulative
// running total and stamping today's en-CA date. The per-call reps is clamped to
// [0, MAX_TIKRAR_PER_CALL] and a call that rounds to 0 is a no-op. A brand-new
// verseKey once the map is already at MAX_MEMORIZED is a no-op (mirrors
// setVerseNote's cap-on-new); an existing entry always accumulates. One write,
// one emit. This is the ONLY place reps accumulate; the total persists and grows
// across days and it never reads or writes the SM-2 memorizationReviews schedule.
export function logTikrarReps(verseKey: string, reps: number): void {
  if (!isBrowser()) return;
  if (!VERSE_KEY_PATTERN.test(verseKey)) return;
  const addedReps = Math.round(clampNumber(reps, 0, 0, MAX_TIKRAR_PER_CALL));
  if (addedReps === 0) return;
  const progress = getProgress();
  const map = progress.tikrarLog ?? {};
  const isNew = !(verseKey in map);
  if (isNew && Object.keys(map).length >= MAX_MEMORIZED) return;
  const prev = map[verseKey] ?? { reps: 0, lastRepDate: "" };
  const today = new Date().toLocaleDateString("en-CA");
  map[verseKey] = { reps: Math.min(prev.reps + addedReps, 100000), lastRepDate: today };
  progress.tikrarLog = map;
  setProgress(progress);
}

// Log one timed no-peek exam attempt (EXAM-02). The new entry is PREPENDED so the
// log stays most-recent-first, then trimmed to MAX_EXAM_LOG (the oldest attempt
// ages off the tail). scope is trimmed and <=80 chars; dateIso is today's en-CA
// date; percent is rounded and clamped to [0,100]; total is clamped to [0,6236].
// One write, one emit. A measurement only — it never touches the SM-2
// memorizationReviews schedule or the revision streak.
export function logExamResult({ scope, percent, total }: { scope: string; percent: number; total: number }): void {
  if (!isBrowser()) return;
  const today = new Date().toLocaleDateString("en-CA");
  const newEntry = {
    scope: String(scope).trim().slice(0, 80),
    dateIso: today,
    percent: Math.round(clampNumber(percent, 0, 0, 100)),
    total: pickNumber(total, 0, 0, 6236),
  };
  const progress = getProgress();
  progress.examLog = [newEntry, ...(progress.examLog ?? [])].slice(0, MAX_EXAM_LOG);
  setProgress(progress);
}

// Read-or-create a day's journal entry (all-zero default, honoring the
// MAX_JOURNAL_DAYS cap-on-new for a brand-new day) and apply a partial: the two
// goal fields are SET (the UI overwrites them), the two tally fields are ADDED
// (memorize/revise activity accumulates). Writes back onto progress.sessionJournal
// WITHOUT calling setProgress, so a caller can fold this bump into its own single
// write + emit (mirrors setLastRead mutating two sub-objects before one write).
// Private: every exported journal helper and the memorize-add tally route through
// it so a day's shape and the cap are enforced in exactly one place.
function bumpJournalEntry(
  progress: TajweedProgress,
  dateIso: string,
  patch: { memorizeGoal?: number; reviseGoal?: number; memorized?: number; revised?: number },
): void {
  const map = progress.sessionJournal ?? {};
  const isNew = !(dateIso in map);
  if (isNew && Object.keys(map).length >= MAX_JOURNAL_DAYS) return;
  const prev = map[dateIso] ?? { memorizeGoal: 0, reviseGoal: 0, memorized: 0, revised: 0 };
  map[dateIso] = {
    memorizeGoal: patch.memorizeGoal ?? prev.memorizeGoal,
    reviseGoal: patch.reviseGoal ?? prev.reviseGoal,
    memorized: prev.memorized + (patch.memorized ?? 0),
    revised: prev.revised + (patch.revised ?? 0),
  };
  progress.sessionJournal = map;
}

// Set (upsert) a day's memorize/revise goals (EXAM-03). Goals are SET, not added
// (a second call overwrites), rounded and clamped to [0, 100000]. A tampered /
// non-ISO dateIso is rejected. One write, one emit. Never SM-2.
export function setJournalGoals(
  dateIso: string,
  { memorizeGoal, reviseGoal }: { memorizeGoal: number; reviseGoal: number },
): void {
  if (!isBrowser()) return;
  if (!isValidIsoDate(dateIso)) return;
  const progress = getProgress();
  bumpJournalEntry(progress, dateIso, {
    memorizeGoal: Math.round(clampNumber(memorizeGoal, 0, 0, 100000)),
    reviseGoal: Math.round(clampNumber(reviseGoal, 0, 0, 100000)),
  });
  setProgress(progress);
}

// Increment today's `revised` tally by one (one recall grade). `now` is injected
// so tests control the clock; the day boundary is the app-wide en-CA local date.
// One write, one emit. Never SM-2.
export function recordJournalRevision(now: Date = new Date()): void {
  if (!isBrowser()) return;
  const progress = getProgress();
  const today = now.toLocaleDateString("en-CA");
  bumpJournalEntry(progress, today, { revised: 1 });
  setProgress(progress);
}

// Add `n` newly memorized verses to today's `memorized` tally. `n` is floored at 0
// and rounded to a whole verse count. `now` is injected so tests control the clock;
// the day boundary is the app-wide en-CA local date. One write, one emit. Never
// SM-2. (The storage memorize-ADD path bumps the tally directly; this is the
// explicit entry point for callers that count adds themselves.)
export function recordJournalMemorization(n: number, now: Date = new Date()): void {
  if (!isBrowser()) return;
  const progress = getProgress();
  const today = now.toLocaleDateString("en-CA");
  bumpJournalEntry(progress, today, { memorized: Math.max(0, Math.round(n)) });
  setProgress(progress);
}
