"use client";

import { useEffect, useState } from "react";

type AttendanceItem = {
  id: number;
  date: string;
  shift: "PAGI" | "SIANG";
  user: {
    id: number;
    nama: string;
    nipLama: string;
    username: string;
  };
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
};

const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export default function AttendanceRecapPage() {
  const [role, setRole] = useState<"LAYANAN_PUBLIK" | "PERMINTAAN_DATA">(
    "LAYANAN_PUBLIK",
  );
  const [month, setMonth] = useState(getCurrentMonth());
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch(
      `/api/admin/attendance/recap?role=${role}&month=${month}`,
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal memuat rekap presensi.");
      return;
    }
    const data = await response.json();
    setItems(data.items ?? []);
    setStatus(null);
  };

  useEffect(() => {
    load();
  }, [role, month]);

  return (
    <>
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Admin Presensi
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-900">
          Rekap Presensi
        </h1>
      </header>

      <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Filter
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Pilih role dan bulan untuk melihat presensi.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={role}
              onChange={(event) =>
                setRole(
                  event.target.value as "LAYANAN_PUBLIK" | "PERMINTAAN_DATA",
                )
              }
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-amber-500"
            >
              <option value="LAYANAN_PUBLIK">Layanan Publik</option>
              <option value="PERMINTAAN_DATA">Permintaan Data</option>
            </select>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-amber-500"
            />
          </div>
        </div>
        {status ? <p className="mt-4 text-sm text-rose-600">{status}</p> : null}
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          Data Presensi ({items.length})
        </h2>
        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-left text-sm text-zinc-700">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="py-3 pr-4">Tanggal</th>
                <th className="py-3 pr-4">Shift</th>
                <th className="py-3 pr-4">Nama</th>
                <th className="py-3 pr-4">NIP Lama</th>
                <th className="py-3 pr-4">Datang</th>
                <th className="py-3 pr-4">Pulang</th>
                {role === "LAYANAN_PUBLIK" ? (
                  <>
                    <th className="py-3 pr-4">Nondata Offline</th>
                    <th className="py-3 pr-4">Nondata Online</th>
                    <th className="py-3 pr-4">Pengaduan</th>
                    <th className="py-3 pr-4">SKD</th>
                    <th className="py-3 pr-4">Catatan</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 pr-4">Permintaan Offline</th>
                    <th className="py-3 pr-4">Konsultasi Offline</th>
                    <th className="py-3 pr-4">Permintaan Online</th>
                    <th className="py-3 pr-4">Konsultasi Online</th>
                    <th className="py-3 pr-4">Catatan</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-100">
                    <td className="py-3 pr-4">{item.date}</td>
                    <td className="py-3 pr-4">
                      {item.shift === "PAGI" ? "Pagi" : "Siang"}
                    </td>
                    <td className="py-3 pr-4">{item.user.nama}</td>
                    <td className="py-3 pr-4">{item.user.nipLama}</td>
                    <td className="py-3 pr-4">
                      {item.checkInAt
                        ? new Date(item.checkInAt).toLocaleTimeString("id-ID")
                        : "-"}
                    </td>
                    <td className="py-3 pr-4">
                      {item.checkOutAt
                        ? new Date(item.checkOutAt).toLocaleTimeString("id-ID")
                        : "-"}
                    </td>
                    {role === "LAYANAN_PUBLIK" ? (
                      <>
                        <td className="py-3 pr-4">
                          {item.publicNondataOffline ?? "-"}
                        </td>
                        <td className="py-3 pr-4">
                          {item.publicNondataOnline ?? "-"}
                        </td>
                        <td className="py-3 pr-4">
                          {item.publicComplaintsOffline ?? "-"}
                        </td>
                        <td className="py-3 pr-4">
                          {item.publicSkdCount ?? "-"}
                        </td>
                        <td className="py-3 pr-4">{item.publicNotes ?? "-"}</td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 pr-4">
                          {item.dataRequestOffline ?? "-"}
                        </td>
                        <td className="py-3 pr-4">
                          {item.dataConsultOffline ?? "-"}
                        </td>
                        <td className="py-3 pr-4">
                          {item.dataRequestOnline ?? "-"}
                        </td>
                        <td className="py-3 pr-4">
                          {item.dataConsultOnline ?? "-"}
                        </td>
                        <td className="py-3 pr-4">{item.dataNotes ?? "-"}</td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="py-4 text-sm text-zinc-500"
                    colSpan={role === "LAYANAN_PUBLIK" ? 11 : 11}
                  >
                    Belum ada data presensi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
