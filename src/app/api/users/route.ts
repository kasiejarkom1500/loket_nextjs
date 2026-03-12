import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    where: { isAdmin: false },
    orderBy: { nama: "asc" },
    select: {
      id: true,
      nama: true,
      nipLama: true,
    },
  });

  return NextResponse.json({ users });
}
