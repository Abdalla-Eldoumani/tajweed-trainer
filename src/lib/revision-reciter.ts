import type { ReciterId, UserSettings } from "./types";

// The ONE place the revision-reciter fallback lives (PROG-02). The four revision
// / recall surfaces (wired in 12-04) all resolve through here so they can never
// diverge: an explicit `revisionReciter` overrides the browse reciter, and an
// unset one (undefined) falls back to it. Both fields are already sanitized on
// read (see storage.ts sanitizeSettings), so this can only emit a known reciter
// id. Pure: no React / next / storage import, so the src/lib/** coverage gate
// counts it and revision-reciter.test.ts exercises it directly.
export function resolveRevisionReciter(settings: UserSettings): ReciterId {
  return settings.revisionReciter ?? settings.reciter;
}
