import { describe, it, expect } from "vitest";
import { sanitizeTajweedHtml, sanitizeTafsirHtml } from "@/lib/sanitize";

// Migrated from scripts/verify-sanitizer.mjs (the two exported sanitizers). These
// call the REAL sanitizeTajweedHtml / sanitizeTafsirHtml so a correctness change to
// the source is always covered here; nothing is re-derived. Fixtures (including the
// Quranic snippets) are copied verbatim from the source script so no XSS/mutation-XSS
// case is lost. The storage-side halves the .mjs also covered (seenOnboarding,
// prototype-pollution, verseNotes, entryTags) belong to the storage test — they
// import storage.ts, not this module, and are out of scope here.

describe("sanitizeTajweedHtml - verse markup", () => {
  it("passes canonical tajweed markup through unchanged", () => {
    const canonical =
      '<tajweed class="ham_wasl">ٱ</tajweed>لْحَمْدُ <span class="end">١</span>';
    expect(sanitizeTajweedHtml(canonical)).toBe(canonical);
  });

  it("collapses empty/null/undefined input to an empty string (no throw)", () => {
    expect(sanitizeTajweedHtml("")).toBe("");
    // The runtime contract accepts null/undefined even though the type is string.
    expect(sanitizeTajweedHtml(null as unknown as string)).toBe("");
    expect(sanitizeTajweedHtml(undefined as unknown as string)).toBe("");
  });

  it("strips a script tag", () => {
    const scriptCase = "<scr" + "ipt>alert(1)</scr" + "ipt>" + "وَ";
    expect(sanitizeTajweedHtml(scriptCase).toLowerCase()).not.toContain(
      "scr" + "ipt",
    );
  });

  it("strips an iframe tag", () => {
    expect(sanitizeTajweedHtml('<iframe src="x"></iframe>وَ')).not.toContain(
      "iframe",
    );
  });

  it("strips an onclick handler on <tajweed> but keeps a valid class", () => {
    expect(
      sanitizeTajweedHtml('<tajweed class="ghunnah" onclick="alert(1)">ن</tajweed>'),
    ).toBe('<tajweed class="ghunnah">ن</tajweed>');
  });

  it("drops a disallowed tajweed class (digits/dashes)", () => {
    expect(sanitizeTajweedHtml('<tajweed class="evil-1">x</tajweed>')).toBe(
      "<tajweed>x</tajweed>",
    );
  });

  it("removes a non-end <span>", () => {
    expect(sanitizeTajweedHtml('<span class="other">x</span>')).not.toContain(
      "<span",
    );
  });

  it("preserves the end-marker <span>", () => {
    expect(sanitizeTajweedHtml('<span class="end">١</span>')).toBe(
      '<span class="end">١</span>',
    );
  });

  it("strips a javascript: URI left in text content", () => {
    expect(
      sanitizeTajweedHtml("see javascript:alert(1) here").toLowerCase(),
    ).not.toContain("javascript:");
  });

  it("strips HTML comments", () => {
    expect(sanitizeTajweedHtml("<!-- evil -->وَ")).toBe("وَ");
  });

  it("strips CDATA sections", () => {
    const cdata = "<![CDATA[<scr" + "ipt>x</scr" + "ipt>]]>وَ";
    expect(sanitizeTajweedHtml(cdata).toLowerCase()).not.toContain("scr" + "ipt");
    expect(sanitizeTajweedHtml(cdata)).toBe("وَ");
  });

  // Mutation-XSS reassembly landmine: removing an inner tag must not re-form a live
  // tag from the surrounding bytes. The escape-then-reallow design leaves no raw '<'
  // outside the two reconstructed shapes.
  it("blocks <<script>script> mutation-XSS reassembly (no raw tag survives)", () => {
    const tajweedReassembly = "<<script>script>alert(1)<</script>/script>";
    const out = sanitizeTajweedHtml(tajweedReassembly);
    expect(out).not.toContain("<scr" + "ipt");
    // After stripping the two reconstructed shapes, no raw live tag remains.
    expect(/<[a-zA-Z]/.test(out.replace(/<\/?(tajweed|span)/g, ""))).toBe(false);
  });

  it("blocks <<img onerror> mutation-XSS reassembly (no live img)", () => {
    const tajweedImgReassembly =
      "<<img src=x onerror=alert(1)>img src=x onerror=alert(1)>";
    const out = sanitizeTajweedHtml(tajweedImgReassembly);
    expect(/<img/i.test(out)).toBe(false);
    expect(/onerror=[^&]/i.test(out)).toBe(false);
  });
});

describe("sanitizeTafsirHtml - tafsir/translation bodies", () => {
  it("keeps allowed formatting tags and strips their attributes", () => {
    expect(
      sanitizeTafsirHtml('<p class="x" onclick="e()">Ibn <strong>Kathir</strong></p>'),
    ).toBe("<p>Ibn <strong>Kathir</strong></p>");
  });

  it("strips a script element and its contents", () => {
    expect(
      sanitizeTafsirHtml("<p>ok</p><scr" + "ipt>alert(1)</scr" + "ipt>").toLowerCase(),
    ).not.toContain("alert");
  });

  it("strips an iframe element and its contents", () => {
    expect(sanitizeTafsirHtml('<p>a</p><iframe src="x">b</iframe>')).toBe("<p>a</p>");
  });

  it("drops an img with onerror entirely (img is not allowed)", () => {
    expect(sanitizeTafsirHtml('<img src=x onerror="alert(1)">')).toBe("");
  });

  it("drops an anchor tag but keeps its text (no href surface)", () => {
    expect(sanitizeTafsirHtml('<a href="javascript:alert(1)">link</a>')).toBe("link");
  });

  it("strips a style element and its contents", () => {
    expect(sanitizeTafsirHtml("<style>body{color:red}</style><p>x</p>")).toBe(
      "<p>x</p>",
    );
  });

  it("strips a javascript: URI left in text", () => {
    expect(
      sanitizeTafsirHtml("see javascript:alert(1)").toLowerCase(),
    ).not.toContain("javascript:");
  });

  it("keeps a footnote sup marker but drops its attribute", () => {
    expect(sanitizeTafsirHtml('text<sup foot_note="12">1</sup>')).toBe(
      "text<sup>1</sup>",
    );
  });

  // Mutation-XSS reassembly landmines: the exact bypasses from the security audit.
  it("collapses <<img onerror> reassembly to inert text (no raw '<')", () => {
    const attack = "<<img src=x onerror=alert(1)>img src=x onerror=alert(1)>";
    const out = sanitizeTafsirHtml(attack);
    expect(out).toBe("");
    expect(out).not.toContain("<");
  });

  it("blocks <<a><svg onload> reassembly (no live tag survives)", () => {
    expect(sanitizeTafsirHtml("<<a href=x>svg onload=alert(1)>")).not.toContain("<");
  });

  it("prevents an allowed tag from smuggling an event handler", () => {
    expect(sanitizeTafsirHtml("<p onclick=alert(1)>hi</p>")).toBe("<p>hi</p>");
  });
});
