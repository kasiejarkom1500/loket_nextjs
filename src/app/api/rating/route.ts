import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const queueId = Number(body?.queueId);
  const score = Number(body?.score);
  const comment = typeof body?.comment === "string" ? body.comment : null;

  if (!queueId || Number.isNaN(score)) {
    return NextResponse.json(
      { error: "queueId and score are required" },
      { status: 400 },
    );
  }

  if (score < 1 || score > 5) {
    return NextResponse.json({ error: "score must be 1-5" }, { status: 400 });
  }

  const queue = await prisma.queue.findUnique({
    where: { id: queueId },
  });

  if (!queue) {
    return NextResponse.json({ error: "Queue not found" }, { status: 404 });
  }

  const rating = await prisma.rating.create({
    data: {
      queueId,
      score,
      comment,
    },
  });

  return NextResponse.json({ rating });
}
