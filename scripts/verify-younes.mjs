#!/usr/bin/env node
// Network-free isolation + config guard for the walled-off Younes Souilass
// (Warsh) narration: it must stay isolated from the Hafs catalogue and the shared
// player, it is offered per surah only, and its single host must be allowlisted in
// both mirrors with no wildcard. The per-surah Warsh URL derivation is now owned
// by the real-import test src/lib/mp3quran-url.test.ts, which imports the shipped
// builder and fails on a regression.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

// Strip // line comments and /* */ block comments so a token mentioned only in a
// comment (the panel documents its isolation by naming the very symbols it must
// not use) never false-fails an import/call check. After stripping, any remaining
// occurrence is real code.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const reciters = read("src", "lib", "reciters.ts");
const panel = read("src", "components", "mushaf", "YounesNarrationPanel.tsx");
const panelCode = stripComments(panel);
const mediaUrl = read("src", "lib", "media-url.ts");
const csp = read("next.config.mjs");

// --- Isolation from the Hafs catalogue --------------------------------------
// Younes/Souilass must not appear as a reciter id, name, or any string in
// reciters.ts (RECITATIONS or EVERYAYAH_FOLDER), and no Warsh folder may leak in.
const LEAK = /souilass|younes/i;
record(
  "Younes/Souilass is absent from the reciter catalogue",
  !LEAK.test(reciters),
  LEAK.test(reciters) ? "found souilass/younes in reciters.ts" : "",
);
record(
  "No Warsh folder leaked into reciters.ts",
  !/warsh/i.test(reciters),
  /warsh/i.test(reciters) ? "found a warsh token in reciters.ts" : "",
);

// --- Isolation from the shared player ---------------------------------------
// The panel must share no state with the Hafs player: it imports/calls none of
// usePlayer, playVerse, fetchAudioUrl, EVERYAYAH_FOLDER, or RECITATIONS. Checked
// against the comment-stripped source so the isolation-documenting comment block
// (which names these very symbols) does not false-fail.
const FORBIDDEN = ["usePlayer", "playVerse", "fetchAudioUrl", "EVERYAYAH_FOLDER", "RECITATIONS"];
const leaked = FORBIDDEN.filter((tok) => panelCode.includes(tok));
record(
  "YounesNarrationPanel references no shared-player symbol (imports/calls)",
  leaked.length === 0,
  leaked.length > 0 ? `leaked: ${leaked.join(", ")}` : "checked comment-stripped source",
);
// Belt-and-suspenders: there is no import of the player store, by path or symbol.
record(
  "YounesNarrationPanel imports no player module",
  !/import[\s\S]*?from\s+["'][^"']*player[^"']*["']/.test(panelCode) &&
    !/import\s*\{[^}]*usePlayer[^}]*\}/.test(panelCode),
  "",
);

// --- Host allowlist: both mirrors, no wildcard ------------------------------
record(
  "media-url.ts allowlists server16.mp3quran.net",
  /ALLOWED_AUDIO_HOSTS[\s\S]*?server16\.mp3quran\.net/.test(mediaUrl),
  "",
);
// No broad *.mp3quran.net suffix matcher may be added (only the specific host).
record(
  "media-url.ts adds no .mp3quran.net wildcard suffix matcher",
  !/endsWith\(["']\.mp3quran\.net["']\)/.test(mediaUrl),
  "",
);
record(
  "CSP media-src allows server16.mp3quran.net",
  /media-src[^;]*https:\/\/server16\.mp3quran\.net/.test(csp),
  "",
);
record(
  "CSP media-src has no *.mp3quran.net wildcard",
  !/\*\.mp3quran\.net/.test(csp),
  "",
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}${f.details ? ": " + f.details : ""}`);
  process.exit(1);
}
