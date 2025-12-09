#!/usr/bin/env npx tsx
/**
 * Interactive Login Script
 * 
 * Opens Chrome, waits for you to login to Tana, then saves the session.
 * 
 * Usage:
 *   npx tsx scripts/login.ts
 *   # or
 *   npm run login
 */
import { chromium } from "playwright";
import path from "path";
import { existsSync, mkdirSync } from "fs";

const TANA_URL = process.env.TANA_KANBAN_URL || "https://app.tana.inc";
const PROFILE_DIR = path.resolve(process.cwd(), process.env.PROFILE_DIR || "chrome-profile");

async function login() {
  console.log("\n" + "=".repeat(60));
  console.log("🔐 TANA LOGIN");
  console.log("=".repeat(60));
  console.log(`\nProfile directory: ${PROFILE_DIR}`);
  console.log(`Tana URL: ${TANA_URL}\n`);
  
  // Create profile directory if needed
  if (!existsSync(PROFILE_DIR)) {
    mkdirSync(PROFILE_DIR, { recursive: true });
    console.log("📁 Created profile directory\n");
  }
  
  console.log("🌐 Opening Chrome...");
  console.log("   Please login with Microsoft/Google in the browser window.\n");
  
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    channel: "chrome",
    viewport: { width: 1200, height: 800 },
    args: ["--start-maximized"],
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  // Navigate to Tana
  await page.goto(TANA_URL);
  
  console.log("⏳ Waiting for login...");
  console.log("   (This window will close automatically when you're logged in)\n");
  
  // Wait for successful login - look for workspace indicators
  try {
    await page.waitForSelector(
      '[data-testid^="column-"], [contenteditable="true"], [data-role="NodeAsCard"]',
      { timeout: 300_000 } // 5 minutes timeout
    );
    
    // Extra wait to ensure session is fully saved
    await page.waitForTimeout(3000);
    
    console.log("✅ LOGIN SUCCESSFUL!");
    console.log("\n" + "=".repeat(60));
    console.log("Session saved to: " + PROFILE_DIR);
    console.log("=".repeat(60));
    console.log("\nYou can now:");
    console.log("  1. Run the watcher locally:");
    console.log("     ./scripts/start-watcher.sh");
    console.log("\n  2. Copy profile to server for Docker:");
    console.log("     scp -r chrome-profile/ user@server:/path/to/web_automate/");
    console.log("\n  3. Start Docker on server:");
    console.log("     docker-compose -f docker-compose.watcher.yml up -d");
    console.log("");
    
  } catch (error) {
    console.log("\n❌ Login timed out or failed.");
    console.log("   Please try again.\n");
  }
  
  await context.close();
}

login().catch(console.error);

