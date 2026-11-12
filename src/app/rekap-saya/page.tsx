"use client";

import { useEffect, useMemo, useState } from "react";
import AppNav from "@/components/AppNav";

type Recap = {
  user: { nama: string; nipLama: string; username: string; role: string; roles: string[] };
  month: string;
  summary: {
    byRole: Record<string, {
      totalHariBertugas: number;
      hariHadir: number;
      disiplinPersen: number;
      disiplinStatus: string;
      totalAntreanSelesai: number;
      antreanPerLayanan: Record<string, number>;
      rincianPekerjaan: Record<string, number>;
    }>;
  };
  attendance: Array<{
    date: string;
    shift: "PAGI" | "SIANG";
    role: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    publicNondataOffline: number | null;
    publicNondataOnline: number | null;
    publicComplaintsOffline: number | null;
    publicSkdCount: number | null;
    publicNotes: string | null;
    dataRequestOffline: number | null;
    dataConsultOffline: number | null;
    dataRequestOnline: number | null;
    dataConsultOnline: number | null;
    dataNotes: string | null;
  }>;
  assignments: Array<{ date: string; shift: "PAGI" | "SIANG"; role: string }>;
  queues: Array<{
    role: string;
    date: string | null;
    number: string;
    service: string;
    counter: string;
    visitor: string;
    purpose: string;
    staffPurposeDetail: string;
    calledAt: string | null;
    completedAt: string | null;
  }>;
};

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const formatDate = (value: string | null) =>
  value
    ? new Date(`${value}T00:00:00+07:00`).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "-";

const formatDateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("id-ID", {
        dateStyle: "short",
        timeStyle: "medium",
      })
    : "-";

const formatTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const roleLabel = (roles: string[]) =>
  roles.length > 1
    ? "Layanan Publik & Permintaan Data"
    : roles[0] === "PERMINTAAN_DATA"
      ? "Permintaan Data"
      : "Layanan Publik";

const workDetails = (item: Recap["attendance"][number] | null, role: string) => {
  if (!item) return "-";
  const values = role === "PERMINTAAN_DATA"
    ? [
        `Permintaan langsung: ${item.dataRequestOffline ?? 0}`,
        `Konsultasi langsung: ${item.dataConsultOffline ?? 0}`,
        `Permintaan online: ${item.dataRequestOnline ?? 0}`,
        `Konsultasi online: ${item.dataConsultOnline ?? 0}`,
      ]
    : [
        `Nondata offline: ${item.publicNondataOffline ?? 0}`,
        `Nondata online: ${item.publicNondataOnline ?? 0}`,
        `Pengaduan: ${item.publicComplaintsOffline ?? 0}`,
        `SKD: ${item.publicSkdCount ?? 0}`,
      ];
  return values.join(" · ");
};

export default function MyRecapPage() {
  const [month, setMonth] = useState(currentMonth);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/my-recap?month=${month}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Gagal memuat rekap.");
        return data as Recap;
      })
      .then((data) => {
        if (active) {
          setRecap(data);
          setError(null);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Gagal memuat rekap.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month]);

  const attendanceRows = useMemo(() => {
    if (!recap) return [];
    const rows = new Map<string, { date: string; shift: string; role: string; item: Recap["attendance"][number] | null }>();
    recap.assignments.forEach((item) => rows.set(`${item.date}-${item.shift}-${item.role}`, { ...item, item: null }));
    recap.attendance.forEach((item) => rows.set(`${item.date}-${item.shift}-${item.role}`, { ...item, item }));
    return Array.from(rows.values()).sort((a, b) => `${a.date}-${a.shift}-${a.role}`.localeCompare(`${b.date}-${b.shift}-${b.role}`));
  }, [recap]);

  const downloadExport = async () => {
    const response = await fetch(`/api/my-recap/export?month=${month}`);
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rekap-saya-${month}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const monthLabel = (() => {
    const [y, m] = month.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  })();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_60%),linear-gradient(120deg,#fff7ed,#f8fafc)] px-6 py-10 print:bg-white print:p-0">
      <style>{`
        @page { size: A4 landscape; margin: 1.2cm 1.5cm; }
        @media print {
          body { background: white !important; color: #111 !important; }
          .tracking-\\[0\\.2em\\], .tracking-\\[0\\.3em\\], .tracking-\\[0\\.15em\\] { letter-spacing: normal !important; }
          .no-print { display: none !important; }
          .print-header { display: block; }
          table { border-collapse: collapse; width: 100%; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          th, td { border: 1px solid #d1d5db; padding: 3px 5px; font-size: 7.5pt; vertical-align: top; }
          th { background: #f3f4f6 !important; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #374151; }
          .tbl-num { text-align: right; }
          .tbl-center { text-align: center; }
          .badge-hadir { background: #d1fae5 !important; color: #065f46 !important; border-radius: 4px; padding: 1px 4px; }
          .badge-absen { background: #fee2e2 !important; color: #991b1b !important; border-radius: 4px; padding: 1px 4px; }
          .section-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #4b5563; border-bottom: 2px solid #e5e7eb; padding-bottom: 3px; margin: 10px 0 5px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
          .summary-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 10px; }
          .summary-box p:first-child { font-size: 7pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; }
          .summary-box p:last-child { font-size: 13pt; font-weight: 800; color: #111827; margin-top: 2px; }
          .print-identity { display: flex; gap: 40px; font-size: 8.5pt; margin-bottom: 12px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 14px; background: #f9fafb !important; }
          .print-identity dl { display: grid; grid-template-columns: 90px 1fr; gap: 2px 8px; }
          .print-identity dt { color: #6b7280; }
          .print-identity dd { font-weight: 700; color: #111; }
          .print-letterhead { text-align: center; border-bottom: 3px solid #111; padding-bottom: 8px; margin-bottom: 14px; }
          .print-letterhead h1 { font-size: 13pt; font-weight: 800; letter-spacing: 0.01em; }
          .print-letterhead h2 { font-size: 10pt; font-weight: 400; margin-top: 2px; }
          .print-letterhead p  { font-size: 7.5pt; color: #555; margin-top: 2px; }
          .print-sign { margin-top: 24px; display: flex; justify-content: flex-end; font-size: 8pt; }
          .print-sign div { text-align: center; width: 180px; }
          .print-sign .sign-box { margin-top: 48px; border-top: 1px solid #111; padding-top: 2px; }
        }
        @media screen { .print-header { display: none; } .print-sign { display: none; } }
      `}</style>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 print:gap-0 print:max-w-none">
        <div className="no-print"><AppNav /></div>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between no-print">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400 print:tracking-normal">Rekap Pribadi</p>
            <h1 className="mt-3 text-3xl font-bold text-zinc-900">Rekap Saya</h1>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="month" className="text-xs font-semibold text-zinc-500">Periode</label>
            <input id="month" type="month" value={month} onChange={(event) => { setLoading(true); setMonth(event.target.value); }} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900" />
            <button type="button" onClick={downloadExport} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">Export Excel</button>
            <button type="button" onClick={() => window.print()} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700">Cetak / PDF</button>
          </div>
        </header>

        {loading ? <p className="text-sm text-zinc-500">Memuat rekap...</p> : null}
        {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {recap ? (
          <>
            <div className="print-header">
              <div className="print-letterhead">
                <h1>REKAP SAYA — SISTEM ANTRIAN</h1>
                <h2>Badan Pusat Statistik Provinsi Jambi</h2>
                <p>Periode: {monthLabel}</p>
              </div>
            </div>
            <div className="print-identity print-header">
              <dl>
                <dt>Nama</dt><dd>{recap.user.nama}</dd>
                <dt>NIP Lama</dt><dd>{recap.user.nipLama || "—"}</dd>
              </dl>
              <dl>
                <dt>Role</dt><dd>{roleLabel(recap.user.roles)}</dd>
                <dt>Periode</dt><dd>{monthLabel}</dd>
              </dl>
            </div>
            <section className="no-print rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 print:tracking-normal">Identitas Petugas</p>
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-4">
                <div><p className="text-zinc-400">Nama</p><p className="font-semibold text-zinc-900">{recap.user.nama}</p></div>
                <div><p className="text-zinc-400">NIP Lama</p><p className="font-semibold text-zinc-900">{recap.user.nipLama || "-"}</p></div>
                <div><p className="text-zinc-400">Role</p><p className="font-semibold text-zinc-900">{roleLabel(recap.user.roles)}</p></div>
                <div><p className="text-zinc-400">Periode</p><p className="font-semibold text-zinc-900">{recap.month}</p></div>
              </div>
            </section>

            {Object.entries(recap.summary.byRole).map(([role, summary]) => (
              <section key={role} className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm print:rounded-none print:border-0 print:p-2 print:shadow-none">
                <h2 className="section-title text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 print:tracking-normal">{roleLabel([role])}</h2>
                <div className="summary-grid mt-3 grid gap-4 sm:grid-cols-4 print:gap-2">
                  {[
                    ["Hari bertugas", summary.totalHariBertugas],
                    ["Hari hadir", summary.hariHadir],
                    ["Disiplin", summary.totalHariBertugas === 0 ? "Tanpa Penugasan" : `${summary.disiplinPersen}% · ${summary.disiplinStatus}`],
                    ["Antrean selesai", summary.totalAntreanSelesai],
                  ].map(([label, value]) => <div key={String(label)} className="summary-box rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm print:rounded-none print:p-2 print:shadow-none"><p className="text-xs uppercase tracking-[0.15em] text-zinc-400 print:tracking-normal">{label}</p><p className="mt-3 text-2xl font-bold text-zinc-900 print:mt-1 print:text-base">{value}</p></div>)}
                </div>
              </section>
            ))}

            <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm print:rounded-none print:border-0 print:p-2 print:shadow-none">
              <h2 className="section-title text-lg font-semibold text-zinc-900 print:tracking-normal">Presensi Harian</h2>
              {attendanceRows.length === 0 ? <p className="mt-4 text-sm text-zinc-500">Tidak ada penugasan atau presensi pada bulan ini.</p> : <div className="mt-4 overflow-x-auto print:overflow-visible"><table className="w-full min-w-[900px] table-auto text-left text-sm print:min-w-0 print:table-fixed print:text-[8px]"><thead className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-400 print:text-[7px] print:tracking-normal"><tr><th className="px-3 py-3 print:w-[13%] print:px-1 print:py-1">Tanggal</th><th className="px-3 py-3 print:w-[9%] print:px-1 print:py-1">Shift</th><th className="px-3 py-3 print:w-[15%] print:px-1 print:py-1">Role</th><th className="px-3 py-3 print:w-[16%] print:px-1 print:py-1">Datang</th><th className="px-3 py-3 print:w-[16%] print:px-1 print:py-1">Pulang</th><th className="px-3 py-3 print:w-[31%] print:px-1 print:py-1">Rincian pekerjaan</th></tr></thead><tbody>{attendanceRows.map((row) => <tr key={`${row.date}-${row.shift}-${row.role}`} className="border-b border-zinc-100"><td className="px-3 py-3 print:px-1 print:py-1">{formatDate(row.date)}</td><td className="px-3 py-3 print:px-1 print:py-1">{row.shift}</td><td className="px-3 py-3 print:px-1 print:py-1">{roleLabel([row.role])}</td><td className="px-3 py-3 print:px-1 print:py-1">{formatDateTime(row.item?.checkInAt ?? null)}</td><td className="px-3 py-3 print:px-1 print:py-1">{formatDateTime(row.item?.checkOutAt ?? null)}</td><td className="max-w-[520px] break-words px-3 py-3 text-zinc-500 print:max-w-none print:whitespace-normal print:px-1 print:py-1">{workDetails(row.item, row.item?.role ?? row.role)}{row.item?.publicNotes || row.item?.dataNotes ? <span className="block italic">{row.item.publicNotes || row.item.dataNotes}</span> : null}</td></tr>)}</tbody></table></div>}
            </section>

            <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm print:rounded-none print:border-0 print:p-2 print:shadow-none">
              <h2 className="section-title text-lg font-semibold text-zinc-900 print:tracking-normal">Antrean Dilayani</h2>
              {recap.queues.length === 0 ? <p className="mt-4 text-sm text-zinc-500">Tidak ada antrean selesai pada bulan ini.</p> : <div className="mt-4 overflow-x-auto print:overflow-visible"><table className="w-full min-w-[1100px] text-left text-sm print:min-w-0 print:table-fixed print:text-[7.5pt]"><thead className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-400 print:tracking-normal"><tr><th className="px-3 py-3 print:w-[9%] print:px-1 print:py-1">Tanggal</th><th className="px-3 py-3 print:w-[7%] print:px-1 print:py-1">Nomor</th><th className="px-3 py-3 print:w-[13%] print:px-1 print:py-1">Sebagai</th><th className="px-3 py-3 print:w-[12%] print:px-1 print:py-1">Layanan</th><th className="px-3 py-3 print:w-[8%] print:px-1 print:py-1">Loket</th><th className="px-3 py-3 print:w-[13%] print:px-1 print:py-1">Pengunjung</th><th className="px-3 py-3 print:w-[24%] print:px-1 print:py-1">Keperluan</th><th className="px-3 py-3 print:w-[7%] print:px-1 print:py-1">Dipanggil</th><th className="px-3 py-3 print:w-[7%] print:px-1 print:py-1">Selesai</th></tr></thead><tbody>{recap.queues.map((queue) => <tr key={`${queue.number}-${queue.completedAt}`} className="border-b border-zinc-100"><td className="px-3 py-3 print:px-1 print:py-1">{formatDate(queue.date)}</td><td className="px-3 py-3 font-semibold print:px-1 print:py-1">{queue.number}</td><td className="px-3 py-3 print:px-1 print:py-1">{roleLabel([queue.role])}</td><td className="px-3 py-3 print:px-1 print:py-1">{queue.service}</td><td className="px-3 py-3 print:px-1 print:py-1">{queue.counter}</td><td className="px-3 py-3 print:px-1 print:py-1">{queue.visitor}</td><td className="max-w-[260px] break-words px-3 py-3 print:max-w-none print:whitespace-normal print:px-1 print:py-1">{[queue.purpose, queue.staffPurposeDetail].filter(Boolean).join(" · ") || "-"}</td><td className="px-3 py-3 print:px-1 print:py-1">{formatTime(queue.calledAt)}</td><td className="px-3 py-3 print:px-1 print:py-1">{formatTime(queue.completedAt)}</td></tr>)}</tbody></table></div>}
            </section>
            <div className="print-header print-sign">
              <div>
                <p>Jambi, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                <p>Petugas,</p>
                <p className="sign-box">{recap.user.nama}</p>
                <p>NIP Lama: {recap.user.nipLama || "—"}</p>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
