#!/usr/bin/env node
// Source-parity guard for the lesson-example coloring components: ExampleCard
// renders through the tajweed renderer from the snapshot reader, and ColorLegend
// reads its colors from the tajweed map (never hand-coded hexes) and groups them
// by family. The snapshot-coverage data audit (every lesson example verse has a
// non-empty <tajweed> snapshot) is now owned by the ported test
// src/lib/verse-snapshots.test.ts, which imports the real reader and walks the
// same content JSON. Network-free; reads source files only.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

// ExampleCard renders through the tajweed renderer from the snapshot.
const exampleCard = readFileSync(join(root, "src", "components", "learn", "ExampleCard.tsx"), "utf8");
record('ExampleCard imports the snapshot reader', /from "@\/lib\/verse-snapshots"/.test(exampleCard));
record("ExampleCard renders TajweedText", /<TajweedText\b/.test(exampleCard));

// Legend reads colors from the map and hard-codes no hex.
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
