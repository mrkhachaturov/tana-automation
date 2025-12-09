import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000, // 60s per test
  use: {
    baseURL:
      process.env.TANA_LINK ??
      process.env.TANA_LINKS?.split(",")[0]?.trim() ??
      undefined,
    headless: process.env.HEADLESS === "1",
    viewport: { width: 1400, height: 900 },
    trace: "on-first-retry",
    channel: "chrome",
    launchOptions: {
      slowMo: 75,
    },
    // Service workers: 'allow' (default) or 'block' if caching issues
    // https://playwright.dev/docs/service-workers
    serviceWorkers: "allow",
  },
  projects: [
    // Setup project - run manually when auth expires
    // Usage: npx playwright test tests/auth.setup.ts --headed
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    // Main tests - use persistent Chrome profile
    {
      name: "tana-tests",
      testIgnore: /.*\.setup\.ts/,
      // Don't auto-depend on setup - run it manually for OAuth
    },
  ],
});

