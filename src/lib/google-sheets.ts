import { existsSync, readFileSync } from "node:fs";
import { google, sheets_v4 } from "googleapis";

type SheetWrite = {
  range: string;
  values: string[][];
};

type SheetRead = {
  range: string;
  spreadsheetId?: string;
};

export type SheetObjectRow = {
  rowNumber: number;
  raw: string[];
  values: Record<string, string>;
};

type SheetConfig = {
  spreadsheetId?: string;
  companyRange: string;
  applicationRange: string;
  clientEmail?: string;
  privateKey?: string;
  error?: string;
};

type ServiceAccountConfig = {
  clientEmail?: string;
  privateKey?: string;
  error?: string;
};

function getSheetConfig() {
  const serviceAccount = getServiceAccountFromEnv();

  return {
    spreadsheetId:
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_SHEET_ID,
    companyRange:
      process.env.GOOGLE_SHEETS_COMPANY_RANGE ?? "Company_tracking!A:K",
    applicationRange:
      process.env.GOOGLE_SHEETS_APPLICATION_RANGE ?? "Applications!A:O",
    clientEmail: serviceAccount.clientEmail,
    privateKey: serviceAccount.privateKey,
    error: serviceAccount.error,
  } satisfies SheetConfig;
}

async function getSheetsClient(spreadsheetIdOverride?: string): Promise<{
  sheets?: sheets_v4.Sheets;
  spreadsheetId?: string;
  error?: string;
}> {
  const config = getSheetConfig();

  if (config.error) {
    return { spreadsheetId: config.spreadsheetId, error: config.error };
  }

  if (!config.spreadsheetId || !config.clientEmail || !config.privateKey) {
    return {
      spreadsheetId: config.spreadsheetId,
      error: "Google Sheets credentials are not configured.",
    };
  }

  try {
    const auth = new google.auth.JWT({
      email: config.clientEmail,
      key: config.privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    return {
      sheets: google.sheets({ version: "v4", auth }),
      spreadsheetId: spreadsheetIdOverride || config.spreadsheetId,
    };
  } catch (error) {
    return {
      spreadsheetId: config.spreadsheetId,
      error: error instanceof Error ? error.message : "Google auth failed.",
    };
  }
}

export async function appendSheetRows(write: SheetWrite) {
  const { sheets, spreadsheetId, error } = await getSheetsClient();

  if (!sheets || !spreadsheetId) {
    return { skipped: true, reason: error ?? "Google Sheets credentials are not configured." };
  }

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: write.range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: write.values,
      },
    });
  } catch (requestError) {
    return {
      skipped: true,
      reason:
        requestError instanceof Error
          ? requestError.message
          : "Google Sheets append failed.",
    };
  }

  return { skipped: false };
}

export async function readSheetRows(read: SheetRead) {
  const { sheets, spreadsheetId, error } = await getSheetsClient(read.spreadsheetId);

  if (!sheets || !spreadsheetId) {
    return {
      skipped: true,
      reason: error ?? "Google Sheets credentials are not configured.",
      values: [] as string[][],
    };
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: read.range,
    });

    return {
      skipped: false,
      values: (response.data.values ?? []) as string[][],
    };
  } catch (requestError) {
    return {
      skipped: true,
      reason:
        requestError instanceof Error
          ? requestError.message
          : "Google Sheets read failed.",
      values: [] as string[][],
    };
  }
}

export async function readSheetRowsFromSpreadsheet(config: {
  spreadsheetId: string;
  range: string;
}) {
  const serviceAccount = getServiceAccountFromEnv();

  if (!config.spreadsheetId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    return {
      skipped: true,
      reason: "Google Sheets credentials are not configured.",
      values: [] as string[][],
    };
  }

  try {
    const auth = new google.auth.JWT({
      email: serviceAccount.clientEmail,
      key: serviceAccount.privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: config.range,
    });

    return {
      skipped: false,
      values: (response.data.values ?? []) as string[][],
    };
  } catch (requestError) {
    return {
      skipped: true,
      reason:
        requestError instanceof Error
          ? requestError.message
          : "Google Sheets read failed.",
      values: [] as string[][],
    };
  }
}

export function getCompanyTrackingRange() {
  return widenRangeEndColumn(getSheetConfig().companyRange, "N");
}

export function getApplicationTrackingRange() {
  return widenRangeEndColumn(getSheetConfig().applicationRange, "V");
}

export async function ensureSheetWithHeaders(range: string, headers: string[]) {
  const { sheets, spreadsheetId, error } = await getSheetsClient();

  if (!sheets || !spreadsheetId) {
    return { skipped: true, reason: error ?? "Google Sheets credentials are not configured." };
  }

  const title = getSheetTitle(range);

  try {
    const metadata = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = metadata.data.sheets?.some(
      (sheet) => sheet.properties?.title === title,
    );

    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title },
              },
            },
          ],
        },
      });
    }

    const headerRange = `${quoteSheetTitle(title)}!A1:${columnLetter(headers.length)}1`;
    const current = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    });

    const currentHeader = current.data.values?.[0] ?? [];

    if (
      currentHeader.length === 0 ||
      currentHeader.length < headers.length
    ) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: headerRange,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [headers] },
      });
    }

    return { skipped: false };
  } catch (requestError) {
    return {
      skipped: true,
      reason:
        requestError instanceof Error
          ? requestError.message
          : "Google Sheets setup failed.",
    };
  }
}

export async function ensureSheetExists(sheetName: string, headers: string[]) {
  return ensureSheetWithHeaders(
    `${quoteSheetTitle(sheetName)}!A:${columnLetter(headers.length)}`,
    headers,
  );
}

export async function getSheetRows(sheetName: string) {
  const result = await readSheetRows({
    range: `${quoteSheetTitle(sheetName)}!A:ZZ`,
  });
  const headers = result.values[0] ?? [];

  return {
    skipped: result.skipped,
    reason: result.reason,
    headers,
    rows: mapSheetRowsToObjects(headers, result.values.slice(1)),
  };
}

export async function appendSheetRow(
  sheetName: string,
  rowData: Record<string, string | number | undefined>,
  headers: string[],
) {
  const setup = await ensureSheetExists(sheetName, headers);

  if (setup.skipped) {
    return setup;
  }

  return appendSheetRows({
    range: `${quoteSheetTitle(sheetName)}!A:${columnLetter(headers.length)}`,
    values: [headers.map((header) => objectValue(rowData, header))],
  });
}

export async function updateSheetRowByColumn(input: {
  sheetName: string;
  columnName: string;
  columnValue: string;
  updatedData: Record<string, string | number | undefined>;
  headers: string[];
}) {
  const setup = await ensureSheetExists(input.sheetName, input.headers);

  if (setup.skipped) {
    return setup;
  }

  const sheet = await getSheetRows(input.sheetName);
  const target = sheet.rows.find(
    (row) => getSheetCell(row, input.columnName) === input.columnValue,
  );

  if (!target) {
    return {
      skipped: true,
      reason: `${input.columnName} ${input.columnValue} was not found in ${input.sheetName}.`,
    };
  }

  return updateSheetRow({
    sheetTitle: input.sheetName,
    rowNumber: target.rowNumber,
    startColumn: "A",
    values: input.headers.map((header) =>
      hasObjectValue(input.updatedData, header)
        ? objectValue(input.updatedData, header)
        : getSheetCell(target, header),
    ),
  });
}

export async function findRowsByColumn(
  sheetName: string,
  columnName: string,
  value: string,
) {
  const sheet = await getSheetRows(sheetName);

  return {
    ...sheet,
    rows: sheet.rows.filter((row) => getSheetCell(row, columnName) === value),
  };
}

export function mapSheetRowsToObjects(
  headers: string[],
  rows: string[][],
  startRowNumber = 2,
): SheetObjectRow[] {
  return rows.map((row, index) => {
    const values: Record<string, string> = {};

    headers.forEach((header, headerIndex) => {
      if (!header?.trim()) return;
      values[header.trim()] = String(row[headerIndex] ?? "").trim();
    });

    return {
      rowNumber: startRowNumber + index,
      raw: row,
      values,
    };
  });
}

export function getSheetCell(
  row: SheetObjectRow,
  names: string | string[],
  fallbackIndex?: number,
) {
  const targets = (Array.isArray(names) ? names : [names]).map(normalizeSheetHeader);

  for (const [header, value] of Object.entries(row.values)) {
    if (targets.includes(normalizeSheetHeader(header))) {
      return value;
    }
  }

  if (fallbackIndex !== undefined) {
    return String(row.raw[fallbackIndex] ?? "").trim();
  }

  return "";
}

export function normalizeSheetHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function updateSheetRow(input: {
  sheetTitle: string;
  rowNumber: number;
  startColumn: string;
  values: string[];
}) {
  const { sheets, spreadsheetId, error } = await getSheetsClient();

  if (!sheets || !spreadsheetId) {
    return { skipped: true, reason: error ?? "Google Sheets credentials are not configured." };
  }

  const startColumnIndex = columnNumber(input.startColumn);
  const endColumn = columnLetter(startColumnIndex + input.values.length - 1);

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quoteSheetTitle(input.sheetTitle)}!${input.startColumn}${input.rowNumber}:${endColumn}${input.rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [input.values],
      },
    });

    return { skipped: false };
  } catch (requestError) {
    return {
      skipped: true,
      reason:
        requestError instanceof Error
          ? requestError.message
          : "Google Sheets row update failed.",
    };
  }
}

export async function deleteSheetRows(input: {
  sheetTitle: string;
  rowNumbers: number[];
}) {
  const { sheets, spreadsheetId, error } = await getSheetsClient();

  if (!sheets || !spreadsheetId) {
    return { skipped: true, reason: error ?? "Google Sheets credentials are not configured." };
  }

  try {
    const metadata = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = metadata.data.sheets?.find(
      (item) => item.properties?.title === input.sheetTitle,
    );
    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined || sheetId === null) {
      return { skipped: true, reason: `Sheet not found: ${input.sheetTitle}` };
    }

    const requests = [...new Set(input.rowNumbers)]
      .filter((rowNumber) => rowNumber > 1)
      .sort((a, b) => b - a)
      .map((rowNumber) => ({
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: rowNumber - 1,
            endIndex: rowNumber,
          },
        },
      }));

    if (requests.length === 0) {
      return { skipped: false };
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });

    return { skipped: false };
  } catch (requestError) {
    return {
      skipped: true,
      reason:
        requestError instanceof Error
          ? requestError.message
          : "Google Sheets row delete failed.",
    };
  }
}

export async function syncApplicationMoveToSheet(input: {
  companyId: string;
  applicationIds: string[];
  targetStage: string;
  remarks?: string;
  rejectedAtRound?: string;
}) {
  return appendSheetRows({
    range: "AuditLog!A:F",
    values: input.applicationIds.map((applicationId) => [
      new Date().toISOString(),
      "DASHBOARD",
      input.companyId,
      applicationId,
      input.targetStage,
      input.remarks ?? input.rejectedAtRound ?? "",
    ]),
  });
}

export async function syncRsaRemarksToSheet(input: {
  companyId: string;
  adminRemarks: string;
  aiSummary: string;
}) {
  return appendSheetRows({
    range: "RSA!A:D",
    values: [
      [
        new Date().toISOString(),
        input.companyId,
        input.adminRemarks,
        input.aiSummary,
      ],
    ],
  });
}

function getServiceAccountFromEnv(): ServiceAccountConfig {
  const errors: string[] = [];
  const path = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH?.trim();

  if (path) {
    const fromPath = getServiceAccountFromJsonPath(path);

    if (isUsableServiceAccount(fromPath)) {
      return fromPath;
    }

    if (fromPath.error) {
      errors.push(fromPath.error);
    }
  }

  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

  if (json) {
    const fromJson = parseServiceAccountJson(json, "GOOGLE_SERVICE_ACCOUNT_JSON");

    if (isUsableServiceAccount(fromJson)) {
      return fromJson;
    }

    if (fromJson.error) {
      errors.push(fromJson.error);
    }
  }

  const encodedJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64?.trim();

  if (encodedJson) {
    const fromEncodedJson = parseServiceAccountJson(
      Buffer.from(encodedJson, "base64").toString("utf8"),
      "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64",
    );

    if (isUsableServiceAccount(fromEncodedJson)) {
      return fromEncodedJson;
    }

    if (fromEncodedJson.error) {
      errors.push(fromEncodedJson.error);
    }
  }

  const privateKey = normalizePrivateKey(
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  );

  if (privateKey.error) {
    return {
      clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      error: privateKey.error,
    };
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (clientEmail && privateKey.value) {
    return {
      clientEmail,
      privateKey: privateKey.value,
    };
  }

  return {
    clientEmail,
    privateKey: privateKey.value,
    error: errors[0],
  };
}

function isUsableServiceAccount(config: ServiceAccountConfig) {
  return Boolean(config.clientEmail && config.privateKey && !config.error);
}

function getServiceAccountFromJsonPath(path: string): ServiceAccountConfig {
  try {
    if (!existsSync(path)) {
      return { error: `Google service account JSON file was not found: ${path}` };
    }

    return parseServiceAccountJson(readFileSync(path, "utf8"), "GOOGLE_SERVICE_ACCOUNT_JSON_PATH");
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not read Google service account JSON file.",
    };
  }
}

function parseServiceAccountJson(
  value: string,
  source = "GOOGLE_SERVICE_ACCOUNT_JSON",
): ServiceAccountConfig {
  try {
    const parsed = JSON.parse(value) as {
      client_email?: string;
      private_key?: string;
    };
    const privateKey = normalizePrivateKey(parsed.private_key);

    if (!parsed.client_email) {
      return { error: "Service account JSON is missing client_email." };
    }

    if (privateKey.error) {
      return { clientEmail: parsed.client_email, error: privateKey.error };
    }

    return {
      clientEmail: parsed.client_email,
      privateKey: privateKey.value,
    };
  } catch {
    return { error: `${source} is not valid JSON.` };
  }
}

function normalizePrivateKey(raw?: string) {
  if (!raw?.trim()) {
    return { value: undefined };
  }

  let value = raw.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  value = value.replace(/\\n/g, "\n").replace(/\r/g, "");

  if (!value.includes("-----BEGIN PRIVATE KEY-----")) {
    return {
      error:
        "Google service account private key is not a PEM private key. Use GOOGLE_SERVICE_ACCOUNT_JSON_PATH or paste the private_key field exactly.",
    };
  }

  if (!value.endsWith("\n")) {
    value += "\n";
  }

  return { value };
}

function getSheetTitle(range: string) {
  return range.split("!")[0].replace(/^'|'$/g, "");
}

function quoteSheetTitle(title: string) {
  return `'${title.replace(/'/g, "''")}'`;
}

function objectValue(
  values: Record<string, string | number | undefined>,
  header: string,
) {
  const exact = values[header];

  if (exact !== undefined) {
    return String(exact);
  }

  const normalizedHeader = normalizeSheetHeader(header);
  const match = Object.entries(values).find(
    ([key]) => normalizeSheetHeader(key) === normalizedHeader,
  );

  return match?.[1] === undefined ? "" : String(match[1]);
}

function hasObjectValue(
  values: Record<string, string | number | undefined>,
  header: string,
) {
  if (values[header] !== undefined) return true;

  const normalizedHeader = normalizeSheetHeader(header);
  return Object.keys(values).some(
    (key) => normalizeSheetHeader(key) === normalizedHeader,
  );
}

function columnLetter(column: number) {
  let current = column;
  let letters = "";

  while (current > 0) {
    const remainder = (current - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    current = Math.floor((current - 1) / 26);
  }

  return letters;
}

function columnNumber(column: string) {
  return column
    .toUpperCase()
    .split("")
    .reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0);
}

function widenRangeEndColumn(range: string, minimumEndColumn: string) {
  const match = range.match(/^(.*!)([A-Z]+)(?::([A-Z]+))?$/i);

  if (!match) {
    return range;
  }

  const [, sheetPrefix, startColumn, endColumn] = match;
  const currentEnd = endColumn || startColumn;

  if (columnNumber(currentEnd) >= columnNumber(minimumEndColumn)) {
    return range;
  }

  return `${sheetPrefix}${startColumn}:${minimumEndColumn}`;
}
