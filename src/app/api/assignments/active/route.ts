import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const role = url.searchParams.get("role");
  if (!role) {
    return NextResponse.json({ error: "role is required" }, { status: 400 });
  }
  const shift = getCurrentShift();
  const { start, end } = getTodayRange();

  const assignments = await prisma.assignment.findMany({
    where: {
      role: role as "LAYANAN_PUBLIK" | "PERMINTAAN_DATA",
      shift,
      date: { gte: start, lte: end },
    },
    include: { user: true },
    orderBy: { user: { nama: "asc" } },
  });

  const users = assignments.map((assignment) => ({
    id: assignment.user.id,
    nama: assignment.user.nama,
    nipLama: assignment.user.nipLama,
  }));

  return NextResponse.json({ users, shift });
}
