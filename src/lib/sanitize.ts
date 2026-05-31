// Defense-in-depth sanitizer for the Quran.com Foundation API's
// `text_uthmani_tajweed` field. The API is trusted, but the value still flows
// through inline HTML rendering in TajweedText, so we strip anything we don't
// expect to see. The API only emits two element shapes:
//
//   <tajweed class="rule_name">...</tajweed>
//   <span class="end">N</span>
//
// Plus Arabic text. Everything else (script, iframe, on* attributes, javascript:
// URLs, comments, doctypes, etc.) is removed.
//
// This runs on both server and client, so it can't depend on DOMParser.

const ALLOWED_TAJWEED_CLASS = /^[a-z_]+$/;

export function sanitizeTajweedHtml(input: string): string {
  if (typeof input !== "string") return "";

  // Drop HTML comments and CDATA sections.
  let out = input.replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");

  // Walk every tag and rewrite it as either an allowed shape or empty.
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (full, rawTag, rawAttrs) => {
    const tag = String(rawTag).toLowerCase();
    const isClose = full.startsWith("</");
    const attrs = String(rawAttrs ?? "");

    if (tag === "tajweed") {
      if (isClose) return "</tajweed>";
      const cls = attrs.match(/class\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const value = cls ? (cls[2] ?? cls[3] ?? cls[4] ?? "") : "";
      return ALLOWED_TAJWEED_CLASS.test(value) ? `<tajweed class="${value}">` : "<tajweed>";
    }

    if (tag === "span") {
      if (isClose) return "</span>";
      // Only the verse-end span is allowed.
      const cls = attrs.match(/class\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const value = cls ? (cls[2] ?? cls[3] ?? cls[4] ?? "") : "";
      return value === "end" ? '<span class="end">' : "";
    }

    // Any other tag is removed entirely.
    return "";
  });

  // Belt and braces: strip any leftover javascript: or data:text/html URLs
  // that might appear inside text content.
  out = out.replace(/javascript\s*:/gi, "").replace(/data\s*:\s*text\/html/gi, "");

  return out;
}

// Tafsir bodies arrive from the Quran.com API as rich HTML (paragraphs, emphasis,
// footnote markers) — far more than the two shapes the verse field emits. They are
// untrusted remote HTML, so this keeps a small allowlist of formatting tags and
// strips ALL attributes (which removes the entire on*/style/href/src surface in one
// move), plus whole dangerous elements together with their contents. Same rigor as
// the verse sanitizer, looser tag set; runs on server and client (no DOMParser).
const TAFSIR_ALLOWED_TAGS = new Set([
  "p", "br", "b", "strong", "i", "em", "u",
  "sup", "sub", "h3", "h4", "blockquote",
  "ul", "ol", "li", "span", "div",
]);

export function sanitizeTafsirHtml(input: string): string {
  if (typeof input !== "string") return "";

  // Drop comments and CDATA first so they cannot hide markup from the tag pass.
  let out = input.replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");

  // Remove dangerous elements together with their contents.
  out = out.replace(
    /<(script|style|iframe|object|embed|svg|math|template|noscript|link|meta|base)\b[\s\S]*?<\/\1\s*>/gi,
    "",
  );

  // Rewrite every remaining tag: allowed tags survive stripped of every attribute;
  // any other tag is dropped while its text content is kept.
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (full, rawTag) => {
    const tag = String(rawTag).toLowerCase();
    if (!TAFSIR_ALLOWED_TAGS.has(tag)) return "";
    return full.startsWith("</") ? `</${tag}>` : `<${tag}>`;
  });

  // Belt and braces against URL-based vectors surviving in text content.
  out = out.replace(/javascript\s*:/gi, "").replace(/data\s*:\s*text\/html/gi, "");

  return out;
}
