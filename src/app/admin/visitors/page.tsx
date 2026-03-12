"use client";

import { useEffect, useState } from "react";

type VisitorItem = {
  id: number;
  number: string;
  serviceName: string;
  counterName: string;
  status: string;
  createdAt: string;
  staffPurposeDetail: string;
  visitorName: string;
  visitorPhone: string;
  visitorOrigin: string;
  visitorPurpose: string;
};

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AdminVisitorsPage() {
  const today = new Date();
  const [from, setFrom] = useState(formatDateInput(today));
  const [to, setTo] = useState(formatDateInput(today));
  const [items, setItems] = useState<VisitorItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch(
      `/api/admin/visitors?from=${from}&to=${to}`,
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal memuat data.");
      return;
    }
    const data = await response.json();
    setItems(data.items ?? []);
    setStatus(null);
  };

  useEffect(() => {
    load();
  }, [from, to]);

  const handleExport = () => {
    window.location.href = `/api/admin/visitors/export?from=${from}&to=${to}`;
  };

  return (
    <>
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Admin Pengunjung
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-900">
          Daftar Pengunjung
        </h1>
      </header>

      <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Filter Tanggal
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Pilih rentang tanggal untuk melihat data pengunjung.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-amber-500"
            />
            <span className="text-xs text-zinc-500">s/d</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-xs font-semibold text-white transition hover:bg-zinc-800"
            >
              Export Excel
            </button>
          </div>
        </div>
        {status ? <p className="mt-4 text-sm text-rose-600">{status}</p> : null}
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          Data Pengunjung ({items.length})
        </h2>
        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-left text-sm text-zinc-700">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="py-3 pr-4">Nomor</th>
                <th className="py-3 pr-4">Layanan</th>
                <th className="py-3 pr-4">Loket</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Tanggal</th>
                <th className="py-3 pr-4">Nama</th>
                <th className="py-3 pr-4">Telepon</th>
                <th className="py-3 pr-4">Asal</th>
                <th className="py-3 pr-4">Keperluan</th>
                <th className="py-3 pr-4">Detail Keperluan</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-100">
                    <td className="py-3 pr-4 font-semibold">{item.number}</td>
                    <td className="py-3 pr-4">{item.serviceName}</td>
                    <td className="py-3 pr-4">{item.counterName}</td>
                    <td className="py-3 pr-4">{item.status}</td>
                    <td className="py-3 pr-4">
                      {new Date(item.createdAt).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 pr-4">{item.visitorName}</td>
                    <td className="py-3 pr-4">{item.visitorPhone}</td>
                    <td className="py-3 pr-4">{item.visitorOrigin}</td>
                    <td className="py-3 pr-4">{item.visitorPurpose}</td>
                    <td className="py-3 pr-4">
                      {item.staffPurposeDetail || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-4 text-sm text-zinc-500" colSpan={10}>
                    Belum ada data pengunjung.
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
