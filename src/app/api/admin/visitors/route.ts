import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
};

const parseDateRange = (from: string | null, to: string | null) => {
  const start = from ? parseLocalDate(from) : new Date();
  const end = to ? parseLocalDate(to) : new Date();
  if (!start || !end) {
    return null;
  }
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const range = parseDateRange(from, to);

  if (!range) {
    return NextResponse.json(
      { error: "Format tanggal tidak valid" },
      { status: 400 },
    );
  }

  const queues = await prisma.queue.findMany({
    where: {
      createdAt: { gte: range.start, lte: range.end },
      visitorId: { not: null },
    },
    include: {
      visitor: true,
      service: true,
      counter: true,
      publicOfficer: true,
      dataOfficer: true,
      securityOfficer: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const items = queues.map((queue) => ({
    id: queue.id,
    number: queue.number,
    serviceName: queue.service.name,
    counterName: queue.counter?.name ?? "-",
    status: queue.status,
    createdAt: queue.createdAt.toISOString(),
    staffPurposeDetail: queue.staffPurposeDetail ?? "",
    publicOfficerName: queue.publicOfficer?.nama ?? "-",
    dataOfficerName: queue.dataOfficer?.nama ?? "-",
    securityOfficerName: queue.securityOfficer?.name ?? "-",
    visitorName: queue.visitor?.name ?? "-",
    visitorPhone: queue.visitor?.phone ?? "-",
    visitorOrigin: queue.visitor?.origin ?? "-",
    visitorPurpose: queue.visitor?.purpose ?? "-",
  }));

  return NextResponse.json({ items });
}
