# Tana Automation

Automatically clicks SYNC on Tana Kanban cards when their status changes. Uses Playwright for browser automation with Microsoft/Google OAuth support.

## Why?

Tana doesn't have webhooks or an Output API to trigger actions on status changes. This watcher polls your Kanban board and clicks SYNC whenever a card moves between columns.

## Features

- 🔄 **Real-time watching** - Detects card status changes every 2 seconds
- 🖱️ **Auto SYNC** - Clicks the SYNC button automatically
- 🔐 **OAuth support** - Works with Microsoft/Google login
- 🐳 **Docker ready** - Deploy to any server
- ⚙️ **Fully configurable** - Via environment variables

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

This opens Chrome, waits for you to login, and auto-closes when done.

### 3. Configure

```bash
cp env.example .env
```

Edit `.env` with your Kanban board URL and column IDs:

```bash
TANA_KANBAN_URL=https://app.tana.inc/?ampDeviceId=YOUR_ID&wsid=YOUR_WSID
COLUMNS_CONFIG=Backlog:column-XXX,In Progress:column-YYY,Done:column-ZZZ
BUTTON_TEXT=SYNC
```

**Finding column IDs:** Right-click column header → Inspect → find `data-testid="column-XXXXX"`

### 4. Run

**Local (headed for debugging):**
```bash
npx playwright test tests/kanban-watcher.spec.ts --headed --timeout=0 --grep "watch ALL columns"
```

**Local (headless background):**
```bash
./scripts/start-watcher.sh
./scripts/stop-watcher.sh   # To stop
```

**Docker:**
```bash
docker-compose -f docker-compose.watcher.yml up -d
docker-compose -f docker-compose.watcher.yml logs -f  # View logs
```

## Deploying to a Server

See [Deployment Guide](docs/KANBAN-WATCHER.md#docker-deployment) for full instructions.

**Quick version:**

1. Login locally: `npm run login`
2. Copy profile to server: `scp -r chrome-profile/ user@server:/path/`
3. Copy `.env` to server
4. Run: `docker-compose -f docker-compose.watcher.yml up -d`

## Configuration

All settings via environment variables (`.env` file):

| Variable | Required | Description |
|----------|----------|-------------|
| `TANA_KANBAN_URL` | ✅ | Your Kanban board URL |
| `COLUMNS_CONFIG` | ✅ | Columns: `Name:testid,Name2:testid2` |
| `BUTTON_TEXT` | | Button to click (default: `SYNC`) |
| `POLL_INTERVAL` | | Check interval in ms (default: `2000`) |
| `WEBHOOK_URL` | | Slack/Discord webhook for notifications |

## Project Structure

```
├── scripts/
│   ├── login.ts          # Interactive login helper
│   ├── start-watcher.sh  # Start watcher (background)
│   └── stop-watcher.sh   # Stop watcher
├── tests/
│   └── kanban-watcher.spec.ts  # Main watcher logic
├── docs/
│   └── KANBAN-WATCHER.md       # Full documentation
├── docker-compose.watcher.yml  # Docker deployment
├── Dockerfile
└── env.example                 # Configuration template
```

## How It Works

```
┌─────────────────┐     ┌─────────────────┐
│  Your Browser   │     │  This Watcher   │
│  (change status)│     │  (Playwright)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│           Tana (Firebase)               │
│  Real-time sync → Both see changes      │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Watcher polls  │
│  every 2 sec,   │
│  clicks SYNC    │
└─────────────────┘
```

## Documentation

- [Full Kanban Watcher Docs](docs/KANBAN-WATCHER.md)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)

## License

MIT
