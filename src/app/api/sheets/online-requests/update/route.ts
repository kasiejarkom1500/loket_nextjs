import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getSheetValues, updateSheetValues } from "@/lib/google-sheets";

const SESSION_COOKIE = "loket_session";

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
  const responded =
    typeof body?.responded === "string" ? body.responded.trim() : "";

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

  const values = await getSheetValues(`${sheetName}!A1:Q1`);
  const headers = values[0] ?? [];
  const headerIndex = new Map<string, number>();
  headers.forEach((header, index) => {
    headerIndex.set(String(header).trim(), index);
  });

  const requiredHeaders = [
    "PUBLIKASI YANG DISARANKAN",
    "Petugas Konsultasi",
    "Apakah sudah dikirimkan link SKD ?",
    "YBS Telah Merespon",
  ];
  for (const header of requiredHeaders) {
    if (!headerIndex.has(header)) {
      return NextResponse.json(
        { error: `Kolom tidak ditemukan: ${header}` },
        { status: 400 },
      );
    }
  }

  const updates: Array<{ rangeA1: string; value: string }> = [];
  const publishCol = toColumnLetter(headerIndex.get("PUBLIKASI YANG DISARANKAN") as number);
  const consultantCol = toColumnLetter(headerIndex.get("Petugas Konsultasi") as number);
  const skdCol = toColumnLetter(headerIndex.get("Apakah sudah dikirimkan link SKD ?") as number);
  const respondedCol = toColumnLetter(headerIndex.get("YBS Telah Merespon") as number);

  updates.push({
    rangeA1: `${sheetName}!${publishCol}${rowNumber}`,
    value: publikasi,
  });
  updates.push({
    rangeA1: `${sheetName}!${consultantCol}${rowNumber}`,
    value: session.nama,
  });
  if (skdLinkSent) {
    updates.push({
      rangeA1: `${sheetName}!${skdCol}${rowNumber}`,
      value: skdLinkSent,
    });
  }
  if (responded) {
    updates.push({
      rangeA1: `${sheetName}!${respondedCol}${rowNumber}`,
      value: responded,
    });
  }

  await updateSheetValues(updates);

  return NextResponse.json({ ok: true });
}

