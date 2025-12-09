import dotenv from "dotenv";

dotenv.config();

export type CliArgs = {
  link?: string;
  target?: string;
  status?: string;
  field?: string;
  column?: string;
  columnTestId?: string;
  cardSelector?: string;
  statusToggleSelector?: string;
  headless?: boolean;
  storageState?: string;
  saveState?: string;
  userDataDir?: string;
  browserChannel?: string;
};

export type Credentials = {
  email?: string;
  password?: string;
};

export type Config = {
  credentials: Credentials;
  link: string;
  targetText?: string;
  statusValue?: string;
  statusField: string;
  columnName?: string;
  columnTestId?: string;
  cardSelector?: string;
  statusToggleSelector?: string;
  headless: boolean;
  storageStatePath?: string;
  saveStatePath?: string;
  userDataDir?: string;
  browserChannel?: string;
};

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];

    switch (current) {
      case "--link":
        args.link = next;
        break;
      case "--target":
        args.target = next;
        break;
      case "--status":
        args.status = next;
        break;
      case "--field":
        args.field = next;
        break;
      case "--column":
        args.column = next;
        break;
      case "--column-testid":
        args.columnTestId = next;
        break;
      case "--card-selector":
        args.cardSelector = next;
        break;
      case "--status-toggle":
        args.statusToggleSelector = next;
        break;
      case "--headless":
        args.headless = true;
        break;
      case "--headed":
        args.headless = false;
        break;
      case "--storage-state":
        args.storageState = next;
        break;
      case "--save-state":
        args.saveState = next;
        break;
      case "--user-data-dir":
        args.userDataDir = next;
        break;
      case "--browser-channel":
        args.browserChannel = next;
        break;
      default:
        break;
    }
  }

  return args;
}

function parseLinksFromEnv(): string[] {
  const raw = process.env.TANA_LINKS ?? process.env.TANA_LINK ?? "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function flagToBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes"].includes(value.toLowerCase());
}

export function buildConfig(args: CliArgs): Config {
  const links = parseLinksFromEnv();
  const link = args.link ?? links[0];

  if (!link) {
    throw new Error(
      "Missing target link. Supply --link, or set TANA_LINKS/TANA_LINK in .env"
    );
  }

  const targetText =
    args.target ??
    process.env.TANA_TARGET_TEXT ??
    process.env.STATUS_TARGET_TEXT;
  const statusValue =
    args.status ?? process.env.TANA_STATUS_VALUE ?? process.env.STATUS_VALUE;
  const statusField =
    args.field ??
    process.env.TANA_STATUS_FIELD ??
    process.env.STATUS_FIELD ??
    "Status";

  const columnName = args.column ?? process.env.TANA_COLUMN;
  const columnTestId =
    args.columnTestId ?? process.env.TANA_COLUMN_TESTID ?? undefined;
  const cardSelector =
    args.cardSelector ?? process.env.TANA_CARD_SELECTOR ?? undefined;
  const statusToggleSelector =
    args.statusToggleSelector ??
    process.env.TANA_STATUS_TOGGLE_SELECTOR ??
    undefined;

  if (!targetText && !columnName && !columnTestId) {
    throw new Error(
      "Missing target. Provide --target/TANA_TARGET_TEXT, or use --column / --column-testid for column mode."
    );
  }

  // In column mode with toggle, we don't need a status value (just clicking checkboxes)
  const isColumnToggleMode = (columnName || columnTestId) && !targetText;
  if (!statusValue && !isColumnToggleMode) {
    throw new Error(
      "Missing status value. Supply --status or set TANA_STATUS_VALUE."
    );
  }

  const headless =
    args.headless ??
    flagToBoolean(process.env.HEADLESS, false); // headed by default for debugging

  const storageStatePath =
    args.storageState ?? process.env.STORAGE_STATE ?? undefined;

  const saveStatePath = args.saveState ?? process.env.SAVE_STORAGE_STATE;
  const userDataDir = args.userDataDir ?? process.env.USER_DATA_DIR;
  const browserChannel = args.browserChannel ?? process.env.BROWSER_CHANNEL;

  return {
    credentials: {
      email: process.env.TANA_EMAIL,
      password: process.env.TANA_PASSWORD,
    },
    link,
    targetText,
    statusValue,
    statusField,
    columnName,
    columnTestId,
    cardSelector,
    statusToggleSelector,
    headless,
    storageStatePath,
    saveStatePath,
    userDataDir,
    browserChannel,
  };
}

