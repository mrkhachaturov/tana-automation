import { test as base, chromium } from "@playwright/test";
import path from "path";
import { buildConfig, parseArgs } from "../src/config.js";
import {
  waitForWorkspace,
  updateStatus,
  updateStatusInColumn,
} from "../src/tana.js";

// Custom test fixture that uses persistent Chrome profile (already signed in)
const test = base.extend({
  // Override the default page fixture to use persistent context
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

test("sync all cards in In Progress column", async ({ page }) => {
  const config = buildConfig(parseArgs([
    "--link", "https://app.tana.inc/?ampDeviceId=86a3f802-c46c-448b-b95e-1aa568d389cd&wsid=MpQrc68i_Jn8",
    "--column", "In progress",
    "--column-testid", "column-YnoDw59tQHaz",
  ]));

  await page.goto(config.link);
  // No login needed - using persistent Chrome profile (already signed in)
  await waitForWorkspace(page);

  if (config.columnName) {
    await updateStatusInColumn(page, {
      columnName: config.columnName,
      columnTestId: config.columnTestId,
      statusField: config.statusField,
      statusValue: config.statusValue ?? "",
      cardSelector: config.cardSelector,
      statusToggleSelector: config.statusToggleSelector,
    });
  } else if (config.targetText) {
    await updateStatus(page, {
      targetText: config.targetText,
      statusField: config.statusField,
      statusValue: config.statusValue ?? "",
    });
  }
});

