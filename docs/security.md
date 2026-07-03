# Security

A client-side app with no user accounts, server data, payments, or PII. The threat model is narrow, but the app still applies several defenses.

## What we defend against

- **Injection through API responses.** The API's `text_uthmani_tajweed` field is structural HTML; we trust the API but still pass every value through a whitelist sanitizer (`src/lib/sanitize.ts`) that allows only `<tajweed class="...">` and `<span class="end">N</span>`, removing anything else.
- **Tampered localStorage.** A user can edit `localStorage` directly. `getProgress()` parses with strict shape validation: fields are type-checked, enums constrained, arrays capped, and unrecognized data silently replaced with defaults, so pathological input (a 100,000-entry bookmarks array) cannot bloat renders. Every keyed map skips the prototype-pollution keys `__proto__`, `constructor`, and `prototype` on read. Per-field caps and validators live in [api-integrations.md](api-integrations.md#storage-caps-and-validation-contract).
- **Bad URL parameters.** The Mushaf page route validates `[page]` against `^[1-9]\d*$` and the range 1 to 604; the surah redirect validates `[surah]` against `^[1-9]\d*$` and the range 1 to 114. Anything else returns a 404.
- **Clickjacking and framing.** `X-Frame-Options: DENY` and `frame-ancestors 'none'` prevent embedding.
- **MIME sniffing.** `X-Content-Type-Options: nosniff`.
- **Information leakage on outbound requests.** `Referrer-Policy: strict-origin-when-cross-origin`.
- **Browser API access.** `Permissions-Policy` allows the microphone for same-origin only (`microphone=(self)`) for the record-your-own-voice comparison, and denies 13 other powerful features the app never needs: camera, geolocation, the FLoC interest cohort, payment, usb, serial, bluetooth, hid, midi, display-capture, accelerometer, gyroscope, and magnetometer.
- **Forced HTTPS.** `Strict-Transport-Security` set to 2 years with subdomain inclusion and preload eligibility.

## Content Security Policy

The CSP and all response headers are assembled once in `next.config.mjs` and applied to every response. This is the single source; `vercel.json` carries only `framework` and `buildCommand`, with no competing headers.

| Directive | Allows |
|-----------|--------|
| `default-src 'self'` | Only same-origin by default. |
| `script-src 'self' 'unsafe-inline'` (plus `'unsafe-eval'` in dev only) | Self plus the inline shims Next.js needs for hydration. |
| `style-src 'self' 'unsafe-inline'` | Self plus inline critical CSS. |
| `font-src 'self' data:` | Self-hosted fonts (next/font); no Google Fonts origins. |
| `img-src 'self' data: blob:` | Self plus data and blob URIs (icons, ornaments). |
| `media-src 'self' https://verses.quran.com https://*.quranicaudio.com https://audio.qurancdn.com https://everyayah.com https://server16.mp3quran.net` | The per-ayah audio origins (Quran.com CDNs plus EveryAyah) and the single host serving the per-surah Warsh narration (specific host, no wildcard). |
| `connect-src 'self' https://api.quran.com` | The Quran.com API. |
| `frame-ancestors 'none'` | No embedding. |
| `base-uri 'self'` | No `<base>` redirection. |
| `form-action 'self'` | Forms can only post back to the app (we have none). |
| `object-src 'none'` | No `<object>` / `<embed>` / Flash. |

`'unsafe-inline'` in `script-src` is still required by Next.js's runtime; removing it would need a nonce-based CSP via middleware. `'unsafe-eval'` is dropped from production (kept only in dev, where the bundler and HMR use `eval`). Fonts are self-hosted via `next/font`, so `fonts.googleapis.com` / `fonts.gstatic.com` are absent from `style-src` / `font-src`.

## Dependency hygiene

- CI runs a production dependency audit on every push and PR: `npm audit --omit=dev --audit-level=high` fails the build on a high or critical advisory in the shipped tree. Run it locally before opening a PR.
- Next.js is on 16.2.9 (React 19.2.7); we track patch releases so fixes land promptly.

## Local-only analytics

The `progress.analytics` field is a local ring buffer of route views and quiz starts and finishes. **It never leaves the device**: recording makes no network call, the data goes straight to localStorage, and the Insights card on `/progress` reads it.

Users can reset analytics three ways:

- Click "Reset all progress" on `/progress`.
- Export the JSON backup (Settings, Backup & Restore, Export), remove the `analytics` array, and re-import.
- Clear site data in the browser.

We ship no third-party analytics SDKs and have no plans to; any future cross-device sync would be opt-in, documented, and reviewed.

## PWA service worker

The worker is served by a Next route handler (`src/app/sw.js/route.ts`, `force-static`) that stamps a unique per-build version into the template `scripts/sw-template.js`. Every deploy gets fresh cache namespaces, and the `activate` step purges any cache not part of the current build (replacing an old static `public/sw.js` whose fixed `CACHE_VERSION` never invalidated across deploys).

Scope is deliberately limited to same-origin requests:

- **HTML navigation**: network-first with cache fallback, so online users get the latest deploy.
- **Same-origin static assets** (`.js`, `.css`, `.svg`, fonts, images): cache-first (immutable hashed files).

Cross-origin Quran audio (mp3) and the Quran.com API are intentionally **not** intercepted; they stream and fetch natively, so the worker can never break audio playback. The trade-off is that Quran content is not available offline. The worker never adds tracking or proxies POST requests, and registers only in production (dev skips it so HMR is not fighting a stale shell).

## What we explicitly do not do

- **No third-party telemetry.** No analytics scripts or trackers; the local `analytics` field above is read-only and on-device.
- **No user accounts.** No authentication, no session cookies, no password storage.
- **No server-side persistence.** All progress lives in the browser, including private per-verse notes (never transmitted, never religious content). Backup and Restore is a user-initiated file download/upload, never automatic sync.
- **No third-party iframes or embedded widgets.** Everything is first-party.
- **No remote-code or remote-config behavior.** All branching is fixed in the shipped build.
- **No TTS of Quranic text.** The Web Speech API reads only the practice question prompt (UI text); verse audio always comes from the verified Quran.com API reciters.

## Reporting a vulnerability

Open a GitHub issue marked `security`, or email the maintainer privately if the issue is sensitive. Please do not post exploit details publicly until a fix is available.
