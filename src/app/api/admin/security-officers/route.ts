import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const securityOfficers = await prisma.securityOfficer.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ securityOfficers });
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const existing = await prisma.securityOfficer.findFirst({
    where: { name },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Nama satpam sudah ada." },
      { status: 400 },
    );
  }
  const securityOfficer = await prisma.securityOfficer.create({
    data: { name },
  });
  return NextResponse.json({ securityOfficer });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const id = Number(body?.id);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!id || !name) {
    return NextResponse.json(
      { error: "id and name are required" },
      { status: 400 },
    );
  }
  const securityOfficer = await prisma.securityOfficer.update({
    where: { id },
    data: { name },
  });
  return NextResponse.json({ securityOfficer });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  await prisma.securityOfficer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
