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

  let recap;
  try {
    recap = await getMyRecap(session as MyRecapSession, month);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to export personal recap", error);
    return NextResponse.json({ error: "Gagal memuat rekap." }, { status: 500 });
  }
  const workbook = XLSX.utils.book_new();
  const summaryRows: Array<Array<string | number>> = [
    ["Nama", recap.user.nama],
    ["NIP Lama", recap.user.nipLama],
    ["Username", recap.user.username],
    ["Role", recap.user.roles.join(" / ")],
    ["Periode", recap.month],
  ];
  for (const [role, summary] of Object.entries(recap.summary.byRole)) {
    summaryRows.push(
      [`Role: ${role}`, ""],
      ["Total Hari Bertugas", summary.totalHariBertugas],
      ["Hari Hadir", summary.hariHadir],
      ["Disiplin (%)", summary.totalHariBertugas === 0 ? "Tanpa Penugasan" : summary.disiplinPersen],
      ["Status Disiplin", summary.disiplinStatus],
      ["Total Antrean Selesai", summary.totalAntreanSelesai],
      ...Object.entries(summary.antreanPerLayanan).map(([name, total]) => [
        `Antrean - ${name}`,
        total,
      ]),
      ...Object.entries(summary.rincianPekerjaan).map(([name, total]) => [
        `Rincian - ${name}`,
        total,
      ]),
      ["", ""],
    );
  }
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), "Ringkasan");

  const attendanceRows = recap.attendance.map((item) => ({
    Tanggal: item.date,
    Shift: item.shift,
    Role: item.role,
    "Jam Datang": item.checkInAt ?? "-",
    "Jam Pulang": item.checkOutAt ?? "-",
    "Nondata Offline": item.role === "LAYANAN_PUBLIK" ? item.publicNondataOffline ?? "-" : "-",
    "Nondata Online": item.role === "LAYANAN_PUBLIK" ? item.publicNondataOnline ?? "-" : "-",
    "Pengaduan Offline": item.role === "LAYANAN_PUBLIK" ? item.publicComplaintsOffline ?? "-" : "-",
    SKD: item.role === "LAYANAN_PUBLIK" ? item.publicSkdCount ?? "-" : "-",
    "Permintaan Data Offline": item.role === "PERMINTAAN_DATA" ? item.dataRequestOffline ?? "-" : "-",
    "Permintaan Data Online": item.role === "PERMINTAAN_DATA" ? item.dataRequestOnline ?? "-" : "-",
    "Konsultasi Offline": item.role === "PERMINTAAN_DATA" ? item.dataConsultOffline ?? "-" : "-",
    "Konsultasi Online": item.role === "PERMINTAAN_DATA" ? item.dataConsultOnline ?? "-" : "-",
    Catatan: item.role === "LAYANAN_PUBLIK" ? item.publicNotes ?? "" : item.dataNotes ?? "",
  }));
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(attendanceRows),
    "Presensi",
  );

  const queueRows = recap.queues.map((item) => ({
    Tanggal: item.date ?? "-",
    Nomor: item.number,
    Sebagai: item.role === "LAYANAN_PUBLIK" ? "Layanan Publik" : "Permintaan Data",
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
