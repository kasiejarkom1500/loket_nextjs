import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

const parseMonthRange = (month: string | null) => {
  if (!month) {
    return null;
  }
  const [yearRaw, monthRaw] = month.split("-").map(Number);
  if (!yearRaw || !monthRaw) {
    return null;
  }
  const start = new Date(yearRaw, monthRaw - 1, 1);
  const end = new Date(yearRaw, monthRaw, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const normalizeRole = (value: string | null) => {
  if (value === "PERMINTAAN_DATA") {
    return "PERMINTAAN_DATA";
  }
  return "LAYANAN_PUBLIK";
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  const role = normalizeRole(url.searchParams.get("role"));
  const range = parseMonthRange(month);

  if (!range) {
    return NextResponse.json(
      { error: "month wajib diisi (YYYY-MM)" },
      { status: 400 },
    );
  }

  const ratings = await prisma.rating.findMany({
    where: {
      createdAt: { gte: range.start, lte: range.end },
    },
    include: {
      queue: true,
    },
  });

  const buckets = new Map<number, { total: number; count: number }>();

  for (const rating of ratings) {
    if (role === "LAYANAN_PUBLIK") {
      const userId = rating.queue.publicOfficerId;
      if (!userId || rating.publicOfficerScore === null) {
        continue;
      }
      const entry = buckets.get(userId) ?? { total: 0, count: 0 };
      entry.total += rating.publicOfficerScore;
      entry.count += 1;
      buckets.set(userId, entry);
    } else {
      const userId = rating.queue.dataOfficerId;
      if (!userId || rating.dataOfficerScore === null) {
        continue;
      }
      const entry = buckets.get(userId) ?? { total: 0, count: 0 };
      entry.total += rating.dataOfficerScore;
      entry.count += 1;
      buckets.set(userId, entry);
    }
  }

  const userIds = Array.from(buckets.keys());
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    orderBy: { nama: "asc" },
  });

  const rows = users.map((user) => {
    const stats = buckets.get(user.id) ?? { total: 0, count: 0 };
    return {
      Nama: user.nama,
      "NIP Lama": user.nipLama,
      Username: user.username,
      "Total Rating": stats.count,
      "Rata-rata": stats.count ? Number((stats.total / stats.count).toFixed(2)) : 0,
    };
  });

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    role === "LAYANAN_PUBLIK" ? "Layanan Publik" : "Permintaan Data",
  );
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=rekap-rating.xlsx",
    },
  });
}
