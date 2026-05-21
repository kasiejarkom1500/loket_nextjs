import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSession } from "@/lib/auth";
import { getActiveShifts, getCurrentShift, getTodayRange } from "@/lib/time";

const SESSION_COOKIE = "loket_session";
const SESSION_SECONDS = 60 * 60 * 8;

type SsoLoginResponse = {
  status?: number;
  token?: string;
};

type SsoValidateResponse = {
  user?: {
    nip_lama_user?: string;
  };
};

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

  const baseUrl = process.env.SSO_BASE_URL;
  const secretKey = process.env.SSO_SECRET_KEY;
  if (!baseUrl || !secretKey) {
    return NextResponse.json(
      { error: "SSO is not configured" },
      { status: 500 },
    );
  }

  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username,
      password,
    }),
  });

  if (!loginResponse.ok) {
    return NextResponse.json({ error: "SSO login failed" }, { status: 401 });
  }

  const loginData = (await loginResponse.json()) as SsoLoginResponse;
  if (!(loginData?.status === 200 || loginData?.token)) {
    return NextResponse.json({ error: "SSO login failed" }, { status: 401 });
  }

  const validateResponse = await fetch(`${baseUrl}/auth/validate-token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token: loginData.token ?? "",
      secret_key: secretKey,
    }),
  });

  if (!validateResponse.ok) {
    return NextResponse.json({ error: "SSO validate failed" }, { status: 401 });
  }

  const validateData = (await validateResponse.json()) as SsoValidateResponse;
  const nipLama = validateData?.user?.nip_lama_user;
  if (!nipLama) {
    return NextResponse.json({ error: "SSO user not found" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { nipLama },
  });

  if (!user) {
    return NextResponse.json({ error: "NIP tidak ditemukan" }, { status: 401 });
  }

  let role: "ADMIN" | "LAYANAN_PUBLIK" | "PERMINTAAN_DATA" = "ADMIN";
  let shift: "PAGI" | "SIANG" | null = null;
  let assignmentId: number | null = null;
  let counterId: number | null = null;

  if (mode === "admin") {
    if (!user.isAdmin) {
      return NextResponse.json({ error: "Akun bukan admin." }, { status: 403 });
    }
  } else {
    const activeShifts = await getActiveShifts();
    const currentShift = activeShifts[0] ?? (await getCurrentShift());
    const { start, end } = getTodayRange();
    const assignmentShifts = activeShifts.length ? activeShifts : [currentShift];
    const assignments = await prisma.assignment.findMany({
      where: {
        userId: user.id,
        shift: { in: assignmentShifts },
        date: { gte: start, lte: end },
      },
      orderBy: { createdAt: "desc" },
    });
    const openAttendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        shift: { in: assignmentShifts },
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
      assignmentShifts
        .map((activeShift) =>
          assignments.find((item) => item.shift === activeShift),
        )
        .find(Boolean);

    if (!assignment) {
      if (user.isAdmin) {
        role = "LAYANAN_PUBLIK";
        shift = currentShift;
        assignmentId = null;
        counterId = null;
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
