import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getSheetValues } from "@/lib/google-sheets";

const SESSION_COOKIE = "loket_session";

const normalizeHeader = (value: string) =>
  value.replace(/\s+/g, " ").trim().toLowerCase();

const parseSheetTimestamp = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const serial = Number(trimmed);
  if (Number.isFinite(serial) && serial > 0) {
    return Date.UTC(1899, 11, 30) + serial * 24 * 60 * 60 * 1000;
  }

  const normalized = trimmed.replace(/\./g, ":");
  const isoMatch = normalized.match(
    /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (isoMatch) {
    const [, year, month, day, hour = "0", minute = "0", second = "0"] =
      isoMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ).getTime();
  }

  const localMatch = normalized.match(
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (localMatch) {
    const [, first, second, year, hour = "0", minute = "0", seconds = "0"] =
      localMatch;
    const firstNumber = Number(first);
    const secondNumber = Number(second);
    const isMonthFirst = firstNumber <= 12 && secondNumber > 12;
    const day = isMonthFirst ? secondNumber : firstNumber;
    const month = isMonthFirst ? firstNumber : secondNumber;
    return new Date(
      Number(year),
      month - 1,
      day,
      Number(hour),
      Number(minute),
      Number(seconds),
    ).getTime();
  }

  const direct = Date.parse(trimmed);
  return Number.isFinite(direct) ? direct : null;
};

const getSession = async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  try {
    return await verifySession(token);
  } catch {
    return null;
  }
};

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(10, Number(url.searchParams.get("limit") ?? 100)));
  const onlyPending = url.searchParams.get("pending") === "1";
  const fromDate = url.searchParams.get("from");
  const fromTime = fromDate ? parseSheetTimestamp(fromDate) : null;

  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME ?? "";
  if (!sheetName) {
    return NextResponse.json(
      { error: "GOOGLE_SHEETS_SHEET_NAME belum diisi" },
      { status: 500 },
    );
  }

  const values = await getSheetValues(
    `'${sheetName.replace(/'/g, "''")}'!A:ZZ`,
  );
  if (values.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const headers = values[0] ?? [];
  const rows = values.slice(1);

  const headerIndex = new Map<string, number>();
  headers.forEach((header, index) => {
    headerIndex.set(normalizeHeader(String(header)), index);
  });

  const getCell = (row: string[], header: string) => {
    const index = headerIndex.get(normalizeHeader(header));
    if (index === undefined) {
      return "";
    }
    return row[index] ?? "";
  };

  const items = rows
    .map((row, idx) => {
      const rowNumber = idx + 2; // header at row 1
      const item = {
        rowNumber,
        timestamp: getCell(row, "Timestamp"),
        nama: getCell(row, "Nama Lengkap"),
        instansi: getCell(row, "Instansi"),
        email: getCell(row, "Email"),
        phone: getCell(row, "No Handphone"),
        kebutuhan: getCell(row, "Data/Konsultasi yang dibutuhkan"),
        kegunaan: getCell(row, "Kegunaan Data"),
        publikasi: getCell(row, "PUBLIKASI YANG DISARANKAN"),
        petugasKonsultasi: getCell(row, "Petugas Konsultasi"),
        petugasPelayananPengaduan: getCell(
          row,
          "Petugas Pelayanan dan Pengaduan",
        ),
        skdLinkSent: getCell(row, "Apakah sudah dikirimkan link SKD ?"),
        keterangan: getCell(row, "Keterangan"),
        completionStatus:
          getCell(row, "Status Penyelesaian") ||
          getCell(row, "Status Selesai") ||
          getCell(row, "Status") ||
          "",
      };
      return item;
    })
    .reverse();

  const isDone = (value: string) => {
    const normalized = normalizeHeader(value);
    return (
      normalized === normalizeHeader("Telah dikirim") ||
      normalized === normalizeHeader("Tidak dikirim")
    );
  };

  const filtered = items.filter((item) => {
    if (fromTime !== null) {
      const timestamp = parseSheetTimestamp(String(item.timestamp ?? ""));
      if (timestamp === null || timestamp < fromTime) {
        return false;
      }
    }

    if (onlyPending) {
      return !isDone(String(item.skdLinkSent ?? ""));
    }

    return true;
  });

  return NextResponse.json({
    items: filtered.slice(0, limit),
    meta: {
      total: filtered.length,
      headers,
    },
  });
}
