// Tajweed Trainer service worker.
// - HTML navigation: network-first with cache fallback.
// - Same-origin static assets: cache-first.
// - Quran.com / Al Quran Cloud APIs: stale-while-revalidate.
// - MP3 audio: cache-first with a soft cap.
const CACHE_VERSION = "v1";
const SHELL_CACHE = `tajweed-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `tajweed-static-${CACHE_VERSION}`;
const API_CACHE = `tajweed-api-${CACHE_VERSION}`;
const AUDIO_CACHE = `tajweed-audio-${CACHE_VERSION}`;

const SHELL_URLS = ["/", "/learn", "/practice", "/progress", "/settings", "/mushaf", "/icon.svg"];
const MAX_AUDIO_ENTRIES = 60;

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
    const current = new Set([SHELL_CACHE, STATIC_CACHE, API_CACHE, AUDIO_CACHE]);
    await Promise.all(keys.filter((k) => !current.has(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isHtmlNavigation(request) {
  return request.mode === "navigate" || (request.method === "GET" && (request.headers.get("accept") || "").includes("text/html"));
}

function isQuranApi(url) {
  return url.hostname === "api.quran.com" || url.hostname === "api.alquran.cloud";
}

function isAudio(url) {
  return /\.mp3($|\?)/i.test(url.pathname) || url.hostname.includes("everyayah.com") || (url.hostname.includes("alquran.cloud") && url.pathname.includes("audio"));
}

function isSameOriginStatic(url) {
  if (url.origin !== self.location.origin) return false;
  return /\.(js|css|svg|png|jpg|jpeg|webp|ico|woff2?|ttf)$/i.test(url.pathname);
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  if (requests.length <= maxEntries) return;
  const toDelete = requests.length - maxEntries;
  for (let i = 0; i < toDelete; i++) await cache.delete(requests[i]);
}

async function networkFirstHtml(request) {
  try {
    const network = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, network.clone());
    return network;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const shell = await caches.match("/");
    if (shell) return shell;
    return new Response("<h1>Offline</h1>", { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const network = await fetch(request);
  if (network && network.status === 200) cache.put(request, network.clone());
  return network;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((network) => {
      if (network && network.status === 200) cache.put(request, network.clone());
      return network;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

async function audioCacheFirst(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const network = await fetch(request);
  if (network && network.status === 200) {
    cache.put(request, network.clone());
    trimCache(AUDIO_CACHE, MAX_AUDIO_ENTRIES);
  }
  return network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try { url = new URL(request.url); } catch { return; }

  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  if (isHtmlNavigation(request) && url.origin === self.location.origin) {
    event.respondWith(networkFirstHtml(request));
    return;
  }
  if (isAudio(url)) { event.respondWith(audioCacheFirst(request)); return; }
  if (isQuranApi(url)) { event.respondWith(staleWhileRevalidate(request, API_CACHE)); return; }
  if (isSameOriginStatic(url)) { event.respondWith(cacheFirst(request, STATIC_CACHE)); return; }
});
