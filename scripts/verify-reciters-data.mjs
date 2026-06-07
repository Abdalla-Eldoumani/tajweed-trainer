#!/usr/bin/env node
// Verifies the verified reciter list in src/lib/reciters.ts: every id is
// well-formed and unique, every reciter is fully attributed (English + Arabic
// name + style), the default id is real, and the legacy migration aliases point
// at real ids. Network-free; the audio-URL resolvability check lives in the
// smoke test / the Playwright verify-reciters.mjs.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, "..", "src", "lib", "reciters.ts"), "utf8");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
}

// Quran.com ids are 1-3 digit numbers; EveryAyah ids are the ea-<slug> form.
const ID_PATTERN = /^(?:[0-9]{1,3}|ea-[a-z]+)$/;
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

const unattributed = entries.filter((e) => !e.nameEn || !e.nameAr || !/[؀-ۿ]/.test(e.nameAr));
record("Every reciter has English and Arabic names", unattributed.length === 0, unattributed.map((e) => e.id).join(", "));

const badStyle = entries.filter((e) => e.style !== null && !VALID_STYLES.has(e.style));
record("Every style is known or null", badStyle.length === 0, badStyle.map((e) => `${e.id}:${e.style}`).join(", "));

const defaultId = (src.match(/export const DEFAULT_RECITER_ID = "(\d+)"/) || [])[1];
record("Default reciter id is in the list", !!defaultId && ids.includes(defaultId), `default=${defaultId}`);

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

const missingFolder = eaIds.filter((id) => !folderMap.has(id));
record("Every ea-* reciter has a folder", missingFolder.length === 0, missingFolder.join(", "));

const orphanFolder = [...folderMap.keys()].filter((id) => !ids.includes(id));
record("No EVERYAYAH_FOLDER entry is orphaned", orphanFolder.length === 0, orphanFolder.join(", "));

// A folder must be a single plausible path segment (no slashes, dots, or spaces)
// so the constructed data/{folder}/{sss}{aaa}.mp3 URL stays well-formed.
const FOLDER_PATTERN = /^[A-Za-z0-9_-]+$/;
const badFolder = [...folderMap.entries()].filter(([, folder]) => !FOLDER_PATTERN.test(folder));
record("Every folder is a well-formed path segment", badFolder.length === 0, badFolder.map(([id]) => id).join(", "));

// The ea-* ids group as murattal (style null) through the existing styleGroup;
// none should carry a style label the source did not provide.
const eaStyled = entries.filter((e) => e.id.startsWith("ea-") && e.style !== null);
record("EveryAyah reciters carry no invented style", eaStyled.length === 0, eaStyled.map((e) => e.id).join(", "));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
