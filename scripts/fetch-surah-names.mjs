#!/usr/bin/env node
// One-shot dev script: fetches surah metadata from Quran.com Foundation API v4,
// writes src/data/content/surah-index.json, and patches surah_name_ar into every
// example across the rule JSON files in src/data/content.
//
// Run manually after the API or rule examples change:
//   node scripts/fetch-surah-names.mjs
//
// This script is NOT part of the build. The generated surah-index.json is checked
// in and consumed at runtime as an offline fallback.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const CONTENT_DIR = join(REPO_ROOT, "src", "data", "content");
const INDEX_PATH = join(CONTENT_DIR, "surah-index.json");
const API_URL = "https://api.quran.com/api/v4/chapters";

async function fetchChapters() {
  const res = await fetch(API_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Quran.com /chapters failed: ${res.status} ${res.statusText}`);
  const json = await res.json();
  if (!Array.isArray(json.chapters)) throw new Error("Unexpected /chapters response shape");
  return json.chapters;
}

function toSurahHeader(c) {
  return {
    number: c.id,
    nameSimple: c.name_simple,
    nameArabic: c.name_arabic,
    versesCount: c.verses_count,
    pages: c.pages,
    bismillahPre: c.bismillah_pre,
    revelationPlace: c.revelation_place === "madinah" ? "madinah" : "makkah",
  };
}

function patchExamplesInPlace(node, byNumber) {
  if (Array.isArray(node)) {
    for (const item of node) patchExamplesInPlace(item, byNumber);
    return;
  }
  if (node && typeof node === "object") {
    if (typeof node.surah === "number" && typeof node.surah_name_en === "string" && !node.surah_name_ar) {
      const meta = byNumber.get(node.surah);
      if (meta) node.surah_name_ar = meta.nameArabic;
    }
    for (const value of Object.values(node)) patchExamplesInPlace(value, byNumber);
  }
}

async function patchContentFiles(byNumber) {
  const files = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith(".json") && f !== "surah-index.json");
  let totalPatched = 0;
  for (const file of files) {
    const fullPath = join(CONTENT_DIR, file);
    const raw = await readFile(fullPath, "utf8");
    const parsed = JSON.parse(raw);
    const before = JSON.stringify(parsed);
    patchExamplesInPlace(parsed, byNumber);
    const after = JSON.stringify(parsed);
    if (before !== after) {
      await writeFile(fullPath, JSON.stringify(parsed, null, 2) + "\n", "utf8");
      const patches = (after.match(/"surah_name_ar":/g) || []).length - (before.match(/"surah_name_ar":/g) || []).length;
      totalPatched += patches;
      console.log(`  patched ${file} (+${patches} surah_name_ar)`);
    }
  }
  return totalPatched;
}

async function main() {
  console.log("Fetching /chapters from Quran.com Foundation API v4...");
  const chapters = await fetchChapters();
  if (chapters.length !== 114) {
    throw new Error(`Expected 114 chapters, got ${chapters.length}`);
  }
  const headers = chapters.map(toSurahHeader);
  await writeFile(INDEX_PATH, JSON.stringify(headers, null, 2) + "\n", "utf8");
  console.log(`Wrote ${INDEX_PATH} (${headers.length} surahs).`);

  const byNumber = new Map(headers.map((h) => [h.number, h]));
  console.log("Patching surah_name_ar into example arrays...");
  const totalPatched = await patchContentFiles(byNumber);
  console.log(`Done. ${totalPatched} example(s) updated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
