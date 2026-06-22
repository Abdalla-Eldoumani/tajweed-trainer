#!/usr/bin/env node
// One-shot dev script: snapshots the color-coded tajweed HTML for every Quranic
// example used in the lessons, so lesson verses render real per-letter colors
// without a live request and keep working offline.
//
// It reads the example verse keys from src/data/content/*.json, fetches each
// referenced surah's text_uthmani_tajweed once from the Quran.com Foundation API
// v4 (batched per chapter, not per ayah), and writes src/data/verse-snapshots.json
// keyed by "<surah>:<ayah>". Idempotent: with unchanged content and API output a
// re-run rewrites the same bytes (existing fetchedAt is preserved).
//
//   node scripts/prefetch-tajweed-snapshots.mjs
//
// Not part of the build. Religious text comes only from the authenticated API and
// is never generated; the stored HTML is sanitized again at render time.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const CONTENT_DIR = join(REPO_ROOT, "src", "data", "content");
const SNAPSHOTS_PATH = join(REPO_ROOT, "src", "data", "verse-snapshots.json");
const API = "https://api.quran.com/api/v4/quran/verses/uthmani_tajweed";
const SOURCE = "api.quran.com/api/v4 uthmani_tajweed";

// Content files with no Quranic examples to scan.
const SKIP = new Set(["surah-index.json", "learning-path.json"]);

// Walk an arbitrary content tree and collect every "<surah>:<ayah>" an example
// carries, regardless of how deeply rules/subtypes nest it.
function collectKeys(node, out) {
  if (Array.isArray(node)) {
    for (const item of node) collectKeys(item, out);
    return;
  }
  if (node && typeof node === "object") {
    if (typeof node.surah === "number" && typeof node.ayah === "number") {
      out.add(`${node.surah}:${node.ayah}`);
    }
    for (const value of Object.values(node)) collectKeys(value, out);
  }
}

function stripTags(html) {
  return html
    .replace(/<span class="end">[\s\S]*?<\/span>/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function byVerseKey(a, b) {
  const [sa, aa] = a.split(":").map(Number);
  const [sb, ab] = b.split(":").map(Number);
  return sa - sb || aa - ab;
}

async function gatherExampleKeys() {
  const files = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith(".json") && !SKIP.has(f));
  const keys = new Set();
  for (const f of files) {
    collectKeys(JSON.parse(await readFile(join(CONTENT_DIR, f), "utf8")), keys);
  }
  return [...keys].sort(byVerseKey);
}

async function fetchSurahTajweed(surah) {
  const res = await fetch(`${API}?chapter_number=${surah}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`chapter ${surah} failed: ${res.status} ${res.statusText}`);
  const json = await res.json();
  if (!Array.isArray(json.verses)) throw new Error(`chapter ${surah}: unexpected response shape`);
  const map = new Map();
  for (const v of json.verses) {
    if (v.verse_key && typeof v.text_uthmani_tajweed === "string") {
      map.set(v.verse_key, v.text_uthmani_tajweed);
    }
  }
  return map;
}

async function main() {
  const keys = await gatherExampleKeys();
  console.log(`Found ${keys.length} distinct example verse(s) across content files.`);

  const surahs = [...new Set(keys.map((k) => Number(k.split(":")[0])))].sort((a, b) => a - b);
  const tajweedByKey = new Map();
  for (const s of surahs) {
    console.log(`Fetching surah ${s}...`);
    for (const [k, html] of await fetchSurahTajweed(s)) tajweedByKey.set(k, html);
  }

  let existing = {};
  try {
    existing = JSON.parse(await readFile(SNAPSHOTS_PATH, "utf8"));
  } catch {
    existing = {};
  }

  const now = new Date().toISOString();
  const out = {};
  const missing = [];
  let added = 0;
  let unchanged = 0;
  for (const key of keys) {
    const html = tajweedByKey.get(key);
    if (!html) {
      missing.push(key);
      continue;
    }
    const prev = existing[key];
    if (prev && prev.tajweedHtml === html) {
      out[key] = prev; // preserve fetchedAt so a no-change re-run is a no-op
      unchanged++;
    } else {
      out[key] = { tajweedHtml: html, arabic: stripTags(html), fetchedAt: now, source: SOURCE };
      added++;
    }
  }
  // Keep any pre-existing snapshot keys that are not current example verses.
  for (const [k, v] of Object.entries(existing)) {
    if (!(k in out)) out[k] = v;
  }

  const sorted = {};
  for (const k of Object.keys(out).sort(byVerseKey)) sorted[k] = out[k];
  await writeFile(SNAPSHOTS_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf8");

  console.log(`Wrote ${SNAPSHOTS_PATH}: ${Object.keys(sorted).length} keys (${added} new/changed, ${unchanged} unchanged).`);
  if (missing.length) {
    console.log(`WARNING: ${missing.length} example key(s) returned no tajweed verse: ${missing.join(", ")}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
