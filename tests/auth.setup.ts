/**
 * Auth Setup - Run this manually to authenticate with Microsoft/Google OAuth
 * 
 * Usage:
 *   npx playwright test tests/auth.setup.ts --headed
 * 
 * This opens Chrome with your persistent profile. Complete OAuth login,
 * then the session is saved for all future test runs.
 */
import { test as setup, chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");
const userDataDir = path.join(process.cwd(), "chrome-profile");

setup("authenticate with OAuth", async () => {
  // Ensure auth directory exists
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  // Use persistent Chrome context for OAuth (Google/Microsoft block non-Chrome)
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // Must be headed for OAuth
    channel: "chrome", // Use system Chrome
    viewport: { width: 1400, height: 900 },
    slowMo: 100,
  });

  const page = context.pages()[0] || (await context.newPage());

  // Navigate to Tana
  await page.goto(
    "https://app.tana.inc/?ampDeviceId=86a3f802-c46c-448b-b95e-1aa568d389cd&wsid=MpQrc68i_Jn8"
  );

  // Wait for user to complete OAuth login manually
  // The test will wait until the workspace is visible
  console.log("\n");
  console.log("=".repeat(60));
  console.log("Complete the OAuth login in the browser window.");
  console.log("The test will continue once you're signed in.");
  console.log("=".repeat(60));
  console.log("\n");

  // Wait for Tana workspace to be ready (indicates successful login)
  await page.waitForSelector('[data-testid^="column-"], [contenteditable="true"]', {
    timeout: 120_000, // 2 minutes to complete login
  });

  console.log("Login successful! Saving auth state...");

  // Save storage state for potential reuse
  await context.storageState({ path: authFile });
  console.log(`Auth state saved to ${authFile}`);

  // Also keep the Chrome profile (primary auth method for OAuth)
  console.log(`Chrome profile saved to ${userDataDir}`);

  await context.close();
});

