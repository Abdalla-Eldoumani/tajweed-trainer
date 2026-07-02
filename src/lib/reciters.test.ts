import { describe, it, expect } from "vitest";
import {
  RECITATIONS,
  EVERYAYAH_FOLDER,
  DEFAULT_RECITER_ID,
  getRecitation,
  normalizeReciterId,
  isEveryAyahReciter,
  styleGroup,
} from "@/lib/reciters";

// Ported from scripts/verify-reciters-data.mjs. This imports the REAL catalogue
// and helpers rather than regex-parsing the source, so a data regression (a
// silent default swap, a dropped ea-* row, a non-Hafs reciter, an orphan folder)
// fails the suite. Every case the source script asserted is preserved. The
// walled-off Warsh exception (Younes) lives on its own surface and is never an
// entry here (covered by verify-younes.mjs). The runtime audio-URL resolvability
// check stays in the browser smoke test, exactly as the source noted.

// Quran.com ids are 1-3 digit numbers; EveryAyah ids are the ea-<slug> form,
// where the slug may carry internal hyphens (e.g. ea-ahmed-al-ajmi).
const ID_PATTERN = /^(?:[0-9]{1,3}|ea-[a-z][a-z-]*)$/;
const VALID_STYLES = new Set(["Murattal", "Mujawwad", "Muallim"]);
// A folder must be a single plausible path segment (no slashes or spaces) so the
// constructed data/{folder}/{sss}{aaa}.mp3 URL stays well-formed. A dot is
// admitted for the one dotted source folder (…ketaballah.net); a dot inside a
// path segment is URL-safe and the host stays everyayah.com.
const FOLDER_PATTERN = /^[A-Za-z0-9_.-]+$/;
// Hafs 'an 'Asim only: no reciter name and no folder may name another narration
// (Warsh, Qaloon) or a non-recitation (saheeh/translation).
const NON_HAFS = /warsh|qaloon|qalon|saheeh|translation/i;
const hasArabicScript = (s: string) => /[؀-ۿ]/.test(s);

const ids = RECITATIONS.map((r) => r.id);
const eaIds = ids.filter((id) => id.startsWith("ea-"));

describe("reciter catalogue — ids", () => {
  it("the list is non-empty", () => {
    expect(RECITATIONS.length).toBeGreaterThan(0);
  });

  it("every id matches the id pattern", () => {
    for (const id of ids) expect(id, id).toMatch(ID_PATTERN);
  });

  it("ids are unique", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("reciter catalogue — attribution", () => {
  it("every numeric reciter has English and Arabic-script names", () => {
    const numeric = RECITATIONS.filter((r) => !r.id.startsWith("ea-"));
    for (const r of numeric) {
      expect(r.nameEn, r.id).toBeTruthy();
      expect(hasArabicScript(r.nameAr), `${r.id} nameAr=${r.nameAr}`).toBe(true);
    }
  });

  it("every ea-* reciter is attributed (Arabic script or documented nameAr === nameEn fallback)", () => {
    // A few EveryAyah reciters could not have their Arabic name sourced
    // unambiguously; reciters.ts sets nameAr === nameEn as an explicit
    // "unsourced" marker, which is allowed. An empty or otherwise-mismatched
    // nameAr still fails. Both branches require a non-empty nameEn.
    const ea = RECITATIONS.filter((r) => r.id.startsWith("ea-"));
    for (const r of ea) {
      expect(r.nameEn, r.id).toBeTruthy();
      expect(
        hasArabicScript(r.nameAr) || r.nameAr === r.nameEn,
        `${r.id} nameAr=${r.nameAr}`,
      ).toBe(true);
    }
  });
});

describe("reciter catalogue — styles", () => {
  it("every style is a known style or null", () => {
    for (const r of RECITATIONS) {
      if (r.style !== null) expect(VALID_STYLES.has(r.style), `${r.id}:${r.style}`).toBe(true);
    }
  });

  it("every ea-* style is null or a known style (no invented label)", () => {
    for (const r of RECITATIONS.filter((r) => r.id.startsWith("ea-"))) {
      if (r.style !== null) expect(VALID_STYLES.has(r.style), `${r.id}:${r.style}`).toBe(true);
    }
  });

  it("styleGroup buckets Mujawwad apart and everything else as murattal", () => {
    for (const r of RECITATIONS) {
      expect(styleGroup(r)).toBe(r.style === "Mujawwad" ? "mujawwad" : "murattal");
    }
  });
});

describe("reciter catalogue — the default is exactly 12 (Husary Muallim)", () => {
  it("DEFAULT_RECITER_ID is exactly 12 and present in the list", () => {
    // Assert the exact id, not merely membership, so a silent default swap fails.
    expect(DEFAULT_RECITER_ID).toBe("12");
    expect(ids).toContain(DEFAULT_RECITER_ID);
  });

  it("id 12 resolves to Al-Husary in the Muallim (teaching) style", () => {
    const r = getRecitation("12");
    expect(r).toBeDefined();
    expect(r!.style).toBe("Muallim");
    expect(r!.nameEn).toMatch(/Husary/);
  });
});

describe("reciter catalogue — legacy aliases normalize to real ids", () => {
  it("husary / ar.husary normalize to 12", () => {
    expect(normalizeReciterId("husary")).toBe("12");
    expect(normalizeReciterId("ar.husary")).toBe("12");
  });

  it("alafasy / ar.alafasy normalize to 7", () => {
    expect(normalizeReciterId("alafasy")).toBe("7");
    expect(normalizeReciterId("ar.alafasy")).toBe("7");
  });

  it("the normalized alias targets are real ids in the list", () => {
    for (const target of ["12", "7"]) expect(ids).toContain(target);
  });

  it("a known id passes through and an unknown / malformed value falls back to the default", () => {
    expect(normalizeReciterId("7")).toBe("7");
    expect(normalizeReciterId("ea-ghamdi")).toBe("ea-ghamdi");
    expect(normalizeReciterId("not-a-reciter")).toBe(DEFAULT_RECITER_ID);
    expect(normalizeReciterId(undefined)).toBe(DEFAULT_RECITER_ID);
    expect(normalizeReciterId(42)).toBe(DEFAULT_RECITER_ID);
  });
});

describe("reciter catalogue — EveryAyah folders", () => {
  it("the folder map is non-empty and every ea-* reciter is present", () => {
    expect(Object.keys(EVERYAYAH_FOLDER).length).toBeGreaterThan(0);
    expect(eaIds.length).toBeGreaterThan(0);
  });

  it("the ea-* reciter count is sane (>= 28)", () => {
    // The verified seed ships 30 EveryAyah reciters. A floor of 28 catches a row
    // silently dropped during an edit without pinning the exact count.
    expect(eaIds.length).toBeGreaterThanOrEqual(28);
  });

  it("every ea-* reciter has a folder", () => {
    const missing = eaIds.filter((id) => !isEveryAyahReciter(id));
    expect(missing, missing.join(", ")).toEqual([]);
  });

  it("no folder entry is orphaned (points at an id not in the list)", () => {
    const orphans = Object.keys(EVERYAYAH_FOLDER).filter((id) => !ids.includes(id));
    expect(orphans, orphans.join(", ")).toEqual([]);
  });

  it("every folder is a well-formed single path segment", () => {
    for (const [id, folder] of Object.entries(EVERYAYAH_FOLDER)) {
      expect(FOLDER_PATTERN.test(folder), `${id}:${folder}`).toBe(true);
    }
  });

  it("isEveryAyahReciter is true for ea-* ids and false for numeric ids", () => {
    expect(isEveryAyahReciter("ea-ghamdi")).toBe(true);
    expect(isEveryAyahReciter("12")).toBe(false);
    expect(isEveryAyahReciter("not-a-reciter")).toBe(false);
  });
});

describe("reciter catalogue — Hafs-only guard", () => {
  it("no reciter nameEn names a non-Hafs narration", () => {
    const offenders = RECITATIONS.filter((r) => NON_HAFS.test(r.nameEn));
    expect(offenders.map((r) => `${r.id}:${r.nameEn}`)).toEqual([]);
  });

  it("no EveryAyah folder names a non-Hafs narration", () => {
    const offenders = Object.entries(EVERYAYAH_FOLDER).filter(([, folder]) => NON_HAFS.test(folder));
    expect(offenders.map(([id, folder]) => `${id}:${folder}`)).toEqual([]);
  });
});
