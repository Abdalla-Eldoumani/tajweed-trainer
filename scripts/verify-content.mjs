#!/usr/bin/env node
// Static, fully offline validator over the authored practice question pool
// (src/data/questions/*.ts) and the lesson content it draws from
// (src/data/content/*.json). No network, no Quran API, no browser; this is the
// counterpart to the Playwright verify-questions.mjs (which drives the live UI).
//
// What it gates on (hard FAIL -> exit 1):
//   1. Every question's moduleId is one of the nine real module ids.
//   2. Exactly one correctOptionId, and it names a real option in that question.
//   3. Option count is consistent within a module and equals 4.
//   4. Provenance: every arabicText appears verbatim (raw substring) in its
//      module's lesson JSON. The questions declare this provenance in their file
//      header; this check holds them to it.
//
// What it reports but does not gate on (WARN, never fails the run):
//   5. Snapshot cross-check: where a question's source verse key exists in
//      verse-snapshots.json, whether arabicText is a substring of that
//      snapshot's plain arabic.
//   6. Lesson-example cross-check: where a lesson example carries a snapshotted
//      verse key, whether its arabic is a substring of the snapshot.
//
// Why 5 and 6 are WARN and not FAIL: the lesson JSON and the daily-verse
// snapshots use two legitimate but different orthographies. The lesson content
// is simplified imla'i (plain alif ا, no superscript alif, no small quranic
// pause marks); the snapshots are the Uthmani text returned by the Quran.com
// API (alif wasla ٱ, dagger alif ٰ, pause marks). Even after Unicode
// normalization the pedagogical fragments differ in case ending and word
// boundary from the running mushaf line, so a hard substring assertion here
// would flag dozens of non-errors. The verbatim lesson-JSON check (4) is the
// real provenance gate; the snapshot checks are corroborating signal. This
// mirrors the WARN-vs-FAIL split in verify-tajweed-colors.mjs, where verbatim
// reference values are honored and the softer signal is surfaced, not enforced.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const questionsDir = join(root, "src", "data", "questions");
const contentDir = join(root, "src", "data", "content");

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
// The map's keys are the canonical moduleId; the value is the lesson JSON whose
// text backs that module. noon/madd/laam-raa/tafkheem/waqf rename; the rest
// share their module id as the file stem.
const MODULE_TO_LESSON = {
  makharij: "makharij.json",
  "noon-sakinah": "noon-sakinah-tanween.json",
  "meem-sakinah": "meem-sakinah.json",
  ghunnah: "ghunnah.json",
  qalqalah: "qalqalah.json",
  madd: "madd-rules.json",
  "laam-raa": "laam-raa-rules.json",
  "tafkheem-tarqeeq": "tafkheem-tarqeeq.json",
  waqf: "waqf-symbols.json",
};
const VALID_MODULE_IDS = new Set(Object.keys(MODULE_TO_LESSON));
// The question file stem equals its moduleId for every module, so the on-disk
// .ts file can be discovered from the id directly.
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

// Collect every example-like object (has arabic + integer surah + integer ayah)
// anywhere in a lesson JSON tree. Lesson files nest examples at varying depths
// (rules[].examples[], subtypes[].examples[], tafkheem levels, etc.), so a
// recursive walk is more durable than per-file shape knowledge.
function collectExamples(node, out) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectExamples(item, out);
    return;
  }
  if (typeof node.arabic === "string" && Number.isInteger(node.surah) && Number.isInteger(node.ayah)) {
    out.push(node);
  }
  for (const key of Object.keys(node)) collectExamples(node[key], out);
}

// Orthography normalization for the SOFT snapshot cross-checks only. Folds the
// Uthmani/imla'i differences that are not content errors: alif wasla and
// madda/hamza-bearing alif variants to plain alif, dagger (superscript) alif and
// other small quranic annotation marks removed, tatweel and zero-width/bidi
// controls removed, whitespace collapsed. The provenance gate (check 4) never
// uses this; it demands a verbatim raw substring.
function normalizeArabic(text) {
  return text
    .normalize("NFC")
    .replace(/[ٱٲٳٵ]/g, "ا") // alif wasla / madda / hamza-alif -> ا
    .replace(/ـ/g, "") // tatweel
    .replace(/[ٖٜٟٗ٘ٙٚٛٝٞ]/g, "") // subscript/superscript small marks
    .replace(/[ٰ]/g, "") // dagger (superscript) alif
    .replace(/[ۖ-ۜ۟-۪ۤۧۨ-ۭ]/g, "") // quranic annotation / pause marks
    .replace(/[​-‏؜]/g, "") // zero-width + bidi controls
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const snapshots = JSON.parse(readFileSync(join(root, "src", "data", "verse-snapshots.json"), "utf8"));

  // Cache lesson JSON raw text (for the verbatim provenance check) and parsed
  // form (for example collection) per file.
  const lessonRaw = new Map();
  const lessonExamples = new Map();
  for (const [, fileName] of Object.entries(MODULE_TO_LESSON)) {
    if (lessonRaw.has(fileName)) continue;
    const raw = readFileSync(join(contentDir, fileName), "utf8");
    lessonRaw.set(fileName, raw);
    const examples = [];
    collectExamples(JSON.parse(raw), examples);
    lessonExamples.set(fileName, examples);
  }

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
  // Check 4: arabicText verbatim in the module's lesson JSON.
  const lessonProvenanceMisses = [];
  // Check 5 (soft): snapshot cross-check.
  let snapChecked = 0;
  let snapSkipped = 0;
  const snapMismatches = [];

  for (const [moduleId, questions] of loaded) {
    const lessonFile = MODULE_TO_LESSON[moduleId];
    const rawLesson = lessonRaw.get(lessonFile);

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

      // 4. arabicText verbatim (raw) in the lesson JSON.
      if (typeof q.arabicText !== "string" || !rawLesson.includes(q.arabicText)) {
        lessonProvenanceMisses.push(`${moduleId}/${q.id}: ${JSON.stringify(q.arabicText)}`);
      }

      // 5. soft snapshot cross-check.
      const key = `${q.source?.surah}:${q.source?.ayah}`;
      const snap = snapshots[key];
      if (snap && typeof snap.arabic === "string") {
        snapChecked++;
        if (!normalizeArabic(snap.arabic).includes(normalizeArabic(q.arabicText))) {
          snapMismatches.push(`${moduleId}/${q.id} @ ${key}: ${JSON.stringify(q.arabicText)}`);
        }
      } else {
        snapSkipped++;
      }
    }
  }

  record("Every question's moduleId is real and matches its file", badModuleId.length === 0, badModuleId.slice(0, 12).join(" | "));
  record("Every question has exactly one valid correctOptionId", badCorrect.length === 0, badCorrect.slice(0, 12).join(" | "));
  record(`Every module has a consistent option count of ${EXPECTED_OPTION_COUNT}`, badOptionCount.length === 0, badOptionCount.join(" | "));
  record("Question ids are unique across the pool", duplicateIds === 0, duplicateIds ? `${duplicateIds} duplicate id(s)` : "");
  record(
    "Every question's arabicText is verbatim in its lesson JSON",
    lessonProvenanceMisses.length === 0,
    lessonProvenanceMisses.length
      ? `${lessonProvenanceMisses.length} provenance miss(es); first: ${lessonProvenanceMisses.slice(0, 8).join(" | ")}`
      : `${totalQuestions} questions checked`,
  );

  // 5 (soft): report, do not fail.
  if (snapMismatches.length === 0) {
    record("Snapshot cross-check (questions) consistent where present", true, `${snapChecked} checked, ${snapSkipped} skipped (verse not snapshotted)`);
  } else {
    warn(
      "Snapshot cross-check (questions): some arabicText not in its snapshot",
      `${snapMismatches.length} of ${snapChecked} checked differ (orthography/pedagogy); ${snapSkipped} skipped; first: ${snapMismatches.slice(0, 6).join(" | ")}`,
    );
  }

  // 6 (soft): lesson examples vs snapshots.
  let exChecked = 0;
  let exSkipped = 0;
  const exMismatches = [];
  for (const [fileName, examples] of lessonExamples) {
    for (const ex of examples) {
      const key = `${ex.surah}:${ex.ayah}`;
      const snap = snapshots[key];
      if (snap && typeof snap.arabic === "string") {
        exChecked++;
        if (!normalizeArabic(snap.arabic).includes(normalizeArabic(ex.arabic))) {
          exMismatches.push(`${fileName} @ ${key}: ${JSON.stringify(ex.arabic).slice(0, 48)}`);
        }
      } else {
        exSkipped++;
      }
    }
  }
  if (exMismatches.length === 0) {
    record("Snapshot cross-check (lesson examples) consistent where present", true, `${exChecked} checked, ${exSkipped} skipped`);
  } else {
    warn(
      "Snapshot cross-check (lesson examples): some example arabic not in its snapshot",
      `${exMismatches.length} of ${exChecked} checked differ (Uthmani vs imla'i); ${exSkipped} skipped; first: ${exMismatches.slice(0, 6).join(" | ")}`,
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed (${warnings.length} warning${warnings.length === 1 ? "" : "s"}).`);
  if (failed.length > 0) {
    console.log("Failures:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
