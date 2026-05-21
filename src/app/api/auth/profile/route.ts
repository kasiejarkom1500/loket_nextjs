import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signSession, verifySession } from "@/lib/auth";

const SESSION_COOKIE = "loket_session";
const SESSION_SECONDS = 60 * 60 * 8;

export async function PUT(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let session;
  try {
    session = await verifySession(token);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const currentPassword =
    typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!username || !currentPassword) {
    return NextResponse.json(
      { error: "Username dan password saat ini wajib diisi." },
      { status: 400 },
    );
  }

  if (newPassword && newPassword.length < 6) {
    return NextResponse.json(
      { error: "Password baru minimal 6 karakter." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  }

  const passwordValid = await bcrypt.compare(currentPassword, user.password);
  if (!passwordValid) {
    return NextResponse.json(
      { error: "Password saat ini salah." },
      { status: 400 },
    );
  }

  if (username !== user.username) {
    const usernameUsed = await prisma.user.findUnique({ where: { username } });
    if (usernameUsed) {
      return NextResponse.json(
        { error: "Username sudah digunakan." },
        { status: 400 },
      );
    }
  }

  if (username === user.username && !newPassword) {
    return NextResponse.json(
      { error: "Tidak ada perubahan yang disimpan." },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      username,
      ...(newPassword ? { password: await bcrypt.hash(newPassword, 10) } : {}),
    },
  });

  const nextToken = await signSession(
    {
      userId: session.userId,
      counterId: session.counterId,
      nama: updated.nama,
      username: updated.username,
      role: session.role,
      shift: session.shift,
      assignmentId: session.assignmentId,
      isAdmin: updated.isAdmin,
    },
    SESSION_SECONDS,
  );

  const response = NextResponse.json({
    ok: true,
    user: {
      nama: updated.nama,
      username: updated.username,
      role: session.role,
      counterId: session.counterId,
    },
  });

  response.cookies.set({
    name: SESSION_COOKIE,
    value: nextToken,
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_SECONDS,
    path: "/",
  });

  return response;
}
