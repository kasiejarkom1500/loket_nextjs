import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
};

const parseDateRange = (from: string | null, to: string | null) => {
  const start = from ? parseLocalDate(from) : new Date();
  const end = to ? parseLocalDate(to) : new Date();
  if (!start || !end) {
    return null;
  }
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const range = parseDateRange(from, to);

  if (!range) {
    return NextResponse.json(
      { error: "Format tanggal tidak valid" },
      { status: 400 },
    );
  }

  const queues = await prisma.queue.findMany({
    where: {
      createdAt: { gte: range.start, lte: range.end },
      visitorId: { not: null },
    },
    include: { visitor: true, service: true, counter: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = queues.map((queue) => ({
    "Nomor Antrian": queue.number,
    Layanan: queue.service.name,
    Loket: queue.counter?.name ?? "-",
    Status: queue.status,
    Tanggal: queue.createdAt.toISOString(),
    Nama: queue.visitor?.name ?? "-",
    Telepon: queue.visitor?.phone ?? "-",
    Asal: queue.visitor?.origin ?? "-",
    Keperluan: queue.visitor?.purpose ?? "-",
    "Detail Keperluan": queue.staffPurposeDetail ?? "",
  }));

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Pengunjung");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=visitors.xlsx",
    },
  });
}
