import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signSession } from "@/lib/auth";
import { getCurrentShift, getTodayRange } from "@/lib/time";

const SESSION_COOKIE = "loket_session";
const SESSION_SECONDS = 60 * 60 * 8;

export async function POST(request: Request) {
  const body = await request.json();
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const mode =
    body?.mode === "admin" || body?.mode === "staff" ? body.mode : "staff";

  if (!username || !password) {
    return NextResponse.json(
      { error: "username and password are required" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  let role: "ADMIN" | "LAYANAN_PUBLIK" | "PERMINTAAN_DATA" = "ADMIN";
  let shift: "PAGI" | "SIANG" | null = null;
  let assignmentId: number | null = null;
  let counterId: number | null = null;

  if (mode === "admin") {
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Akun bukan admin." },
        { status: 403 },
      );
    }
  } else {
    const currentShift = getCurrentShift();
    const { start, end } = getTodayRange();
    const assignment = await prisma.assignment.findFirst({
      where: {
        userId: user.id,
        shift: currentShift,
        date: { gte: start, lte: end },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!assignment) {
      if (user.isAdmin) {
        role = "ADMIN";
      } else {
        return NextResponse.json(
          { error: "Tidak ada penugasan aktif untuk shift ini." },
          { status: 403 },
        );
      }
    } else {
      role = assignment.role;
      shift = assignment.shift;
      assignmentId = assignment.id;
      counterId = assignment.counterId ?? null;

      if (role === "LAYANAN_PUBLIK" && !counterId) {
        return NextResponse.json(
          { error: "Penugasan belum memiliki loket." },
          { status: 400 },
        );
      }
    }
  }

  const token = await signSession(
    {
      userId: user.id,
      counterId,
      nama: user.nama,
      username: user.username,
      role,
      shift,
      assignmentId,
      isAdmin: user.isAdmin,
    },
    SESSION_SECONDS,
  );

  const response = NextResponse.json({
    ok: true,
    counterId,
    role,
    nama: user.nama,
    mode,
  });

  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_SECONDS,
    path: "/",
  });

  return response;
}
