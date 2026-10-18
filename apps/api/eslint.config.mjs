import { defineConfig, globalIgnores } from "eslint/config";
// Reuse the installed TypeScript rules only; API code has no Next/React runtime dependency.
import typescript from "eslint-config-next/typescript";
export default defineConfig([
  ...typescript,
  globalIgnores(["dist/**", ".generated/**"]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-unused-expressions": "error",
    },
  },
]);
