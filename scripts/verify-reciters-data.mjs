#!/usr/bin/env node
// Verifies the verified Hafs reciter catalogue in src/lib/reciters.ts: every id
// is well-formed and unique, numeric rows carry Arabic-script names (ea-* rows
// allow a documented nameAr === nameEn Latin fallback), styles are known, the
// default stays Husary Muallim, the legacy aliases point at real ids, every ea-*
// reciter maps to a well-formed folder, the count is sane, and no entry names a
// non-Hafs narration. The walled-off Warsh exception (Younes) is covered by its
// sibling verify-younes.mjs. Network-free; the audio-URL resolvability check
// lives in the smoke test / the Playwright verify-reciters.mjs.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, "..", "src", "lib", "reciters.ts"), "utf8");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

// Quran.com ids are 1-3 digit numbers; EveryAyah ids are the ea-<slug> form,
// where the slug may carry internal hyphens (e.g. ea-ahmed-al-ajmi).
const ID_PATTERN = /^(?:[0-9]{1,3}|ea-[a-z][a-z-]*)$/;
const VALID_STYLES = new Set(["Murattal", "Mujawwad", "Muallim"]);

// Parse the single-line RECITATIONS entries (both numeric and ea-* ids).
const entries = [];
const re = /\{ id: "([a-z0-9-]+)", nameEn: "([^"]+)", nameAr: "([^"]+)", style: (null|"[^"]+") \}/g;
let m;
while ((m = re.exec(src)) !== null) {
  entries.push({ id: m[1], nameEn: m[2], nameAr: m[3], style: m[4] === "null" ? null : m[4].slice(1, -1) });
}
record("Reciter list parses", entries.length > 0, `${entries.length} reciters`);

const ids = entries.map((e) => e.id);
record("Every id matches the id pattern", ids.every((id) => ID_PATTERN.test(id)), ids.join(", "));
record("Ids are unique", new Set(ids).size === ids.length);

// Attribution. Numeric Quran.com rows are all sourced, so they keep the strict
// Arabic-script requirement on nameAr. ea-* rows additionally accept a documented
// Latin fallback: a few EveryAyah reciters could not have their Arabic name
// sourced unambiguously, so reciters.ts sets nameAr === nameEn as an explicit
// "unsourced" marker. That passes; an empty or otherwise-mismatched nameAr still
// fails. Both branches require a non-empty nameEn.
const hasArabicScript = (s) => /[؀-ۿ]/.test(s);
const numericUnattributed = entries.filter(
  (e) => !e.id.startsWith("ea-") && (!e.nameEn || !e.nameAr || !hasArabicScript(e.nameAr)),
);
record(
  "Every numeric reciter has English and Arabic-script names",
  numericUnattributed.length === 0,
  numericUnattributed.map((e) => e.id).join(", "),
);

const eaLatinFallback = entries.filter((e) => e.id.startsWith("ea-") && e.nameAr === e.nameEn);
const eaUnattributed = entries.filter(
  (e) => e.id.startsWith("ea-") && (!e.nameEn || !e.nameAr || (!hasArabicScript(e.nameAr) && e.nameAr !== e.nameEn)),
);
record(
  "Every ea-* reciter is attributed (Arabic script or documented nameAr === nameEn fallback)",
  eaUnattributed.length === 0,
  eaUnattributed.length > 0
    ? eaUnattributed.map((e) => e.id).join(", ")
    : `Latin fallback used by: ${eaLatinFallback.map((e) => e.id).join(", ") || "none"}`,
);

const badStyle = entries.filter((e) => e.style !== null && !VALID_STYLES.has(e.style));
record("Every style is known or null", badStyle.length === 0, badStyle.map((e) => `${e.id}:${e.style}`).join(", "));

const defaultId = (src.match(/export const DEFAULT_RECITER_ID = "(\d+)"/) || [])[1];
// The default must stay Al-Husary Muallim (id 12): teaching style, slow and
// clear. Assert the exact id, not merely membership, so a silent default swap
// fails the gate.
record(
  "Default reciter id is exactly 12 (Husary Muallim) and in the list",
  defaultId === "12" && ids.includes(defaultId),
  `default=${defaultId}`,
);

// Legacy aliases must map to real ids.
const aliasBlock = (src.match(/LEGACY_ALIASES[^=]*=\s*\{([\s\S]*?)\}/) || [])[1] || "";
const aliasTargets = [...aliasBlock.matchAll(/"(\d+)"/g)].map((x) => x[1]);
record(
  "Legacy aliases map to real ids",
  aliasTargets.length > 0 && aliasTargets.every((id) => ids.includes(id)),
  aliasTargets.join(", "),
);

// EveryAyah folder map: each ea-* reciter must have a well-formed folder, and
// no folder may be orphaned (point at an id that is not in the list).
const folderBlock = (src.match(/EVERYAYAH_FOLDER[^=]*=\s*\{([\s\S]*?)\}/) || [])[1] || "";
const folderMap = new Map([...folderBlock.matchAll(/"([a-z0-9-]+)":\s*"([^"]+)"/g)].map((x) => [x[1], x[2]]));
record("EVERYAYAH_FOLDER map parses", folderMap.size > 0, `${folderMap.size} folders`);

const eaIds = ids.filter((id) => id.startsWith("ea-"));
record("EveryAyah reciters are present", eaIds.length > 0, eaIds.join(", "));

// Count sanity: the verified seed ships 30 EveryAyah reciters. A floor of 28
// catches a row silently dropped during an edit without pinning the exact count
// (so an intentional addition does not trip it).
record("EveryAyah reciter count is sane (>= 28)", eaIds.length >= 28, `${eaIds.length} ea-* reciters`);

const missingFolder = eaIds.filter((id) => !folderMap.has(id));
record("Every ea-* reciter has a folder", missingFolder.length === 0, missingFolder.join(", "));

const orphanFolder = [...folderMap.keys()].filter((id) => !ids.includes(id));
record("No EVERYAYAH_FOLDER entry is orphaned", orphanFolder.length === 0, orphanFolder.join(", "));

// A folder must be a single plausible path segment (no slashes or spaces) so the
// constructed data/{folder}/{sss}{aaa}.mp3 URL stays well-formed. A dot is
// admitted for the one dotted source folder
// (Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net); a dot inside a path segment
// is URL-safe and the host stays everyayah.com.
const FOLDER_PATTERN = /^[A-Za-z0-9_.-]+$/;
const badFolder = [...folderMap.entries()].filter(([, folder]) => !FOLDER_PATTERN.test(folder));
record("Every folder is a well-formed path segment", badFolder.length === 0, badFolder.map(([id]) => id).join(", "));

// ea-* ids are unlabelled at the source (style null) and group as murattal,
// except the one labelled Husary Mujawwad row. So an ea-* style must be null or
// a known style from VALID_STYLES; an invented/unknown label still fails.
const eaBadStyle = entries.filter(
  (e) => e.id.startsWith("ea-") && e.style !== null && !VALID_STYLES.has(e.style),
);
record(
  "EveryAyah reciter style is null or a known style",
  eaBadStyle.length === 0,
  eaBadStyle.map((e) => `${e.id}:${e.style}`).join(", "),
);

// Hafs-only constraint: this catalogue is Hafs 'an 'Asim. No reciter name and no
// EveryAyah folder may name another narration (Warsh, Qaloon) or a non-recitation
// (saheeh/translation). The walled-off Warsh exception is the separate Younes
// surface (verify-younes.mjs), never an entry here. Machine check that the Hafs
// set stays Hafs.
const NON_HAFS = /warsh|qaloon|qalon|saheeh|translation/i;
const nonHafsNames = entries.filter((e) => NON_HAFS.test(e.nameEn));
record(
  "No reciter nameEn names a non-Hafs narration",
  nonHafsNames.length === 0,
  nonHafsNames.map((e) => `${e.id}:${e.nameEn}`).join(", "),
);
const nonHafsFolders = [...folderMap.entries()].filter(([, folder]) => NON_HAFS.test(folder));
record(
  "No EveryAyah folder names a non-Hafs narration",
  nonHafsFolders.length === 0,
  nonHafsFolders.map(([id, folder]) => `${id}:${folder}`).join(", "),
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
