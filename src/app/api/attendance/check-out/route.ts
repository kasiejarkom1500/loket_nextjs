import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { getCurrentShift, getShiftSettings, getTodayDate } from "@/lib/time";

const APP_TIMEZONE = "Asia/Jakarta";

const parseIntField = (value: unknown) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseTime = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return { hour, minute };
};

export async function POST(request: Request) {
  const token = (await cookies()).get("loket_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let session;
  try {
    session = await verifySession(token);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    session.role !== "LAYANAN_PUBLIK" &&
    session.role !== "PERMINTAAN_DATA"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const shift = session.shift ?? (await getCurrentShift());
  const date = getTodayDate();

  const attendance = await prisma.attendance.findFirst({
    where: {
      userId: session.userId,
      role: session.role,
      shift,
      date,
    },
  });

  if (!attendance || !attendance.checkInAt) {
    return NextResponse.json(
      { error: "Belum presensi datang." },
      { status: 400 },
    );
  }

  const shiftSettings = await getShiftSettings();
  const shiftSetting = shiftSettings.find((item) => item.shift === shift);
  if (shiftSetting) {
    const shiftStartTime = parseTime(shiftSetting.startTime);
    const shiftEndTime = parseTime(shiftSetting.endTime);
    if (shiftStartTime && shiftEndTime) {
      const baseDate = DateTime.fromJSDate(attendance.date).setZone(
        APP_TIMEZONE,
      );
      const shiftStart = baseDate.set({
        hour: shiftStartTime.hour,
        minute: shiftStartTime.minute,
        second: 0,
        millisecond: 0,
      });
      let shiftEnd = baseDate.set({
        hour: shiftEndTime.hour,
        minute: shiftEndTime.minute,
        second: 0,
        millisecond: 0,
      });
      if (shiftEnd <= shiftStart) {
        shiftEnd = shiftEnd.plus({ days: 1 });
      }

      const now = DateTime.now().setZone(APP_TIMEZONE);
      if (now < shiftEnd) {
        return NextResponse.json(
          {
            error: `Presensi pulang baru bisa setelah jam ${shiftSetting.endTime}.`,
          },
          { status: 400 },
        );
      }
    }
  }

  let data: Record<string, unknown> = {
    checkOutAt: new Date(),
  };

  if (session.role === "LAYANAN_PUBLIK") {
    const publicNondataOffline = parseIntField(body?.publicNondataOffline);
    const publicNondataOnline = parseIntField(body?.publicNondataOnline);
    const publicComplaintsOffline = parseIntField(body?.publicComplaintsOffline);
    const publicSkdCount = parseIntField(body?.publicSkdCount);
    if (
      publicNondataOffline === null ||
      publicNondataOnline === null ||
      publicComplaintsOffline === null ||
      publicSkdCount === null
    ) {
      return NextResponse.json(
        { error: "Semua field wajib diisi." },
        { status: 400 },
      );
    }
    data = {
      ...data,
      publicNondataOffline,
      publicNondataOnline,
      publicComplaintsOffline,
      publicSkdCount,
      publicNotes: typeof body?.publicNotes === "string" ? body.publicNotes : null,
    };
  }

  if (session.role === "PERMINTAAN_DATA") {
    const dataRequestOffline = parseIntField(body?.dataRequestOffline);
    const dataConsultOffline = parseIntField(body?.dataConsultOffline);
    const dataRequestOnline = parseIntField(body?.dataRequestOnline);
    const dataConsultOnline = parseIntField(body?.dataConsultOnline);
    if (
      dataRequestOffline === null ||
      dataConsultOffline === null ||
      dataRequestOnline === null ||
      dataConsultOnline === null
    ) {
      return NextResponse.json(
        { error: "Semua field wajib diisi." },
        { status: 400 },
      );
    }
    data = {
      ...data,
      dataRequestOffline,
      dataConsultOffline,
      dataRequestOnline,
      dataConsultOnline,
      dataNotes: typeof body?.dataNotes === "string" ? body.dataNotes : null,
    };
  }

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data,
  });

  return NextResponse.json({ attendance: updated });
}
