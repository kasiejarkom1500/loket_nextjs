import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { pushRealtimeState } from "@/lib/realtime";
import { verifySession } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const counterId = Number(body?.counterId);
  const queueId = body?.queueId ? Number(body.queueId) : null;

  if (!counterId) {
    return NextResponse.json(
      { error: "counterId is required" },
      { status: 400 },
    );
  }

  const token = (await cookies()).get("loket_session")?.value;
  if (token) {
    try {
      const session = await verifySession(token);
      if (session.role !== "LAYANAN_PUBLIK") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (session.counterId !== counterId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const counter = await prisma.counter.findUnique({
    where: { id: counterId },
  });

  if (!counter) {
    return NextResponse.json({ error: "Counter not found" }, { status: 404 });
  }

  const nextQueue = queueId
    ? await prisma.queue.findFirst({
        where: { id: queueId, status: "PENDING" },
      })
    : await prisma.queue.findFirst({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
      });

  if (!nextQueue) {
    return NextResponse.json(
      { error: "No pending queue" },
      { status: 404 },
    );
  }

  const updatedQueue = await prisma.queue.update({
    where: { id: nextQueue.id },
    data: {
      status: "CALLED",
      counterId,
      calledAt: new Date(),
    },
    include: { service: true, counter: true },
  });

  await pushRealtimeState();

  return NextResponse.json({ queue: updatedQueue });
}
