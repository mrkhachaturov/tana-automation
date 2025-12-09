/**
 * Kanban Board Watcher
 * 
 * Watches for cards moving to "In progress" column and clicks SYNC.
 * 
 * Usage:
 *   npx playwright test tests/kanban-watcher.spec.ts --headed --timeout=0
 */
import { test as base, chromium } from "@playwright/test";
import path from "path";

// Custom test fixture with persistent Chrome profile
// Set HEADLESS=1 to run without visible browser
// BROWSER_CHANNEL defaults to "chrome" (required for OAuth profile compatibility)
const test = base.extend({
  page: async ({}, use) => {
    const userDataDir = path.join(process.cwd(), "chrome-profile");
    const isHeadless = process.env.HEADLESS === "1";
    const browserChannel = process.env.BROWSER_CHANNEL || "chrome";
    
    console.log(`Running in ${isHeadless ? "HEADLESS" : "HEADED"} mode`);
    console.log(`Browser channel: ${browserChannel}`);
    
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: isHeadless,
      channel: browserChannel as "chrome" | "chrome-beta" | "msedge",
      viewport: { width: 1400, height: 900 },
      slowMo: isHeadless ? 0 : 50,
    });
    const page = context.pages()[0] || (await context.newPage());
    await use(page);
    await context.close();
  },
});

// =============================================================================
// CONFIGURATION - All settings via environment variables
// =============================================================================

// Kanban board URL (required)
const KANBAN_URL = process.env.TANA_KANBAN_URL || "";

// Webhook for notifications (optional - Slack, Discord, etc.)
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";

// Button to click when status changes
// Can be: button text, CSS selector, or data-testid
const BUTTON_TEXT = process.env.BUTTON_TEXT || "SYNC";
const BUTTON_SELECTOR = process.env.BUTTON_SELECTOR || ""; // e.g., "[data-testid='sync-btn']"

// Column configuration
// Format: NAME:TESTID (comma-separated for multiple)
// Example: "Backlog:column-ABC,In Progress:column-XYZ,Done:column-123"
const COLUMNS_CONFIG = process.env.COLUMNS_CONFIG || "";

// Individual column env vars (alternative to COLUMNS_CONFIG)
const COLUMNS: Record<string, string> = {};

if (COLUMNS_CONFIG) {
  // Parse COLUMNS_CONFIG format: "Name1:id1,Name2:id2,Name3:id3"
  COLUMNS_CONFIG.split(",").forEach((pair) => {
    const [name, testId] = pair.split(":").map((s) => s.trim());
    if (name && testId) {
      // Convert name to camelCase key
      const key = name.toLowerCase().replace(/\s+/g, "");
      COLUMNS[key] = testId;
    }
  });
} else {
  // Fallback to individual env vars
  if (process.env.COLUMN_BACKLOG) COLUMNS["backlog"] = process.env.COLUMN_BACKLOG;
  if (process.env.COLUMN_IN_PROGRESS) COLUMNS["inprogress"] = process.env.COLUMN_IN_PROGRESS;
  if (process.env.COLUMN_DONE) COLUMNS["done"] = process.env.COLUMN_DONE;
  if (process.env.COLUMN_TODO) COLUMNS["todo"] = process.env.COLUMN_TODO;
  if (process.env.COLUMN_BLOCKED) COLUMNS["blocked"] = process.env.COLUMN_BLOCKED;
  if (process.env.COLUMN_REVIEW) COLUMNS["review"] = process.env.COLUMN_REVIEW;
  // Add more as needed, or use COLUMNS_CONFIG for flexibility
}

// Polling interval (milliseconds)
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "2000", 10);

// Log configuration on start
function logConfig() {
  console.log("\n" + "=".repeat(60));
  console.log("CONFIGURATION");
  console.log("=".repeat(60));
  console.log(`Kanban URL: ${KANBAN_URL || "NOT SET!"}`);
  console.log(`Button: ${BUTTON_SELECTOR || `text="${BUTTON_TEXT}"`}`);
  console.log(`Poll interval: ${POLL_INTERVAL}ms`);
  console.log(`Webhook: ${WEBHOOK_URL ? "configured" : "not set"}`);
  console.log(`Columns:`);
  Object.entries(COLUMNS).forEach(([name, id]) => {
    console.log(`  - ${name}: ${id}`);
  });
  console.log("=".repeat(60) + "\n");
}

// Send notification (Slack, Discord, etc.)
async function sendNotification(message: string, isError = false) {
  console.log(`[${isError ? "ERROR" : "INFO"}] ${message}`);
  
  if (WEBHOOK_URL) {
    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: message,
          // Slack format
          attachments: [{ color: isError ? "danger" : "good", text: message }],
          // Discord format
          content: message,
        }),
      });
    } catch (e) {
      console.error("Failed to send webhook:", e);
    }
  }
}

// Check if session expired (login page shown)
async function checkSessionExpired(page: import("playwright").Page): Promise<boolean> {
  // Look for login buttons
  const loginButtons = await page.locator('button:has-text("Sign in with"), button:has-text("Sign in with Microsoft"), button:has-text("Sign in with Google")').count();
  return loginButtons > 0;
}

test.describe("Kanban Watcher", () => {
  test("watch In Progress and click SYNC on new cards", async ({ page }) => {
    await page.goto(KANBAN_URL);
    
    // Wait for Kanban to load
    await page.waitForSelector(`[data-testid="${COLUMNS.inProgress}"]`, { timeout: 30_000 });
    console.log("Kanban board loaded");

    // Get initial cards in "In progress" column
    const getCardsInColumn = async (columnTestId: string) => {
      const column = page.locator(`[data-testid="${columnTestId}"]`);
      const cards = column.locator('[data-testid^="card-"]');
      const count = await cards.count();
      const cardIds: string[] = [];
      
      for (let i = 0; i < count; i++) {
        const testId = await cards.nth(i).getAttribute("data-testid");
        if (testId) cardIds.push(testId);
      }
      return cardIds;
    };

    let previousCards = await getCardsInColumn(COLUMNS.inProgress);
    console.log(`Initial cards in "In progress": ${previousCards.length}`);
    previousCards.forEach(id => console.log(`  - ${id}`));

    console.log("\n" + "=".repeat(60));
    console.log("WATCHING KANBAN - IN PROGRESS COLUMN");
    console.log("Drag a card to 'In progress' - I'll click SYNC!");
    console.log("Press Ctrl+C to stop.");
    console.log("=".repeat(60) + "\n");

    let syncClicks = 0;
    
    while (true) {
      await page.waitForTimeout(2000); // Poll every 2 seconds
      
      const currentCards = await getCardsInColumn(COLUMNS.inProgress);
      
      // Find NEW cards (in current but not in previous)
      for (const cardTestId of currentCards) {
        if (!previousCards.includes(cardTestId)) {
          console.log(`\n🆕 NEW CARD IN "IN PROGRESS": ${cardTestId}`);
          
          // Find the card and get its title
          const card = page.locator(`[data-testid="${cardTestId}"]`);
          const titleEl = card.locator('[data-role="editable"]').first();
          const title = await titleEl.textContent().catch(() => "Untitled");
          console.log(`   Title: "${title?.trim()}"`);
          
          // Find and click SYNC button
          const syncButton = card.locator('button:has-text("SYNC")');
          if ((await syncButton.count()) > 0) {
            console.log("   → Clicking SYNC...");
            await syncButton.click();
            syncClicks++;
            console.log(`   ✓ SYNC clicked! (Total: ${syncClicks})\n`);
          } else {
            console.log("   → No SYNC button found\n");
          }
        }
      }
      
      // Find REMOVED cards (for logging only)
      for (const cardTestId of previousCards) {
        if (!currentCards.includes(cardTestId)) {
          console.log(`📤 Card removed from "In progress": ${cardTestId}`);
        }
      }
      
      previousCards = currentCards;
    }
  });

  test("watch ALL columns - SYNC on ANY status change", async ({ page }) => {
    // Validate configuration
    if (!KANBAN_URL) {
      throw new Error("TANA_KANBAN_URL environment variable is required!");
    }
    if (Object.keys(COLUMNS).length === 0) {
      throw new Error("No columns configured! Set COLUMNS_CONFIG or individual COLUMN_* env vars.");
    }
    
    logConfig();
    
    await page.goto(KANBAN_URL);
    
    // Check if session expired
    if (await checkSessionExpired(page)) {
      const msg = "🔐 SESSION EXPIRED! Please re-login:\n" +
        "npx playwright open --channel=chrome --user-data-dir=./chrome-profile \"" + KANBAN_URL + "\"";
      await sendNotification(msg, true);
      throw new Error("Session expired - re-authentication required");
    }
    
    // Wait for first column to load
    const firstColumnId = Object.values(COLUMNS)[0];
    await page.waitForSelector(`[data-testid="${firstColumnId}"]`, { timeout: 30_000 });
    console.log("Kanban board loaded");
    await sendNotification("✅ Kanban watcher started");

    type ColumnState = { [cardId: string]: string }; // cardId -> columnId
    
    const getAllCards = async (): Promise<ColumnState> => {
      const state: ColumnState = {};
      
      for (const [name, testId] of Object.entries(COLUMNS)) {
        const column = page.locator(`[data-testid="${testId}"]`);
        const cards = column.locator('[data-testid^="card-"]');
        const count = await cards.count();
        
        for (let i = 0; i < count; i++) {
          const cardTestId = await cards.nth(i).getAttribute("data-testid");
          if (cardTestId) {
            state[cardTestId] = name;
          }
        }
      }
      return state;
    };

    let previousState = await getAllCards();
    console.log(`Tracking ${Object.keys(previousState).length} cards across columns`);

    console.log("\n" + "=".repeat(60));
    console.log("WATCHING ALL KANBAN COLUMNS");
    console.log("Move any card to ANY status - I'll click SYNC!");
    console.log("=".repeat(60) + "\n");

    let syncClicks = 0;
    let sessionCheckCounter = 0;

    while (true) {
      await page.waitForTimeout(POLL_INTERVAL);
      
      // Check session every ~1 minute
      const sessionCheckInterval = Math.ceil(60000 / POLL_INTERVAL);
      sessionCheckCounter++;
      if (sessionCheckCounter >= sessionCheckInterval) {
        sessionCheckCounter = 0;
        if (await checkSessionExpired(page)) {
          const msg = "🔐 SESSION EXPIRED during watch! Re-login required.";
          await sendNotification(msg, true);
          throw new Error("Session expired - re-authentication required");
        }
      }
      
      const currentState = await getAllCards();
      
      for (const [cardId, currentColumn] of Object.entries(currentState)) {
        const previousColumn = previousState[cardId];
        
        // STATUS CHANGED - click button on ANY change
        if (previousColumn && previousColumn !== currentColumn) {
          console.log(`\n🔄 STATUS CHANGED: ${cardId}`);
          console.log(`   ${previousColumn} → ${currentColumn}`);
          
          const card = page.locator(`[data-testid="${cardId}"]`);
          const titleEl = card.locator('[data-role="editable"]').first();
          const title = await titleEl.textContent().catch(() => "Untitled");
          console.log(`   Title: "${title?.trim()}"`);
          
          // Click configured button
          const button = BUTTON_SELECTOR 
            ? card.locator(BUTTON_SELECTOR)
            : card.locator(`button:has-text("${BUTTON_TEXT}")`);
            
          if ((await button.count()) > 0) {
            console.log(`   → Clicking "${BUTTON_TEXT}"...`);
            await button.click();
            syncClicks++;
            console.log(`   ✓ Button clicked! (Total: ${syncClicks})\n`);
          } else {
            console.log(`   → No "${BUTTON_TEXT}" button found\n`);
          }
        }
        
        // New card appeared
        if (!previousColumn) {
          console.log(`🆕 NEW CARD: ${cardId} in ${currentColumn}`);
          // Also click button for new cards
          const card = page.locator(`[data-testid="${cardId}"]`);
          const button = BUTTON_SELECTOR 
            ? card.locator(BUTTON_SELECTOR)
            : card.locator(`button:has-text("${BUTTON_TEXT}")`);
            
          if ((await button.count()) > 0) {
            console.log(`   → Clicking "${BUTTON_TEXT}" for new card...`);
            await button.click();
            syncClicks++;
            console.log(`   ✓ Button clicked! (Total: ${syncClicks})\n`);
          }
        }
      }
      
      // Card removed entirely
      for (const [cardId, col] of Object.entries(previousState)) {
        if (!currentState[cardId]) {
          console.log(`🗑️ CARD REMOVED: ${cardId} (was in ${col})`);
        }
      }
      
      previousState = currentState;
    }
  });
});

