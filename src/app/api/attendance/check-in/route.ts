import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { getCurrentShift, getTodayDate } from "@/lib/time";

export async function POST() {
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

  const shift = getCurrentShift();
  const date = getTodayDate();
  const attendance = await prisma.attendance.upsert({
    where: {
      userId_date_shift_role: {
        userId: session.userId,
        date,
        shift,
        role: session.role,
      },
    },
    create: {
      userId: session.userId,
      role: session.role,
      shift,
      date,
      checkInAt: new Date(),
    },
    update: {
      checkInAt: new Date(),
    },
  });

  return NextResponse.json({ attendance });
}
