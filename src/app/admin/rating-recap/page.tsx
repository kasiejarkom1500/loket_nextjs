"use client";

import { useEffect, useState } from "react";

type RecapItem = {
  userId: number;
  nama: string;
  nipLama: string;
  username: string;
  totalRating: number;
  averageScore: number;
};

const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export default function RatingRecapPage() {
  const [role, setRole] = useState<"LAYANAN_PUBLIK" | "PERMINTAAN_DATA">(
    "LAYANAN_PUBLIK",
  );
  const [month, setMonth] = useState(getCurrentMonth());
  const [items, setItems] = useState<RecapItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch(
      `/api/admin/ratings/recap?role=${role}&month=${month}`,
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal memuat rekap.");
      return;
    }
    const data = await response.json();
    setItems(data.items ?? []);
    setStatus(null);
  };

  useEffect(() => {
    load();
  }, [role, month]);

  const handleExport = () => {
    window.location.href = `/api/admin/ratings/recap/export?role=${role}&month=${month}`;
  };

  return (
    <>
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Admin Rekap Rating
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-900">
          Rekap Rating Per Bulan
        </h1>
      </header>

      <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Filter
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Pilih role dan bulan untuk melihat rekap rating.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value as "LAYANAN_PUBLIK" | "PERMINTAAN_DATA")
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
          Rekap Rating ({items.length})
        </h2>
        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-left text-sm text-zinc-700">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="py-3 pr-4">Nama</th>
                <th className="py-3 pr-4">NIP Lama</th>
                <th className="py-3 pr-4">Username</th>
                <th className="py-3 pr-4">Total Rating</th>
                <th className="py-3 pr-4">Rata-rata</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item) => (
                  <tr key={item.userId} className="border-b border-zinc-100">
                    <td className="py-3 pr-4">{item.nama}</td>
                    <td className="py-3 pr-4">{item.nipLama}</td>
                    <td className="py-3 pr-4">{item.username}</td>
                    <td className="py-3 pr-4">{item.totalRating}</td>
                    <td className="py-3 pr-4">
                      {item.averageScore.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-4 text-sm text-zinc-500" colSpan={5}>
                    Belum ada data rating.
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
