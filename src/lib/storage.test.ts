import { describe, it, expect } from "vitest";
import {
  STORAGE_KEY,
  sanitizeProgress,
  importProgress,
  exportProgress,
  getProgress,
  getSettings,
  setSettings,
  DEFAULT_SETTINGS,
  setMemorizedVerses,
  toggleMemorizedVerse,
  getVerseNote,
  setVerseNote,
  getTags,
  setTags,
  getBookmarks,
  toggleVerseBookmark,
  getLastRead,
  getLastReadForSurah,
  setLastRead,
  getOnboardingSeen,
  setOnboardingSeen,
  shouldRemindBackup,
  hasMeaningfulProgress,
  resetProgress,
  getSessionPeeks,
  recordPeek,
  resetSessionPeeks,
  getNewVersesIntroducedToday,
  recordNewVerseIntroduced,
  updateMemorizationStreak,
  logTikrarReps,
  logExamResult,
  setJournalGoals,
  recordJournalRevision,
  recordJournalMemorization,
  getMemorizationReviews,
} from "@/lib/storage";

// Behavioral coverage of the storage funnel against the REAL module under jsdom
// (storage.ts gates on `typeof window`; jsdom provides window + localStorage).
// This is the security-critical file: the sanitizer is the trust boundary for a
// tampered backup. Nothing here re-derives a sanitizer — every assertion runs
// through the shipped sanitizeProgress / helpers. The setup's afterEach clears
// localStorage between tests, so each case starts from empty progress.

// Generate n unique verse keys that all match VERSE_KEY_PATTERN (^\d{1,3}:\d{1,3}$).
// Each ayah stays <= 3 digits and the surah stays <= 3 digits well past 6236 keys.
function manyVerseKeys(n: number): string[] {
  const out: string[] = [];
  for (let s = 1; out.length < n; s++) {
    for (let a = 1; a <= 200 && out.length < n; a++) out.push(`${s}:${a}`);
  }
  return out;
}

describe("prototype-pollution-key guard (ASVS: tampered backup cannot reach Object.prototype)", () => {
  // JSON.parse materializes "__proto__" as an OWN enumerable key (it does not set
  // the prototype), so the sanitizer's per-map guard is what actually drops it.
  const tamperedRaw = `{
    "reviews": {
      "__proto__": { "polluted": true },
      "1:1": { "box": 2, "nextDueDate": "", "lastSeenDate": "", "timesSeen": 0, "timesCorrect": 0 }
    },
    "memorizationReviews": {
      "constructor": { "box": 5 },
      "2:255": { "box": 3, "nextDueDate": "", "lastSeenDate": "", "timesSeen": 0, "timesCorrect": 0 }
    },
    "modules": {
      "prototype": { "lessonsCompleted": [], "quizScores": [], "lastAccessed": "" },
      "makharij": { "lessonsCompleted": ["m1"], "quizScores": [], "lastAccessed": "" }
    },
    "readSections": {
      "__proto__": ["evil"],
      "makharij": ["intro"]
    },
    "verseNotes": {
      "__proto__": "polluted",
      "2:255": "a real note"
    },
    "entryTags": {
      "__proto__": ["evil"],
      "2:1": ["tag"]
    },
    "lastReadBySurah": {
      "__proto__": { "verseKey": "1:1", "page": 1 },
      "2": { "verseKey": "2:255", "page": 3 }
    }
  }`;

  it("importing a tampered backup drops the dangerous keys and never pollutes Object.prototype", () => {
    expect(importProgress(tamperedRaw)).toBe(true);

    // Object.prototype stayed clean after the import.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();

    const p = getProgress();
    const maps: Record<string, unknown>[] = [
      p.reviews,
      p.memorizationReviews,
      p.modules,
      p.readSections,
      p.verseNotes,
      p.entryTags ?? {},
      (p.lastReadBySurah ?? {}) as unknown as Record<string, unknown>,
    ];
    for (const map of maps) {
      // Each sanitized map is a plain object with an untouched prototype and none
      // of the dangerous keys present as own keys.
      expect(Object.getPrototypeOf(map)).toBe(Object.prototype);
      expect(Object.keys(map)).not.toContain("__proto__");
      expect(Object.keys(map)).not.toContain("constructor");
      expect(Object.keys(map)).not.toContain("prototype");
    }

    // The legitimate entries alongside the dangerous keys survive.
    expect(Object.keys(p.reviews)).toEqual(["1:1"]);
    expect(Object.keys(p.memorizationReviews)).toEqual(["2:255"]);
    // The surviving memorizationReviews entry migrated from its box-3 Leitner
    // shape to an SM-2 state (box 3 -> repetitions 3, intervalDays 7, EF 2.5).
    expect(p.memorizationReviews["2:255"]).toMatchObject({ repetitions: 3, easeFactor: 2.5, intervalDays: 7 });
    expect(Object.keys(p.modules)).toEqual(["makharij"]);
    expect(p.readSections["makharij"]).toEqual(["intro"]);
    expect(p.verseNotes["2:255"]).toBe("a real note");
    expect(p.entryTags?.["2:1"]).toEqual(["tag"]);
    expect(p.lastReadBySurah?.[2]).toMatchObject({ verseKey: "2:255", page: 3 });
  });
});

describe("memorizationReviews: lossless Leitner -> SM-2 migration (SCHED-02)", () => {
  // The migration map from the RESEARCH proof table: box N -> intervalDays.
  const LEITNER: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

  it("migrates each box 1..5 to the exact SM-2 map, preserving nextDueDate / lastSeenDate / counts", () => {
    for (let box = 1; box <= 5; box++) {
      const state = sanitizeProgress({
        memorizationReviews: {
          "2:255": {
            box,
            nextDueDate: "2026-09-01",
            lastSeenDate: "2026-06-01",
            timesSeen: 8,
            timesCorrect: 7,
          },
        },
      }).memorizationReviews["2:255"];
      expect(state).toEqual({
        repetitions: box,
        easeFactor: 2.5,
        intervalDays: LEITNER[box],
        nextDueDate: "2026-09-01", // copied verbatim (migration never changes when a verse is next due)
        lastReviewedDate: "2026-06-01", // old lastSeenDate carried over
        timesSeen: 8,
        timesCorrect: 7,
        lapses: 0,
      });
    }
  });

  it("is idempotent: re-sanitizing a migrated entry is deep-equal", () => {
    const once = sanitizeProgress({
      memorizationReviews: {
        "2:255": { box: 3, nextDueDate: "2026-09-01", lastSeenDate: "2026-06-01", timesSeen: 4, timesCorrect: 3 },
      },
    }).memorizationReviews;
    const twice = sanitizeProgress({ memorizationReviews: once }).memorizationReviews;
    expect(twice).toEqual(once);
  });

  it("a box-5 entry keeps its nextDueDate and does not regress to a box-1 interval", () => {
    const state = sanitizeProgress({
      memorizationReviews: {
        "2:255": { box: 5, nextDueDate: "2026-09-01", lastSeenDate: "2026-06-01", timesSeen: 8, timesCorrect: 8 },
      },
    }).memorizationReviews["2:255"];
    expect(state.nextDueDate).toBe("2026-09-01"); // verbatim, not recomputed
    expect(state.intervalDays).toBe(30); // not 1 -> no regression on a pass
    expect(state.repetitions).toBe(5);
  });

  it("an already-SM-2 entry passes through bounded and unchanged", () => {
    const entry = {
      repetitions: 5,
      easeFactor: 2.5,
      intervalDays: 30,
      nextDueDate: "2026-09-01",
      lastReviewedDate: "2026-06-01",
      timesSeen: 8,
      timesCorrect: 7,
      lapses: 0,
    };
    expect(sanitizeProgress({ memorizationReviews: { "2:255": entry } }).memorizationReviews["2:255"]).toEqual(entry);
  });

  it("clamps a tampered SM-2 entry to its bounds (does not reject wholesale)", () => {
    const state = sanitizeProgress({
      memorizationReviews: {
        "2:255": {
          easeFactor: 1e9,
          intervalDays: 1e9,
          repetitions: -5,
          timesSeen: 3,
          timesCorrect: 2,
          lapses: 0,
          nextDueDate: "",
          lastReviewedDate: "",
        },
      },
    }).memorizationReviews["2:255"];
    expect(state.easeFactor).toBe(5.0); // clamped to MAX_EF, not the 2.5 fallback
    expect(state.intervalDays).toBe(36500); // clamped to MAX_INTERVAL, not the 1 fallback
    expect(state.repetitions).toBe(0); // clamped up from -5
  });

  it("a tampered entry with BOTH easeFactor and box takes the SM-2 branch", () => {
    const state = sanitizeProgress({
      memorizationReviews: {
        "2:255": { easeFactor: 2.0, intervalDays: 12, box: 1 },
      },
    }).memorizationReviews["2:255"];
    expect(state.easeFactor).toBe(2.0); // SM-2 branch, not migrated from box 1
    expect(state.intervalDays).toBe(12); // not the box-1 interval of 1
  });

  it("drops an entry that is neither SM-2 nor a valid box (a no-entry verse is due anyway)", () => {
    const out = sanitizeProgress({
      memorizationReviews: {
        "2:255": { box: 9, foo: "bar" }, // box out of range, no numeric easeFactor
        "3:1": { nothing: true },
      },
    }).memorizationReviews;
    expect(out).toEqual({});
  });

  it("upgrades a pre-2.2 box-based backup on importProgress", () => {
    const backup = `{
      "memorizationReviews": {
        "2:255": { "box": 4, "nextDueDate": "2026-09-01", "lastSeenDate": "2026-06-01", "timesSeen": 5, "timesCorrect": 4 }
      }
    }`;
    expect(importProgress(backup)).toBe(true);
    expect(getProgress().memorizationReviews["2:255"]).toEqual({
      repetitions: 4,
      easeFactor: 2.5,
      intervalDays: 14,
      nextDueDate: "2026-09-01",
      lastReviewedDate: "2026-06-01",
      timesSeen: 5,
      timesCorrect: 4,
      lapses: 0,
    });
  });
});

describe("seenOnboarding coercion", () => {
  it("absent -> false, non-boolean -> false, true -> true", () => {
    expect(sanitizeProgress({}).seenOnboarding).toBe(false);
    expect(sanitizeProgress({ seenOnboarding: "yes" }).seenOnboarding).toBe(false);
    expect(sanitizeProgress({ seenOnboarding: true }).seenOnboarding).toBe(true);
  });

  it("the getter reflects a persisted flag", () => {
    expect(getOnboardingSeen()).toBe(false);
    setOnboardingSeen(true);
    expect(getOnboardingSeen()).toBe(true);
  });
});

describe("verse notes: trim, cap 1000, drop empty, reject bad key/value, cap 2000", () => {
  it("trims and caps a note at 1000 chars, empty deletes, bad key is rejected", () => {
    setVerseNote("2:255", "  hello  ");
    expect(getVerseNote("2:255")).toBe("hello");

    setVerseNote("2:255", "x".repeat(2000));
    expect(getVerseNote("2:255").length).toBe(1000);

    setVerseNote("2:255", "   ");
    expect(getVerseNote("2:255")).toBe("");

    setVerseNote("bad-key", "nope");
    expect(getVerseNote("bad-key")).toBe("");
  });

  it("sanitizer drops a non-string value and caps the map at 2000 notes", () => {
    expect(sanitizeProgress({ verseNotes: { "2:255": 123 } }).verseNotes["2:255"]).toBeUndefined();

    const notes: Record<string, string> = {};
    for (const k of manyVerseKeys(2100)) notes[k] = "note";
    expect(Object.keys(sanitizeProgress({ verseNotes: notes }).verseNotes).length).toBe(2000);
  });
});

describe("entry tags: trim, case-insensitive dedupe, cap 40 chars, cap 12/entry, drop empty, cap 2000", () => {
  it("trims, dedupes case-insensitively keeping first casing, caps tag length and count", () => {
    setTags("2:1", ["  Hard  ", "hard", "HARD", "easy"]);
    expect(getTags("2:1")).toEqual(["Hard", "easy"]);

    setTags("2:1", ["y".repeat(60)]);
    expect(getTags("2:1")[0].length).toBe(40);

    setTags(
      "2:1",
      Array.from({ length: 20 }, (_, i) => `tag${i}`),
    );
    expect(getTags("2:1").length).toBe(12);

    setTags("2:1", ["   "]);
    expect(getTags("2:1")).toEqual([]);
  });

  it("sanitizer caps the map at 2000 tag entries", () => {
    const tags: Record<string, string[]> = {};
    for (const k of manyVerseKeys(2100)) tags[k] = ["t"];
    expect(Object.keys(sanitizeProgress({ entryTags: tags }).entryTags ?? {}).length).toBe(2000);
  });
});

describe("memorized verses: union / difference / skip-invalid, cap 6236", () => {
  it("setMemorizedVerses unions on mark, differences on unmark, skips invalid keys", () => {
    expect(setMemorizedVerses(["1:1", "1:2"], true)).toBe(2);
    expect(setMemorizedVerses(["1:2", "1:3"], true)).toBe(3); // union, no double-count
    expect([...getProgress().memorizedVerses].sort()).toEqual(["1:1", "1:2", "1:3"]);

    expect(setMemorizedVerses(["1:1"], false)).toBe(2); // difference
    expect(setMemorizedVerses(["bad", "1:4"], true)).toBe(3); // "bad" skipped, "1:4" added
    expect(getProgress().memorizedVerses).not.toContain("bad");
  });

  it("toggleMemorizedVerse flips one verse and returns the new state", () => {
    expect(toggleMemorizedVerse("5:5")).toBe(true);
    expect(getProgress().memorizedVerses).toContain("5:5");
    expect(toggleMemorizedVerse("5:5")).toBe(false);
    expect(getProgress().memorizedVerses).not.toContain("5:5");
  });

  it("the sanitizer caps the memorized set at 6236", () => {
    expect(sanitizeProgress({ memorizedVerses: manyVerseKeys(6300) }).memorizedVerses.length).toBe(6236);
  });
});

describe("bookmarks: dedupe, drop junk, cap 500", () => {
  it("toggle adds then removes a verse bookmark", () => {
    expect(toggleVerseBookmark("2:255")).toBe(true);
    expect(getBookmarks()).toContain("2:255");
    expect(toggleVerseBookmark("2:255")).toBe(false);
    expect(getBookmarks()).not.toContain("2:255");
  });

  it("the sanitizer dedupes, drops junk, and caps at 500", () => {
    expect(sanitizeProgress({ bookmarks: ["2:255", "2:255", "junk", "3:1"] }).bookmarks).toEqual(["2:255", "3:1"]);
    expect(sanitizeProgress({ bookmarks: manyVerseKeys(600) }).bookmarks.length).toBe(500);
  });
});

describe("per-surah lastRead: surah key bounds 1..114, page bounds, cap 114", () => {
  it("setLastRead records both the global and per-surah location", () => {
    setLastRead("2:255", 42);
    expect(getLastRead()).toMatchObject({ verseKey: "2:255", page: 42 });
    expect(getLastReadForSurah(2)).toMatchObject({ verseKey: "2:255", page: 42 });
  });

  it("an out-of-range page falls back to 1 and surah keys are bounded 1..114 (cap 114)", () => {
    expect(
      sanitizeProgress({ lastReadBySurah: { "2": { verseKey: "2:255", page: 9999 } } }).lastReadBySurah?.[2]?.page,
    ).toBe(1);

    const surahMap: Record<string, { verseKey: string; page: number }> = {};
    for (let i = 1; i <= 200; i++) surahMap[String(i)] = { verseKey: "1:1", page: 5 };
    const sanitized = sanitizeProgress({ lastReadBySurah: surahMap }).lastReadBySurah ?? {};
    expect(Object.keys(sanitized).length).toBe(114);
    expect(sanitized[115]).toBeUndefined();
    expect(sanitized[0]).toBeUndefined();
  });
});

describe("shouldRemindBackup / hasMeaningfulProgress", () => {
  const now = new Date("2026-07-01T12:00:00Z");

  it("no meaningful progress -> never reminds", () => {
    const empty = sanitizeProgress({});
    expect(hasMeaningfulProgress(empty)).toBe(false);
    expect(shouldRemindBackup(empty, now)).toBe(false);
  });

  it("a completed lesson, a memorized verse, or a bookmark all count as meaningful", () => {
    expect(
      hasMeaningfulProgress(
        sanitizeProgress({ modules: { makharij: { lessonsCompleted: ["m1"], quizScores: [], lastAccessed: "" } } }),
      ),
    ).toBe(true);
    expect(hasMeaningfulProgress(sanitizeProgress({ memorizedVerses: ["1:1"] }))).toBe(true);
    expect(hasMeaningfulProgress(sanitizeProgress({ bookmarks: ["1:1"] }))).toBe(true);
  });

  it("reminds with progress and no/stale/unparseable backup, stays quiet on a fresh one", () => {
    const p = sanitizeProgress({ memorizedVerses: ["1:1"] });

    p.lastBackupAt = "";
    expect(shouldRemindBackup(p, now)).toBe(true); // never backed up

    p.lastBackupAt = new Date("2026-07-01T00:00:00Z").toISOString();
    expect(shouldRemindBackup(p, now)).toBe(false); // fresh (same day)

    p.lastBackupAt = new Date("2026-05-01T00:00:00Z").toISOString();
    expect(shouldRemindBackup(p, now)).toBe(true); // > 30 days

    p.lastBackupAt = "not-a-date";
    expect(shouldRemindBackup(p, now)).toBe(true); // unparseable
  });
});

describe("reviewIntervalModifier setting: default 1.0, clamp [0.5, 2.0] (SCHED-04)", () => {
  // Exercised through the real sanitizeProgress -> sanitizeSettings so no new
  // export is added; sanitizeSettings itself stays module-private.
  const mod = (v: unknown) => sanitizeProgress({ settings: { reviewIntervalModifier: v } }).settings.reviewIntervalModifier;

  it("defaults to 1.0 (canonical default and absent value)", () => {
    expect(DEFAULT_SETTINGS.reviewIntervalModifier).toBe(1.0);
    expect(sanitizeProgress({}).settings.reviewIntervalModifier).toBe(1.0);
    expect(mod(undefined)).toBe(1.0);
  });

  it("clamps low/high, keeps an in-band value, defaults a non-number / NaN to 1.0", () => {
    expect(mod(0.1)).toBe(0.5); // clamp low to the band floor
    expect(mod(5)).toBe(2.0); // clamp high to the band ceiling
    expect(mod(1.5)).toBe(1.5); // in-band value kept as-is
    expect(mod("x")).toBe(1.0); // non-number -> 1.0
    expect(mod(Number.NaN)).toBe(1.0); // NaN -> 1.0
  });

  it("round-trips a non-default modifier through export/import", () => {
    setSettings({ ...getSettings(), reviewIntervalModifier: 1.5 });
    const snapshot = exportProgress();
    localStorage.clear();
    expect(importProgress(snapshot)).toBe(true);
    expect(getSettings().reviewIntervalModifier).toBe(1.5);
  });

  it("survives resetProgress (it is a preference, kept like reciter / theme)", () => {
    setSettings({ ...getSettings(), reviewIntervalModifier: 0.5 });
    resetProgress();
    expect(getSettings().reviewIntervalModifier).toBe(0.5);
  });
});

describe("diacriticInsensitive setting: default false, boolean coercion (TYPE-02)", () => {
  // Exercised through the REAL sanitizeProgress -> sanitizeSettings so no new
  // export is added; sanitizeSettings itself stays module-private. Byte-for-byte
  // the showTransliteration / showWordByWord boolean-coercion precedent.
  const di = (v: unknown) => sanitizeProgress({ settings: { diacriticInsensitive: v } }).settings.diacriticInsensitive;

  it("defaults to false (canonical default and absent value = exact match per TYPE-01)", () => {
    expect(DEFAULT_SETTINGS.diacriticInsensitive).toBe(false);
    expect(sanitizeProgress({}).settings.diacriticInsensitive).toBe(false);
    expect(di(undefined)).toBe(false);
  });

  it("coerces a non-boolean to false and passes a real boolean through", () => {
    expect(di("yes")).toBe(false); // string -> false
    expect(di(1)).toBe(false); // number -> false
    expect(di(null)).toBe(false); // null -> false
    expect(di(true)).toBe(true); // real boolean kept
    expect(di(false)).toBe(false); // real boolean kept
  });

  it("round-trips a true value through export/import", () => {
    setSettings({ ...getSettings(), diacriticInsensitive: true });
    const snapshot = exportProgress();
    localStorage.clear();
    expect(importProgress(snapshot)).toBe(true);
    expect(getSettings().diacriticInsensitive).toBe(true);
  });

  it("survives resetProgress (it is a preference, kept like reciter / theme / reviewIntervalModifier)", () => {
    // resetProgress clears learner data but keeps settings, so a toggled value is
    // retained across a reset; a fresh store defaults it to false (asserted above).
    setSettings({ ...getSettings(), diacriticInsensitive: true });
    resetProgress();
    expect(getSettings().diacriticInsensitive).toBe(true);
  });
});

describe("sessionPeekUsed + peekBudget (BLIND-03/BLIND-04)", () => {
  // Exercised through the REAL sanitizeProgress -> sanitizeSessionPeeks /
  // sanitizeSettings and the shipped helpers; nothing here re-derives a sanitizer.
  const peeks = (v: unknown) => sanitizeProgress({ sessionPeekUsed: v }).sessionPeekUsed ?? {};
  const budget = (v: unknown) => sanitizeProgress({ settings: { peekBudget: v } }).settings.peekBudget;

  it("importing a tampered peek map drops the dangerous keys and never pollutes Object.prototype", () => {
    // JSON.parse materializes "__proto__" as an OWN enumerable key (it does not
    // set the prototype), so the sanitizer's per-map guard is what drops it.
    const tampered = `{
      "sessionPeekUsed": {
        "__proto__": { "polluted": true },
        "constructor": 5,
        "prototype": 3,
        "2:255": 1
      }
    }`;
    expect(importProgress(tampered)).toBe(true);

    // Object.prototype stayed clean after the import.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();

    const map = getSessionPeeks();
    expect(Object.getPrototypeOf(map)).toBe(Object.prototype);
    expect(Object.keys(map)).not.toContain("__proto__");
    expect(Object.keys(map)).not.toContain("constructor");
    expect(Object.keys(map)).not.toContain("prototype");
    // The one legitimate entry alongside the dangerous keys survives.
    expect(map).toEqual({ "2:255": 1 });
  });

  it("rejects a malformed verseKey, keeps a valid one", () => {
    expect(peeks({ "1:2:3": 2, "x:y": 1, "2:255": 1 })).toEqual({ "2:255": 1 });
  });

  it("drops a count < 1 (0 / negative / non-number / NaN), clamps a high count to 99, keeps an in-band count", () => {
    expect(peeks({ "1:1": 0, "1:2": -4, "1:3": "x", "1:4": Number.NaN })).toEqual({});
    expect(peeks({ "1:5": 500 })).toEqual({ "1:5": 99 }); // clamped to MAX_PEEK_PER_VERSE
    expect(peeks({ "1:6": 2 })).toEqual({ "1:6": 2 }); // in-band count kept
  });

  it("caps the map at 500 entries", () => {
    const map: Record<string, number> = {};
    for (const k of manyVerseKeys(600)) map[k] = 1;
    expect(Object.keys(peeks(map)).length).toBe(500);
  });

  it("peekBudget defaults to 3 and clamps to [1, 10]", () => {
    expect(DEFAULT_SETTINGS.peekBudget).toBe(3);
    expect(sanitizeProgress({}).settings.peekBudget).toBe(3); // absent
    expect(budget(undefined)).toBe(3);
    expect(budget(0)).toBe(1); // clamp low to the band floor
    expect(budget(99)).toBe(10); // clamp high to the band ceiling
    expect(budget(5)).toBe(5); // in-band value kept
    expect(budget("x")).toBe(3); // non-number -> 3
    expect(budget(Number.NaN)).toBe(3); // NaN -> 3
  });

  it("recordPeek increments a verse's count and rejects a bad verseKey", () => {
    recordPeek("1:1");
    recordPeek("1:1");
    expect(getSessionPeeks()["1:1"]).toBe(2);
    recordPeek("bad-key");
    expect(getSessionPeeks()["bad-key"]).toBeUndefined();
  });

  it("resetSessionPeeks clears the map and no-ops when already empty", () => {
    recordPeek("1:1");
    expect(Object.keys(getSessionPeeks()).length).toBe(1);
    resetSessionPeeks();
    expect(getSessionPeeks()).toEqual({});
    // A second reset on an already-empty map is a no-op (does not throw).
    expect(() => resetSessionPeeks()).not.toThrow();
    expect(getSessionPeeks()).toEqual({});
  });

  it("sessionPeekUsed survives an export -> clear -> import round-trip (BLIND-04 persistence)", () => {
    recordPeek("1:1");
    recordPeek("1:2");
    setSettings({ ...getSettings(), peekBudget: 7 });

    const snapshot = exportProgress();
    localStorage.clear();
    expect(importProgress(snapshot)).toBe(true);

    expect(getSessionPeeks()).toEqual({ "1:1": 1, "1:2": 1 });
    expect(getSettings().peekBudget).toBe(7); // the setting round-trips too
  });

  it("resetProgress clears sessionPeekUsed but keeps peekBudget (it is a preference)", () => {
    recordPeek("1:1");
    setSettings({ ...getSettings(), peekBudget: 5 });

    resetProgress();

    expect(getSessionPeeks()).toEqual({}); // cleared with the rest of the learner data
    expect(getSettings().peekBudget).toBe(5); // kept, like reciter / theme / reviewIntervalModifier
  });
});

describe("newVerseCap setting: default 5, clamp [1, 10], round (REV-01)", () => {
  // Exercised through the REAL sanitizeProgress -> sanitizeSettings (no new
  // export). Byte-for-byte the peekBudget clamp precedent, only the band anchor
  // differs (default 5 instead of 3).
  const cap = (v: unknown) => sanitizeProgress({ settings: { newVerseCap: v } }).settings.newVerseCap;

  it("defaults to 5 (canonical default and absent value)", () => {
    expect(DEFAULT_SETTINGS.newVerseCap).toBe(5);
    expect(sanitizeProgress({}).settings.newVerseCap).toBe(5);
    expect(cap(undefined)).toBe(5);
  });

  it("clamps low/high, rounds, keeps an in-band value, defaults a non-number", () => {
    expect(cap(0)).toBe(1); // clamp low to the band floor
    expect(cap(999)).toBe(10); // clamp high to the band ceiling
    expect(cap(7)).toBe(7); // in-band value kept
    expect(cap(7.6)).toBe(8); // Math.round (a cap is a whole verse count)
    expect(cap("x")).toBe(5); // non-number -> 5
  });
});

describe("revisionRemindersEnabled setting: default false, boolean coercion (REV-04)", () => {
  // Exercised through the REAL sanitizeProgress -> sanitizeSettings (no new
  // export). Byte-for-byte the showWordByWord / diacriticInsensitive boolean
  // coercion precedent.
  const rre = (v: unknown) =>
    sanitizeProgress({ settings: { revisionRemindersEnabled: v } }).settings.revisionRemindersEnabled;

  it("defaults to false (canonical default and absent value)", () => {
    expect(DEFAULT_SETTINGS.revisionRemindersEnabled).toBe(false);
    expect(sanitizeProgress({}).settings.revisionRemindersEnabled).toBe(false);
    expect(rre(undefined)).toBe(false);
  });

  it("coerces a non-boolean to false and passes a real boolean through", () => {
    expect(rre("yes")).toBe(false); // string -> false
    expect(rre(1)).toBe(false); // number -> false
    expect(rre(null)).toBe(false); // null -> false
    expect(rre(true)).toBe(true); // real boolean kept
    expect(rre(false)).toBe(false); // real boolean kept
  });

  it("a true value survives an export -> clear -> import round-trip", () => {
    setSettings({ ...getSettings(), revisionRemindersEnabled: true });
    const snapshot = exportProgress();
    localStorage.clear();
    expect(importProgress(snapshot)).toBe(true);
    expect(getSettings().revisionRemindersEnabled).toBe(true);
  });

  it("survives resetProgress (it is a preference, kept like reciter / theme)", () => {
    // resetProgress clears learner data but keeps settings, so a toggled value is
    // retained across a reset; a fresh store defaults it to false (asserted above).
    setSettings({ ...getSettings(), revisionRemindersEnabled: true });
    resetProgress();
    expect(getSettings().revisionRemindersEnabled).toBe(true);
  });
});

describe("revisionReciter setting: optional, coerced like reciter, falls back to browse (PROG-02)", () => {
  // Exercised through the REAL sanitizeProgress -> sanitizeSettings (no new
  // export). Coerced like `reciter` (normalize / migrate legacy) EXCEPT that an
  // unset or invalid value stays undefined so resolveRevisionReciter falls back
  // to the browse reciter, rather than becoming DEFAULT_RECITER_ID.
  const rr = (v: unknown) => sanitizeProgress({ settings: { revisionReciter: v } }).settings.revisionReciter;

  it("is undefined by default (canonical default and absent value)", () => {
    expect(DEFAULT_SETTINGS.revisionReciter).toBeUndefined();
    expect(sanitizeProgress({}).settings.revisionReciter).toBeUndefined();
    expect(rr(undefined)).toBeUndefined();
  });

  it("keeps a known reciter id and migrates a legacy alias", () => {
    expect(rr("7")).toBe("7"); // known Quran.com id kept
    expect(rr("ea-ghamdi")).toBe("ea-ghamdi"); // known EveryAyah id kept
    expect(rr("ar.alafasy")).toBe("7"); // legacy alias normalized
  });

  it("drops any invalid value to undefined so it falls back to browse (not the default)", () => {
    expect(rr("nope")).toBeUndefined(); // unknown string -> undefined (NOT "12")
    expect(rr(5)).toBeUndefined(); // number -> undefined
    expect(rr(null)).toBeUndefined(); // null -> undefined
  });

  it("a valid value survives an export -> clear -> import round-trip", () => {
    setSettings({ ...getSettings(), revisionReciter: "7" });
    const snapshot = exportProgress();
    localStorage.clear();
    expect(importProgress(snapshot)).toBe(true);
    expect(getSettings().revisionReciter).toBe("7");
  });

  it("survives resetProgress (it is a preference, kept like reciter / theme)", () => {
    setSettings({ ...getSettings(), revisionReciter: "7" });
    resetProgress();
    expect(getSettings().revisionReciter).toBe("7");
  });
});

describe("dailyNewVersesTracking: fixed-shape sanitizer, default { date: '', count: 0 } (REV-01)", () => {
  // Exercised through the REAL sanitizeProgress -> sanitizeDailyNewVerses. This is
  // a fixed-shape object (not a keyed map), so there is no prototype-key vector to
  // test — only the shape / clamp / date-length bounds.
  const dnv = (v: unknown) => sanitizeProgress({ dailyNewVersesTracking: v }).dailyNewVersesTracking;

  it("defaults to { date: '', count: 0 } for a fresh or non-object store", () => {
    expect(sanitizeProgress({}).dailyNewVersesTracking).toEqual({ date: "", count: 0 });
    expect(dnv(undefined)).toEqual({ date: "", count: 0 });
    expect(dnv("nope")).toEqual({ date: "", count: 0 });
    expect(dnv(123)).toEqual({ date: "", count: 0 });
  });

  it("passes a valid { date, count } through unchanged", () => {
    expect(dnv({ date: "2026-07-02", count: 3 })).toEqual({ date: "2026-07-02", count: 3 });
  });

  it("clamps count to [0, 100000] and rejects a date longer than 10 chars", () => {
    expect(dnv({ date: "2026-07-02", count: -4 })).toEqual({ date: "2026-07-02", count: 0 }); // negative -> 0
    expect(dnv({ date: "2026-07-02", count: 1e9 })).toEqual({ date: "2026-07-02", count: 0 }); // huge -> 0 (pickNumber reject)
    expect(dnv({ date: "2026-07-02T00:00:00Z", count: 2 })).toEqual({ date: "", count: 2 }); // > 10 chars -> ""
    expect(dnv({ date: 5, count: 2 })).toEqual({ date: "", count: 2 }); // non-string date -> ""
  });
});

describe("getNewVersesIntroducedToday: same-day count, stale -> 0 with NO write (REV-01)", () => {
  it("returns the stored count when the stored day is today", () => {
    const now = new Date("2026-07-02T09:00:00");
    const today = now.toLocaleDateString("en-CA");
    expect(importProgress(JSON.stringify({ dailyNewVersesTracking: { date: today, count: 4 } }))).toBe(true);
    expect(getNewVersesIntroducedToday(now)).toBe(4);
  });

  it("returns 0 for a stale stored day and does NOT write (localStorage byte-identical across the call)", () => {
    const now = new Date("2026-07-02T09:00:00");
    expect(importProgress(JSON.stringify({ dailyNewVersesTracking: { date: "2020-01-01", count: 9 } }))).toBe(true);
    const before = localStorage.getItem(STORAGE_KEY);
    expect(getNewVersesIntroducedToday(now)).toBe(0);
    const after = localStorage.getItem(STORAGE_KEY);
    // The read is side-effect-free: a stale day returns 0 without rewriting the store.
    expect(after).toBe(before);
  });
});

describe("recordNewVerseIntroduced: increments same-day, rolls the day (REV-01)", () => {
  it("from an empty store sets { date: today, count: 1 }", () => {
    const now = new Date("2026-07-02T09:00:00");
    const today = now.toLocaleDateString("en-CA");
    recordNewVerseIntroduced(now);
    expect(getProgress().dailyNewVersesTracking).toEqual({ date: today, count: 1 });
  });

  it("a same-day second call increments to 2", () => {
    const now = new Date("2026-07-02T09:00:00");
    const today = now.toLocaleDateString("en-CA");
    recordNewVerseIntroduced(now);
    recordNewVerseIntroduced(now);
    expect(getProgress().dailyNewVersesTracking).toEqual({ date: today, count: 2 });
    expect(getNewVersesIntroducedToday(now)).toBe(2);
  });

  it("a stale stored day rolls to { date: today, count: 1 }", () => {
    expect(importProgress(JSON.stringify({ dailyNewVersesTracking: { date: "2020-01-01", count: 9 } }))).toBe(true);
    const now = new Date("2026-07-02T09:00:00");
    const today = now.toLocaleDateString("en-CA");
    recordNewVerseIntroduced(now);
    expect(getProgress().dailyNewVersesTracking).toEqual({ date: today, count: 1 });
  });
});

describe("dailyNewVersesTracking persistence: export/import round-trip + reset (REV-01)", () => {
  it("round-trips through export -> clear -> import", () => {
    const now = new Date("2026-07-02T09:00:00");
    const today = now.toLocaleDateString("en-CA");
    recordNewVerseIntroduced(now);
    recordNewVerseIntroduced(now);
    const snapshot = exportProgress();
    localStorage.clear();
    expect(importProgress(snapshot)).toBe(true);
    expect(getProgress().dailyNewVersesTracking).toEqual({ date: today, count: 2 });
  });

  it("resetProgress clears it to the { date: '', count: 0 } default (it is learner data, not a setting)", () => {
    const now = new Date("2026-07-02T09:00:00");
    recordNewVerseIntroduced(now);
    resetProgress();
    expect(getProgress().dailyNewVersesTracking).toEqual({ date: "", count: 0 });
  });
});

describe("memorizationStreak: fixed-shape sanitizer, default { currentStreak: 0, longestStreak: 0, lastRevisionDate: '' } (STAT-03)", () => {
  // Exercised through the REAL sanitizeProgress -> sanitizeMemorizationStreak. Like
  // dailyNewVersesTracking this is a fixed-shape object (not a keyed map), so there
  // is no prototype-key vector to test — only the shape / clamp / date-length
  // bounds. It mirrors the practice `streaks` sanitizer but on a SEPARATE field.
  const mem = (v: unknown) => sanitizeProgress({ memorizationStreak: v }).memorizationStreak;
  const DEFAULT = { currentStreak: 0, longestStreak: 0, lastRevisionDate: "" };

  it("defaults for a fresh or non-object store", () => {
    expect(sanitizeProgress({}).memorizationStreak).toEqual(DEFAULT);
    expect(mem(undefined)).toEqual(DEFAULT);
    expect(mem("nope")).toEqual(DEFAULT);
    expect(mem(123)).toEqual(DEFAULT);
  });

  it("passes a valid streak through unchanged", () => {
    expect(mem({ currentStreak: 3, longestStreak: 5, lastRevisionDate: "2026-07-02" })).toEqual({
      currentStreak: 3,
      longestStreak: 5,
      lastRevisionDate: "2026-07-02",
    });
  });

  it("clamps the counters to [0, 100000] and bounds the date string", () => {
    // huge / negative counters -> 0 (pickNumber rejects out-of-band to the fallback)
    expect(mem({ currentStreak: 1e9, longestStreak: 2, lastRevisionDate: "2026-07-02" })).toEqual({
      currentStreak: 0,
      longestStreak: 2,
      lastRevisionDate: "2026-07-02",
    });
    expect(mem({ currentStreak: -4, longestStreak: 2, lastRevisionDate: "2026-07-02" })).toEqual({
      currentStreak: 0,
      longestStreak: 2,
      lastRevisionDate: "2026-07-02",
    });
    // a date longer than 10 chars, or a non-string date, both read back as ""
    expect(mem({ currentStreak: 1, longestStreak: 1, lastRevisionDate: "2026-07-02T00:00:00Z" })).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastRevisionDate: "",
    });
    expect(mem({ currentStreak: 1, longestStreak: 1, lastRevisionDate: 5 })).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastRevisionDate: "",
    });
  });
});

describe("updateMemorizationStreak: day/timezone rollover, longest tracked (STAT-03)", () => {
  // Compute the expected today/yesterday strings from the SAME injected `now` via
  // toLocaleDateString("en-CA") so the assertions match the app clock in any TZ.
  it("from a fresh store sets currentStreak 1 / longestStreak 1 / lastRevisionDate today", () => {
    const now = new Date("2026-07-02T09:00:00");
    const today = now.toLocaleDateString("en-CA");
    updateMemorizationStreak(now);
    expect(getProgress().memorizationStreak).toEqual({ currentStreak: 1, longestStreak: 1, lastRevisionDate: today });
  });

  it("a same-day second call is a no-op (stays 1)", () => {
    const now = new Date("2026-07-02T09:00:00");
    const today = now.toLocaleDateString("en-CA");
    updateMemorizationStreak(now);
    updateMemorizationStreak(now);
    expect(getProgress().memorizationStreak).toEqual({ currentStreak: 1, longestStreak: 1, lastRevisionDate: today });
  });

  it("a call one day later increments to 2 and bumps longest", () => {
    const day1 = new Date("2026-07-02T09:00:00");
    const day2 = new Date("2026-07-03T09:00:00");
    const today2 = day2.toLocaleDateString("en-CA");
    updateMemorizationStreak(day1);
    updateMemorizationStreak(day2);
    expect(getProgress().memorizationStreak).toEqual({ currentStreak: 2, longestStreak: 2, lastRevisionDate: today2 });
  });

  it("a >1-day gap resets currentStreak to 1 while longestStreak keeps its running max", () => {
    const day1 = new Date("2026-07-02T09:00:00");
    const day2 = new Date("2026-07-03T09:00:00");
    const gap = new Date("2026-07-10T09:00:00"); // a week later, not consecutive
    const gapDay = gap.toLocaleDateString("en-CA");
    updateMemorizationStreak(day1); // 1 / 1
    updateMemorizationStreak(day2); // 2 / 2
    updateMemorizationStreak(gap); // reset current to 1, longest stays at 2
    expect(getProgress().memorizationStreak).toEqual({ currentStreak: 1, longestStreak: 2, lastRevisionDate: gapDay });
  });
});

describe("updateMemorizationStreak never touches the practice streak (STAT-03)", () => {
  const PRACTICE_DEFAULT = { currentStreak: 0, longestStreak: 0, lastPracticeDate: "" };

  it("leaves the practice streak at its default after a revision-streak advance", () => {
    const now = new Date("2026-07-02T09:00:00");
    expect(getProgress().streaks).toEqual(PRACTICE_DEFAULT);
    updateMemorizationStreak(now);
    expect(getProgress().streaks).toEqual(PRACTICE_DEFAULT);
    // and the memorization streak DID advance, so this is not a vacuous pass
    expect(getProgress().memorizationStreak?.currentStreak).toBe(1);
  });

  it("leaves a pre-existing practice streak unchanged", () => {
    // Seed a practice streak via a raw import, then advance only the revision streak.
    expect(
      importProgress(JSON.stringify({ streaks: { currentStreak: 7, longestStreak: 9, lastPracticeDate: "2026-06-30" } })),
    ).toBe(true);
    updateMemorizationStreak(new Date("2026-07-02T09:00:00"));
    expect(getProgress().streaks).toEqual({ currentStreak: 7, longestStreak: 9, lastPracticeDate: "2026-06-30" });
  });
});

describe("memorizationStreak persistence: export/import round-trip + reset (STAT-03)", () => {
  it("round-trips through export -> clear -> import", () => {
    const day1 = new Date("2026-07-02T09:00:00");
    const day2 = new Date("2026-07-03T09:00:00");
    const today2 = day2.toLocaleDateString("en-CA");
    updateMemorizationStreak(day1);
    updateMemorizationStreak(day2);
    const snapshot = exportProgress();
    localStorage.clear();
    expect(importProgress(snapshot)).toBe(true);
    expect(getProgress().memorizationStreak).toEqual({ currentStreak: 2, longestStreak: 2, lastRevisionDate: today2 });
  });

  it("resetProgress clears it to the default (it is learner data, not a setting)", () => {
    updateMemorizationStreak(new Date("2026-07-02T09:00:00"));
    resetProgress();
    expect(getProgress().memorizationStreak).toEqual({ currentStreak: 0, longestStreak: 0, lastRevisionDate: "" });
  });
});

describe("tikrarTarget setting: default 5, clamp [1, 20], round (EXAM-01)", () => {
  // Exercised through the REAL sanitizeProgress -> sanitizeSettings (no new
  // export). Byte-for-byte the peekBudget / newVerseCap clamp precedent, only the
  // band ceiling differs (20 instead of 10) and the default anchor is 5.
  const tt = (v: unknown) => sanitizeProgress({ settings: { tikrarTarget: v } }).settings.tikrarTarget;

  it("defaults to 5, clamps low/high, rounds, keeps in-band, defaults a non-number", () => {
    expect(DEFAULT_SETTINGS.tikrarTarget).toBe(5);
    expect(sanitizeProgress({}).settings.tikrarTarget).toBe(5); // absent
    expect(tt(undefined)).toBe(5);
    expect(tt(0)).toBe(1); // clamp low to the band floor
    expect(tt(99)).toBe(20); // clamp high to the band ceiling
    expect(tt(8)).toBe(8); // in-band value kept
    expect(tt(8.6)).toBe(9); // Math.round (a rep target is a whole count)
    expect(tt("x")).toBe(5); // non-number -> 5
    expect(tt(Number.NaN)).toBe(5); // NaN -> 5
  });
});

describe("sanitizeTikrarLog + logTikrarReps: cumulative across days, cap-on-new (EXAM-01)", () => {
  // Exercised through the REAL sanitizeProgress -> sanitizeTikrarLog and the
  // shipped logTikrarReps helper; nothing here re-derives a sanitizer.
  const tik = (v: unknown) => sanitizeProgress({ tikrarLog: v }).tikrarLog ?? {};

  it("proto-guards, rejects a non-verseKey key, clamps reps, coerces a bad lastRepDate to '', drops a non-object", () => {
    const out = tik({
      __proto__: { reps: 5, lastRepDate: "2026-07-02" },
      constructor: { reps: 5, lastRepDate: "2026-07-02" },
      prototype: { reps: 5, lastRepDate: "2026-07-02" },
      "x:y": { reps: 5, lastRepDate: "2026-07-02" }, // non-verseKey -> rejected
      "1:2:3": { reps: 5, lastRepDate: "2026-07-02" }, // non-verseKey -> rejected
      "3:4": "nope", // non-object value -> dropped
      "2:255": { reps: 1e9, lastRepDate: "not-a-date" }, // reps out of band -> 0, bad date -> ""
      "1:1": { reps: 12, lastRepDate: "2026-07-02" }, // valid entry survives
    });
    // Object.prototype stayed clean and the dangerous keys never became own keys.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect(Object.keys(out).sort()).toEqual(["1:1", "2:255"]);
    expect(out["2:255"]).toEqual({ reps: 0, lastRepDate: "" }); // pickNumber rejects 1e9 -> 0
    expect(out["1:1"]).toEqual({ reps: 12, lastRepDate: "2026-07-02" });
  });

  it("logTikrarReps creates an entry on a fresh store, then accumulates same-day (cumulative)", () => {
    const today = new Date().toLocaleDateString("en-CA");
    logTikrarReps("2:255", 3);
    expect(getProgress().tikrarLog?.["2:255"]).toEqual({ reps: 3, lastRepDate: today });
    logTikrarReps("2:255", 4);
    expect(getProgress().tikrarLog?.["2:255"]).toEqual({ reps: 7, lastRepDate: today }); // 3 + 4, same day
  });

  it("adds onto a seeded prior-day total and moves lastRepDate to today (across-days growth)", () => {
    expect(importProgress(JSON.stringify({ tikrarLog: { "2:255": { reps: 20, lastRepDate: "2020-01-01" } } }))).toBe(
      true,
    );
    const today = new Date().toLocaleDateString("en-CA");
    logTikrarReps("2:255", 5);
    // The total grows across days (20 + 5) and the date rolls to today, never reset.
    expect(getProgress().tikrarLog?.["2:255"]).toEqual({ reps: 25, lastRepDate: today });
  });

  it("logs a large real session in full, clamps only an absurd per-call value, no-ops 0, rejects a bad key", () => {
    logTikrarReps("2:255", 500);
    expect(getProgress().tikrarLog?.["2:255"].reps).toBe(500); // a real long session is NOT truncated (WR-02)
    logTikrarReps("2:255", 1500);
    expect(getProgress().tikrarLog?.["2:255"].reps).toBe(1500); // 500 + min(1500, MAX_TIKRAR_PER_CALL 1000)
    logTikrarReps("2:255", 0);
    expect(getProgress().tikrarLog?.["2:255"].reps).toBe(1500); // 0 is a no-op, unchanged
    logTikrarReps("bad-key", 5);
    expect(getProgress().tikrarLog?.["bad-key"]).toBeUndefined(); // rejected verseKey
  });

  it("a brand-new key once the map is at 6236 is a no-op, but an existing key still accumulates", () => {
    const keys = manyVerseKeys(6237);
    const seed: Record<string, { reps: number; lastRepDate: string }> = {};
    for (const k of keys.slice(0, 6236)) seed[k] = { reps: 1, lastRepDate: "2020-01-01" };
    expect(importProgress(JSON.stringify({ tikrarLog: seed }))).toBe(true);
    expect(Object.keys(getProgress().tikrarLog ?? {}).length).toBe(6236);

    const newKey = keys[6236]; // the 6237th, absent from the seeded map
    logTikrarReps(newKey, 5);
    expect(getProgress().tikrarLog?.[newKey]).toBeUndefined(); // cap-on-new no-op
    expect(Object.keys(getProgress().tikrarLog ?? {}).length).toBe(6236);

    // Editing an existing entry always works (never stuck by the cap).
    logTikrarReps(keys[0], 4);
    expect(getProgress().tikrarLog?.[keys[0]].reps).toBe(5); // 1 + 4
  });
});

describe("sanitizeExamLog + logExamResult: cap 100, most-recent-first, percent clamp (EXAM-02)", () => {
  // Exercised through the REAL sanitizeProgress -> sanitizeExamLog and the shipped
  // logExamResult helper; nothing here re-derives a sanitizer.
  const exam = (v: unknown) => sanitizeProgress({ examLog: v }).examLog ?? [];

  it("returns [] for a non-array and drops a non-object entry", () => {
    expect(exam("nope")).toEqual([]);
    expect(exam(undefined)).toEqual([]);
    expect(exam([null, 5, "x", { scope: "Al-Fatihah", dateIso: "2026-07-02", percent: 90, total: 7 }])).toEqual([
      { scope: "Al-Fatihah", dateIso: "2026-07-02", percent: 90, total: 7 },
    ]);
  });

  it("trims/caps scope, rounds+clamps percent to [0,100], rejects an out-of-range total, coerces a bad dateIso", () => {
    expect(exam([{ scope: "  " + "z".repeat(200), dateIso: "not-a-date", percent: 130, total: 9999 }])).toEqual([
      { scope: "z".repeat(80), dateIso: "", percent: 100, total: 0 }, // scope trimmed+capped, date "", percent clamped, total rejected to 0
    ]);
    expect(exam([{ scope: "s", dateIso: "2026-07-02", percent: 66.6, total: 286 }])[0]).toEqual({
      scope: "s",
      dateIso: "2026-07-02",
      percent: 67, // Math.round
      total: 286,
    });
    expect(exam([{ scope: "s", dateIso: "2026-07-02", percent: -5, total: 3 }])[0].percent).toBe(0); // clamp low
  });

  it("caps the array at 100, keeping the first 100", () => {
    const many = Array.from({ length: 150 }, (_, i) => ({ scope: `s${i}`, dateIso: "2026-07-02", percent: 50, total: 1 }));
    const out = exam(many);
    expect(out.length).toBe(100);
    expect(out[0].scope).toBe("s0"); // first kept
    expect(out[99].scope).toBe("s99"); // last kept
  });

  it("logExamResult prepends the newest attempt (most-recent-first) and clamps percent both ways", () => {
    logExamResult({ scope: "Al-Fatihah", percent: 80, total: 7 });
    logExamResult({ scope: "Juz 30", percent: 130, total: 200 }); // percent over 100 -> 100
    const log = getProgress().examLog ?? [];
    const today = new Date().toLocaleDateString("en-CA");
    expect(log[0]).toEqual({ scope: "Juz 30", dateIso: today, percent: 100, total: 200 }); // newest first
    expect(log[1]).toEqual({ scope: "Al-Fatihah", dateIso: today, percent: 80, total: 7 });
    logExamResult({ scope: "neg", percent: -5, total: 1 });
    expect((getProgress().examLog ?? [])[0].percent).toBe(0); // percent below 0 -> 0
  });

  it("trims a 101st attempt off the tail (cap holds the length at 100)", () => {
    for (let i = 0; i < 101; i++) logExamResult({ scope: `s${i}`, percent: 50, total: 1 });
    const log = getProgress().examLog ?? [];
    expect(log.length).toBe(100);
    expect(log[0].scope).toBe("s100"); // the newest sits at the head
    expect(log.some((e) => e.scope === "s0")).toBe(false); // the oldest aged off the tail
  });
});

describe("sanitizeSessionJournal + journal helpers + memorize-add tally (EXAM-03)", () => {
  // Exercised through the REAL sanitizeProgress -> sanitizeSessionJournal and the
  // shipped helpers; nothing here re-derives a sanitizer.
  const journal = (v: unknown) => sanitizeProgress({ sessionJournal: v }).sessionJournal ?? {};

  it("proto-guards, rejects a non-ISO date key, clamps the four numbers, drops a non-object", () => {
    const out = journal({
      __proto__: { memorizeGoal: 1, reviseGoal: 1, memorized: 1, revised: 1 },
      constructor: { memorizeGoal: 1, reviseGoal: 1, memorized: 1, revised: 1 },
      prototype: { memorizeGoal: 1, reviseGoal: 1, memorized: 1, revised: 1 },
      "not-a-date": { memorizeGoal: 1, reviseGoal: 1, memorized: 1, revised: 1 }, // non-ISO key -> rejected
      "2026-02-31": { memorizeGoal: 1, reviseGoal: 1, memorized: 1, revised: 1 }, // impossible day -> rejected
      "2026-07-02": "nope", // non-object value -> dropped
      "2026-07-03": { memorizeGoal: 1e9, reviseGoal: -4, memorized: 5, revised: 2 }, // out-of-band goals -> 0
    });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect(Object.keys(out)).toEqual(["2026-07-03"]);
    expect(out["2026-07-03"]).toEqual({ memorizeGoal: 0, reviseGoal: 0, memorized: 5, revised: 2 }); // 1e9 / -4 rejected to 0
  });

  it("is a rolling window: keeps the most-recent 366 days and drops the OLDEST, never the newest (WR-03)", () => {
    const map: Record<string, unknown> = {};
    const days: string[] = [];
    const d = new Date("2024-01-01T00:00:00Z"); // start of a leap year, plenty of days ahead
    for (let i = 0; i < 400; i++) {
      const iso = d.toISOString().slice(0, 10);
      days.push(iso);
      map[iso] = { memorizeGoal: 0, reviseGoal: 0, memorized: 1, revised: 0 };
      d.setUTCDate(d.getUTCDate() + 1);
    }
    const out = journal(map);
    expect(Object.keys(out).length).toBe(366);
    expect(out[days[399]]).toBeDefined(); // the newest day is kept
    expect(out[days[0]]).toBeUndefined(); // the oldest 34 days aged off
    expect(out[days[33]]).toBeUndefined();
    expect(out[days[34]]).toBeDefined(); // the 35th day is the oldest survivor (400 - 366)
  });

  it("the write path evicts the oldest day so a full journal never refuses a new day (WR-03)", () => {
    // Seed a full journal of 366 consecutive OLD days, then set goals for today.
    const seed: Record<string, unknown> = {};
    const seedDays: string[] = [];
    const d = new Date("2024-01-01T00:00:00Z");
    for (let i = 0; i < 366; i++) {
      const iso = d.toISOString().slice(0, 10);
      seedDays.push(iso);
      seed[iso] = { memorizeGoal: 1, reviseGoal: 1, memorized: 1, revised: 1 };
      d.setUTCDate(d.getUTCDate() + 1);
    }
    expect(importProgress(JSON.stringify({ sessionJournal: seed }))).toBe(true);
    expect(Object.keys(getProgress().sessionJournal ?? {}).length).toBe(366);

    const today = new Date().toLocaleDateString("en-CA");
    setJournalGoals(today, { memorizeGoal: 5, reviseGoal: 10 });
    const after = getProgress().sessionJournal ?? {};
    expect(Object.keys(after).length).toBe(366); // still capped
    expect(after[today]).toEqual({ memorizeGoal: 5, reviseGoal: 10, memorized: 0, revised: 0 }); // today recorded
    expect(after[seedDays[0]]).toBeUndefined(); // the oldest seeded day was evicted, not the new one refused
  });

  it("setJournalGoals upserts SET goals (a second call overwrites, not adds) and rejects a bad date", () => {
    const today = new Date().toLocaleDateString("en-CA");
    setJournalGoals(today, { memorizeGoal: 3, reviseGoal: 5 });
    expect(getProgress().sessionJournal?.[today]).toEqual({ memorizeGoal: 3, reviseGoal: 5, memorized: 0, revised: 0 });
    setJournalGoals(today, { memorizeGoal: 10, reviseGoal: 2 });
    // Goals are SET, not added: the second call overwrites.
    expect(getProgress().sessionJournal?.[today]).toEqual({ memorizeGoal: 10, reviseGoal: 2, memorized: 0, revised: 0 });
    setJournalGoals("not-a-date", { memorizeGoal: 9, reviseGoal: 9 });
    expect(getProgress().sessionJournal?.["not-a-date"]).toBeUndefined(); // rejected key
  });

  it("recordJournalRevision and recordJournalMemorization ADD to today's tallies across calls", () => {
    const now = new Date("2026-07-02T09:00:00");
    const today = now.toLocaleDateString("en-CA");
    recordJournalRevision(now);
    recordJournalRevision(now);
    recordJournalMemorization(3, now);
    recordJournalMemorization(2, now);
    expect(getProgress().sessionJournal?.[today]).toEqual({ memorizeGoal: 0, reviseGoal: 0, memorized: 5, revised: 2 });
  });

  it("toggleMemorizedVerse bumps today's memorized by 1 on ADD and does NOT decrement on unmark", () => {
    const today = new Date().toLocaleDateString("en-CA");
    toggleMemorizedVerse("5:5"); // add
    expect(getProgress().sessionJournal?.[today]?.memorized).toBe(1);
    toggleMemorizedVerse("5:5"); // unmark
    expect(getProgress().sessionJournal?.[today]?.memorized).toBe(1); // NOT decremented — adds only
  });

  it("setMemorizedVerses bumps by the net-added delta only; re-marking adds 0; unmark leaves it unchanged", () => {
    const today = new Date().toLocaleDateString("en-CA");
    setMemorizedVerses(["1:1", "1:2"], true); // net-added 2
    expect(getProgress().sessionJournal?.[today]?.memorized).toBe(2);
    setMemorizedVerses(["1:2", "1:3"], true); // only 1:3 is new -> net-added 1
    expect(getProgress().sessionJournal?.[today]?.memorized).toBe(3);
    setMemorizedVerses(["1:1", "1:2"], true); // already memorized -> net-added 0, no bump
    expect(getProgress().sessionJournal?.[today]?.memorized).toBe(3);
    setMemorizedVerses(["1:1", "1:2"], false); // unmark path never touches the journal
    expect(getProgress().sessionJournal?.[today]?.memorized).toBe(3);
  });

  it("the new journal helpers + memorize tally never touch the SM-2 memorizationReviews keyspace", () => {
    const sm2 = {
      repetitions: 5,
      easeFactor: 2.5,
      intervalDays: 30,
      nextDueDate: "2026-09-01",
      lastReviewedDate: "2026-06-01",
      timesSeen: 8,
      timesCorrect: 7,
      lapses: 0,
    };
    expect(importProgress(JSON.stringify({ memorizationReviews: { "2:255": sm2 } }))).toBe(true);
    const before = JSON.stringify(getMemorizationReviews());

    const today = new Date().toLocaleDateString("en-CA");
    setJournalGoals(today, { memorizeGoal: 3, reviseGoal: 5 });
    recordJournalRevision();
    recordJournalMemorization(2);
    logTikrarReps("1:1", 4);
    logExamResult({ scope: "Al-Fatihah", percent: 90, total: 7 });
    toggleMemorizedVerse("1:1");
    setMemorizedVerses(["1:2", "1:3"], true);

    // The SM-2 keyspace is byte-for-byte what it was before any of the new writes.
    expect(JSON.stringify(getMemorizationReviews())).toBe(before);
    expect(getMemorizationReviews()["2:255"]).toEqual(sm2);
  });

  it("exportProgress round-trips tikrarLog + examLog + sessionJournal; resetProgress clears all three, keeps settings", () => {
    const today = new Date().toLocaleDateString("en-CA");
    logTikrarReps("2:255", 7);
    logExamResult({ scope: "Juz 30", percent: 88, total: 200 });
    setJournalGoals(today, { memorizeGoal: 4, reviseGoal: 6 });
    recordJournalMemorization(2);
    setSettings({ ...getSettings(), tikrarTarget: 12 });

    const snapshot = exportProgress();
    const afterExport = getProgress();
    localStorage.clear();
    expect(importProgress(snapshot)).toBe(true);
    // All three fields survive export -> clear -> import losslessly.
    expect(getProgress().tikrarLog).toEqual(afterExport.tikrarLog);
    expect(getProgress().examLog).toEqual(afterExport.examLog);
    expect(getProgress().sessionJournal).toEqual(afterExport.sessionJournal);
    expect(getProgress().tikrarLog?.["2:255"]?.reps).toBe(7);

    resetProgress();
    // Learner data cleared to defaults, the tikrarTarget setting kept.
    expect(getProgress().tikrarLog).toEqual({});
    expect(getProgress().examLog).toEqual([]);
    expect(getProgress().sessionJournal).toEqual({});
    expect(getSettings().tikrarTarget).toBe(12);
  });
});

describe("export/import round-trip and resetProgress", () => {
  it("export then import round-trips losslessly", () => {
    setMemorizedVerses(["1:1", "1:2"], true);
    setVerseNote("2:255", "keep me");
    setTags("2:1", ["alpha", "beta"]);
    toggleVerseBookmark("3:4");
    setOnboardingSeen(true);
    setLastRead("2:255", 42);

    const snapshot = exportProgress(); // stamps lastBackupAt into the store + snapshot
    const afterExport = getProgress();

    localStorage.clear();
    expect(importProgress(snapshot)).toBe(true);
    expect(getProgress()).toEqual(afterExport);
  });

  it("resetProgress clears learner data and re-shows onboarding while keeping settings", () => {
    setSettings({ ...getSettings(), playbackSpeed: 0.5 });
    setMemorizedVerses(["1:1"], true);
    setOnboardingSeen(true);

    resetProgress();

    expect(getProgress().memorizedVerses).toEqual([]);
    expect(getOnboardingSeen()).toBe(false);
    expect(getSettings().playbackSpeed).toBe(0.5);
  });
});
