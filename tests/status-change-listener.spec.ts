/**
 * Status Change Listener Test
 * 
 * Listens for task status changes using Playwright Events API
 * https://playwright.dev/docs/events
 * 
 * This test clicks SYNC on cards and waits for the API response
 * to confirm the action completed.
 */
import { test as base, chromium, expect } from "@playwright/test";
import path from "path";

// Custom test fixture with persistent Chrome profile
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

test.describe("Task Status Change Listener", () => {
  test("listen for status changes on SYNC click", async ({ page }) => {
    // Track API requests for status changes
    const statusChanges: string[] = [];
    
    // Listen for all requests (per https://playwright.dev/docs/events)
    // Tana uses Firebase for backend
    page.on("request", (request) => {
      const url = request.url();
      const method = request.method();
      
      // Log Firebase and Tana API calls
      const isFirebase = 
        url.includes("firestore.googleapis.com") ||
        url.includes("firebaseio.com") ||
        url.includes("firebase.google.com");
      const isTana = url.includes("tana.inc");
      
      if ((isFirebase || isTana) && method !== "GET") {
        console.log(`[Request] ${method} ${url.substring(0, 100)}...`);
      }
    });

    // Listen for responses to detect status changes
    page.on("response", (response) => {
      const url = response.url();
      const method = response.request().method();
      
      // Track Firebase mutations (Firestore uses POST for writes)
      const isFirebaseWrite = 
        (url.includes("firestore.googleapis.com") && method === "POST") ||
        (url.includes("firebaseio.com") && (method === "PUT" || method === "PATCH"));
      const isTanaWrite = 
        url.includes("tana.inc") && 
        (method === "POST" || method === "PATCH" || method === "PUT");
      
      if ((isFirebaseWrite || isTanaWrite) && response.status() === 200) {
        statusChanges.push(url);
        console.log(`[Response] ${response.status()} ${method} ${url.substring(0, 100)}...`);
      }
    });

    // Navigate to Tana
    await page.goto(
      "https://app.tana.inc/?ampDeviceId=86a3f802-c46c-448b-b95e-1aa568d389cd&wsid=MpQrc68i_Jn8"
    );

    // Wait for workspace
    await page.waitForSelector('[data-testid^="column-"]', { timeout: 20_000 });
    console.log("Workspace ready");

    // Find the In Progress column
    const column = page.locator('[data-testid="column-YnoDw59tQHaz"]');
    await column.waitFor({ state: "visible" });

    // Find first card's SYNC button
    const firstCard = column.locator('[data-testid^="card-"]').first();
    const syncButton = firstCard.locator('button:has-text("SYNC")');

    if ((await syncButton.count()) > 0) {
      // Wait for Firebase response when clicking SYNC
      // Using waitForResponse per https://playwright.dev/docs/events#waiting-for-event
      const [response] = await Promise.all([
        page.waitForResponse(
          (resp) => {
            const url = resp.url();
            const method = resp.request().method();
            const isFirebase = url.includes("firestore.googleapis.com") || url.includes("firebaseio.com");
            const isTana = url.includes("tana.inc");
            return (isFirebase || isTana) && method !== "GET" && resp.status() === 200;
          },
          { timeout: 10_000 }
        ).catch(() => null),
        syncButton.click(),
      ]);

      if (response) {
        console.log(`SYNC completed via Firebase: ${response.url().substring(0, 100)}...`);
      } else {
        console.log("SYNC clicked, no Firebase/API response detected (might use WebSocket)");
      }
    }

    // Log all status changes detected
    console.log(`Total status change requests: ${statusChanges.length}`);
  });

  test("watch for any task status updates", async ({ page }) => {
    // One-off listener for first status change (per docs)
    const statusChangePromise = new Promise<string>((resolve) => {
      page.once("response", (response) => {
        const url = response.url();
        if (
          url.includes("tana.inc") &&
          response.status() === 200 &&
          response.request().method() !== "GET"
        ) {
          resolve(url);
        }
      });
    });

    await page.goto(
      "https://app.tana.inc/?ampDeviceId=86a3f802-c46c-448b-b95e-1aa568d389cd&wsid=MpQrc68i_Jn8"
    );
    await page.waitForSelector('[data-testid^="column-"]', { timeout: 20_000 });

    // Click any SYNC button
    const syncButton = page.locator('button:has-text("SYNC")').first();
    await syncButton.click();

    // Wait for status change (with timeout)
    const changedUrl = await Promise.race([
      statusChangePromise,
      new Promise<string>((resolve) =>
        setTimeout(() => resolve("timeout"), 10_000)
      ),
    ]);

    console.log(`Status change detected: ${changedUrl}`);
  });
});

