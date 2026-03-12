import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const securityOfficers = await prisma.securityOfficer.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ securityOfficers });
}
