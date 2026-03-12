import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

type ParsedRow = {
  tanggal: string;
  shift: string;
  role: string;
  nip_lama: string;
  counter?: string;
};

const parseIndoDate = (value: string) => {
  const match = value.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!match) {
    return null;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!day || !month || !year) {
    return null;
  }
  return new Date(year, month - 1, day);
};

const normalizeShift = (value: string) => {
  const raw = value.trim().toUpperCase();
  if (raw === "PAGI") {
    return "PAGI";
  }
  if (raw === "SIANG") {
    return "SIANG";
  }
  return null;
};

const normalizeRole = (value: string) => {
  const raw = value.trim().toUpperCase();
  if (raw === "LAYANAN_PUBLIK") {
    return "LAYANAN_PUBLIK";
  }
  if (raw === "PERMINTAAN_DATA") {
    return "PERMINTAAN_DATA";
  }
  return null;
};

const parseCounter = async (raw: string) => {
  const value = raw.trim();
  if (!value) {
    return null;
  }
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && asNumber > 0) {
    const counter = await prisma.counter.findUnique({
      where: { id: asNumber },
    });
    return counter?.id ?? null;
  }
  const counter = await prisma.counter.findFirst({
    where: { name: value },
  });
  return counter?.id ?? null;
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return NextResponse.json({ error: "Sheet kosong" }, { status: 400 });
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<ParsedRow>(sheet, {
    defval: "",
  });

  if (!rows.length) {
    return NextResponse.json({ error: "Data kosong" }, { status: 400 });
  }

  const results: { row: number; error: string }[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const tanggalRaw = String(row.tanggal ?? "");
    const shiftRaw = String(row.shift ?? "");
    const roleRaw = String(row.role ?? "");
    const nipRaw = String(row.nip_lama ?? "");
    const counterRaw = String(row.counter ?? "");

    const date = parseIndoDate(tanggalRaw);
    const shift = normalizeShift(shiftRaw);
    const role = normalizeRole(roleRaw);

    if (!date || !shift || !role || !nipRaw.trim()) {
      results.push({
        row: i + 2,
        error: "Data tidak lengkap atau format tanggal salah (dd/mm/yyyy).",
      });
      continue;
    }

    const user = await prisma.user.findFirst({
      where: { nipLama: nipRaw.trim() },
    });

    if (!user) {
      results.push({ row: i + 2, error: "NIP lama tidak ditemukan." });
      continue;
    }

    let counterId: number | null = null;
    if (role === "LAYANAN_PUBLIK") {
      counterId = await parseCounter(counterRaw);
      if (!counterId) {
        results.push({
          row: i + 2,
          error: "Loket wajib diisi untuk layanan publik.",
        });
        continue;
      }
    }

    date.setHours(0, 0, 0, 0);

    await prisma.assignment.upsert({
      where: {
        userId_date_shift: {
          userId: user.id,
          date,
          shift,
        },
      },
      create: {
        userId: user.id,
        role,
        shift,
        date,
        counterId,
      },
      update: {
        role,
        counterId,
      },
    });

    created += 1;
  }

  return NextResponse.json({
    created,
    errors: results,
  });
}
