import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { pushRealtimeState } from "@/lib/realtime";
import { verifySession } from "@/lib/auth";
import { appendRowToSheet } from "@/lib/google-sheets";
import { DateTime } from "luxon";

const isPermintaanDataService = (serviceName: string) =>
  serviceName.toLowerCase().includes("permintaan data");

const monthNameId = (date: Date) =>
  DateTime.fromJSDate(date).setZone("Asia/Jakarta").toFormat("LLLL");

export async function POST(request: Request) {
  const body = await request.json();
  const queueId = Number(body?.queueId);

  if (!queueId) {
    return NextResponse.json(
      { error: "queueId is required" },
      { status: 400 },
    );
  }

  let queue = await prisma.queue.findUnique({
    where: { id: queueId },
  });

  if (!queue) {
    return NextResponse.json({ error: "Queue not found" }, { status: 404 });
  }

  const token = (await cookies()).get("loket_session")?.value;
  if (token) {
    try {
      const session = await verifySession(token);
      if (session.role !== "LAYANAN_PUBLIK") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (queue.counterId !== session.counterId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const updatedQueue = await prisma.queue.update({
    where: { id: queueId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
    include: {
      service: true,
      counter: true,
      visitor: true,
      publicOfficer: true,
      dataOfficer: true,
    },
  });

  if (isPermintaanDataService(updatedQueue.service.name)) {
    try {
      const start = updatedQueue.createdAt;
      const end = updatedQueue.completedAt ?? new Date();
      const minutes = Math.max(
        0,
        Math.round((end.getTime() - start.getTime()) / 60000),
      );

      await appendRowToSheet([
        updatedQueue.createdAt.toISOString(), // Timestamp
        updatedQueue.visitor?.name ?? "", // Nama Lengkap
        updatedQueue.visitor?.origin ?? "", // Instansi
        "", // Email
        updatedQueue.visitor?.phone ?? "", // No Handphone
        updatedQueue.visitor?.purpose ?? "", // Data/Konsultasi yang dibutuhkan
        "", // Kegunaan Data
        "", // PUBLIKASI YANG DISARANKAN
        updatedQueue.dataOfficer?.nama ?? "", // Petugas Konsultasi
        updatedQueue.publicOfficer?.nama ?? "", // Petugas Pelayanan dan Pengaduan
        monthNameId(updatedQueue.createdAt), // Bulan
        `${minutes} menit`, // Waktu Penyelesaian
        "", // Durasi penyelesaian (jam dalam jam layanan)
        "", // Pembagian Tugas Petugas Pelayanan Publik untuk SKD
        "", // Apakah sudah dikirimkan link SKD ?
        "", // YBS Telah Merespon
        updatedQueue.staffPurposeDetail ?? "", // Keterangan
      ]);
    } catch (error) {
      console.error("Failed to append permintaan data sheet row", error);
    }
  }

  await pushRealtimeState();

  return NextResponse.json({ queue: updatedQueue });
}
