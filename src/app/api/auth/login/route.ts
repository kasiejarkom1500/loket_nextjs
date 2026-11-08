import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signSession } from "@/lib/auth";
import {
  getCurrentShift,
  getLoginEligibleShifts,
  getTodayRange,
} from "@/lib/time";

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

  let role: "ADMIN" | "LAYANAN_PUBLIK" | "PERMINTAAN_DATA" | null = "ADMIN";
  let shift: "PAGI" | "SIANG" | null = null;
  let assignmentId: number | null = null;
  let counterId: number | null = null;
  let isSubstitute = false;

  if (mode === "admin") {
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Akun bukan admin." },
        { status: 403 },
      );
    }
  } else {
    const loginEligibleShifts = await getLoginEligibleShifts();
    const currentShift = loginEligibleShifts[0] ?? (await getCurrentShift());
    const { start, end } = getTodayRange();
    const assignments = await prisma.assignment.findMany({
      where: {
        userId: user.id,
        date: { gte: start, lte: end },
      },
      orderBy: { createdAt: "desc" },
    });
    const openAttendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        date: { gte: start, lte: end },
        checkInAt: { not: null },
        checkOutAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
    const assignment =
      (openAttendance
        ? assignments.find(
            (item) =>
              item.shift === openAttendance.shift &&
              item.role === openAttendance.role,
          )
        : null) ??
      loginEligibleShifts
        .map((eligibleShift) =>
          assignments.find((item) => item.shift === eligibleShift),
        )
        .find(Boolean);

    if (!assignment) {
      if (user.isAdmin) {
        const substituteRole = body?.substituteRole;
        if (substituteRole !== "LAYANAN_PUBLIK" && substituteRole !== "PERMINTAAN_DATA") {
          const counters = await prisma.counter.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
          return NextResponse.json({ error: "Pilih mode pengganti.", needsSubstituteChoice: true, roles: ["LAYANAN_PUBLIK", "PERMINTAAN_DATA"], counters }, { status: 400 });
        }
        role = substituteRole;
        shift = currentShift;
        assignmentId = null;
        isSubstitute = true;
        if (role === "LAYANAN_PUBLIK") {
          const requestedCounterId = Number(body?.counterId);
          const counter = Number.isInteger(requestedCounterId) ? await prisma.counter.findUnique({ where: { id: requestedCounterId }, select: { id: true } }) : null;
          if (!counter) return NextResponse.json({ error: "Loket tidak valid." }, { status: 400 });
          counterId = counter.id;
        }
      } else {
        role = null;
        shift = null;
        assignmentId = null;
        counterId = null;
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
      ...(isSubstitute ? { isSubstitute: true } : {}),
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
