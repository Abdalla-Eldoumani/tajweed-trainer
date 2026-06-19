// Content Security Policy assembled once and shared by every response.
// connect-src whitelists the Quran.com API we call; media-src whitelists the
// audio CDNs it hands us (verses.quran.com and the quranicaudio.com mirrors)
// plus everyayah.com, the reviewed per-ayah source for the EveryAyah reciters.
// script-src needs 'unsafe-inline' for Next's runtime hydration shims;
// style-src needs it for inlined critical CSS.
//
// 'unsafe-eval' is only kept in development (webpack/HMR uses eval); the
// production bundle does not need it, so it is dropped from prod responses.
// Verify under `next build && next start` in a network-capable env.
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  // 'unsafe-inline' is required: the theme/dir bootstrap in src/app/layout.tsx
  // is an inline <script> that sets dark mode and lang/dir from localStorage
  // before paint (to avoid a flash), and Next.js emits inline hydration scripts
  // of its own. Dropping it would need a nonce-based CSP, which requires a
  // server or middleware to mint a per-request nonce. That is out of scope for
  // this static, server-less model, so do not remove it without that work.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Fonts are self-hosted via next/font; no Google Fonts origins needed.
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "media-src 'self' https://verses.quran.com https://*.quranicaudio.com https://audio.qurancdn.com https://everyayah.com",
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
  // Isolate the browsing context from cross-origin windows. The app opens no
  // popups and uses no window.opener, so same-origin is free defense.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Deny every powerful feature the app never uses, shrinking the surface a
  // post-XSS attacker could reach. The app only plays audio, which needs none
  // of these.
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "interest-cohort=()",
      "payment=()",
      "usb=()",
      "serial=()",
      "bluetooth=()",
      "hid=()",
      "midi=()",
      "display-capture=()",
      "accelerometer=()",
      "gyroscope=()",
      "magnetometer=()",
    ].join(", "),
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

import bundleAnalyzer from "@next/bundle-analyzer";

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

// Bundle analyzer, enabled only when ANALYZE=true so it never touches normal
// builds. It hooks the webpack builder, so an analysis pass must run the
// webpack build (ANALYZE=true npm run build); Turbopack ignores the plugin.
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

export default withBundleAnalyzer(nextConfig);
