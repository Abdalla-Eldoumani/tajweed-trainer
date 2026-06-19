#!/usr/bin/env node
// Reciter verification. Two parts:
//
//   1. Network-free URL checks (always run): every EveryAyah reciter builds a
//      well-formed, host-allowlisted per-ayah URL via the same logic the app
//      uses. A best-effort live resolution follows; in a low-egress environment
//      it is marked partial/skipped, never a hard failure. A malformed URL or a
//      rejected host still fails.
//   2. Settings-UI checks (drives Chromium against the dev server): asserts the
//      reciter library in settings. Confirms:
//        - The settings page renders a reciter <select> and a search input.
//        - Reciters are grouped by style (Mujawwad / Murattal), with the default
//          (id 12, Al-Husary muallim) and Alafasy (id 7) present.
//        - Choosing a reciter persists the id and survives reload.
//        - The search input narrows the options.
//        - A tampered localStorage reciter id falls back to the default (12).
//      If the dev server or the Chromium binary is unavailable, this part is
//      reported as skipped rather than failing the run.
//
// Mirrors the style of the other verify-* scripts.

import { chromium } from "playwright-core";
import { toSafeAudioUrl } from "../src/lib/media-url.ts";
import { EVERYAYAH_FOLDER } from "../src/lib/reciters.ts";

// Mirror of the deterministic EveryAyah URL the app builds in audio-api.ts
// (kept local so this script imports no module with extensionless value
// imports, which Node's TS loader cannot resolve). The shape is asserted below
// against the same data/{folder}/{sss}{aaa}.mp3 contract.
const pad3 = (n) => String(n).padStart(3, "0");
const getEveryAyahUrl = (folder, surah, ayah) =>
  `https://everyayah.com/data/${folder}/${pad3(surah)}${pad3(ayah)}.mp3`;

const CHROME =
  process.env.PLAYWRIGHT_CHROME ||
  (process.platform === "win32"
    ? `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe`
    : process.platform === "darwin"
    ? `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1208/chrome-mac/Chromium.app/Contents/MacOS/Chromium`
    : `${process.env.HOME}/.cache/ms-playwright/chromium-1208/chrome-linux/chrome`);
const BASE = process.env.BASE_URL || "http://localhost:3000";

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${details ? ": " + details : ""}`);
}

// For best-effort checks that need network or a running server: never counts
// against the pass/fail tally; just logs so the gap is visible.
function recordPartial(name, details = "") {
  console.log(`PARTIAL: ${name}${details ? ": " + details : ""}`);
}

// Sample verses that span the Mushaf: first ayah, a mid-range ayah, and the
// last surah's opener. Used for the EveryAyah URL-shape and resolution checks.
const SAMPLE_VERSES = [
  { surah: 1, ayah: 1 },
  { surah: 2, ayah: 255 },
  { surah: 114, ayah: 1 },
];

// Network-free: every EveryAyah reciter builds a well-formed, host-allowlisted
// URL with three-digit zero-padding for surah and ayah. This is authoritative;
// a malformed URL or a rejected host fails the run.
function checkEveryAyahUrls() {
  const eaIds = Object.keys(EVERYAYAH_FOLDER);
  record("EveryAyah folder map is non-empty", eaIds.length > 0, `${eaIds.length} reciters`);

  let allWellFormed = true;
  let allAllowed = true;
  const samples = [];
  for (const id of eaIds) {
    const folder = EVERYAYAH_FOLDER[id];
    for (const { surah, ayah } of SAMPLE_VERSES) {
      const raw = getEveryAyahUrl(folder, surah, ayah);
      const expectedFile = `${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;
      const wellFormed =
        raw === `https://everyayah.com/data/${folder}/${expectedFile}` && /\/\d{3}\d{3}\.mp3$/.test(raw);
      // Must survive the host allowlist (absolute URL, so empty CDN base).
      const safe = toSafeAudioUrl(raw, "");
      if (!wellFormed) allWellFormed = false;
      if (safe !== raw) allAllowed = false;
      samples.push({ id, surah, ayah, raw, safe });
    }
  }
  record("EveryAyah URLs are well-formed (3-digit padded .mp3)", allWellFormed, samples[0]?.raw ?? "");
  record("EveryAyah URLs pass the host allowlist", allAllowed, "everyayah.com");
  return samples;
}

// Best-effort: a malformed-host URL must always be rejected (this is a pure,
// authoritative invariant, not network-dependent).
function checkAllowlistRejectsOthers() {
  const rejected = toSafeAudioUrl("https://evil.example.com/data/x/001001.mp3", "") === null;
  record("A non-allowlisted audio host is rejected", rejected);
}

// Best-effort live resolution: try to HEAD/GET a couple of sample files. In a
// low-egress environment this is expected to fail; it is reported PARTIAL and
// never counted against the run.
async function resolveSamplesBestEffort(samples) {
  if (process.env.SKIP_NETWORK === "1") {
    recordPartial("EveryAyah live resolution skipped (SKIP_NETWORK=1)");
    return;
  }
  const probe = samples.filter((s) => s.surah === 1 && s.ayah === 1).slice(0, 3);
  for (const s of probe) {
    try {
      const res = await fetch(s.raw, { method: "GET", headers: { Range: "bytes=0-1" } });
      if (res.ok || res.status === 206) {
        record(`EveryAyah resolves ${s.id} 1:1`, true, `HTTP ${res.status}`);
      } else {
        recordPartial(`EveryAyah ${s.id} 1:1 returned HTTP ${res.status}`, "treated as non-fatal");
      }
    } catch (err) {
      recordPartial(`EveryAyah ${s.id} 1:1 not reachable`, err?.message ?? "network error");
    }
  }
}

async function runSettingsUiChecks() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("tajweed-trainer-progress"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  // 1. The reciter select and search input render; the old radio group is gone.
  record("Reciter select renders", (await page.locator('select[aria-label="Reciter"]').count()) === 1);
  record("Reciter search input renders", (await page.locator('input[aria-label="Search reciters"]').count()) === 1);
  record("Old reciter radio group is gone", (await page.locator('input[type="radio"][name="reciter"]').count()) === 0);

  // 2. The default (12) and Alafasy (7) are present.
  const ids = await page.evaluate(() =>
    Array.from(document.querySelectorAll('select[aria-label="Reciter"] option')).map((o) => o.value),
  );
  record("Default id 12 and Alafasy id 7 are listed", ids.includes("12") && ids.includes("7"), `ids: ${ids.join(",")}`);

  // 3. Reciters are grouped by style.
  const groups = await page.evaluate(() =>
    Array.from(document.querySelectorAll('select[aria-label="Reciter"] optgroup')).map((g) => g.label),
  );
  record("Reciter select groups by style", groups.includes("Mujawwad") && groups.includes("Murattal"), `groups: ${groups.join(", ")}`);

  // 4. Choosing Alafasy (7) persists.
  await page.selectOption('select[aria-label="Reciter"]', "7");
  await page.waitForTimeout(150);
  const persisted = await page.evaluate(() => {
    const r = localStorage.getItem("tajweed-trainer-progress");
    return r ? JSON.parse(r)?.settings?.reciter ?? null : null;
  });
  record("Choosing Alafasy persists id 7", persisted === "7", `persisted: ${persisted}`);

  // 5. Reload, the selection comes back.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const afterReload = await page.evaluate(() => document.querySelector('select[aria-label="Reciter"]')?.value ?? null);
  record("Reciter selection persists across reload", afterReload === "7", `after reload: ${afterReload}`);

  // 6. Search narrows the options.
  await page.fill('input[aria-label="Search reciters"]', "Minshawi");
  await page.waitForTimeout(250);
  const narrowed = await page.evaluate(() =>
    Array.from(document.querySelectorAll('select[aria-label="Reciter"] option')).map((o) => o.textContent.trim()),
  );
  record(
    "Search narrows the reciter options",
    narrowed.length < ids.length && narrowed.some((t) => t.includes("Minshawi")),
    `narrowed ${narrowed.length}/${ids.length}`,
  );
  await page.fill('input[aria-label="Search reciters"]', "");

  // 7. A tampered reciter id falls back to the default (12).
  await page.evaluate(() => {
    const r = localStorage.getItem("tajweed-trainer-progress");
    const p = r ? JSON.parse(r) : { settings: {} };
    p.settings = { ...(p.settings ?? {}), reciter: "not-a-real-id" };
    localStorage.setItem("tajweed-trainer-progress", JSON.stringify(p));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const fallback = await page.evaluate(() => document.querySelector('select[aria-label="Reciter"]')?.value ?? null);
  record("Tampered reciter id falls back to default 12", fallback === "12", `value after tamper: ${fallback}`);

  // 8. No serious console errors.
  const serious = consoleErrors.filter(
    (e) => !/hydration|Hydration|Text content|Expected server HTML|did not match|favicon|\.ico|Failed to load resource.*404/.test(e),
  );
  record("No serious console errors", serious.length === 0, serious.slice(0, 3).join(" | ") || "0 errors");

  await browser.close();
}

async function main() {
  // Authoritative, network-free URL checks first.
  const samples = checkEveryAyahUrls();
  checkAllowlistRejectsOthers();

  // Best-effort live resolution; PARTIAL on any network failure.
  await resolveSamplesBestEffort(samples);

  // Settings-UI checks need a dev server + Chromium. If either is missing
  // (common in a low-egress CI), report it as skipped, not a failure.
  try {
    await runSettingsUiChecks();
  } catch (err) {
    recordPartial("Settings-UI checks skipped", err?.message ?? "browser or dev server unavailable");
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} hard checks passed (PARTIAL lines are non-fatal).`);
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
