import type { BrowserContext } from "@playwright/test";

// The single localStorage funnel key (mirrors STORAGE_KEY in src/lib/storage.ts).
// Defined as a literal here on purpose: importing storage.ts would pull in
// browser globals the app reads at module scope. Keep this in sync with the app.
export const STORAGE_KEY = "tajweed-trainer-progress";

// A partial of the persisted TajweedProgress. The app's sanitizer fills every
// missing field with a default on read, so a partial seed only overrides the
// keys it names and is always safe.
export type ProgressSeed = Record<string, unknown>;

// Write the progress key into localStorage before any page script runs.
// addInitScript runs ahead of the app's own scripts, so the pre-paint bootstrap
// in layout.tsx (theme, dir/lang) and every hook's first read see the seed.
export async function seedProgress(context: BrowserContext, partial: ProgressSeed): Promise<void> {
  const payload = JSON.stringify(partial);
  await context.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [STORAGE_KEY, payload] as const,
  );
}
