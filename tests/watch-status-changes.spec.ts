/**
 * Watch for Task Status Changes
 * 
 * Opens Tana and watches for status changes in real-time.
 * When you change a task status in another browser, this detects it
 * via DOM mutations (Firebase syncs cause UI updates).
 * 
 * Usage:
 *   npx playwright test tests/watch-status-changes.spec.ts --headed --timeout=0
 */
import { test as base, chromium, expect } from "@playwright/test";
import path from "path";

// Custom test fixture with persistent Chrome profile
const test = base.extend({
  page: async ({}, use) => {
    const userDataDir = path.join(process.cwd(), "chrome-profile");
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // Must be headed to watch
      channel: "chrome",
      viewport: { width: 1400, height: 900 },
      slowMo: 50,
    });
    const page = context.pages()[0] || (await context.newPage());
    await use(page);
    await context.close();
  },
});

// Task status change event
type StatusChange = {
  nodeId: string;
  taskTitle: string;
  oldStatus: string;
  newStatus: string;
  timestamp: Date;
};

test.describe("Watch Status Changes", () => {
  test("watch for task status changes and react", async ({ page }) => {
    const statusChanges: StatusChange[] = [];
    
    // Navigate to the Tasks view
    await page.goto(
      "https://app.tana.inc/?ampDeviceId=86a3f802-c46c-448b-b95e-1aa568d389cd&wsid=Il199XTyKf9i"
    );

    // Wait for page to load
    await page.waitForSelector('[data-role="embed"]', { timeout: 30_000 });
    console.log("Tasks view loaded");

    // Get initial task states
    const getTaskStates = async () => {
      return await page.evaluate(() => {
        const tasks: { nodeId: string; title: string; status: string }[] = [];
        document.querySelectorAll('[data-role="embed"][data-node-id]').forEach((el) => {
          const nodeId = el.getAttribute("data-node-id") || "";
          const titleEl = el.querySelector(".Card-module_title__Tj-Pu");
          const title = titleEl?.textContent?.trim() || "Untitled";
          const statusEl = el.querySelector(".NavigationDimensionFields-module_dimField__vFPfb");
          const status = statusEl?.textContent?.trim() || "Unknown";
          tasks.push({ nodeId, title, status });
        });
        return tasks;
      });
    };

    let previousStates = await getTaskStates();
    console.log(`Tracking ${previousStates.length} tasks`);
    previousStates.forEach(t => console.log(`  - [${t.status}] ${t.title}`));

    // Set up mutation observer to detect DOM changes
    await page.evaluate(() => {
      (window as any).__statusChanges = [];
      
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          // Look for status field changes
          if (mutation.type === "characterData" || mutation.type === "childList") {
            const target = mutation.target as Element;
            const dimField = target.closest?.(".NavigationDimensionFields-module_dimField__vFPfb");
            if (dimField) {
              const card = dimField.closest('[data-role="embed"]');
              if (card) {
                const nodeId = card.getAttribute("data-node-id");
                const newStatus = dimField.textContent?.trim();
                (window as any).__statusChanges.push({
                  nodeId,
                  newStatus,
                  timestamp: Date.now(),
                });
              }
            }
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    });

    console.log("\n" + "=".repeat(60));
    console.log("WATCHING FOR STATUS CHANGES...");
    console.log("Change a task status in your browser - I'll detect it!");
    console.log("Press Ctrl+C to stop.");
    console.log("=".repeat(60) + "\n");

    // Poll for changes
    let iteration = 0;
    while (true) {
      await page.waitForTimeout(2000); // Check every 2 seconds
      
      // Get current states
      const currentStates = await getTaskStates();
      
      // Compare with previous states
      for (const current of currentStates) {
        const previous = previousStates.find(p => p.nodeId === current.nodeId);
        if (previous && previous.status !== current.status) {
          const change: StatusChange = {
            nodeId: current.nodeId,
            taskTitle: current.title,
            oldStatus: previous.status,
            newStatus: current.status,
            timestamp: new Date(),
          };
          statusChanges.push(change);
          
          console.log("\n🔔 STATUS CHANGE DETECTED!");
          console.log(`   Task: "${change.taskTitle}"`);
          console.log(`   ${change.oldStatus} → ${change.newStatus}`);
          console.log(`   Node ID: ${change.nodeId}`);
          console.log(`   Time: ${change.timestamp.toLocaleTimeString()}`);
          
          // TODO: Navigate to Kanban and click SYNC for this task
          // For now, just log it
          console.log("   → Would trigger SYNC for this task\n");
        }
      }
      
      previousStates = currentStates;
      
      // Show heartbeat every 30 seconds
      iteration++;
      if (iteration % 15 === 0) {
        console.log(`[${new Date().toLocaleTimeString()}] Still watching... (${statusChanges.length} changes detected)`);
      }
    }
  });

  test("detect change and click SYNC on Kanban", async ({ page }) => {
    // Navigate to Kanban view instead
    await page.goto(
      "https://app.tana.inc/?ampDeviceId=86a3f802-c46c-448b-b95e-1aa568d389cd&wsid=MpQrc68i_Jn8"
    );

    await page.waitForSelector('[data-testid^="column-"]', { timeout: 30_000 });
    console.log("Kanban view loaded");

    // Get initial card states in "In progress" column
    const getInProgressCards = async () => {
      const column = page.locator('[data-testid="column-YnoDw59tQHaz"]');
      const cards = column.locator('[data-testid^="card-"]');
      const count = await cards.count();
      const states: { cardId: string; title: string }[] = [];
      
      for (let i = 0; i < count; i++) {
        const card = cards.nth(i);
        const cardId = await card.getAttribute("data-testid") || "";
        const title = await card.locator('span[data-role="editable"]').first().textContent() || "";
        states.push({ cardId, title: title.trim() });
      }
      return states;
    };

    let previousCards = await getInProgressCards();
    console.log(`Tracking ${previousCards.length} cards in "In progress"`);

    console.log("\n" + "=".repeat(60));
    console.log("WATCHING KANBAN FOR NEW CARDS...");
    console.log("Move a task to 'In progress' - I'll click SYNC!");
    console.log("=".repeat(60) + "\n");

    while (true) {
      await page.waitForTimeout(3000);
      
      const currentCards = await getInProgressCards();
      
      // Find new cards (cards in current but not in previous)
      for (const current of currentCards) {
        const existed = previousCards.find(p => p.cardId === current.cardId);
        if (!existed) {
          console.log(`\n🆕 NEW CARD IN "IN PROGRESS": "${current.title}"`);
          
          // Find and click SYNC on this card
          const card = page.locator(`[data-testid="${current.cardId}"]`);
          const syncButton = card.locator('button:has-text("SYNC")');
          
          if ((await syncButton.count()) > 0) {
            console.log("   → Clicking SYNC...");
            await syncButton.click();
            console.log("   ✓ SYNC clicked!\n");
          } else {
            console.log("   → No SYNC button found on this card\n");
          }
        }
      }
      
      previousCards = currentCards;
    }
  });
});

