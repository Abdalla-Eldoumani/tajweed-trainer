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
