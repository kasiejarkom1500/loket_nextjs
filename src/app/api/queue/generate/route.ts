import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushRealtimeState } from "@/lib/realtime";
import { getTodayRange } from "@/lib/time";

export async function POST(request: Request) {
  const body = await request.json();
  const serviceId = Number(body?.serviceId);
  const visitorName =
    typeof body?.visitorName === "string" ? body.visitorName.trim() : "";
  const visitorPhone =
    typeof body?.visitorPhone === "string" ? body.visitorPhone.trim() : "";
  const visitorOrigin =
    typeof body?.visitorOrigin === "string" ? body.visitorOrigin.trim() : "";
  const visitorPurpose =
    typeof body?.visitorPurpose === "string" ? body.visitorPurpose.trim() : "";

  if (!serviceId) {
    return NextResponse.json(
      { error: "serviceId is required" },
      { status: 400 },
    );
  }
  if (!visitorName || !visitorPhone || !visitorOrigin || !visitorPurpose) {
    return NextResponse.json(
      { error: "visitor data is required" },
      { status: 400 },
    );
  }
  if (!/^\d{10,13}$/.test(visitorPhone)) {
    return NextResponse.json(
      { error: "visitorPhone must be 10-13 digits" },
      { status: 400 },
    );
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const { start: startOfDay, end: endOfDay } = getTodayRange();

  const todayCount = await prisma.queue.count({
    where: {
      serviceId,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const number = `${service.code}-${String(todayCount + 1).padStart(3, "0")}`;

  const visitor = await prisma.visitor.create({
    data: {
      name: visitorName,
      phone: visitorPhone,
      origin: visitorOrigin,
      purpose: visitorPurpose,
    },
  });

  const queue = await prisma.queue.create({
    data: {
      number,
      serviceId,
      visitorId: visitor.id,
    },
  });

  await pushRealtimeState();

  return NextResponse.json({ queue });
}
