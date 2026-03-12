import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

const getCurrentShift = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "PAGI" : "SIANG";
};

const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
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

  const shift = getCurrentShift();
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
