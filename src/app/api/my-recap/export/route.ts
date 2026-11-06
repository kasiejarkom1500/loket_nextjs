import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { verifySession } from "@/lib/auth";
import { getMyRecap, parseMyRecapMonth, type MyRecapSession } from "@/lib/my-recap";

const SESSION_COOKIE = "loket_session";

export async function GET(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  let session;
  try {
    session = token ? await verifySession(token) : null;
  } catch {
    session = null;
  }
  if (!session || (session.role !== "LAYANAN_PUBLIK" && session.role !== "PERMINTAAN_DATA")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month = parseMyRecapMonth(new URL(request.url).searchParams.get("month"));
  if (!month) {
    return NextResponse.json(
      { error: "month wajib diisi (YYYY-MM)" },
      { status: 400 },
    );
  }

  const recap = await getMyRecap(session as MyRecapSession, month);
  const workbook = XLSX.utils.book_new();
  const summaryRows = [
    ["Nama", recap.user.nama],
    ["NIP Lama", recap.user.nipLama],
    ["Username", recap.user.username],
    ["Role", recap.user.roles.join(" / ")],
    ["Periode", recap.month],
    ["Total Hari Bertugas", recap.summary.totalHariBertugas],
    ["Hari Hadir", recap.summary.hariHadir],
    ["Disiplin (%)", recap.summary.disiplinPersen],
    ["Status Disiplin", recap.summary.disiplinStatus],
    ["Total Antrean Selesai", recap.summary.totalAntreanSelesai],
    ...Object.entries(recap.summary.antreanPerLayanan).map(([name, total]) => [
      `Antrean - ${name}`,
      total,
    ]),
    ...Object.entries(recap.summary.rincianPekerjaan).map(([name, total]) => [
      `Rincian - ${name}`,
      total,
    ]),
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), "Ringkasan");

  const attendanceRows = recap.attendance.map((item) => ({
    Tanggal: item.date,
    Shift: item.shift,
    Role: item.role,
    "Jam Datang": item.checkInAt ?? "-",
    "Jam Pulang": item.checkOutAt ?? "-",
    "Nondata Offline": item.publicNondataOffline ?? item.dataRequestOffline ?? "-",
    "Nondata Online": item.publicNondataOnline ?? item.dataRequestOnline ?? "-",
    "Pengaduan Offline": item.publicComplaintsOffline ?? "-",
    SKD: item.publicSkdCount ?? "-",
    "Konsultasi Offline": item.dataConsultOffline ?? "-",
    "Konsultasi Online": item.dataConsultOnline ?? "-",
    Catatan: item.publicNotes ?? item.dataNotes ?? "",
  }));
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(attendanceRows),
    "Presensi",
  );

  const queueRows = recap.queues.map((item) => ({
    Tanggal: item.date ?? "-",
    Nomor: item.number,
    Layanan: item.service,
    Loket: item.counter,
    Pengunjung: item.visitor,
    Keperluan: item.purpose,
    "Detail Keperluan": item.staffPurposeDetail,
    "Jam Dipanggil": item.calledAt ?? "-",
    "Jam Selesai": item.completedAt ?? "-",
  }));
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(queueRows),
    "Antrean Dilayani",
  );

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=rekap-saya-${recap.month}.xlsx`,
    },
  });
}
