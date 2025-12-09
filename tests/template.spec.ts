/**
 * Test Template - Copy this file to create new tests
 * 
 * Usage:
 *   1. Copy this file: cp tests/template.spec.ts tests/my-feature.spec.ts
 *   2. Rename the test and update the logic
 *   3. Run: npx playwright test tests/my-feature.spec.ts --headed
 */
import { test as base, chromium, expect } from "@playwright/test";
import path from "path";

// Custom test fixture with persistent Chrome profile (OAuth)
const test = base.extend({
  page: async ({}, use) => {
    const userDataDir = path.join(process.cwd(), "chrome-profile");
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: process.env.HEADLESS === "1",
      channel: "chrome",
      viewport: { width: 1400, height: 900 },
      slowMo: 75,
    });
    const page = context.pages()[0] || (await context.newPage());
    await use(page);
    await context.close();
  },
});

// ============================================================
// YOUR TEST HERE - Modify below
// ============================================================

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Tana before each test
    await page.goto(
      "https://app.tana.inc/?ampDeviceId=86a3f802-c46c-448b-b95e-1aa568d389cd&wsid=MpQrc68i_Jn8"
    );
    
    // Wait for workspace to load
    await page.waitForSelector('[data-testid^="column-"], [contenteditable="true"]', {
      timeout: 20_000,
    });
  });

  test("example test", async ({ page }) => {
    // Your test logic here
    // Example: Click a button and verify result
    
    // await page.getByRole("button", { name: "Click me" }).click();
    // await expect(page.getByText("Success")).toBeVisible();
  });

  test.skip("skipped test - enable when ready", async ({ page }) => {
    // This test is skipped until implemented
  });
});

