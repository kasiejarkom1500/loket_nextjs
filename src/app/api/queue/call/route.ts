import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { pushRealtimeState } from "@/lib/realtime";
import { verifySession } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const counterId = Number(body?.counterId);
  const queueId = body?.queueId ? Number(body.queueId) : null;
  const dataOfficerId = body?.dataOfficerId ? Number(body.dataOfficerId) : null;
  const securityOfficerId = body?.securityOfficerId
    ? Number(body.securityOfficerId)
    : null;

  if (!counterId) {
    return NextResponse.json(
      { error: "counterId is required" },
      { status: 400 },
    );
  }

  const token = (await cookies()).get("loket_session")?.value;
  let sessionUserId: number | null = null;
  if (token) {
    try {
      const session = await verifySession(token);
      if (session.role !== "LAYANAN_PUBLIK") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (session.counterId !== counterId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      sessionUserId = session.userId;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const currentShift = now.getHours() < 12 ? "PAGI" : "SIANG";

  const isDataService = (serviceName: string) =>
    serviceName.toLowerCase().includes("permintaan data");

  if (dataOfficerId) {
    const dataAssignment = await prisma.assignment.findFirst({
      where: {
        userId: dataOfficerId,
        role: "PERMINTAAN_DATA",
        shift: currentShift,
        date: { gte: start, lte: end },
      },
    });

    if (!dataAssignment) {
      return NextResponse.json(
        { error: "Petugas permintaan data tidak aktif" },
        { status: 400 },
      );
    }
  }

  if (securityOfficerId) {
    const securityOfficer = await prisma.securityOfficer.findUnique({
      where: { id: securityOfficerId },
    });
    if (!securityOfficer) {
      return NextResponse.json(
        { error: "Satpam tidak ditemukan" },
        { status: 400 },
      );
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
        include: { service: true },
      })
    : await prisma.queue.findFirst({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: { service: true },
      });

  if (!nextQueue) {
    return NextResponse.json(
      { error: "No pending queue" },
      { status: 404 },
    );
  }

  if (isDataService(nextQueue.service.name) && !dataOfficerId) {
    return NextResponse.json(
      { error: "Petugas permintaan data wajib dipilih." },
      { status: 400 },
    );
  }

  const updatedQueue = await prisma.queue.update({
    where: { id: nextQueue.id },
    data: {
      status: "CALLED",
      counterId,
      publicOfficerId: sessionUserId,
      dataOfficerId,
      securityOfficerId,
      calledAt: new Date(),
    },
    include: { service: true, counter: true },
  });

  await pushRealtimeState();

  return NextResponse.json({ queue: updatedQueue });
}
