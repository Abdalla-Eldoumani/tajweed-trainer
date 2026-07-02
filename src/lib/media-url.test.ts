import { describe, it, expect } from "vitest";
import { toSafeAudioUrl } from "@/lib/media-url";

// Migrated from scripts/verify-security.mjs (the media-url half). These call the
// REAL toSafeAudioUrl so a regression in the host allowlist or the https-upgrade
// logic fails the suite; the allowlist is never re-derived as a local array here.
// The open-redirect/SSRF guard (unexpected host -> null) is the load-bearing
// landmine and is asserted for several plausible attacker hosts, including the
// suffix-boundary lookalike the wildcard match must reject.

const CDN = "https://verses.quran.com/";

describe("toSafeAudioUrl - resolution and https upgrade", () => {
  it("pins a relative path to the trusted CDN base", () => {
    expect(toSafeAudioUrl("Alafasy/mp3/001001.mp3", CDN)).toBe(
      "https://verses.quran.com/Alafasy/mp3/001001.mp3",
    );
  });

  it("upgrades a protocol-relative mirror URL to https", () => {
    expect(toSafeAudioUrl("//mirrors.quranicaudio.com/x.mp3", CDN)).toBe(
      "https://mirrors.quranicaudio.com/x.mp3",
    );
  });

  it("upgrades plaintext http on an allowed host to https", () => {
    expect(toSafeAudioUrl("http://verses.quran.com/x.mp3", CDN)).toBe(
      "https://verses.quran.com/x.mp3",
    );
  });

  it("accepts https on an allowed host (everyayah.com)", () => {
    expect(toSafeAudioUrl("https://everyayah.com/data/001001.mp3", CDN)).toBe(
      "https://everyayah.com/data/001001.mp3",
    );
  });

  it("accepts a subdomain of the wildcarded quranicaudio.com host", () => {
    expect(toSafeAudioUrl("https://mirrors.quranicaudio.com/x.mp3", CDN)).toBe(
      "https://mirrors.quranicaudio.com/x.mp3",
    );
  });
});

describe("toSafeAudioUrl - open-redirect/SSRF guard (unexpected host -> null)", () => {
  it("rejects an entirely unexpected host", () => {
    expect(toSafeAudioUrl("https://evil.example.com/x.mp3", CDN)).toBeNull();
  });

  it("rejects a suffix-boundary lookalike of the wildcard host", () => {
    // "evilquranicaudio.com" is NOT ".quranicaudio.com" — the wildcard requires a
    // real subdomain boundary, so this must not slip through.
    expect(toSafeAudioUrl("https://evilquranicaudio.com/x.mp3", CDN)).toBeNull();
  });

  it("rejects an allowed host smuggled as a subdomain of an attacker domain", () => {
    expect(toSafeAudioUrl("https://quranicaudio.com.evil.com/x.mp3", CDN)).toBeNull();
  });
});

describe("toSafeAudioUrl - empty/null input", () => {
  it("returns null for an empty string", () => {
    expect(toSafeAudioUrl("", CDN)).toBeNull();
  });

  it("returns null for null", () => {
    expect(toSafeAudioUrl(null, CDN)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(toSafeAudioUrl(undefined, CDN)).toBeNull();
  });
});
