import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  // resolve.* lives at the top level (not inside `test`) and mirrors the
  // tsconfig `@/* -> ./src/*` alias so tests import shipped modules exactly the
  // way the app does. An explicit alias is used on purpose (no new plugin dep).
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Defensive: the include already scopes to src/**/*.test, and the e2e specs
    // are .spec.ts, so they are outside it. Excluding e2e/** as well keeps the
    // Playwright tree unambiguously out of the unit run.
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      // Vitest 4 defaults coverage.all to true, so the include is scoped to the
      // pure-logic tree; a broad include would surface untested UI at 0%.
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/lib/types.ts", // type-only, 0 executable lines
        "src/lib/quran-api.ts", // thin fetch/cache/retry network wrapper; behavior is Phase 3 e2e
        "src/lib/motion.ts", // View Transitions API + DOM; behavior is Phase 3 e2e
        "src/lib/search.ts", // out-of-migration-scope peripheral, no dedicated test
        "src/lib/question-pool.ts", // out-of-migration-scope peripheral, no dedicated test
        "src/lib/practice-scores.ts", // out-of-migration-scope peripheral, no dedicated test
        "src/lib/reading-resources.ts", // out-of-migration-scope peripheral, no dedicated test
        "**/*.test.ts",
      ],
      // Thresholds are set from the measured baseline (npm run coverage), not
      // aspirational round numbers. The migrated suite measured, over the
      // src/lib/** set: statements 69.79 / branches 65.04 / functions 72.44 /
      // lines 73.01. Global floors sit ~2 points below the measured aggregate;
      // the src/lib/** glob is a stricter floor that stays a point under the
      // measured lib coverage so it can ratchet up later without breaking CI on
      // a single added line. Vitest 4 glob thresholds do not inherit the
      // top-level perFile, so both blocks check their aggregate.
      thresholds: {
        statements: 67,
        branches: 61,
        functions: 70,
        lines: 71,
        "src/lib/**": {
          statements: 68,
          branches: 62,
          functions: 71,
          lines: 72,
        },
      },
    },
  },
});
