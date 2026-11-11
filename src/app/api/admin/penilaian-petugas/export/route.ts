import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getStaffEvaluation, parseEvaluationMonth, type EvaluationRole } from "@/lib/staff-evaluation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const month = parseEvaluationMonth(url.searchParams.get("month"));
  const roleValue = url.searchParams.get("role");
  const role: EvaluationRole = roleValue === "PERMINTAAN_DATA" ? "PERMINTAAN_DATA" : "LAYANAN_PUBLIK";
  if (!month) return NextResponse.json({ error: "month wajib diisi dengan format YYYY-MM yang valid." }, { status: 400 });
  if (roleValue && roleValue !== "LAYANAN_PUBLIK" && roleValue !== "PERMINTAAN_DATA") {
    return NextResponse.json({ error: "role tidak valid." }, { status: 400 });
  }

  const result = await getStaffEvaluation(month, role);
  const detailKeys = role === "LAYANAN_PUBLIK"
    ? ["publicNondataOffline", "publicComplaintsOffline", "publicNondataOnline", "publicSkdCount"] as const
    : ["dataRequestOffline", "dataConsultOffline", "dataRequestOnline", "dataConsultOnline"] as const;
  const rows = result.items.map((item) => ({
    "User ID": item.userId, Nama: item.nama, "NIP Lama": item.nipLama,
    "Presensi (%)": item.disiplinPersen ?? "Tanpa Penugasan", "Status Presensi": item.disiplinStatus,
    "Total Layanan": item.totalLayanan, "Total Checkout": item.totalCheckout,
    "Total Antrean Pengganti": item.totalAntreanPengganti, "Skor Kinerja Relatif": item.kinerjaSkor,
    "Antrean Selesai (Pembanding)": item.antreanSelesai, "Skor Rating": item.ratingSkor,
    "Rata-rata Rating": item.ratingRataRata, "Jumlah Rating": item.ratingJumlah,
    ...Object.fromEntries(detailKeys.map((key) => [key, !item.rincianCheckoutAda ? "-" : item.rincian[key] ?? 0])),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Penilaian");
  const detailRows = result.items.map((item) => ({ "User ID": item.userId, Nama: item.nama, "NIP Lama": item.nipLama, ...item.rincian }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows), "Rincian");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=penilaian-petugas-${month.value}.xlsx`,
    },
  });
}
