// Content Security Policy assembled once and shared by every response.
// connect-src whitelists the Quran.com API we call; media-src whitelists the
// audio CDNs it hands us (verses.quran.com and the quranicaudio.com mirrors).
// script-src needs 'unsafe-inline' for Next's runtime hydration shims;
// style-src needs it for inlined critical CSS.
//
// 'unsafe-eval' is only kept in development (webpack/HMR uses eval); the
// production bundle does not need it, so it is dropped from prod responses.
// Verify under `next build && next start` in a network-capable env.
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "media-src 'self' https://verses.quran.com https://*.quranicaudio.com https://audio.qurancdn.com",
  "connect-src 'self' https://api.quran.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root to this project so a stray parent-directory lockfile
  // doesn't get inferred as the root (Next 16 / Turbopack root detection).
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
