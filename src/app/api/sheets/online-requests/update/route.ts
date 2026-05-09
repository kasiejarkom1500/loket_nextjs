import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getSheetValues, updateSheetValues } from "@/lib/google-sheets";

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

const toColumnLetter = (indexZeroBased: number) => {
  let n = indexZeroBased + 1;
  let result = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    result = String.fromCharCode(65 + mod) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const rowNumber = Number(body?.rowNumber);
  const publikasi =
    typeof body?.publikasi === "string" ? body.publikasi.trim() : "";
  const skdLinkSent =
    typeof body?.skdLinkSent === "string" ? body.skdLinkSent.trim() : "";
  const completionStatus =
    typeof body?.completionStatus === "string"
      ? body.completionStatus.trim()
      : "";

  if (!rowNumber || rowNumber < 2) {
    return NextResponse.json(
      { error: "rowNumber tidak valid" },
      { status: 400 },
    );
  }

  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME ?? "";
  if (!sheetName) {
    return NextResponse.json(
      { error: "GOOGLE_SHEETS_SHEET_NAME belum diisi" },
      { status: 500 },
    );
  }

  const quotedSheetName = `'${sheetName.replace(/'/g, "''")}'`;
  const values = await getSheetValues(`${quotedSheetName}!A1:Z1`);
  const headers = values[0] ?? [];
  const headerIndex = new Map<string, number>();
  headers.forEach((header, index) => {
    headerIndex.set(normalizeHeader(String(header)), index);
  });

  const requiredHeaders: Record<string, string> = {
    PUBLIKASI: "PUBLIKASI YANG DISARANKAN",
    SKD: "Apakah sudah dikirimkan link SKD ?",
  };
  for (const label of Object.values(requiredHeaders)) {
    if (!headerIndex.has(normalizeHeader(label))) {
      return NextResponse.json(
        { error: `Kolom tidak ditemukan: ${label}` },
        { status: 400 },
      );
    }
  }

  const officerHeader =
    session.role === "LAYANAN_PUBLIK"
      ? "Petugas Pelayanan dan Pengaduan"
      : "Petugas Konsultasi";
  if (!headerIndex.has(normalizeHeader(officerHeader))) {
    return NextResponse.json(
      { error: `Kolom tidak ditemukan: ${officerHeader}` },
      { status: 400 },
    );
  }

  const updates: Array<{ rangeA1: string; value: string }> = [];
  const publishCol = toColumnLetter(
    headerIndex.get(normalizeHeader(requiredHeaders.PUBLIKASI)) as number,
  );
  const officerCol = toColumnLetter(
    headerIndex.get(normalizeHeader(officerHeader)) as number,
  );
  const skdCol = toColumnLetter(
    headerIndex.get(normalizeHeader(requiredHeaders.SKD)) as number,
  );
  const completionHeaderCandidates = [
    "Status Penyelesaian",
    "Status Selesai",
    "Status",
  ];
  const completionHeader = completionHeaderCandidates.find((candidate) =>
    headerIndex.has(normalizeHeader(candidate)),
  );
  const completionCol = completionHeader
    ? toColumnLetter(headerIndex.get(normalizeHeader(completionHeader)) as number)
    : null;
  const keteranganCol = headerIndex.has(normalizeHeader("Keterangan"))
    ? toColumnLetter(headerIndex.get(normalizeHeader("Keterangan")) as number)
    : null;

  updates.push({
    rangeA1: `${quotedSheetName}!${publishCol}${rowNumber}`,
    value: publikasi,
  });
  updates.push({
    rangeA1: `${quotedSheetName}!${officerCol}${rowNumber}`,
    value: session.nama,
  });
  updates.push({
    rangeA1: `${quotedSheetName}!${skdCol}${rowNumber}`,
    value: skdLinkSent,
  });

  if (completionCol) {
    updates.push({
      rangeA1: `${quotedSheetName}!${completionCol}${rowNumber}`,
      value: completionStatus,
    });
  } else if (keteranganCol) {
    const prefix = completionStatus ? `Status: ${completionStatus}` : "";
    updates.push({
      rangeA1: `${quotedSheetName}!${keteranganCol}${rowNumber}`,
      value: prefix,
    });
  }

  try {
    await updateSheetValues(updates);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Gagal update Google Sheet: ${message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
