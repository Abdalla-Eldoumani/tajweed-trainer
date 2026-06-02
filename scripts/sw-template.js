// Tajweed Trainer service worker (template). Served by src/app/sw.js/route.ts,
// which stamps __BUILD_VERSION__ with a unique per-build value so every deploy
// gets fresh cache namespaces and the activate step purges the previous build's
// caches. A static cache version was the old prod bug: caches never invalidated
// across deploys, so users were served stale shells/assets.
//
// Scope is deliberately limited to the app shell and same-origin static assets:
// - HTML navigation: network-first with cache fallback (never a stale page online).
// - Same-origin static assets: cache-first (immutable hashed files).
// Cross-origin Quran audio (mp3) and the Quran.com API are intentionally NOT
// intercepted: they stream/fetch natively so the worker can never break audio
// playback (the user-facing priority), at the cost of offline Quran content.
const CACHE_VERSION = "__BUILD_VERSION__";
const SHELL_CACHE = `tajweed-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `tajweed-static-${CACHE_VERSION}`;

const SHELL_URLS = ["/", "/learn", "/practice", "/progress", "/settings", "/mushaf", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const current = new Set([SHELL_CACHE, STATIC_CACHE]);
    // Delete every cache that isn't part of this build (purges old deploys).
    await Promise.all(keys.filter((k) => !current.has(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isHtmlNavigation(request) {
  return request.mode === "navigate" || (request.method === "GET" && (request.headers.get("accept") || "").includes("text/html"));
}

function isSameOriginStatic(url) {
  if (url.origin !== self.location.origin) return false;
  return /\.(js|css|svg|png|jpg|jpeg|webp|ico|woff2?|ttf)$/i.test(url.pathname);
}

async function networkFirstHtml(request) {
  // Cache under a query-stripped key. The shell HTML is identical regardless of
  // query string, so this bounds the cache to one entry per route instead of
  // letting distinct ?query values grow it without limit.
  const url = new URL(request.url);
  const cacheKey = url.origin + url.pathname;
  try {
    const network = await fetch(request);
    if (network && network.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(cacheKey, network.clone());
    }
    return network;
  } catch {
    const cached = await caches.match(cacheKey);
    if (cached) return cached;
    const shell = await caches.match("/");
    if (shell) return shell;
    return new Response("<h1>Offline</h1>", { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

// Cache-first, but a failed/non-OK network response is returned without caching
// and never substituted with an HTML fallback (which would corrupt JS/CSS).
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const network = await fetch(request);
    if (network && network.status === 200) cache.put(request, network.clone());
    return network;
  } catch {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try { url = new URL(request.url); } catch { return; }

  // Only ever touch same-origin requests. Cross-origin (audio CDN, Quran API)
  // is left entirely to the browser so playback and data fetches are never
  // mediated by the worker.
  if (url.origin !== self.location.origin) return;
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;
  // Never intercept the service worker file itself.
  if (url.pathname === "/sw.js") return;

  if (isSameOriginStatic(url)) { event.respondWith(cacheFirst(request, STATIC_CACHE)); return; }
  if (isHtmlNavigation(request)) { event.respondWith(networkFirstHtml(request)); return; }
});
