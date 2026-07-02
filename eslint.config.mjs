import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// ESLint 9 flat config. Next 16's eslint-config-next ships native flat configs,
// so we spread `core-web-vitals` directly (FlatCompat trips over its plugin
// self-references). The old .eslintrc.json was removed. Node tooling scripts,
// config files, and build output are not application source, so they're ignored.
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "next-env.d.ts",
      "scripts/**",
      "public/**",
      "*.config.mjs",
      "*.config.ts",
    ],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      // The SSR-safe "set client-only state after mount" pattern (mounted flags,
      // localStorage reads, the daily-verse pick, the search debounce reset) is
      // intentional throughout for hydration safety. This React 19 lint is
      // advisory here, not a correctness bug, so it warns rather than fails.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // The Playwright e2e suite is not React: a fixture destructures a `use`
    // callback (`await use(page)`) that eslint-plugin-react-hooks v7 misreads as
    // the React `use` hook, erroring on rules-of-hooks. The react-hooks rules
    // have no meaning outside the React tree, so turn them off for e2e (the specs
    // stay linted for everything else). Same spirit as the scripts/ ignore above.
    files: ["e2e/**"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
