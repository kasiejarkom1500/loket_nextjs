import { SignJWT, importPKCS8 } from "jose";

type GoogleSheetsConfig = {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
  sheetName: string;
};

const getConfig = (): GoogleSheetsConfig | null => {
  if (process.env.GOOGLE_SHEETS_ENABLED !== "1") {
    return null;
  }
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL ?? "";
  const privateKeyRaw = process.env.GOOGLE_SHEETS_PRIVATE_KEY ?? "";
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "";
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME ?? "";

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey || !spreadsheetId || !sheetName) {
    return null;
  }

  return { clientEmail, privateKey, spreadsheetId, sheetName };
};

let cachedToken: { value: string; expiresAt: number } | null = null;

const getAccessToken = async (config: GoogleSheetsConfig) => {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) {
    return cachedToken.value;
  }

  const key = await importPKCS8(config.privateKey, "RS256");
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/spreadsheets",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(config.clientEmail)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60)
    .sign(key);

  const body = new URLSearchParams();
  body.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  body.set("assertion", assertion);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Google token error: ${response.status} ${message}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    value: data.access_token,
    expiresAt: now + Math.max(0, Number(data.expires_in ?? 0)),
  };

  return cachedToken.value;
};

export const googleSheetsEnabled = () => Boolean(getConfig());

export const appendRowToSheet = async (row: Array<string | number | null>) => {
  const config = getConfig();
  if (!config) {
    return;
  }

  const token = await getAccessToken(config);
  const range = `'${config.sheetName.replace(/'/g, "''")}'!A:Z`;
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      config.spreadsheetId,
    )}/values/${encodeURIComponent(range)}:append` +
    `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [row] }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Google Sheets append error: ${response.status} ${message}`);
  }
};

export const getSheetValues = async (rangeA1: string) => {
  const config = getConfig();
  if (!config) {
    throw new Error("Google Sheets is not configured");
  }

  const token = await getAccessToken(config);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      config.spreadsheetId,
    )}/values/${encodeURIComponent(rangeA1)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Google Sheets get error: ${response.status} ${message}`);
  }

  const data = (await response.json()) as { values?: unknown[][] };
  return (data.values ?? []) as Array<Array<string>>;
};

export const updateSheetValues = async (
  updates: Array<{ rangeA1: string; value: string | number | null }>,
) => {
  const config = getConfig();
  if (!config) {
    throw new Error("Google Sheets is not configured");
  }

  if (updates.length === 0) {
    return;
  }

  const token = await getAccessToken(config);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      config.spreadsheetId,
    )}/values:batchUpdate`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data: updates.map((update) => ({
        range: update.rangeA1,
        values: [[update.value ?? ""]],
      })),
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `Google Sheets batchUpdate error: ${response.status} ${message}`,
    );
  }
};
