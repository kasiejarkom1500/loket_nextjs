import { prisma } from "./prisma";
import { firebaseDb } from "./firebase-admin";
import { DateTime } from "luxon";

type CalledQueue = {
  queueId: number;
  number: string;
  counterId: number;
  counterName: string;
  serviceName: string;
  calledAt: string | null;
  status: "CALLED" | "COMPLETED";
};

type CounterState = {
  queueId: number;
  number: string;
  serviceName: string;
  calledAt: string | null;
  visitorName: string;
  visitorPhone: string;
  visitorOrigin: string;
  visitorPurpose: string;
  staffPurposeDetail: string;
  publicOfficerName: string;
  dataOfficerName: string;
  securityOfficerName: string;
};

type PendingQueue = {
  queueId: number;
  number: string;
  serviceName: string;
  createdAt: string;
  visitorName: string;
  visitorPhone: string;
  visitorOrigin: string;
  visitorPurpose: string;
};

export type RealtimeState = {
  updatedAt: string;
  called: CalledQueue[];
  counters: Record<string, CounterState | null>;
  pending: PendingQueue[];
};

export async function buildRealtimeState(): Promise<RealtimeState> {
  const now = DateTime.now().setZone("Asia/Jakarta");
  const startOfDay = now.startOf("day").toJSDate();
  const endOfToday = now.endOf("day").toJSDate();

  const [activeCalledQueues, recentQueues, pendingQueues, counters] =
    await Promise.all([
      prisma.queue.findMany({
        where: {
          status: "CALLED",
          createdAt: { gte: startOfDay, lte: endOfToday },
        },
        include: {
          counter: true,
          service: true,
          visitor: true,
          publicOfficer: true,
          dataOfficer: true,
          securityOfficer: true,
        },
        orderBy: { calledAt: "desc" },
      }),
      prisma.queue.findMany({
        where: {
          calledAt: { not: null },
          createdAt: { gte: startOfDay, lte: endOfToday },
        },
        include: {
          counter: true,
          service: true,
          visitor: true,
          publicOfficer: true,
          dataOfficer: true,
          securityOfficer: true,
        },
        orderBy: { calledAt: "desc" },
        take: 10,
      }),
      prisma.queue.findMany({
        where: {
          status: "PENDING",
          createdAt: { gte: startOfDay, lte: endOfToday },
        },
        include: { service: true, visitor: true },
        orderBy: { createdAt: "asc" },
        take: 15,
      }),
      prisma.counter.findMany({ orderBy: { id: "asc" } }),
    ]);

  const countersState: Record<string, CounterState | null> = {};
  const latestByCounter = new Map<number, CounterState>();

  for (const queue of activeCalledQueues) {
    if (!queue.counterId || latestByCounter.has(queue.counterId)) {
      continue;
    }
    latestByCounter.set(queue.counterId, {
      queueId: queue.id,
      number: queue.number,
      serviceName: queue.service.name,
      calledAt: queue.calledAt ? queue.calledAt.toISOString() : null,
      visitorName: queue.visitor?.name ?? "-",
      visitorPhone: queue.visitor?.phone ?? "-",
      visitorOrigin: queue.visitor?.origin ?? "-",
      visitorPurpose: queue.visitor?.purpose ?? "-",
      staffPurposeDetail: queue.staffPurposeDetail ?? "",
      publicOfficerName: queue.publicOfficer?.nama ?? "-",
      dataOfficerName: queue.dataOfficer?.nama ?? "-",
      securityOfficerName: queue.securityOfficer?.name ?? "-",
    });
  }

  for (const counter of counters) {
    countersState[String(counter.id)] = latestByCounter.get(counter.id) ?? null;
  }

  const latestByService = new Map<number, CalledQueue>();
  for (const queue of recentQueues) {
    if (!queue.counterId || !queue.counter) {
      continue;
    }
    if (latestByService.has(queue.serviceId)) {
      continue;
    }
    latestByService.set(queue.serviceId, {
      queueId: queue.id,
      number: queue.number,
      counterId: queue.counterId as number,
      counterName: queue.counter?.name ?? `Loket ${queue.counterId}`,
      serviceName: queue.service.name,
      calledAt: queue.calledAt ? queue.calledAt.toISOString() : null,
      status: queue.status === "CALLED" ? "CALLED" : "COMPLETED",
    });
  }

  const called: CalledQueue[] = Array.from(latestByService.values());
  const pending: PendingQueue[] = pendingQueues.map((queue) => ({
    queueId: queue.id,
    number: queue.number,
    serviceName: queue.service.name,
    createdAt: queue.createdAt.toISOString(),
    visitorName: queue.visitor?.name ?? "-",
    visitorPhone: queue.visitor?.phone ?? "-",
    visitorOrigin: queue.visitor?.origin ?? "-",
    visitorPurpose: queue.visitor?.purpose ?? "-",
  }));

  return {
    updatedAt: new Date().toISOString(),
    called,
    counters: countersState,
    pending,
  };
}

export async function pushRealtimeState(): Promise<RealtimeState | null> {
  if (!firebaseDb) {
    return null;
  }
  const state = await buildRealtimeState();
  await firebaseDb.ref("state").set(state);
  return state;
}
