import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { firebaseDb } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const counterId = Number(body?.counterId);

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

  if (!firebaseDb) {
    return NextResponse.json(
      { error: "Realtime database not configured" },
      { status: 500 },
    );
  }

  const queue = await prisma.queue.findFirst({
    where: {
      status: "CALLED",
      counterId,
    },
    include: { service: true },
    orderBy: { calledAt: "desc" },
  });

  if (!queue) {
    return NextResponse.json(
      { error: "Tidak ada antrian dipanggil di loket ini." },
      { status: 404 },
    );
  }

  const payload = {
    id: Date.now(),
    queueId: queue.id,
    number: queue.number,
    serviceName: queue.service.name,
    counterId,
    createdAt: new Date().toISOString(),
  };

  await firebaseDb.ref("sound").set(payload);

  return NextResponse.json({ ok: true, sound: payload });
}
