import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getSheetValues } from "@/lib/google-sheets";

const SESSION_COOKIE = "loket_session";

const normalizeHeader = (value: string) =>
  value.replace(/\s+/g, " ").trim().toLowerCase();

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

  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME ?? "";
  if (!sheetName) {
    return NextResponse.json(
      { error: "GOOGLE_SHEETS_SHEET_NAME belum diisi" },
      { status: 500 },
    );
  }

  const values = await getSheetValues(`'${sheetName.replace(/'/g, "''")}'!A:Q`);
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
        skdLinkSent: getCell(row, "Apakah sudah dikirimkan link SKD ?"),
        responded: getCell(row, "YBS Telah Merespon"),
        keterangan: getCell(row, "Keterangan"),
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

  const filtered = onlyPending
    ? items.filter(
        (item) => !isDone(String(item.skdLinkSent ?? "")),
      )
    : items;

  return NextResponse.json({
    items: filtered.slice(0, limit),
    meta: {
      total: filtered.length,
      headers,
    },
  });
}
