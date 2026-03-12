import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const normalizeColor = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
};

export async function GET() {
  const services = await prisma.service.findMany({
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ services });
}

export async function POST(request: Request) {
  const body = await request.json();
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const color = normalizeColor(body?.color);

  if (!code || !name) {
    return NextResponse.json(
      { error: "code dan name wajib diisi" },
      { status: 400 },
    );
  }

  const service = await prisma.service.create({
    data: { code, name, color },
  });

  return NextResponse.json({ service });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const id = Number(body?.id);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const color = normalizeColor(body?.color);

  if (!id || !code || !name) {
    return NextResponse.json(
      { error: "id, code, dan name wajib diisi" },
      { status: 400 },
    );
  }

  const service = await prisma.service.update({
    where: { id },
    data: { code, name, color },
  });

  return NextResponse.json({ service });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
  }
  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
