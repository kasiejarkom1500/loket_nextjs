import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { getCurrentShift, getShiftSettings, getTodayDate } from "@/lib/time";

const APP_TIMEZONE = "Asia/Jakarta";

const parseTime = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
};

export async function GET() {
  const token = (await cookies()).get("loket_session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let session;
  try {
    session = await verifySession(token);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.isSubstitute) {
    return NextResponse.json({ error: "Mode pengganti tidak perlu presensi." }, { status: 403 });
  }
  if (session.role !== "LAYANAN_PUBLIK" && session.role !== "PERMINTAAN_DATA") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shift = session.shift ?? (await getCurrentShift());
  const date = getTodayDate();
  const baseDate = DateTime.fromJSDate(date).setZone(APP_TIMEZONE);
  const settings = await getShiftSettings();
  const setting = settings.find((item) => item.shift === shift);
  const start = parseTime(setting?.startTime ?? (shift === "PAGI" ? "00:00" : "12:00"));
  const end = parseTime(setting?.endTime ?? (shift === "PAGI" ? "11:59" : "23:59"));
  if (!start || !end) return NextResponse.json({ error: "Pengaturan shift tidak valid." }, { status: 500 });
  const shiftStart = baseDate.set({ hour: start.hour, minute: start.minute, second: 0, millisecond: 0 });
  let shiftEnd = baseDate.set({ hour: end.hour, minute: end.minute, second: 59, millisecond: 999 });
  if (shiftEnd <= shiftStart) shiftEnd = shiftEnd.plus({ days: 1 });

  const officerField = session.role === "LAYANAN_PUBLIK" ? "publicOfficerId" : "dataOfficerId";
  const codes = session.role === "LAYANAN_PUBLIK" ? ["A", "C"] : ["B"];
  const rows = await prisma.queue.groupBy({
    by: ["serviceId"],
    where: {
      status: "COMPLETED",
      completedAt: { gte: shiftStart.toJSDate(), lte: shiftEnd.toJSDate() },
      [officerField]: session.userId,
      service: { code: { in: codes } },
    },
    _count: { _all: true },
  });
  const services = rows.length
    ? await prisma.service.findMany({ where: { id: { in: rows.map((row) => row.serviceId) } }, select: { id: true, code: true, name: true } })
    : [];
  const perService = rows.map((row) => {
    const service = services.find((item) => item.id === row.serviceId);
    return { code: service?.code ?? "", name: service?.name ?? "", count: row._count._all };
  }).sort((a, b) => a.code.localeCompare(b.code));
  const total = perService.reduce((sum, item) => sum + item.count, 0);
  const detail = perService.map((item) => `${item.name} ${item.count}`).join(" · ");
  const note = total === 0
    ? "Tidak ada antrean selesai hari ini — isi manual bila ada tamu yang dilayani tanpa ambil nomor antrean."
    : `Otomatis dari antrean: ${total} selesai hari ini${detail ? ` (${detail})` : ""}. Angka dimasukkan ke kolom kunjungan langsung pertama — pindahkan sebagian ke kolom ${session.role === "LAYANAN_PUBLIK" ? "Pengaduan" : "Konsultasi"} bila ada, dan isi ${session.role === "LAYANAN_PUBLIK" ? "Online + SKD" : "Online"} secara manual.`;

  return NextResponse.json({ role: session.role, shift, date: DateTime.fromJSDate(date).setZone(APP_TIMEZONE).toISODate(), total, perService, note });
}
