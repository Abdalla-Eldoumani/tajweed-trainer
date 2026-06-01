#!/usr/bin/env node
// Verifies that every lesson example verse has an authenticated tajweed
// snapshot, ExampleCard renders through the tajweed renderer, and the legend
// reads its colors from the tajweed map (never hand-coded hexes). Network-free;
// reads source and data files only.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const CONTENT_DIR = join(root, "src", "data", "content");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
}

const SKIP = new Set(["surah-index.json", "learning-path.json", "glossary.json"]);
function collectKeys(node, out) {
  if (Array.isArray(node)) {
    for (const i of node) collectKeys(i, out);
    return;
  }
  if (node && typeof node === "object") {
    if (typeof node.surah === "number" && typeof node.ayah === "number") out.add(`${node.surah}:${node.ayah}`);
    for (const v of Object.values(node)) collectKeys(v, out);
  }
}

// 1. Snapshot coverage: every example verse has non-empty tajweed HTML.
const keys = new Set();
for (const f of readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".json") && !SKIP.has(f))) {
  collectKeys(JSON.parse(readFileSync(join(CONTENT_DIR, f), "utf8")), keys);
}
const snapshots = JSON.parse(readFileSync(join(root, "src", "data", "verse-snapshots.json"), "utf8"));
const missing = [...keys].filter(
  (k) => !snapshots[k] || typeof snapshots[k].tajweedHtml !== "string" || snapshots[k].tajweedHtml.length === 0,
);
record("Every lesson example verse has a tajweed snapshot", missing.length === 0, missing.join(", ") || `${keys.size} verses covered`);

const sampleKey = [...keys][0];
record(
  "Snapshots contain real <tajweed> markup",
  !!sampleKey && /<tajweed class=/.test(snapshots[sampleKey].tajweedHtml),
  sampleKey || "no example keys",
);

// 2. ExampleCard renders through the tajweed renderer from the snapshot.
const exampleCard = readFileSync(join(root, "src", "components", "learn", "ExampleCard.tsx"), "utf8");
record('ExampleCard imports the snapshot reader', /from "@\/lib\/verse-snapshots"/.test(exampleCard));
record("ExampleCard renders TajweedText", /<TajweedText\b/.test(exampleCard));

// 3. Legend reads colors from the map and hard-codes no hex.
const legend = readFileSync(join(root, "src", "components", "learn", "ColorLegend.tsx"), "utf8");
record(
  "Legend reads colors from the tajweed map",
  /from "@\/lib\/tajweed-colors"/.test(legend) && /getColorsByGroup/.test(legend),
);
const hex = legend.match(/#[0-9a-fA-F]{6}\b/g);
record("Legend hard-codes no hex value", !hex, hex ? hex.join(", ") : "none");
record("Legend groups entries by family", /TAJWEED_GROUP_ORDER/.test(legend) && /GROUP_LABEL/.test(legend));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
