// ESLint config per Playwright Best Practices
// https://playwright.dev/docs/best-practices#lint-your-tests
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Catch missing awaits - critical for Playwright
      // https://playwright.dev/docs/best-practices#lint-your-tests
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      
      // Allow unused vars with underscore prefix
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    ignores: ["node_modules/", "artifacts/", "chrome-profile/", "playwright/.auth/", "*.js"],
  },
);
