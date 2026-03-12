import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

const parseDateRange = (dateString: string | null) => {
  const date = dateString ? parseLocalDate(dateString) : new Date();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const { start, end } = parseDateRange(dateParam);

  const assignments = await prisma.assignment.findMany({
    where: { date: { gte: start, lte: end } },
    include: { user: true, counter: true },
    orderBy: [{ shift: "asc" }, { role: "asc" }],
  });

  const items = assignments.map((assignment) => ({
    ...assignment,
    date: formatLocalDate(assignment.date),
  }));

  return NextResponse.json({ assignments: items });
}

export async function POST(request: Request) {
  const body = await request.json();
  const userId = Number(body?.userId);
  const role = body?.role as "LAYANAN_PUBLIK" | "PERMINTAAN_DATA";
  const shift = body?.shift as "PAGI" | "SIANG";
  const counterId =
    body?.counterId === null || body?.counterId === undefined
      ? null
      : Number(body.counterId);
  const dateString = typeof body?.date === "string" ? body.date : "";

  if (!userId || !role || !shift || !dateString) {
    return NextResponse.json(
      { error: "userId, role, shift, and date are required" },
      { status: 400 },
    );
  }
  if (role === "LAYANAN_PUBLIK" && !counterId) {
    return NextResponse.json(
      { error: "counterId is required for layanan publik" },
      { status: 400 },
    );
  }

  const date = parseLocalDate(dateString);

  const assignment = await prisma.assignment.upsert({
    where: {
      userId_date_shift: {
        userId,
        date,
        shift,
      },
    },
    create: {
      userId,
      role,
      shift,
      date,
      counterId,
    },
    update: {
      role,
      counterId,
    },
  });

  return NextResponse.json({ assignment });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const id = Number(body?.id);
  const userId = Number(body?.userId);
  const role = body?.role as "LAYANAN_PUBLIK" | "PERMINTAAN_DATA";
  const shift = body?.shift as "PAGI" | "SIANG";
  const counterId =
    body?.counterId === null || body?.counterId === undefined
      ? null
      : Number(body.counterId);
  const dateString = typeof body?.date === "string" ? body.date : "";

  if (!id || !userId || !role || !shift || !dateString) {
    return NextResponse.json(
      { error: "id, userId, role, shift, dan date wajib diisi" },
      { status: 400 },
    );
  }
  if (role === "LAYANAN_PUBLIK" && !counterId) {
    return NextResponse.json(
      { error: "counterId is required for layanan publik" },
      { status: 400 },
    );
  }

  const date = parseLocalDate(dateString);

  const assignment = await prisma.assignment.update({
    where: { id },
    data: {
      userId,
      role,
      shift,
      date,
      counterId,
    },
  });

  return NextResponse.json({ assignment });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
  }
  await prisma.assignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
