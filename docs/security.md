# Security

This is a client-side app with no user accounts, no server data, no payments, and no PII. The threat model is correspondingly narrow, but the app still applies a few layers of defense.

## What we defend against

- **Injection through API responses.** The Quran.com Foundation API's `text_uthmani_tajweed` field is structural HTML. We trust the API, but we still pass every value through a whitelist sanitizer (`src/lib/sanitize.ts`) that allows only `<tajweed class="...">` and `<span class="end">N</span>` before it's rendered. Anything else is removed.
- **Tampered localStorage.** A user can edit `localStorage` directly. `getProgress()` parses with strict shape validation: every field is type-checked, enums are constrained to known values, arrays are capped to reasonable sizes, and unrecognized data is silently replaced with defaults. Pathological input (e.g. a 100,000-entry bookmarks array) can't bloat renders.
- **Bad URL parameters.** The Mushaf page route validates `[page]` against `^[1-9]\d*$` and the range 1–604; the surah redirect validates `[surah]` against `^[1-9]\d*$` and the range 1–114. Anything else returns a 404.
- **Clickjacking and framing.** `X-Frame-Options: DENY` and `frame-ancestors 'none'` prevent the app from being embedded.
- **MIME sniffing.** `X-Content-Type-Options: nosniff`.
- **Information leakage on outbound requests.** `Referrer-Policy: strict-origin-when-cross-origin`.
- **Browser API access.** `Permissions-Policy` denies 14 powerful features the app never needs: camera, microphone, geolocation, the FLoC interest cohort, payment, usb, serial, bluetooth, hid, midi, display-capture, accelerometer, gyroscope, and magnetometer.
- **Forced HTTPS.** `Strict-Transport-Security` set to 2 years with subdomain inclusion and preload eligibility.

## Content Security Policy

The CSP and all response headers are assembled once in `next.config.mjs` and applied to every response. This is the single source — `vercel.json` is trimmed to just `framework` and `buildCommand`, with no competing headers of its own.

| Directive | Allows |
|-----------|--------|
| `default-src 'self'` | Only same-origin by default. |
| `script-src 'self' 'unsafe-inline'` (plus `'unsafe-eval'` in dev only) | Self plus the inline shims Next.js needs for hydration. |
| `style-src 'self' 'unsafe-inline'` | Self plus inline critical CSS. |
| `font-src 'self' data:` | Self-hosted fonts (next/font); no Google Fonts origins. |
| `img-src 'self' data: blob:` | Self plus data and blob URIs (icons, ornaments). |
| `media-src 'self' https://verses.quran.com https://*.quranicaudio.com https://audio.qurancdn.com https://everyayah.com` | The per-ayah audio origins (Quran.com CDNs plus EveryAyah). |
| `connect-src 'self' https://api.quran.com` | The Quran.com API. |
| `frame-ancestors 'none'` | No embedding. |
| `base-uri 'self'` | No `<base>` redirection. |
| `form-action 'self'` | Forms can only post back to the app (we don't have any). |
| `object-src 'none'` | No `<object>` / `<embed>` / Flash. |

`'unsafe-inline'` in `script-src` is still required by Next.js's runtime today; to remove it the build would need a nonce-based CSP via middleware, which is a larger change. `'unsafe-eval'` is dropped from production responses (it's kept only in dev, where the bundler/HMR uses `eval`). Fonts are self-hosted via `next/font`, so `fonts.googleapis.com` / `fonts.gstatic.com` are no longer listed in `style-src` / `font-src`.

## Dependency hygiene

- `npm audit` is part of the contributing checklist.
- Next.js is on 16.2.7 (React 19.2.7); we track patch releases so security fixes land promptly.

## Local-only analytics

The `progress.analytics` field is a local 1000-event ring buffer that records route views and quiz starts/finishes. **It never leaves the device.** No network call is made when an event is recorded; the data is written straight to localStorage. The Insights card on `/progress` reads this buffer to surface usage stats.

Users can reset analytics three ways:

- Click "Reset all progress" on `/progress`.
- Edit the JSON backup file (Settings → Backup & Restore → Export) and remove the `analytics` array, then re-import.
- Clear site data in the browser.

We do not ship third-party analytics SDKs (Plausible, Google Analytics, PostHog, etc.) and have no plans to. If a future version adds opt-in cross-device sync, it will be opt-in, documented, and reviewed.

## PWA service worker

The worker is served by a Next route handler (`src/app/sw.js/route.ts`, `force-static`) that stamps a unique per-build version into the template `scripts/sw-template.js`. Every deploy therefore gets fresh cache namespaces, and the `activate` step purges any cache that isn't part of the current build. (The old static `public/sw.js` had a fixed `CACHE_VERSION` that never invalidated across deploys — that was the production bug that left users on stale shells and assets. It was removed.)

Scope is deliberately limited to same-origin requests:

- **HTML navigation**: network-first with cache fallback (so users always get the latest deploy when online).
- **Same-origin static assets** (`.js`, `.css`, `.svg`, fonts, images): cache-first (immutable hashed files).

Cross-origin Quran audio (mp3) and the Quran.com API are intentionally **not** intercepted — they stream/fetch natively, so the worker can never break audio playback. The trade-off is that Quran content is not available offline. The worker only ever touches same-origin requests, doesn't add tracking, and doesn't proxy POST requests. It registers only in production builds; dev (`npm run dev`) skips registration so HMR isn't fighting a stale shell.

## What we explicitly do not do

- **No third-party telemetry.** No analytics scripts, no third-party trackers. The local `analytics` field documented above is read-only, on-device, and never transmitted.
- **No user accounts.** No authentication, no session cookies, no password storage.
- **No server-side persistence.** All progress lives in the browser. Backup / Restore is a user-initiated file download / upload — never an automatic sync.
- **No third-party iframes or embedded widgets.** Everything is first-party.
- **No remote-code or remote-config behavior.** All branching is determined by code shipped in the build.
- **No TTS of Quranic text.** The Web Speech API is used only to read the practice question prompt (UI text); verse audio always comes from the verified Quran.com API reciters.

## Reporting a vulnerability

Open a GitHub issue marked `security`, or email the maintainer privately if the issue is sensitive. Please don't post exploit details publicly until a fix is available.
