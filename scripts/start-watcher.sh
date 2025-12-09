#!/bin/bash
# Start the Kanban watcher in headless mode
# Usage: ./scripts/start-watcher.sh

cd "$(dirname "$0")/.."

echo "Starting Kanban watcher (headless)..."
echo "PID will be saved to ./watcher.pid"
echo "Stop with: ./scripts/stop-watcher.sh"

HEADLESS=1 npx playwright test tests/kanban-watcher.spec.ts --timeout=0 --grep "watch ALL columns" &
echo $! > watcher.pid

echo "Watcher started with PID: $(cat watcher.pid)"

