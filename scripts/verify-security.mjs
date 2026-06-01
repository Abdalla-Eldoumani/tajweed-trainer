#!/usr/bin/env node
// Network-free security checks: CSP origins, input validation at the URL
// boundary, and absence of third-party trackers.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");
const csp = read("next.config.mjs");
const api = read("src", "lib", "quran-api.ts");
const validate = read("src", "lib", "validate.ts");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? " — " + details : ""}`);
}

record("CSP allows the Quran.com API in connect-src", /connect-src[^;]*api\.quran\.com/.test(csp));
record(
  "CSP allows verse and word audio in media-src",
  /media-src[^;]*verses\.quran\.com/.test(csp) && /media-src[^;]*audio\.qurancdn\.com/.test(csp),
);
record("CSP blocks objects and framing", /object-src 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp));
record(
  "CSP gates 'unsafe-eval' to development only",
  /isDev\s*=\s*process\.env\.NODE_ENV/.test(csp) && /script-src[^`]*\$\{isDev \? " 'unsafe-eval'" : ""\}/.test(csp),
);
record("CSP keeps verse and tafsir HTML safe via the sanitizer", /sanitizeTafsirHtml/.test(api));
record(
  "No analytics or ad origins in CSP",
  !/google-analytics|googletagmanager|doubleclick|facebook|hotjar|segment|mixpanel/i.test(csp),
);

record(
  "validate.ts defines division clamps",
  /export const clampSurah/.test(validate) && /export const clampPage/.test(validate) && /export const clampJuz/.test(validate),
);
record(
  "validate.ts validates resource ids and verse keys",
  /export function isValidResourceId/.test(validate) && /export function isValidVerseKey/.test(validate),
);
record("validate.ts sanitizes the search query", /export function sanitizeSearchQuery/.test(validate));

record("API imports the validators", /from "\.\/validate"/.test(api));
record("Reading-depth wrappers clamp the surah", /clampSurah\(/.test(api));
record("Reading-depth wrappers validate resource ids", /isValidResourceId\(/.test(api));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}`);
  process.exit(1);
}
