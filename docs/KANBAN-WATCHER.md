# Kanban Watcher

Automatically clicks SYNC on Tana cards when their status changes.

## How It Works

1. Opens the Kanban board (headless or headed)
2. Polls every 2 seconds for card position changes
3. When a card moves between columns (status change), clicks its SYNC button
4. Runs infinitely until stopped

## Quick Start

```bash
# Install dependencies
npm install

# Login (opens Chrome, auto-detects when done)
npm run login

# Run watcher (headless)
./scripts/start-watcher.sh   # Start (headless, background)
./scripts/stop-watcher.sh    # Stop
```

## Configuration

All settings are via **environment variables** - no code changes needed!

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `TANA_KANBAN_URL` | ✅ | Your Kanban board URL | `https://app.tana.inc/?ampDeviceId=...&wsid=...` |
| `COLUMNS_CONFIG` | ✅* | All columns in one string | `Backlog:column-ABC,In Progress:column-XYZ` |
| `BUTTON_TEXT` | | Button text to click (default: "SYNC") | `SYNC`, `Update`, `Refresh` |
| `BUTTON_SELECTOR` | | CSS selector for button (overrides BUTTON_TEXT) | `[data-testid="sync-btn"]` |
| `POLL_INTERVAL` | | Check interval in ms (default: 2000) | `1000`, `5000` |
| `WEBHOOK_URL` | | Slack/Discord webhook for notifications | `https://hooks.slack.com/...` |

*Or use individual `COLUMN_*` variables

### Individual Column Variables

| Variable | Description |
|----------|-------------|
| `COLUMN_BACKLOG` | Backlog column testid |
| `COLUMN_TODO` | Todo column testid |
| `COLUMN_IN_PROGRESS` | In Progress column testid |
| `COLUMN_REVIEW` | Review column testid |
| `COLUMN_BLOCKED` | Blocked column testid |
| `COLUMN_DONE` | Done column testid |

### Finding Column IDs

1. Open your Kanban board in Chrome
2. Right-click a column header → Inspect
3. Find `data-testid="column-XXXXX"`
4. Copy the full value (e.g., `column-MdFbOUqzn6cV`)

### Example .env File

```bash
# Copy env.example to .env and edit:
cp env.example .env

# Required
TANA_KANBAN_URL=https://app.tana.inc/?ampDeviceId=86a3f802-c46c-448b-b95e-1aa568d389cd&wsid=p6wEf4b6qB4L
COLUMNS_CONFIG=Backlog:column-MdFbOUqzn6cV,In Progress:column-YnoDw59tQHaz,Done:column-F7nGPDvh6iLi

# Optional
BUTTON_TEXT=SYNC
POLL_INTERVAL=2000
WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
```

## Running Modes

### Headed (for debugging)
```bash
npx playwright test tests/kanban-watcher.spec.ts --headed --timeout=0 --grep "watch ALL columns"
```

### Headless (production)
```bash
HEADLESS=1 npx playwright test tests/kanban-watcher.spec.ts --timeout=0 --grep "watch ALL columns"
```

### Background process
```bash
# Start
./scripts/start-watcher.sh

# Check logs
tail -f /path/to/terminal/output

# Stop
./scripts/stop-watcher.sh
```

## What Gets Detected

| Event | Action |
|-------|--------|
| Card moves Backlog → In Progress | ✅ Click SYNC |
| Card moves In Progress → Done | ✅ Click SYNC |
| Card moves Done → Backlog | ✅ Click SYNC |
| Card moves to ANY column | ✅ Click SYNC |
| New card appears | ✅ Click SYNC |
| Card deleted | 📝 Log only |

## Daily Usage

**Morning:**
```bash
./scripts/start-watcher.sh
```

**Night:**
```bash
./scripts/stop-watcher.sh
```

## Troubleshooting

### "Session expired" / Login required
Re-authenticate on your local PC, then copy profile to server:
```bash
# On local PC
npx playwright open --channel=chrome --user-data-dir=./chrome-profile "https://app.tana.inc"
# Login, close browser

# Copy to server
scp -r chrome-profile/ user@server:/path/to/web_automate/

# Restart container on server
docker-compose -f docker-compose.watcher.yml restart
```

### "Profile already in use" / "Profile locked"
The profile has lock files from another Chrome instance:
```bash
# Docker auto-clears locks on start, but if needed manually:
rm -f chrome-profile/SingletonLock chrome-profile/SingletonCookie chrome-profile/SingletonSocket
```

### Watcher not detecting changes
1. Check the Kanban URL is correct
2. Verify column test IDs match your board
3. Run headed locally to see what's happening:
   ```bash
   npx playwright test tests/kanban-watcher.spec.ts --headed --timeout=0
   ```

### "Chrome not found" in Docker
Chrome wasn't installed. Rebuild with no cache:
```bash
docker-compose -f docker-compose.watcher.yml build --no-cache
```

### Profile created on Mac, running on Linux server
This works! Chrome profiles are cross-platform compatible. Just copy the folder.

### How to find column IDs
1. Open your Kanban board in Chrome
2. Right-click on a column header → "Inspect"
3. Look for `data-testid="column-XXXXX"`
4. Copy the full ID (e.g., `column-MdFbOUqzn6cV`)

## Docker Deployment

### Prerequisites

Before deploying to a server, you need to create a Chrome profile with your login session.

#### On Your Local PC (Windows/Mac/Linux)

1. **Install Node.js** (v18 or later):
   - Windows: Download from https://nodejs.org/
   - Mac: `brew install node`
   - Linux: `sudo apt install nodejs npm`

2. **Install Playwright globally**:
   ```bash
   npm install -g playwright
   npx playwright install chrome
   ```

3. **Create the Chrome profile with login** (easy way):
   ```bash
   # Clone/download this project first
   git clone <repo-url> web_automate
   cd web_automate
   npm install
   
   # Run the login helper
   npm run login
   ```
   
   This will:
   - Open Chrome automatically
   - Wait for you to login (Microsoft/Google)
   - **Auto-close when login is detected**
   - Save the session to `chrome-profile/`

   **Alternative (manual way)**:
   ```bash
   npx playwright open --channel=chrome --user-data-dir=./chrome-profile "https://app.tana.inc"
   # Login, then manually close the browser
   ```

4. **Verify profile was created**:
   ```bash
   ls chrome-profile/
   # Should see: Default/, Local State, etc.
   ```

#### Copy Profile to Server

```bash
# Option 1: SCP
scp -r chrome-profile/ user@server:/path/to/web_automate/

# Option 2: rsync
rsync -avz chrome-profile/ user@server:/path/to/web_automate/chrome-profile/

# Option 3: Archive and transfer
tar -czf chrome-profile.tar.gz chrome-profile/
scp chrome-profile.tar.gz user@server:/path/to/web_automate/
# On server: tar -xzf chrome-profile.tar.gz
```

### Setup on Server

1. **Clone/copy the project**:
   ```bash
   git clone <your-repo> web_automate
   cd web_automate
   ```

2. **Ensure chrome-profile folder exists** (from previous step):
   ```bash
   ls chrome-profile/  # Should have Default/, Local State, etc.
   ```

3. **Configure environment**:
   ```bash
   # Copy example config
   cp env.example .env
   
   # Edit with your values
   nano .env
   ```
   
   Required settings in `.env`:
   ```bash
   # Your Tana Kanban board URL
   TANA_KANBAN_URL=https://app.tana.inc/?ampDeviceId=YOUR_ID&wsid=YOUR_WSID
   
   # Your column IDs (find via browser inspect on column headers)
   COLUMNS_CONFIG=Backlog:column-XXX,In Progress:column-YYY,Done:column-ZZZ
   
   # Button to click (default: SYNC)
   BUTTON_TEXT=SYNC
   
   # Optional: Slack/Discord notifications
   WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
   ```

4. **Build and start** (x86 server):
   ```bash
   docker-compose -f docker-compose.watcher.yml up -d --build
   ```
   
   **For ARM Mac with emulation**:
   ```bash
   docker-compose -f docker-compose.watcher.yml build --no-cache
   docker-compose -f docker-compose.watcher.yml up -d
   ```

5. **Verify it's running**:
   ```bash
   docker-compose -f docker-compose.watcher.yml logs -f
   ```

### Commands

```bash
# Start
docker-compose -f docker-compose.watcher.yml up -d

# View logs
docker-compose -f docker-compose.watcher.yml logs -f

# Stop
docker-compose -f docker-compose.watcher.yml down

# Restart
docker-compose -f docker-compose.watcher.yml restart
```

### Deployment Checklist

- [ ] Node.js installed on local PC
- [ ] Playwright installed: `npm install -g playwright && npx playwright install chrome`
- [ ] Chrome profile created with login session
- [ ] Profile copied to server: `scp -r chrome-profile/ user@server:/path/`
- [ ] `.env` configured with your Kanban URL and column IDs
- [ ] Docker/docker-compose installed on server
- [ ] Container started: `docker-compose -f docker-compose.watcher.yml up -d`
- [ ] Logs show "Kanban watcher started"

### Session Expiration Handling

When session expires:

1. **Watcher detects it** → sends webhook notification (if configured)
2. **Container exits** → Docker restarts it (restart: unless-stopped)
3. **You re-login on host**:
   ```bash
   npx playwright open --channel=chrome --user-data-dir=./chrome-profile "https://app.tana.inc"
   ```
4. **Watcher auto-recovers** on next restart (profile is volume-mounted)

### Webhook Notifications

Get notified on Slack/Discord when session expires:

```bash
# Slack
WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx...

# Discord  
WEBHOOK_URL=https://discord.com/api/webhooks/123.../abc...
```

The watcher sends:
- ✅ "Kanban watcher started" - on successful start
- 🔐 "SESSION EXPIRED!" - when re-auth needed
- 🔄 "STATUS CHANGED" - logged locally (not webhooks)

### Volume Mounts

| Host Path | Container Path | Purpose |
|-----------|---------------|---------|
| `./chrome-profile` | `/app/chrome-profile` | Auth session (re-login without rebuild) |
| `./artifacts` | `/app/artifacts` | Screenshots on failure |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Your Browser   │     │  Playwright     │
│  (change status)│     │  (headless)     │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│           Tana (Firebase)               │
│  - Real-time sync via WebSocket         │
│  - Both browsers see changes            │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Playwright     │
│  detects DOM    │
│  change, clicks │
│  SYNC button    │
└─────────────────┘
```

## Files

- `tests/kanban-watcher.spec.ts` - Main watcher test
- `scripts/start-watcher.sh` - Start script
- `scripts/stop-watcher.sh` - Stop script
- `chrome-profile/` - Persistent browser profile (auth)

