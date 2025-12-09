# How to Extract Configuration from Tana

This guide helps you get the environment variables needed for the watcher by copying HTML from Tana and using AI to extract the values.

## Step 1: Open Tana in Chrome

Navigate to your Kanban board or list view in Tana.

## Step 2: Open DevTools

Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

## Step 3: Select the Element

1. Click the **element selector** button (arrow icon in top-left of DevTools)
2. Hover over your **Kanban board** or **list container** until the entire area is highlighted
3. Click to select it

![Element Selector](https://developer.chrome.com/static/docs/devtools/dom/imgs/inspect.png)

## Step 4: Copy the HTML

1. In the Elements panel, right-click the selected element
2. Choose **Copy → Copy outerHTML**

## Step 5: Ask AI to Extract Config

Paste the HTML into ChatGPT, Claude, or any AI with this prompt:

---

### Prompt Template

```
I need to configure a Tana automation watcher. From this HTML, extract:

1. **COLUMNS_CONFIG** - Find all columns with their names and data-testid values
   Format: `ColumnName1:column-XXX,ColumnName2:column-YYY`

2. **BUTTON_TEXT** or **BUTTON_SELECTOR** - Find the button I want to click on cards
   - If button has unique text like "SYNC", use BUTTON_TEXT
   - If not, provide a CSS selector for BUTTON_SELECTOR

3. **Card selector pattern** - How cards are identified (usually `[data-testid^="card-"]`)

Here's the HTML:

<paste your HTML here>

Give me the .env variables I need to set.
```

---

## Example AI Response

The AI should give you something like:

```bash
# Columns: Backlog, In Progress, Done
COLUMNS_CONFIG=Backlog:column-MdFbOUqzn6cV,In Progress:column-YnoDw59tQHaz,Done:column-F7nGPDvh6iLi

# Button to click
BUTTON_TEXT=SYNC

# Or if button needs a selector:
# BUTTON_SELECTOR=button[data-action="sync"]
```

## What Each Variable Means

| Variable | Description | Example |
|----------|-------------|---------|
| `COLUMNS_CONFIG` | Comma-separated list of `Name:testId` pairs | `Backlog:column-ABC,Done:column-XYZ` |
| `BUTTON_TEXT` | Text shown on the button to click | `SYNC` |
| `BUTTON_SELECTOR` | CSS selector if button has no unique text | `button.sync-btn` |
| `POLL_INTERVAL` | How often to check for changes (ms) | `2000` |

## Tips

### Finding Column IDs

Look for elements like:
```html
<div data-testid="column-YnoDw59tQHaz" class="...">
  <div class="...">In Progress</div>
  <!-- cards here -->
</div>
```

The `data-testid="column-XXX"` is what you need.

### Finding Button Selectors

Look for the button you want to click:
```html
<button class="Button-module_button__7zRTD" data-testid="sync-btn">SYNC</button>
```

- If it has unique text → use `BUTTON_TEXT=SYNC`
- If it has a data-testid → use `BUTTON_SELECTOR=[data-testid="sync-btn"]`
- If only class → use `BUTTON_SELECTOR=button.Button-module_button__7zRTD` (less reliable)

### For List Views (Non-Kanban)

The same process works. Look for:
- Container with tasks
- Status indicators or dropdowns
- Action buttons

---

## Alternative: Use Playwright Codegen

If you prefer recording:

```bash
npx playwright codegen https://app.tana.inc/your-page
```

1. Click on elements you want to target
2. Playwright shows you the locators
3. Use those in your config

---

## Need Help?

If the AI can't figure it out from the HTML, share:
1. A screenshot of your Tana page
2. What action you want to automate (e.g., "click SYNC when card moves")

The community can help identify the right selectors.

