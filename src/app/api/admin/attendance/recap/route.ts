import { NextResponse } from "next/server";
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

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

  const attendances = await prisma.attendance.findMany({
    where: {
      role,
      date: { gte: range.start, lte: range.end },
    },
    include: { user: true },
    orderBy: [{ date: "desc" }, { shift: "asc" }],
  });

  const items = attendances.map((attendance) => ({
    id: attendance.id,
    date: formatDateInput(attendance.date),
    shift: attendance.shift,
    user: {
      id: attendance.user.id,
      nama: attendance.user.nama,
      nipLama: attendance.user.nipLama,
      username: attendance.user.username,
    },
    checkInAt: attendance.checkInAt?.toISOString() ?? null,
    checkOutAt: attendance.checkOutAt?.toISOString() ?? null,
    publicNondataOffline: attendance.publicNondataOffline ?? null,
    publicNondataOnline: attendance.publicNondataOnline ?? null,
    publicComplaintsOffline: attendance.publicComplaintsOffline ?? null,
    publicSkdCount: attendance.publicSkdCount ?? null,
    publicNotes: attendance.publicNotes ?? null,
    dataRequestOffline: attendance.dataRequestOffline ?? null,
    dataConsultOffline: attendance.dataConsultOffline ?? null,
    dataRequestOnline: attendance.dataRequestOnline ?? null,
    dataConsultOnline: attendance.dataConsultOnline ?? null,
    dataNotes: attendance.dataNotes ?? null,
  }));

  return NextResponse.json({ role, items });
}
