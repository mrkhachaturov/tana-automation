import { chromium } from "playwright";
import { existsSync } from "fs";
import { buildConfig, parseArgs } from "./config.js";
import {
  captureScreenshot,
  maybeLogin,
  updateStatusInColumn,
  updateStatus,
  waitForWorkspace,
} from "./tana.js";

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const config = buildConfig(args);

  const storageState =
    config.storageStatePath && existsSync(config.storageStatePath)
      ? config.storageStatePath
      : undefined;

  const usePersistent = Boolean(config.userDataDir);

  const browser =
    usePersistent === false
      ? await chromium.launch({
          headless: config.headless,
          slowMo: config.headless ? 0 : 75,
          channel: config.browserChannel,
        })
      : null;

  const context = usePersistent
    ? await chromium.launchPersistentContext(config.userDataDir!, {
        headless: config.headless,
        slowMo: config.headless ? 0 : 75,
        channel: config.browserChannel,
        viewport: { width: 1400, height: 900 },
      })
    : await browser!.newContext({
        viewport: { width: 1400, height: 900 },
        storageState,
      });

  const page = await context.newPage();

  console.log(
    `Opening ${config.link} in ${config.headless ? "headless" : "headed"} mode`
  );

  try {
    await page.goto(config.link, { waitUntil: "domcontentloaded" });
    await maybeLogin(page, config.credentials);
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
    } else {
      await updateStatus(page, {
        targetText: config.targetText!,
        statusField: config.statusField,
        statusValue: config.statusValue ?? "",
      });
    }

    if (config.columnName) {
      console.log(`Completed processing column "${config.columnName}"`);
    } else {
      console.log(
        `Updated "${config.targetText}" -> ${config.statusField}: ${config.statusValue}`
      );
    }

    if (config.saveStatePath) {
      await context.storageState({ path: config.saveStatePath });
      console.log(`Saved storage state to ${config.saveStatePath}`);
    }
  } catch (error) {
    const screenshot = await captureScreenshot(page, "failure");
    console.error(
      `Automation failed: ${(error as Error).message}. Screenshot: ${screenshot}`
    );
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    } else {
      await context.close();
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

