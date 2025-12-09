#!/bin/bash
# Stop the Kanban watcher
# Usage: ./scripts/stop-watcher.sh

cd "$(dirname "$0")/.."

if [ -f watcher.pid ]; then
    PID=$(cat watcher.pid)
    echo "Stopping watcher (PID: $PID)..."
    kill $PID 2>/dev/null || true
    pkill -f "playwright test" 2>/dev/null || true
    rm -f watcher.pid
    echo "Watcher stopped"
else
    echo "No watcher.pid found, killing any playwright tests..."
    pkill -f "playwright test" 2>/dev/null || true
    echo "Done"
fi

