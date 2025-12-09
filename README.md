# Tana Automation

Automate any button click on Tana when content changes. Watch any page, detect changes, trigger actions automatically.

## Why?

Tana doesn't have webhooks or an Output API to trigger actions on changes. This watcher monitors your Tana pages and clicks buttons (SYNC, Update, Refresh, or any custom button) when changes are detected.

## Use Cases

- 📋 **Kanban boards** - Click SYNC when cards move between columns
- 📝 **Task lists** - Trigger actions when task status changes  
- 🔄 **Any page** - Watch for DOM changes and click any button
- 🔗 **Integrations** - Trigger external syncs via Tana buttons

## Features

- 🔄 **Real-time watching** - Polls for changes (configurable interval)
- 🖱️ **Click any button** - Configure button by text or CSS selector
- 🔐 **OAuth support** - Microsoft/Google login via persistent Chrome profile
- 🐳 **Docker ready** - Deploy anywhere
- ⚙️ **Fully configurable** - All settings via environment variables
- 📢 **Notifications** - Slack/Discord webhooks for alerts

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/mrkhachaturov/tana-automation.git
cd tana-automation
npm install
```

### 2. Login to Tana

```bash
npm run login
```

Opens Chrome, waits for you to login, auto-closes when done.

### 3. Configure

```bash
cp env.example .env
```

Edit `.env`:

```bash
# Your Tana page URL
TANA_KANBAN_URL=https://app.tana.inc/?ampDeviceId=YOUR_ID&wsid=YOUR_WSID

# What to watch (for Kanban - column IDs)
COLUMNS_CONFIG=Backlog:column-XXX,In Progress:column-YYY,Done:column-ZZZ

# Button to click (by text or CSS selector)
BUTTON_TEXT=SYNC
# Or: BUTTON_SELECTOR=[data-testid="my-button"]

# How often to check (milliseconds)
POLL_INTERVAL=2000

# Optional: notifications
WEBHOOK_URL=https://hooks.slack.com/services/XXX
```

### 4. Run

**Local:**
```bash
./scripts/start-watcher.sh   # Start (background)
./scripts/stop-watcher.sh    # Stop
```

**Docker:**
```bash
docker-compose -f docker-compose.watcher.yml up -d
```

## Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `TANA_KANBAN_URL` | ✅ | Tana page URL to watch | `https://app.tana.inc/?...` |
| `COLUMNS_CONFIG` | ✅* | Columns to watch (Kanban) | `Name:testid,Name2:testid2` |
| `BUTTON_TEXT` | | Button text to click | `SYNC`, `Update`, `Refresh` |
| `BUTTON_SELECTOR` | | CSS selector for button | `[data-testid="btn"]`, `.my-btn` |
| `POLL_INTERVAL` | | Check interval (ms) | `2000` (default) |
| `WEBHOOK_URL` | | Slack/Discord notifications | `https://hooks.slack.com/...` |

*For Kanban mode. Other modes may use different config.

> **Don't know where to get column IDs?** See [How to Extract Config](docs/EXTRACT-CONFIG.md) - copy HTML from DevTools, paste to AI, get your env vars.

## Button Configuration

You can target any button:

```bash
# By text (finds button containing this text)
BUTTON_TEXT=SYNC

# By CSS selector (more precise)
BUTTON_SELECTOR=button:has-text("Update")
BUTTON_SELECTOR=[data-testid="sync-button"]
BUTTON_SELECTOR=.my-custom-button
BUTTON_SELECTOR=#submit-btn
```

## Deploying to Server

1. **Login locally:** `npm run login`
2. **Copy profile to server:** `scp -r chrome-profile/ user@server:/path/`
3. **Copy `.env` to server**
4. **Run:** `docker-compose -f docker-compose.watcher.yml up -d`

See [full deployment guide](docs/KANBAN-WATCHER.md#docker-deployment).

## How It Works

```
┌─────────────────┐     ┌─────────────────┐
│   You (Tana)    │     │  This Watcher   │
│  Make changes   │     │  (Playwright)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│           Tana (Firebase)               │
│  Real-time sync → Both see changes      │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Watcher detects change → Clicks button │
└─────────────────────────────────────────┘
```

## Project Structure

```
├── scripts/
│   ├── login.ts          # Interactive login helper
│   ├── start-watcher.sh  # Start watcher
│   └── stop-watcher.sh   # Stop watcher
├── tests/
│   ├── kanban-watcher.spec.ts    # Kanban watcher
│   ├── watch-status-changes.spec.ts  # Generic watcher
│   └── template.spec.ts          # Template for new watchers
├── docs/
│   └── KANBAN-WATCHER.md   # Full documentation
├── docker-compose.watcher.yml
├── Dockerfile
└── env.example
```

## Creating Custom Watchers

Use `tests/template.spec.ts` as a starting point:

```typescript
test("my custom watcher", async ({ page }) => {
  await page.goto("https://app.tana.inc/...");
  
  // Watch for changes
  while (true) {
    // Your detection logic here
    const changed = await detectChanges(page);
    
    if (changed) {
      // Click your button
      await page.click('button:has-text("My Button")');
    }
    
    await page.waitForTimeout(2000);
  }
});
```

## Examples

### Kanban Watcher (Status Change → SYNC)

Watch a Kanban board and click SYNC when cards move between columns.

**[📖 Full Guide](docs/KANBAN-WATCHER.md)**

```bash
# Configure
TANA_KANBAN_URL=https://app.tana.inc/?...&wsid=YOUR_BOARD
COLUMNS_CONFIG=Backlog:column-XXX,In Progress:column-YYY,Done:column-ZZZ
BUTTON_TEXT=SYNC

# Run
./scripts/start-watcher.sh
```

**Output:**
```
🔄 STATUS CHANGED: card-ABC123
   Backlog → In Progress
   Title: "My Task"
   → Clicking "SYNC"...
   ✓ Button clicked!
```

---

*More examples coming soon:*
- Task List Watcher
- Calendar Event Watcher
- Custom Field Watcher

## Documentation

- [📖 How to Extract Config from Tana](docs/EXTRACT-CONFIG.md) - Get column IDs and selectors using AI
- [Kanban Watcher Example](docs/KANBAN-WATCHER.md)
- [Playwright Docs](https://playwright.dev/docs)

## License

MIT
