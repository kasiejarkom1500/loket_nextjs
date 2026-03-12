import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { nama: "asc" },
    select: {
      id: true,
      nama: true,
      username: true,
      nipLama: true,
      isAdmin: true,
      counterId: true,
    },
  });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const body = await request.json();
  const nama = typeof body?.nama === "string" ? body.nama.trim() : "";
  const nipLama = typeof body?.nipLama === "string" ? body.nipLama.trim() : "";
  const username =
    typeof body?.username === "string" ? body.username.trim() : "";
  const password =
    typeof body?.password === "string" ? body.password.trim() : "";
  const isAdmin = Boolean(body?.isAdmin);
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
      isAdmin,
      counterId,
    },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      nama: user.nama,
      username: user.username,
      nipLama: user.nipLama,
      isAdmin: user.isAdmin,
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
  const isAdmin = Boolean(body?.isAdmin);
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
    isAdmin: boolean;
    counterId: number | null;
    password?: string;
  } = {
    nama,
    nipLama,
    username,
    isAdmin,
    counterId,
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
      isAdmin: user.isAdmin,
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
