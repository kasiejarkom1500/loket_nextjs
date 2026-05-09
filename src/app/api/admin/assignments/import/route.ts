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

type MatrixRow = Record<string, unknown> & {
  No?: number | string;
  Nama?: string;
  "NIP Lama"?: string;
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

const parseMonthParam = (raw: string | null) => {
  if (!raw) return null;
  const match = raw.trim().match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return null;
  return { year, month };
};

const parseMatrixCode = (raw: string) => {
  const value = raw.trim().toUpperCase();
  if (!value) return null;

  if (value === "K1") return { role: "PERMINTAAN_DATA", shift: "PAGI" as const };
  if (value === "K2") return { role: "PERMINTAAN_DATA", shift: "SIANG" as const };
  if (value === "P1") return { role: "LAYANAN_PUBLIK", shift: "PAGI" as const };
  if (value === "P2") return { role: "LAYANAN_PUBLIK", shift: "SIANG" as const };

  return null;
};

const isRowBasedTemplate = (row: unknown): row is ParsedRow => {
  if (!row || typeof row !== "object") return false;
  const asRecord = row as Record<string, unknown>;
  return (
    typeof asRecord.tanggal === "string" &&
    typeof asRecord.shift === "string" &&
    typeof asRecord.role === "string" &&
    typeof asRecord.nip_lama === "string"
  );
};

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const monthParam = parseMonthParam(searchParams.get("month"));

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName =
    workbook.SheetNames.find((n) => n === "Template") ??
    workbook.SheetNames.find((n) => n.trim().toLowerCase() === "template");

  if (!sheetName) {
    return NextResponse.json(
      { error: "Sheet 'Template' tidak ditemukan. Pastikan nama sheet persis 'Template'." },
      { status: 400 },
    );
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (!rows.length) {
    return NextResponse.json({ error: "Data kosong" }, { status: 400 });
  }

  const results: { row: number; error: string }[] = [];
  let created = 0;

  const rowBased = isRowBasedTemplate(rows[0]);

  if (rowBased) {
    const typedRows = rows as unknown as ParsedRow[];

    for (let i = 0; i < typedRows.length; i += 1) {
      const row = typedRows[i];
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
  } else {
    if (!monthParam) {
      return NextResponse.json(
        { error: "Untuk template jadwal bulanan, parameter month wajib (format YYYY-MM)." },
        { status: 400 },
      );
    }

    const { year, month } = monthParam;

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i] as MatrixRow;
      const nipRaw = String(row["NIP Lama"] ?? "").trim();

      if (!nipRaw) {
        results.push({ row: i + 2, error: "NIP Lama wajib diisi." });
        continue;
      }

      const user = await prisma.user.findFirst({
        where: { nipLama: nipRaw },
      });

      if (!user) {
        results.push({ row: i + 2, error: "NIP lama tidak ditemukan." });
        continue;
      }

      for (let day = 1; day <= 31; day += 1) {
        const cellRaw = String((row as Record<string, unknown>)[String(day)] ?? "").trim();
        if (!cellRaw) continue;

        const parsed = parseMatrixCode(cellRaw);
        if (!parsed) {
          results.push({ row: i + 2, error: `Kode tidak dikenali: "${cellRaw}" (kolom ${day}).` });
          continue;
        }

        const date = new Date(year, month - 1, day);
        if (date.getMonth() !== month - 1) {
          continue;
        }
        date.setHours(0, 0, 0, 0);

        let counterId: number | null = null;
        if (parsed.role === "LAYANAN_PUBLIK") {
          counterId = user.counterId ?? null;
          if (!counterId) {
            results.push({
              row: i + 2,
              error: `Loket belum ter-set untuk user (kolom ${day}). Isi loket di master user atau gunakan template lama.`,
            });
            continue;
          }
        }

        await prisma.assignment.upsert({
          where: {
            userId_date_shift: {
              userId: user.id,
              date,
              shift: parsed.shift,
            },
          },
          create: {
            userId: user.id,
            role: parsed.role,
            shift: parsed.shift,
            date,
            counterId,
          },
          update: {
            role: parsed.role,
            counterId,
          },
        });

        created += 1;
      }
    }
  }

  return NextResponse.json({
    created,
    errors: results,
  });
}
