import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { getCurrentShift, getTodayRange } from "@/lib/time";

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
  const attendance = await prisma.attendance.findFirst({
    where: {
      userId: session.userId,
      role: session.role,
      shift,
      date: { gte: start, lte: end },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    attendance,
    role: session.role,
    shift,
  });
}
