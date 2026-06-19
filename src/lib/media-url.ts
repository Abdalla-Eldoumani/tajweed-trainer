// Normalizes the audio paths the Quran.com API hands us into safe, playable
// URLs. The `url` field is populated by the API, not by the user, but we still
// refuse to load media from an unexpected origin and never downgrade to plaintext
// http, defense-in-depth in case the upstream response is ever tampered with.
// This mirrors the `media-src` allowlist in next.config.mjs.

const ALLOWED_AUDIO_HOSTS = new Set([
  "verses.quran.com",
  "audio.qurancdn.com",
  "quranicaudio.com",
  // Reviewed per-ayah source for the EveryAyah reciters (deterministic file
  // paths, no API). Mirrored in the CSP media-src in next.config.mjs.
  "everyayah.com",
]);

function isAllowedAudioHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return ALLOWED_AUDIO_HOSTS.has(h) || h.endsWith(".quranicaudio.com");
}

// Resolve an API-provided path to an https URL on an allowlisted host, or null
// if it is empty or points anywhere unexpected. Relative paths are pinned to the
// trusted CDN base.
export function toSafeAudioUrl(path: string | null | undefined, cdnBase: string): string | null {
  if (typeof path !== "string" || path.length === 0) return null;

  // Absolute or protocol-relative: must resolve to an allowlisted https host.
  if (/^https?:\/\//i.test(path) || path.startsWith("//")) {
    const normalized = path.startsWith("//") ? `https:${path}` : path.replace(/^http:\/\//i, "https://");
    try {
      const u = new URL(normalized);
      return u.protocol === "https:" && isAllowedAudioHost(u.hostname) ? u.toString() : null;
    } catch {
      return null;
    }
  }

  // Relative path: pin to the trusted CDN base.
  return cdnBase + path.replace(/^\/+/, "");
}
