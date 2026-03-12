import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushRealtimeState } from "@/lib/realtime";

export async function POST(request: Request) {
  const body = await request.json();
  const queueId = Number(body?.queueId);
  const staffPurposeDetail =
    typeof body?.staffPurposeDetail === "string"
      ? body.staffPurposeDetail.trim()
      : "";

  if (!queueId) {
    return NextResponse.json(
      { error: "queueId is required" },
      { status: 400 },
    );
  }

  const queue = await prisma.queue.findUnique({
    where: { id: queueId },
  });

  if (!queue) {
    return NextResponse.json({ error: "Queue not found" }, { status: 404 });
  }

  const updated = await prisma.queue.update({
    where: { id: queueId },
    data: { staffPurposeDetail },
  });

  await pushRealtimeState();

  return NextResponse.json({ queue: updated });
}
