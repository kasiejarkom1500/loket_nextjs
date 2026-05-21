import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { getCurrentShift, getShiftSettings, getTodayRange } from "@/lib/time";

const APP_TIMEZONE = "Asia/Jakarta";

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

export async function GET() {
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

  const shift = session.shift ?? (await getCurrentShift());
  const { start, end } = getTodayRange();
  const shiftSettings = await getShiftSettings();
  const shiftSetting = shiftSettings.find((item) => item.shift === shift);
  const attendance = await prisma.attendance.findFirst({
    where: {
      userId: session.userId,
      role: session.role,
      shift,
      date: { gte: start, lte: end },
    },
    orderBy: { createdAt: "desc" },
  });

  let lateMinutes = 0;
  if (attendance?.checkInAt && shiftSetting) {
    const startTime = parseTime(shiftSetting.startTime);
    if (startTime) {
      const shiftStart = DateTime.fromJSDate(start)
        .setZone(APP_TIMEZONE)
        .set({
          hour: startTime.hour,
          minute: startTime.minute,
          second: 0,
          millisecond: 0,
        });
      const checkIn = DateTime.fromJSDate(attendance.checkInAt).setZone(
        APP_TIMEZONE,
      );
      lateMinutes = Math.max(
        0,
        Math.floor(checkIn.diff(shiftStart, "minutes").minutes),
      );
    }
  }

  return NextResponse.json({
    attendance,
    role: session.role,
    shift,
    meta: {
      shift,
      startTime: shiftSetting?.startTime ?? null,
      endTime: shiftSetting?.endTime ?? null,
      lateMinutes,
    },
  });
}
