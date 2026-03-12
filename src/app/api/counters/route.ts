import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const counters = await prisma.counter.findMany({
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ counters });
}
