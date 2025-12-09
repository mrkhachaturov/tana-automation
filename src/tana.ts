import { mkdirSync } from "fs";
import path from "path";
import type { Page } from "playwright";
import type { Credentials } from "./config.js";

type StatusUpdate = {
  targetText: string;
  statusField: string;
  statusValue: string;
};

export type ColumnStatusUpdate = {
  columnName: string;
  columnTestId?: string;
  statusField: string;
  statusValue: string;
  cardSelector?: string;
  statusToggleSelector?: string;
};

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts");

export async function captureScreenshot(
  page: Page,
  label: string
): Promise<string> {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const filePath = path.join(
    ARTIFACT_DIR,
    `${Date.now()}-${label.replace(/\s+/g, "-")}.png`
  );
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

export async function maybeLogin(
  page: Page,
  credentials: Credentials
): Promise<void> {
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const passwordInput = page.locator(
    'input[type="password"], input[name="password"]'
  );

  if ((await emailInput.count()) === 0 && (await passwordInput.count()) === 0) {
    console.log("No login form detected; assuming session is already active.");
    return;
  }

  if (credentials.email && (await emailInput.count()) > 0) {
    await emailInput.first().fill(credentials.email);
  } else if ((await emailInput.count()) > 0) {
    console.warn("Email input present but TANA_EMAIL is missing; fill manually.");
  }

  if (credentials.password && (await passwordInput.count()) > 0) {
    await passwordInput.first().fill(credentials.password);
  } else if ((await passwordInput.count()) > 0) {
    console.warn(
      "Password input present but TANA_PASSWORD is missing; fill manually."
    );
  }

  const submitButton = page.getByRole("button", {
    name: /continue|login|log in|sign in/i,
  });

  if ((await submitButton.count()) > 0) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => null),
      submitButton.first().click(),
    ]);
  }
}

export async function waitForWorkspace(page: Page): Promise<void> {
  // Tana is a SPA - don't wait for networkidle, it may never settle
  await page.waitForLoadState("domcontentloaded");

  // Wait for Tana-specific UI elements
  const candidates = [
    '[data-testid^="column-"]', // Kanban columns
    '[class*="NodeAsCard"]', // Card elements
    '[contenteditable="true"]', // Editor
    '[data-testid="workspace"]',
    '[data-test-id="workspace-root"]',
  ];

  await Promise.any(
    candidates.map((selector) =>
      page.waitForSelector(selector, { timeout: 20000 })
    )
  ).catch(() => undefined);

  // Extra pause to let Tana finish rendering
  await page.waitForTimeout(2000);

  console.log("Workspace appears ready.");
}

export async function updateStatus(
  page: Page,
  { targetText, statusField, statusValue }: StatusUpdate
): Promise<void> {
  const cardSelectors = [
    '[role="article"]',
    '[data-test-id*="card"]',
    '[data-testid*="card"]',
    '[data-test-id*="list-item"]',
    '[data-testid*="list-item"]',
  ];

  let targetNode = page.getByText(targetText, { exact: false }).first();

  for (const selector of cardSelectors) {
    const candidate = page
      .locator(selector, { hasText: targetText })
      .first();
    if ((await candidate.count()) > 0) {
      targetNode = candidate;
      break;
    }
  }

  console.log(`Selecting node containing text: "${targetText}"`);
  await targetNode.waitFor({ state: "visible", timeout: 15_000 });
  await targetNode.scrollIntoViewIfNeeded();
  await targetNode.click({ timeout: 10_000 });

  const statusLabel = page.getByText(statusField, { exact: false }).first();
  console.log(`Opening status field "${statusField}"`);
  await statusLabel.scrollIntoViewIfNeeded();
  await statusLabel.click({ timeout: 8_000 });

  const optionByRole = page
    .getByRole("option", { name: new RegExp(statusValue, "i") })
    .first();
  if ((await optionByRole.count()) > 0) {
    await optionByRole.click({ timeout: 6_000 });
    return;
  }

  const optionByText = page.getByText(statusValue, { exact: false }).first();
  await optionByText.click({ timeout: 6_000 });
  console.log(`Set ${statusField} to ${statusValue}`);
}

export async function updateStatusInColumn(
  page: Page,
  {
    columnName,
    columnTestId,
    statusField,
    statusValue,
    cardSelector,
    statusToggleSelector,
  }: ColumnStatusUpdate
): Promise<void> {
  console.log(`Locating column: "${columnName}"${columnTestId ? ` (testId: ${columnTestId})` : ""}`);

  // Find the column by data-testid (most reliable based on HTML structure)
  // Column has: data-testid="column-YnoDw59tQHaz" class="react-kanban-column"
  let columnContainer;
  if (columnTestId) {
    columnContainer = page.locator(`[data-testid="${columnTestId}"]`);
  } else {
    // Fallback: find column by name in the editable span
    columnContainer = page.locator('.react-kanban-column').filter({
      has: page.locator(`span[data-role="editable"]:has-text("${columnName}")`)
    });
  }

  await columnContainer.first().waitFor({ state: "visible", timeout: 15_000 });
  console.log("Column found");

  // Scroll to load all cards (handles lazy loading / virtualization)
  // Keep scrolling until no new cards appear
  let previousCount = 0;
  let currentCount = 0;
  let scrollAttempts = 0;
  const maxScrollAttempts = 20; // Safety limit

  do {
    previousCount = currentCount;
    currentCount = await columnContainer.locator('[data-testid^="card-"]').count();
    
    if (currentCount > previousCount) {
      console.log(`Found ${currentCount} card(s) so far, scrolling for more...`);
    }

    // Scroll the column container down
    await columnContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(500); // Wait for potential lazy load

    scrollAttempts++;
  } while (currentCount > previousCount && scrollAttempts < maxScrollAttempts);

  // Scroll back to top before processing
  await columnContainer.evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(300);

  // Find all cards in the column
  // Each card has data-testid="card-XXX" pattern
  const cards = columnContainer.locator('[data-testid^="card-"]');

  const total = await cards.count();
  console.log(`Found ${total} card(s) in column (after scrolling)`);

  if (total === 0) {
    console.log("No cards found in this column.");
    return;
  }

  for (let index = 0; index < total; index += 1) {
    const card = cards.nth(index);
    
    // Get card text from the editable span
    const cardText = await card
      .locator('span[data-role="editable"]')
      .first()
      .innerText()
      .catch(() => `card ${index + 1}`);
    console.log(`Processing card #${index + 1}: "${cardText.slice(0, 50)}"`);

    await card.scrollIntoViewIfNeeded();

    // Click the SYNC button inside the card
    // SYNC button: <button ... class="navtarget Button-module_button__7zRTD ...">SYNC</button>
    const syncButton = card.locator('button:has-text("SYNC")').first();
    
    if ((await syncButton.count()) > 0) {
      console.log(`  Clicking SYNC button for card #${index + 1}`);
      await syncButton.click({ timeout: 6_000 });
      await page.waitForTimeout(1000); // Wait for sync to process
      continue;
    }

    // Fallback: try status toggle selector if provided
    if (statusToggleSelector) {
      const toggle = card.locator(statusToggleSelector).first();
      if ((await toggle.count()) > 0) {
        console.log(`  Clicking toggle for card #${index + 1}`);
        await toggle.click({ timeout: 6_000 });
        await page.waitForTimeout(500);
        continue;
      }
    }

    // Last fallback: click status dropdown
    if (statusValue) {
      const statusLabel = card
        .getByText(statusField, { exact: false })
        .first()
        .or(page.getByText(statusField, { exact: false }).first());
      await statusLabel.scrollIntoViewIfNeeded();
      await statusLabel.click({ timeout: 8_000 });

      const optionByRole = page
        .getByRole("option", { name: new RegExp(statusValue, "i") })
        .first();
      if ((await optionByRole.count()) > 0) {
        await optionByRole.click({ timeout: 6_000 });
        continue;
      }

      const optionByText = page.getByText(statusValue, { exact: false }).first();
      await optionByText.click({ timeout: 6_000 });
    }
  }

  console.log(`Done processing ${total} card(s)`);
}

