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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_60%),linear-gradient(120deg,#fff7ed,#f8fafc)] px-6 py-10 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 print:gap-3">
        <div className="print:hidden"><AppNav /></div>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Rekap Pribadi</p>
            <h1 className="mt-3 text-3xl font-bold text-zinc-900">Rekap Saya</h1>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <label htmlFor="month" className="text-xs font-semibold text-zinc-500">Periode</label>
            <input id="month" type="month" value={month} onChange={(event) => { setLoading(true); setMonth(event.target.value); }} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900" />
            <button type="button" onClick={downloadExport} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">Export Excel</button>
            <button type="button" onClick={() => window.print()} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700">Cetak</button>
          </div>
        </header>

        {loading ? <p className="text-sm text-zinc-500">Memuat rekap...</p> : null}
        {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {recap ? (
          <>
            <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm print:rounded-none print:border-0 print:p-2 print:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Identitas Petugas</p>
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-4">
                <div><p className="text-zinc-400">Nama</p><p className="font-semibold text-zinc-900">{recap.user.nama}</p></div>
                <div><p className="text-zinc-400">NIP Lama</p><p className="font-semibold text-zinc-900">{recap.user.nipLama || "-"}</p></div>
                <div><p className="text-zinc-400">Role</p><p className="font-semibold text-zinc-900">{roleLabel(recap.user.roles)}</p></div>
                <div><p className="text-zinc-400">Periode</p><p className="font-semibold text-zinc-900">{recap.month}</p></div>
              </div>
            </section>

            {Object.entries(recap.summary.byRole).map(([role, summary]) => (
              <section key={role} className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm print:rounded-none print:border-0 print:p-2 print:shadow-none">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">{roleLabel([role])}</h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-4 print:gap-2">
                  {[
                    ["Hari bertugas", summary.totalHariBertugas],
                    ["Hari hadir", summary.hariHadir],
                    ["Disiplin", summary.totalHariBertugas === 0 ? "Tanpa Penugasan" : `${summary.disiplinPersen}% · ${summary.disiplinStatus}`],
                    ["Antrean selesai", summary.totalAntreanSelesai],
                  ].map(([label, value]) => <div key={String(label)} className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm print:rounded-none print:p-2 print:shadow-none"><p className="text-xs uppercase tracking-[0.15em] text-zinc-400">{label}</p><p className="mt-3 text-2xl font-bold text-zinc-900 print:mt-1 print:text-base">{value}</p></div>)}
                </div>
              </section>
            ))}

            <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm print:rounded-none print:border-0 print:p-2 print:shadow-none">
              <h2 className="text-lg font-semibold text-zinc-900">Presensi Harian</h2>
              {attendanceRows.length === 0 ? <p className="mt-4 text-sm text-zinc-500">Tidak ada penugasan atau presensi pada bulan ini.</p> : <div className="mt-4 overflow-x-auto print:overflow-visible"><table className="w-full min-w-[900px] table-auto text-left text-sm print:min-w-0 print:table-fixed print:text-[8px]"><thead className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-400 print:text-[7px]"><tr><th className="px-3 py-3 print:w-[13%] print:px-1 print:py-1">Tanggal</th><th className="px-3 py-3 print:w-[9%] print:px-1 print:py-1">Shift</th><th className="px-3 py-3 print:w-[15%] print:px-1 print:py-1">Role</th><th className="px-3 py-3 print:w-[16%] print:px-1 print:py-1">Datang</th><th className="px-3 py-3 print:w-[16%] print:px-1 print:py-1">Pulang</th><th className="px-3 py-3 print:w-[31%] print:px-1 print:py-1">Rincian pekerjaan</th></tr></thead><tbody>{attendanceRows.map((row) => <tr key={`${row.date}-${row.shift}-${row.role}`} className="border-b border-zinc-100"><td className="px-3 py-3 print:px-1 print:py-1">{formatDate(row.date)}</td><td className="px-3 py-3 print:px-1 print:py-1">{row.shift}</td><td className="px-3 py-3 print:px-1 print:py-1">{roleLabel([row.role])}</td><td className="px-3 py-3 print:px-1 print:py-1">{formatDateTime(row.item?.checkInAt ?? null)}</td><td className="px-3 py-3 print:px-1 print:py-1">{formatDateTime(row.item?.checkOutAt ?? null)}</td><td className="max-w-[520px] break-words px-3 py-3 text-zinc-500 print:max-w-none print:whitespace-normal print:px-1 print:py-1">{workDetails(row.item, row.item?.role ?? row.role)}{row.item?.publicNotes || row.item?.dataNotes ? <span className="block italic">{row.item.publicNotes || row.item.dataNotes}</span> : null}</td></tr>)}</tbody></table></div>}
            </section>

            <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm print:rounded-none print:border-0 print:p-2 print:shadow-none">
              <h2 className="text-lg font-semibold text-zinc-900">Antrean Dilayani</h2>
              {recap.queues.length === 0 ? <p className="mt-4 text-sm text-zinc-500">Tidak ada antrean selesai pada bulan ini.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-400"><tr><th className="px-3 py-3">Tanggal</th><th className="px-3 py-3">Nomor</th><th className="px-3 py-3">Sebagai</th><th className="px-3 py-3">Layanan</th><th className="px-3 py-3">Loket</th><th className="px-3 py-3">Pengunjung</th><th className="px-3 py-3">Keperluan</th><th className="px-3 py-3">Dipanggil</th><th className="px-3 py-3">Selesai</th></tr></thead><tbody>{recap.queues.map((queue) => <tr key={`${queue.number}-${queue.completedAt}`} className="border-b border-zinc-100"><td className="px-3 py-3">{formatDate(queue.date)}</td><td className="px-3 py-3 font-semibold">{queue.number}</td><td className="px-3 py-3">{roleLabel([queue.role])}</td><td className="px-3 py-3">{queue.service}</td><td className="px-3 py-3">{queue.counter}</td><td className="px-3 py-3">{queue.visitor}</td><td className="max-w-[260px] px-3 py-3">{[queue.purpose, queue.staffPurposeDetail].filter(Boolean).join(" · ") || "-"}</td><td className="px-3 py-3">{formatDateTime(queue.calledAt)}</td><td className="px-3 py-3">{formatDateTime(queue.completedAt)}</td></tr>)}</tbody></table></div>}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
