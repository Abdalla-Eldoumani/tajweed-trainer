import { defineConfig } from "vitest/config";
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
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      // Vitest 4 defaults coverage.all to true, so the include is scoped to the
      // pure-logic tree; a broad include would surface untested UI at 0%.
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/types.ts", "src/lib/quran-api.ts", "**/*.test.ts"],
      // Thresholds are set in the coverage-gate plan (wave 4) after the migrated
      // suite is measured; adding an unmet threshold now would fail every run.
    },
  },
});
