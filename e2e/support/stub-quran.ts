import type { BrowserContext, Route } from "@playwright/test";

// Fixture paths resolve relative to the current working directory, which
// Playwright sets to the repo root (where playwright.config.ts lives).
const fixture = (name: string): string => `e2e/fixtures/${name}`;

// Intercept every cross-origin call the tested screens make and fulfill it from
// a committed, captured-real fixture, so the suite is deterministic and never
// touches the live network.
//
// route.fulfill PRESERVES the request URL, so the app's CSP still applies:
// connect-src 'self' https://api.quran.com gates the API fetches and the
// media-src allowlist gates the audio element, regardless of who supplied the
// bytes. Do NOT widen next.config.mjs to satisfy a test.
export async function stubQuran(context: BrowserContext): Promise<void> {
  // api.quran.com: branch on the URL path to the matching fixture. A catch-all
  // returns a shaped-but-empty 200 so no unhandled path leaks to the network or
  // logs a console error.
  await context.route(/https:\/\/api\.quran\.com\/.*/, (route: Route) => {
    const url = route.request().url();
    if (/\/recitations\/.*\/by_ayah\//.test(url)) return route.fulfill({ path: fixture("audio-by-ayah.json") });
    if (/\/verses\/by_key\//.test(url)) return route.fulfill({ path: fixture("verse-by-key.json") });
    // getWordsForChapter requests words=true: serve the captured word list (real
    // bytes, INCLUDING the trailing char_type_name:"end" ayah-number pseudo-word),
    // so a memorized verse actually splits in the segment drill and the
    // end-marker filter is provable end-to-end (WordByWord + SegmentDrill). The
    // tajweed-only by_chapter request (words=false, getTajweedSurah) and the
    // translations by_chapter request are unused paths here — the drills resolve
    // tajweed HTML from the bundled snapshot — so they fall through to the catch-all
    // {} below, which also leaves fetchSegments' alignment degrading.
    if (/\/verses\/by_chapter\//.test(url) && /[?&]words=true\b/.test(url)) {
      return route.fulfill({ path: fixture("words-by-chapter.json") });
    }
    if (/\/resources\//.test(url)) return route.fulfill({ path: fixture("resources.json") });
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  // Audio bytes: one tiny valid SILENT mp3 (silence, not recitation) for every
  // allowlisted audio host, so audio.play() resolves and the player reaches
  // "playing" without decoding real recitation. The by_ayah fixture resolves to
  // mirrors.quranicaudio.com; the other hosts cover word audio and the Warsh
  // narration.
  await context.route(
    /https:\/\/(verses\.quran\.com|[^/]*\.quranicaudio\.com|audio\.qurancdn\.com|everyayah\.com|server16\.mp3quran\.net)\/.*/,
    (route: Route) => route.fulfill({ path: fixture("silent.mp3"), contentType: "audio/mpeg" }),
  );
}
