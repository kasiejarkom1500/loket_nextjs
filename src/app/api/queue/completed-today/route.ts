import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const queues = await prisma.queue.findMany({
    where: {
      status: "COMPLETED",
      completedAt: { gte: start, lte: end },
      rating: null,
    },
    include: {
      visitor: true,
      publicOfficer: true,
      dataOfficer: true,
      securityOfficer: true,
    },
    orderBy: { completedAt: "desc" },
  });

  const items = queues.map((queue) => ({
    id: queue.id,
    number: queue.number,
    visitorName: queue.visitor?.name ?? "-",
    publicOfficerName: queue.publicOfficer?.nama ?? "-",
    dataOfficerName: queue.dataOfficer?.nama ?? null,
    securityOfficerName: queue.securityOfficer?.name ?? "-",
    hasDataOfficer: Boolean(queue.dataOfficerId),
  }));

  return NextResponse.json({ queues: items });
}
