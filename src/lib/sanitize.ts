// Defense-in-depth sanitizer for remote HTML from the Quran.com Foundation API:
// the verse `text_uthmani_tajweed` field (TajweedText) and tafsir/translation
// bodies (ReadingDepth). The API is trusted, but both values flow through inline
// HTML rendering, so we strip anything we don't expect to see.
//
// Strategy: ESCAPE every angle bracket to text first, then re-create ONLY the
// shapes a caller allows. Because the only raw `<`/`>` in the output are the ones
// we deliberately reconstruct, the single-pass "mutation XSS" reassembly class
// is impossible: there are no stray brackets left for a stripped-tag splice to
// recombine into a new, never-re-scanned tag (e.g. `<<img onerror=x>img ...>`).
//
// Pure string ops only: this runs on both server (SSG) and client, so it cannot
// depend on DOMParser/DOMPurify.

const ALLOWED_TAJWEED_CLASS = /^[a-z_]+$/;

// Turn every angle bracket into a text entity. `&` is left untouched so existing
// entities in the source text keep rendering correctly.
function escapeBrackets(s: string): string {
  return s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Remove any escaped tag-like sequences left after the allowlist pass, to a fixed
// point. This operates on already-escaped text, so a removal can never create a
// raw bracket; it only deletes disallowed tags that would otherwise render as
// literal text. Looping converges because each changing pass shortens the string.
function stripEscapedTags(s: string): string {
  const re = /&lt;\/?[a-zA-Z][a-zA-Z0-9]*\b(?:(?!&gt;).)*&gt;/g;
  let out = s;
  let prev: string;
  do {
    prev = out;
    out = out.replace(re, "");
  } while (out !== prev);
  return out;
}

// Match an escaped opening tag's attribute section (everything between the tag
// name and the escaped `>`), used to extract a validated class off a known tag.
function attrsOf(escapedAttrs: string): string {
  return String(escapedAttrs ?? "");
}

// The verse field only ever emits two element shapes plus Arabic text:
//   <tajweed class="rule_name">...</tajweed>
//   <span class="end">N</span>
export function sanitizeTajweedHtml(input: string): string {
  if (typeof input !== "string") return "";

  // Drop comments and CDATA before anything can hide markup inside them.
  let out = input.replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");

  out = escapeBrackets(out);

  // Re-create only the two known-safe shapes from their escaped forms.
  out = out
    .replace(/&lt;tajweed\b((?:(?!&gt;).)*)&gt;/gi, (_full, rawAttrs) => {
      const m = attrsOf(rawAttrs).match(/class\s*=\s*(?:"([a-z_]+)"|'([a-z_]+)'|([a-z_]+))/i);
      const cls = m ? (m[1] || m[2] || m[3] || "") : "";
      return ALLOWED_TAJWEED_CLASS.test(cls) ? `<tajweed class="${cls}">` : "<tajweed>";
    })
    .replace(/&lt;span\b((?:(?!&gt;).)*)&gt;/gi, (_full, rawAttrs) =>
      /class\s*=\s*(?:"end"|'end'|end\b)/i.test(attrsOf(rawAttrs)) ? '<span class="end">' : "",
    )
    .replace(/&lt;\/(tajweed|span)&gt;/gi, "</$1>");

  // Anything else stays escaped text; drop the disallowed escaped tags entirely.
  out = stripEscapedTags(out);

  // Belt and braces against URL-based vectors surviving in text content.
  out = out.replace(/javascript\s*:/gi, "").replace(/data\s*:\s*text\/html/gi, "");

  return out;
}

// Tafsir/translation bodies arrive as rich HTML (paragraphs, emphasis, footnote
// markers). They are untrusted remote HTML, so this keeps a small allowlist of
// formatting tags and strips ALL attributes (no on*/style/href/src survives),
// removing whole dangerous elements together with their contents first.
const TAFSIR_ALLOWED_TAGS = [
  "p", "br", "b", "strong", "i", "em", "u",
  "sup", "sub", "h3", "h4", "blockquote",
  "ul", "ol", "li", "span", "div",
];

const TAFSIR_TAG_RE = new RegExp(
  `&lt;(/?)(${TAFSIR_ALLOWED_TAGS.join("|")})\\b(?:(?!&gt;).)*&gt;`,
  "gi",
);

export function sanitizeTafsirHtml(input: string): string {
  if (typeof input !== "string") return "";

  // Drop comments and CDATA, then dangerous elements together with their
  // contents. The escape pass below is the actual guarantee; this only spares us
  // from rendering script/style bodies as visible text.
  let out = input.replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  out = out.replace(
    /<(script|style|iframe|object|embed|svg|math|template|noscript|link|meta|base)\b[\s\S]*?<\/\1\s*>/gi,
    "",
  );

  out = escapeBrackets(out);

  // Re-create only the allowlisted formatting tags, stripped of every attribute.
  out = out.replace(TAFSIR_TAG_RE, (_full, slash, tag) => `<${slash ? "/" : ""}${String(tag).toLowerCase()}>`);

  // Any other escaped tag (img, a, etc.) is removed entirely; text is kept.
  out = stripEscapedTags(out);

  out = out.replace(/javascript\s*:/gi, "").replace(/data\s*:\s*text\/html/gi, "");

  return out;
}
