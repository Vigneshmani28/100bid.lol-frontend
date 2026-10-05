import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The backend is a separate TS project with its own eslint config/lint
    // script — it shouldn't be linted (or its build output re-linted) here.
    "backend/**",
    // Stale Next.js build-verification scratch directories (gitignored,
    // not always removable in this environment) — never lint-worthy output.
    ".next-verify*/**",
    ".next-build-verify*/**",
    // Renamed/backed-up .next build directories (e.g. ".next_old_<timestamp>",
    // gitignored, not always removable in this environment) — never
    // lint-worthy output.
    ".next_old*/**",
    // Stray sandbox scratch directory (undeletable in this environment,
    // gitignored) that can end up nested inside the project root — never
    // lint-worthy output.
    "sessions/**",
    "tmp/**",
  ]),
]);

export default eslintConfig;
