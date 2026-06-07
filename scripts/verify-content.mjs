#!/usr/bin/env node
// Static, fully offline validator over the authored practice question pool
// (src/data/questions/*.ts) and the verified verse text it cites
// (src/data/verse-snapshots.json). No network, no Quran API, no browser; this is
// the counterpart to the Playwright verify-questions.mjs (which drives the live
// UI).
//
// Structural checks (hard FAIL -> exit 1):
//   1. Every question's moduleId is one of the nine real module ids and matches
//      the file it lives in.
//   2. Exactly one correctOptionId, naming a real option in that question.
//   3. Option count is consistent within a module and equals 4.
//   4. Question ids are unique across the whole pool.
//
// Content provenance check (WARN, counted, never fails the run):
//   5. Real-verse membership. Every question's arabicText, after orthography
//      normalization, must appear as a normalized substring of the authenticated
//      `arabic` text of its cited `source` verse in verse-snapshots.json. This is
//      the honest provenance gate: the modules that cite verses (makharij, waqf,
//      tafkheem-tarqeeq, parts of laam-raa, ...) draw their Arabic from the cited
//      surah:ayah, not from the lesson JSON, so the question text is checked
//      against the verified Quran text it claims to come from. Two sub-cases are
//      reported separately:
//        5a. the cited verse is NOT in the snapshot set  -> cannot verify offline.
//        5b. the cited verse IS in the snapshot set but arabicText is not a
//            fragment of it -> a real provenance mismatch for a maintainer to fix
//            (wrong surah:ayah, wrong inflection, or non-contiguous words).
//
// Why 5 is WARN and not a hard FAIL: the Arabic in these files is immutable Quran
// text. When arabicText does not match its cited verse the fix is an editorial,
// source-of-truth decision about the Quran reference (correct the citation or the
// fragment) — not something this tool may auto-resolve, and not something that
// should silently change. The script therefore surfaces every mismatch loudly and
// counts it, while the structural checks above are the hard gate. This mirrors the
// WARN-vs-FAIL split in verify-tajweed-colors.mjs, where verbatim reference values
// are honored and the softer signal is surfaced, not enforced.
//
// The normalization folds the orthographic differences between the Uthmani text in
// the snapshots (alif-wasla, superscript dagger alif, shadda, quranic pause marks)
// and the simplified imla'i spelling the questions use (plain written-out alif and
// doubled sun letters). After folding, the SAME Quranic word compares equal across
// the two scripts; genuinely different words (a wrong inflection or a different
// verse) still do not match, which is what makes the membership signal meaningful.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const questionsDir = join(root, "src", "data", "questions");

const results = [];
const warnings = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
}
function warn(name, details = "") {
  warnings.push({ name, details });
  console.log(`WARN: ${name}${details ? " — " + details : ""}`);
}

// The nine real module ids (the learn modules; same set nav-data.tsx exposes).
// The question file stem equals its moduleId for every module.
const VALID_MODULE_IDS = new Set([
  "makharij",
  "noon-sakinah",
  "meem-sakinah",
  "ghunnah",
  "qalqalah",
  "madd",
  "laam-raa",
  "tafkheem-tarqeeq",
  "waqf",
]);
const EXPECTED_OPTION_COUNT = 4;

// Load one questions/*.ts file. Node 24 strips TypeScript types natively and the
// file's only import is `import type ... from "@/lib/types"`, which erases to
// nothing at runtime (no real @/ resolution needed), so a dynamic import is the
// clean path. If that ever fails (older Node, a future non-type import), fall
// back to a tolerant text parse: drop the type-only import, neutralize the
// `: Question[]` annotation, and evaluate the array literal in a vm sandbox.
async function loadQuestions(file) {
  try {
    const mod = await import(pathToFileURL(file).href);
    if (Array.isArray(mod.questions)) return { questions: mod.questions, via: "import" };
  } catch {
    // fall through to the text parse
  }
  let src = readFileSync(file, "utf8");
  src = src
    .replace(/^\s*import\s+type[^;]*;\s*$/m, "")
    .replace(/export\s+const\s+questions\s*:\s*[^=]*=/, "__sandbox.questions =");
  const sandbox = { __sandbox: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: file });
  if (!Array.isArray(sandbox.__sandbox.questions)) {
    throw new Error(`could not load questions from ${file}`);
  }
  return { questions: sandbox.__sandbox.questions, via: "vm" };
}

// Orthography normalization for the real-verse membership check. Folds the
// Uthmani/imla'i differences that are not content differences so that the SAME
// Quranic word compares equal across the snapshot (Uthmani) and the question
// (imla'i) spellings:
//   - tatweel and zero-width / bidi controls removed;
//   - every harakat and small quranic mark removed (tanwin, short vowels, sukoon,
//     shadda, superscript dagger alif, the small high/low pause + recitation
//     marks);
//   - every long-a form folded away (plain alif, alif-wasla, madda/hamza alif) —
//     the long-a is written three incompatible ways across the two scripts (full
//     alif, alif-wasla, dagger alif) or omitted entirely in words like الرحمن، الله,
//     so the only stable comparison drops it on both sides;
//   - alif-maksura / farsi ya -> ya; hamza on a waw/ya seat -> the base letter;
//     bare hamza removed; ta-marbuta -> ha;
//   - runs of the same letter collapsed to one, so the imla'i written-out sun
//     letter (الليل) equals the Uthmani shadda form (ٱلَّيْل);
//   - whitespace collapsed.
// The result is a skeleton string used only for the substring membership test; it
// is never written anywhere and never alters the stored Quran text.
function normalizeArabic(text) {
  return text
    .normalize("NFC")
    .replace(/ـ/g, "") // tatweel
    .replace(/[​-‏؜]/g, "") // zero-width + bidi controls
    .replace(/[ً-ٰٟؐ-ؚۖ-ۜ۟-۪ۤۧۨ-ۭ]/g, "") // harakat, shadda, dagger alif, small quranic marks
    .replace(/[آأإاٱٲٳٵ]/g, "") // long-a forms (madda/hamza/plain/wasla alif)
    .replace(/[ىی]/g, "ي") // alif-maksura / farsi ya -> ya
    .replace(/ؤ/g, "و") // hamza-on-waw -> waw
    .replace(/ئ/g, "ي") // hamza-on-ya -> ya
    .replace(/ء/g, "") // bare hamza
    .replace(/ة/g, "ه") // ta-marbuta -> ha
    .replace(/(.)\1+/g, "$1") // collapse repeated identical letters
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const snapshots = JSON.parse(readFileSync(join(root, "src", "data", "verse-snapshots.json"), "utf8"));

  // --- Discover the question files and confirm full coverage of the nine ---
  const onDisk = readdirSync(questionsDir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => f.replace(/\.ts$/, ""));
  const missingFiles = [...VALID_MODULE_IDS].filter((id) => !onDisk.includes(id));
  const extraFiles = onDisk.filter((id) => !VALID_MODULE_IDS.has(id));
  record(
    "Every module id has a question file (and no stray files)",
    missingFiles.length === 0 && extraFiles.length === 0,
    [missingFiles.length ? `missing: ${missingFiles.join(", ")}` : "", extraFiles.length ? `extra: ${extraFiles.join(", ")}` : ""]
      .filter(Boolean)
      .join("; "),
  );

  // Load every pool. The expected module id is the file stem; check 1 confirms
  // the in-file moduleId agrees with it.
  const loaded = new Map();
  const loaders = new Set();
  for (const id of onDisk) {
    if (!VALID_MODULE_IDS.has(id)) continue;
    const { questions, via } = await loadQuestions(join(questionsDir, `${id}.ts`));
    loaded.set(id, questions);
    loaders.add(via);
  }
  record("All question pools loaded", loaded.size === VALID_MODULE_IDS.size, `loaded ${loaded.size} modules via ${[...loaders].join("+")}`);

  // Aggregate counters for the final report.
  let totalQuestions = 0;
  const idSeen = new Set();
  let duplicateIds = 0;

  // Check 1: moduleId validity + agreement with the file it lives in.
  const badModuleId = [];
  // Check 2: exactly one real correct option.
  const badCorrect = [];
  // Check 3: option-count consistency within a module (and == 4).
  const badOptionCount = [];
  // Check 5: real-verse membership of arabicText against its cited snapshot verse.
  let verseChecked = 0; // verse present in snapshots -> membership tested
  let verseMatched = 0;
  const verseNotSnapshotted = new Map(); // verseKey -> count (5a)
  const fragmentMismatches = new Map(); // "key|arabicText" -> { key, txt, ids } (5b)

  for (const [moduleId, questions] of loaded) {
    // Per-module option-count consistency: every question in the module must
    // carry the same option count, and that count must be EXPECTED_OPTION_COUNT.
    const optionCounts = new Set(questions.map((q) => (Array.isArray(q.options) ? q.options.length : -1)));
    if (optionCounts.size !== 1 || !optionCounts.has(EXPECTED_OPTION_COUNT)) {
      badOptionCount.push(`${moduleId}: counts {${[...optionCounts].join(", ")}}`);
    }

    for (const q of questions) {
      totalQuestions++;
      if (idSeen.has(q.id)) duplicateIds++;
      idSeen.add(q.id);

      // 1. moduleId must be real and must match the file it is declared in.
      if (!VALID_MODULE_IDS.has(q.moduleId) || q.moduleId !== moduleId) {
        badModuleId.push(`${q.id} (moduleId=${q.moduleId}, file=${moduleId})`);
      }

      // 2. exactly one correctOptionId, naming a real option.
      const optionIds = Array.isArray(q.options) ? q.options.map((o) => o.id) : [];
      const matches = optionIds.filter((oid) => oid === q.correctOptionId);
      if (typeof q.correctOptionId !== "string" || matches.length !== 1) {
        badCorrect.push(`${q.id} (correct=${q.correctOptionId}, options=[${optionIds.join(", ")}])`);
      }

      // 5. real-verse membership of arabicText against the cited source verse.
      const key = `${q.source?.surah}:${q.source?.ayah}`;
      const snap = snapshots[key];
      if (snap && typeof snap.arabic === "string") {
        verseChecked++;
        if (isVerseFragment(q.arabicText, snap.arabic)) {
          verseMatched++;
        } else {
          const sig = `${key}|${q.arabicText}`;
          if (!fragmentMismatches.has(sig)) fragmentMismatches.set(sig, { key, txt: q.arabicText, ids: [] });
          fragmentMismatches.get(sig).ids.push(q.id);
        }
      } else {
        verseNotSnapshotted.set(key, (verseNotSnapshotted.get(key) || 0) + 1);
      }
    }
  }

  record("Every question's moduleId is real and matches its file", badModuleId.length === 0, badModuleId.slice(0, 12).join(" | "));
  record("Every question has exactly one valid correctOptionId", badCorrect.length === 0, badCorrect.slice(0, 12).join(" | "));
  record(`Every module has a consistent option count of ${EXPECTED_OPTION_COUNT}`, badOptionCount.length === 0, badOptionCount.join(" | "));
  record("Question ids are unique across the pool", duplicateIds === 0, duplicateIds ? `${duplicateIds} duplicate id(s)` : "");

  // 5: report the real-verse membership outcome. Matches are the happy path; the
  // two miss sub-cases are surfaced as counted warnings.
  record(
    "arabicText real-verse membership checked against cited snapshots",
    true,
    `${verseMatched}/${verseChecked} confirmed as a fragment of their cited verse`,
  );
  if (verseNotSnapshotted.size > 0) {
    const total = [...verseNotSnapshotted.values()].reduce((a, b) => a + b, 0);
    warn(
      "Some cited verses are not in verse-snapshots.json (cannot verify offline)",
      `${total} question(s) across ${verseNotSnapshotted.size} verse(s): ${[...verseNotSnapshotted.keys()].join(", ")}`,
    );
  }
  if (fragmentMismatches.size > 0) {
    const totalQ = [...fragmentMismatches.values()].reduce((a, m) => a + m.ids.length, 0);
    const lines = [...fragmentMismatches.values()].map((m) => `${m.key} ${JSON.stringify(m.txt)} (x${m.ids.length}; e.g. ${m.ids[0]})`);
    warn(
      "arabicText not a fragment of its cited verse (provenance mismatch to fix)",
      `${fragmentMismatches.size} distinct case(s), ${totalQ} question(s): ${lines.join(" | ")}`,
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed (${warnings.length} warning${warnings.length === 1 ? "" : "s"}).`);
  console.log(`Pool: ${totalQuestions} questions across ${loaded.size} modules.`);
  if (failed.length > 0) {
    console.log("Failures:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
    process.exit(1);
  }
}

// True when `fragment` (a question's arabicText) is, after orthography
// normalization, a substring of `verse` (the authenticated Uthmani text of its
// cited source verse). Folding both sides to the same skeleton lets the same
// Quranic word match across the Uthmani and imla'i spellings while a genuinely
// different word or inflection still fails.
function isVerseFragment(fragment, verse) {
  if (typeof fragment !== "string" || typeof verse !== "string") return false;
  return normalizeArabic(verse).includes(normalizeArabic(fragment));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
