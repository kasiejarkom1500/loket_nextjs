import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushRealtimeState } from "@/lib/realtime";

export async function POST(request: Request) {
  const body = await request.json();
  const queueId = Number(body?.queueId);
  const serviceId = Number(body?.serviceId);

  if (!queueId || !serviceId) {
    return NextResponse.json(
      { error: "queueId and serviceId are required" },
      { status: 400 },
    );
  }

  const queue = await prisma.queue.findUnique({
    where: { id: queueId },
  });

  if (!queue || queue.status !== "PENDING") {
    return NextResponse.json(
      { error: "Queue not found or not pending" },
      { status: 400 },
    );
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const updated = await prisma.queue.update({
    where: { id: queueId },
    data: { serviceId },
  });

  await pushRealtimeState();

  return NextResponse.json({ queue: updated });
}
