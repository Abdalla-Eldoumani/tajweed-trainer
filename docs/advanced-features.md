# Advanced features: feasibility notes

These are larger, optional features that each carry a real cost or a stack
decision, so each gets a written feasibility note before any code. The
record-and-self-compare step under feature 2 has since been built; QCF V4 page
fonts and account sync remain deferred. Where a claim needs confirmation from an
external party (font licensing, for instance), that is called out explicitly
rather than asserted.

---

## 1. QCF V4 page fonts (pixel-accurate mushaf layout)

**Question.** Replace the current Amiri Quran Unicode rendering with the Quran.com
Foundation's QCF V4 per-page glyph fonts, for layout that matches a printed
Madinah mushaf line-for-line.

**How QCF V4 works.** QCF V4 ships one font file per mushaf page (604 fonts). Each
page's glyphs are encoded at private-use codepoints specific to that page, and the
API returns a `code_v2`/`v4` field per word that indexes into the page font. You do
not render Unicode Arabic; you render the page's own glyph codes with the page's
own font. This is what produces exact line breaks and justification.

**Feasibility.**
- *Rendering*: requires fetching per-word `code_v4` + `page_number` from the API
  (`words=true&word_fields=code_v2,...`) and loading the matching `pNNN.woff2`. The
  app already fetches per page (`getTajweedPage`), so the data path largely exists.
- *Tajweed coloring*: this is the hard interaction. The current color scheme works
  because `text_uthmani_tajweed` returns `<tajweed class>` spans around Unicode
  text. QCF V4 glyph codes do **not** carry tajweed classes, so coloring would
  have to be reconstructed by aligning the QCF word codes with the tajweed markup
  word by word. That alignment is non-trivial and is the main engineering cost.
- *Bundle size*: 604 page fonts. They are loaded on demand per page (not bundled),
  so the incremental cost is one ~5-20 KB woff2 per visited page, cached. Acceptable
  for a reader, but it adds 604 network assets to host or proxy.
- *Licensing*: QCF fonts are distributed by the Quran.com Foundation. **Their exact
  redistribution/self-hosting terms must be confirmed with the Foundation before
  shipping**, so do not assume. Hotlinking their CDN may be permitted; bundling
  may not. This is a blocker that is a question for a person, not code.

**Decision.** Deferred. The current Amiri Quran Unicode rendering is correct and
fully functional; QCF V4 is a fidelity upgrade, not a correctness fix. Pursue only
if (a) the Foundation confirms self-host/redistribution terms, and (b) there is
appetite for the tajweed-to-glyph alignment work. Until then, keep Amiri Quran.

---

## 2. On-device recitation feedback (separate initiative)

**Question.** Listen to a user reciting and flag tajweed/pronunciation mistakes.

**Finding.** This does not fit a static, backend-free app. Accurate recitation
assessment needs a specialized Arabic/Quranic speech model (phoneme- and
makhraj-aware), which is far heavier than anything that belongs in a Next.js static
export. Generic browser speech recognition (Web Speech API) is tuned for
conversational language, not Quranic articulation, and will not reliably judge
tajweed. Treating its output as correctness feedback would risk telling a user
their correct recitation is wrong, which is unacceptable for this domain.

**Lighter step, now shipped.** A *record-and-self-compare* feature: the user
records themselves, then plays the recording back against the reference reciter
for the same ayah, side by side, with no automated judgement. This is honest (no
model claims), fits the static app (MediaRecorder + the existing player), and is
genuinely useful for self-correction. It lives in
`src/components/mushaf/RecitationCompare.tsx` (backed by `useRecorder`), mounted
in the Mushaf reading-depth panel; the recording stays in memory and is never
uploaded, stored, or scored.

**Decision.** Automated feedback is its own project, with its own research and its
own codebase; do not bolt it onto this app. The record-and-self-compare step is
built and shipped, as scoped above.

---

## 3. Account sync (server-side, cross-device)

**Question.** Sync bookmarks, notes, goals, and progress across devices via a
Quran.com user login (OAuth).

**Finding.** OAuth requires a server to hold the client secret and to store
per-user data; that ends the pure static export this project is built on. The
current model is deliberately local-only (consolidated progress in localStorage,
with export/import for manual transfer), which keeps the app free, private, and
deployable as static files.

**Decision.** Deferred until there is real traction and a reason to take on a
backend. If pursued, it is a distinct architecture decision (a small server or a
managed backend for the OAuth secret + user store), recorded before any code. The
existing export/import backup already covers the "move my data to another device"
need without a server.

---

*Of these, only the record-and-self-compare step (feature 2) is implemented; QCF
V4 page fonts and account sync remain deferred. Each note records the decision so
the trade-off is clear before anyone picks the work up.*
