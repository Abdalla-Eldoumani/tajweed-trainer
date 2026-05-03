# Security

This is a client-side app with no user accounts, no server data, no payments, and no PII. The threat model is correspondingly narrow, but the app still applies a few layers of defense.

## What we defend against

- **Injection through API responses.** The Quran.com Foundation API's `text_uthmani_tajweed` field is structural HTML. We trust the API, but we still pass every value through a whitelist sanitizer (`src/lib/sanitize.ts`) that allows only `<tajweed class="...">` and `<span class="end">N</span>` before it's rendered. Anything else is removed.
- **Tampered localStorage.** A user can edit `localStorage` directly. `getProgress()` parses with strict shape validation: every field is type-checked, enums are constrained to known values, arrays are capped to reasonable sizes, and unrecognized data is silently replaced with defaults. Pathological input (e.g. a 100,000-entry bookmarks array) can't bloat renders.
- **Bad URL parameters.** The Mushaf page route validates `[page]` against `^[1-9]\d*$` and the range 1–604; the surah redirect validates `[surah]` against `^[1-9]\d*$` and the range 1–114. Anything else returns a 404.
- **Clickjacking and framing.** `X-Frame-Options: DENY` and `frame-ancestors 'none'` prevent the app from being embedded.
- **MIME sniffing.** `X-Content-Type-Options: nosniff`.
- **Information leakage on outbound requests.** `Referrer-Policy: strict-origin-when-cross-origin`.
- **Browser API access.** `Permissions-Policy` denies camera, microphone, geolocation, and the FLoC interest cohort.
- **Forced HTTPS.** `Strict-Transport-Security` set to 2 years with subdomain inclusion and preload eligibility.

## Content Security Policy

Set in `next.config.mjs` and applied to every response:

| Directive | Allows |
|-----------|--------|
| `default-src 'self'` | Only same-origin by default. |
| `script-src 'self' 'unsafe-inline' 'unsafe-eval'` | Self plus the inline shims Next.js needs for hydration. |
| `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` | Self plus inline critical CSS plus Google Fonts CSS. |
| `font-src 'self' https://fonts.gstatic.com data:` | Self plus Google Fonts WOFF files. |
| `img-src 'self' data: blob:` | Self plus data and blob URIs (icons, ornaments). |
| `media-src 'self' https://cdn.islamic.network https://*.islamic.network` | The Al Quran Cloud audio CDN. |
| `connect-src 'self' https://api.quran.com https://api.alquran.cloud https://cdn.islamic.network` | The two Quranic APIs and their CDNs. |
| `frame-ancestors 'none'` | No embedding. |
| `base-uri 'self'` | No `<base>` redirection. |
| `form-action 'self'` | Forms can only post back to the app (we don't have any). |
| `object-src 'none'` | No `<object>` / `<embed>` / Flash. |

`'unsafe-inline'` and `'unsafe-eval'` in `script-src` are required by Next.js's runtime today. To remove them, the build would need to switch to a nonce-based CSP via middleware, which is a larger change.

## Dependency hygiene

- `npm audit` is part of the contributing checklist.
- We track Next.js patch releases on the 14.x line so security fixes land without a major-version migration. Currently pinned to `^14.2.35`, which contains the fixes for the published Next.js advisories of that line.

## Local-only analytics

The `progress.analytics` field is a local 1000-event ring buffer that records route views and quiz starts/finishes. **It never leaves the device.** No network call is made when an event is recorded; the data is written straight to localStorage. The Insights card on `/progress` reads this buffer to surface usage stats.

Users can reset analytics three ways:

- Click "Reset all progress" on `/progress`.
- Edit the JSON backup file (Settings → Backup & Restore → Export) and remove the `analytics` array, then re-import.
- Clear site data in the browser.

We do not ship third-party analytics SDKs (Plausible, Google Analytics, PostHog, etc.) and have no plans to. If a future version adds opt-in cross-device sync, it will be opt-in, documented, and reviewed.

## PWA service worker

`public/sw.js` is precached as part of the install. It uses scoped fetch handling:

- **HTML**: network-first (so users always get the latest deploy when online).
- **`/icon*.svg` and `/_next/static/*`**: cache-first (immutable assets).
- **`api.quran.com` and `api.alquran.cloud`**: stale-while-revalidate (offline reads work, fresh data lands when the network returns).
- **`cdn.islamic.network` audio**: cache-first with a 50-entry FIFO cap so the cache size stays bounded.

The worker doesn't add tracking, doesn't intercept third-party domains beyond the listed APIs, and doesn't proxy POST requests. It registers only in production builds; dev (`npm run dev`) skips registration so HMR isn't fighting a stale shell.

## What we explicitly do not do

- **No third-party telemetry.** No analytics scripts, no third-party trackers. The local `analytics` field documented above is read-only, on-device, and never transmitted.
- **No user accounts.** No authentication, no session cookies, no password storage.
- **No server-side persistence.** All progress lives in the browser. Backup / Restore is a user-initiated file download / upload — never an automatic sync.
- **No third-party iframes or embedded widgets.** Everything is first-party.
- **No remote-code or remote-config behavior.** All branching is determined by code shipped in the build.
- **No TTS of Quranic text.** The Web Speech API is used only to read the practice question prompt (UI text); verse audio always comes from the verified Al Quran Cloud reciters.

## Reporting a vulnerability

Open a GitHub issue marked `security`, or email the maintainer privately if the issue is sensitive. Please don't post exploit details publicly until a fix is available.
