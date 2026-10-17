import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "apps/**",
    "packages/**",
    "**/node_modules/**",
    ".next/**",
    "out/**",
    ".turbo/**",
  ]),
  {
    files: ["**/*.mjs"],
    languageOptions: { globals: { console: "readonly", process: "readonly" } },
    rules: { "no-unused-vars": "error", "no-undef": "error" },
  },
]);
