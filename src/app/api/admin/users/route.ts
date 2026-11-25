import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession, isAdminLevel } from "@/lib/auth";

const SESSION_COOKIE = "loket_session";
const getSession = async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try { return await verifySession(token); } catch { return null; }
};
const isSuperAdmin = async () => (await getSession())?.adminLevel === "SUPER_ADMIN";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { nama: "asc" },
    select: {
      id: true,
      nama: true,
      username: true,
      nipLama: true,
      adminLevel: true,
      counterId: true,
    },
  });
  return NextResponse.json({ users, canManageAdminLevels: await isSuperAdmin() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const nama = typeof body?.nama === "string" ? body.nama.trim() : "";
  const nipLama = typeof body?.nipLama === "string" ? body.nipLama.trim() : "";
  const username =
    typeof body?.username === "string" ? body.username.trim() : "";
  const password =
    typeof body?.password === "string" ? body.password.trim() : "";
  const requestedAdminLevel = body?.adminLevel;
  if (body?.isAdmin !== undefined) {
    return NextResponse.json({ error: "isAdmin sudah tidak didukung; gunakan adminLevel." }, { status: 400 });
  }
  if (requestedAdminLevel !== undefined) {
    if ((await getSession())?.adminLevel !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin yang dapat membuat akun admin." }, { status: 403 });
    }
    if (requestedAdminLevel !== null && !isAdminLevel(requestedAdminLevel)) {
      return NextResponse.json({ error: "adminLevel tidak valid." }, { status: 400 });
    }
  }
  const counterId =
    body?.counterId === null || body?.counterId === undefined
      ? null
      : Number(body.counterId);

  if (!nama || !nipLama || !username || !password) {
    return NextResponse.json(
      { error: "nama, nipLama, username, dan password wajib diisi" },
      { status: 400 },
    );
  }


  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Username sudah digunakan" },
      { status: 400 },
    );
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      nama,
      nipLama,
      username,
      password: hash,
      adminLevel: requestedAdminLevel === undefined ? null : requestedAdminLevel,
      counterId,
    },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      nama: user.nama,
      username: user.username,
      nipLama: user.nipLama,
      adminLevel: user.adminLevel,
      counterId: user.counterId,
    },
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const id = Number(body?.id);
  const nama = typeof body?.nama === "string" ? body.nama.trim() : "";
  const nipLama = typeof body?.nipLama === "string" ? body.nipLama.trim() : "";
  const username =
    typeof body?.username === "string" ? body.username.trim() : "";
  const password =
    typeof body?.password === "string" ? body.password.trim() : "";
  const adminLevel = body?.adminLevel;
  const changeAdminLevel = adminLevel !== undefined;
  if (body?.isAdmin !== undefined) {
    return NextResponse.json({ error: "Gunakan adminLevel dan hak Super Admin untuk mengubah level." }, { status: 403 });
  }
  const counterId =
    body?.counterId === null || body?.counterId === undefined
      ? null
      : Number(body.counterId);

  if (!id || !nama || !nipLama || !username) {
    return NextResponse.json(
      { error: "id, nama, nipLama, dan username wajib diisi" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }
  if (changeAdminLevel) {
    const actor = await getSession();
    if (actor?.adminLevel !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya Super Admin yang dapat mengubah level admin." }, { status: 403 });
    }
    if (actor.userId === id) {
      return NextResponse.json({ error: "Level akun sendiri tidak dapat diubah melalui endpoint ini." }, { status: 403 });
    }
    if (adminLevel !== null && !isAdminLevel(adminLevel)) {
      return NextResponse.json({ error: "adminLevel tidak valid." }, { status: 400 });
    }
    if (existing.adminLevel === "SUPER_ADMIN" && adminLevel !== "SUPER_ADMIN") {
      const superAdminCount = await prisma.user.count({ where: { adminLevel: "SUPER_ADMIN" } });
      if (superAdminCount <= 1) {
        return NextResponse.json({ error: "Super Admin terakhir tidak dapat diturunkan atau dicabut." }, { status: 400 });
      }
    }
  }

  if (existing.username !== username) {
    const usernameUsed = await prisma.user.findUnique({
      where: { username },
    });
    if (usernameUsed) {
      return NextResponse.json(
        { error: "Username sudah digunakan" },
        { status: 400 },
      );
    }
  }

  const data: {
    nama: string;
    nipLama: string;
    username: string;
    counterId: number | null;
    adminLevel?: typeof existing.adminLevel;
    password?: string;
  } = {
    nama,
    nipLama,
    username,
    counterId,
    ...(changeAdminLevel ? { adminLevel } : {}),
  };

  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      nama: user.nama,
      username: user.username,
      nipLama: user.nipLama,
      adminLevel: user.adminLevel,
      counterId: user.counterId,
    },
  });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { adminLevel: true } });
  if (target?.adminLevel === "SUPER_ADMIN") {
    const superAdminCount = await prisma.user.count({ where: { adminLevel: "SUPER_ADMIN" } });
    if (superAdminCount <= 1) {
      return NextResponse.json({ error: "Super Admin terakhir tidak dapat dihapus." }, { status: 400 });
    }
  }

  const assignmentCount = await prisma.assignment.count({
    where: { userId: id },
  });
  if (assignmentCount > 0) {
    return NextResponse.json(
      { error: "User masih memiliki penugasan." },
      { status: 400 },
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
