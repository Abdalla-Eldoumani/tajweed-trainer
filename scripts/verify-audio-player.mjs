#!/usr/bin/env node
// Verifies the audio player wiring (source-parity, network-free): the store
// supports both playback modes and the full transport, the resume position
// round-trips through the consolidated storage, and a single audio element plus
// the mini-player are mounted once.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");
const store = read("src", "hooks", "usePlayer.ts");
const host = read("src", "components", "ui", "PlayerHost.tsx");
const mini = read("src", "components", "ui", "MiniPlayer.tsx");
const storage = read("src", "lib", "storage.ts");
const provider = read("src", "components", "layout", "AppProvider.tsx");

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

record("Store supports single and continuous modes", /"single"/.test(store) && /"continuous"/.test(store));

const actions = ["playVerse", "playSurah", "toggle", "pause", "resume", "next", "prev", "seek", "setSpeed", "stop", "restore", "persist"];
const missing = actions.filter((a) => !new RegExp("\\b" + a + "\\s*:").test(store));
record("Store exposes the full transport", missing.length === 0, missing.join(", "));

record("Store persists and restores resume", /setPlayerResume\(/.test(store) && /getPlayerResume\(/.test(store));

const resumeCall = (store.match(/setPlayerResume\(\{[\s\S]*?\}\)/) || [])[0] || "";
const fields = ["surah", "ayah", "mode", "offset", "reciter"];
const missingFields = fields.filter((f) => !new RegExp("\\b" + f + ":").test(resumeCall));
record("Resume payload carries surah/ayah/mode/offset/reciter", missingFields.length === 0, missingFields.join(", "));

record(
  "Storage sanitizes the resume shape",
  /function sanitizePlayerResume/.test(storage) && /playerResume: sanitizePlayerResume/.test(storage),
);

const audioCount = (host.match(/new Audio\(/g) || []).length;
record("Host reuses a single audio element (iOS rule)", audioCount === 1, `new Audio() count: ${audioCount}`);
record(
  "Host wires media element events",
  /onended/.test(host) && /ontimeupdate/.test(host) && /onloadedmetadata/.test(host),
);
record("Host wires the Media Session API", /mediaSession/.test(host) && /setActionHandler/.test(host));
record("Host preloads the next ayah in continuous mode", /continuous[\s\S]*?fetchAudioUrl/.test(host));

record(
  "PlayerHost and MiniPlayer are mounted once",
  /<PlayerHost\s*\/>/.test(provider) && /<MiniPlayer\s*\/>/.test(provider),
);
record(
  "Mini-player exposes play, seek and speed",
  /player\.play/.test(mini) && /player\.seek/.test(mini) && /player\.speed/.test(mini),
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.details}`);
  process.exit(1);
}
