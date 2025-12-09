# Tana Playwright Automation Docker Image
# Based on: https://playwright.dev/docs/docker

# Use official Playwright image with all dependencies
FROM mcr.microsoft.com/playwright:v1.57.0-noble

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json tsconfig.json ./
RUN npm install

# Install Google Chrome using Playwright (handles all dependencies)
RUN npx playwright install chrome

# Copy source code
COPY src ./src
COPY tests ./tests
COPY playwright.config.ts ./

# Create directories for auth and artifacts
RUN mkdir -p playwright/.auth artifacts chrome-profile

ENV NODE_ENV=production
# Default to headless for container runs
ENV HEADLESS=1

# Recommended: Run as root for trusted code (e2e tests)
# Per docs: https://playwright.dev/docs/docker#end-to-end-tests
# For untrusted sites, use --user pwuser with seccomp profile

# ============================================================
# USAGE (run from host):
#
# Build:
#   docker build -t tana-automation .
#
# Run (with recommended flags per Playwright docs):
#   docker run --init --ipc=host \
#     -v ./chrome-profile:/app/chrome-profile \
#     -e TANA_LINK="https://app.tana.inc/..." \
#     -e TANA_COLUMN="In progress" \
#     -e TANA_COLUMN_TESTID="column-YnoDw59tQHaz" \
#     tana-automation
#
# Flags explained:
#   --init          Avoid zombie processes (recommended)
#   --ipc=host      Prevent Chromium OOM crashes (required for Chromium)
#   -v chrome-profile  Mount your signed-in Chrome profile
#
# For OAuth: First authenticate on host machine with headed browser,
# then mount the chrome-profile into the container.
# ============================================================

# Default command: run headless automation
CMD ["npm", "run", "run:headless", "--", \
  "--column", "In progress", \
  "--column-testid", "column-YnoDw59tQHaz", \
  "--user-data-dir", "/app/chrome-profile", \
  "--browser-channel", "chrome"]
