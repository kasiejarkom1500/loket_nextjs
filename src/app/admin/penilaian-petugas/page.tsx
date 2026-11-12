"use client";

import { useEffect, useState } from "react";

type Role = "LAYANAN_PUBLIK" | "PERMINTAAN_DATA";
type Item = {
  userId: number; nama: string; nipLama: string; disiplinPersen: number | null; disiplinStatus: string;
  totalLayanan: number; totalCheckout: number; hariTanpaCheckout: number; totalAntreanPengganti: number;
  rincian: Record<string, number | null>; rincianCheckoutAda: boolean; kinerjaSkor: number; antreanSelesai: number;
  ratingSkor: number; ratingRataRata: number; ratingJumlah: number;
};
const currentMonth = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; };
const roleName = (role: Role) => role === "LAYANAN_PUBLIK" ? "Layanan Publik" : "Permintaan Data";
const detailLabels: Record<string, string> = {
  publicNondataOffline: "Kunjungan langsung (non-data + data)", publicComplaintsOffline: "Pengaduan langsung",
  publicNondataOnline: "Permintaan online non-data", publicSkdCount: "SKD",
  dataRequestOffline: "Permintaan data langsung", dataConsultOffline: "Konsultasi langsung",
  dataRequestOnline: "Permintaan data online", dataConsultOnline: "Konsultasi online",
};

export default function StaffEvaluationPage() {
  const [month, setMonth] = useState(currentMonth);
  const [role, setRole] = useState<Role>("LAYANAN_PUBLIK");
  const [items, setItems] = useState<Item[]>([]);
  const [maxTotal, setMaxTotal] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/penilaian-petugas?month=${encodeURIComponent(month)}&role=${role}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Gagal memuat penilaian.");
        if (active) { setItems(data.items ?? []); setMaxTotal(data.maxTotal ?? 0); setStatus(null); }
      })
      .catch((error: unknown) => { if (active) setStatus(error instanceof Error ? error.message : "Gagal memuat penilaian."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, role]);

  const exportUrl = `/api/admin/penilaian-petugas/export?month=${encodeURIComponent(month)}&role=${role}`;
  const componentKeys = role === "LAYANAN_PUBLIK"
    ? ["publicNondataOffline", "publicComplaintsOffline", "publicNondataOnline", "publicSkdCount"]
    : ["dataRequestOffline", "dataConsultOffline", "dataRequestOnline", "dataConsultOnline"];

  return (
    <>
      <style>{`@media print { nav, .print-hide { display: none !important; } body { background: white !important; } .print-card { box-shadow: none !important; border: 1px solid #ddd !important; } .print-table { font-size: 9px !important; } }`}</style>
      <header><p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Admin Kinerja</p><h1 className="mt-3 text-3xl font-semibold text-zinc-900">Penilaian Petugas</h1><p className="mt-2 text-sm text-zinc-600">Presensi, kinerja relatif, dan rating per petugas.</p></header>
      <section className="print-card rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap gap-3 print-hide">
            <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-500">Bulan<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900" /></label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-500">Role<select value={role} onChange={(event) => setRole(event.target.value as Role)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"><option value="LAYANAN_PUBLIK">Layanan Publik</option><option value="PERMINTAAN_DATA">Permintaan Data</option></select></label>
          </div>
          <div className="flex flex-wrap gap-2 print-hide"><a href={exportUrl} className="inline-flex h-10 items-center rounded-full bg-zinc-900 px-5 text-xs font-semibold text-white">Export Excel</a><button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center rounded-full border border-zinc-300 bg-white px-5 text-xs font-semibold text-zinc-700">Cetak</button></div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-blue-50 p-4"><p className="text-xs text-blue-700">Role / Periode</p><p className="mt-1 font-semibold text-blue-950">{roleName(role)} · {month}</p></div>
          <div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs text-amber-700">Total layanan terbanyak</p><p className="mt-1 font-semibold text-amber-950">{maxTotal}</p></div>
          <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs text-emerald-700">Petugas dinilai</p><p className="mt-1 font-semibold text-emerald-950">{items.length}</p></div>
        </div>
        {status ? <p className="mt-4 text-sm text-rose-600">{status}</p> : null}
      </section>
      <section className="print-card rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Rincian Penilaian — {roleName(role)}</h2>
        <p className="mt-1 text-xs text-zinc-500">Checkout menjumlahkan isian petugas; antrean selesai menjadi pembanding dan kredit antrean pengganti hanya ditambahkan pada hari tanpa penugasan (dan tanpa checkout).</p>
        <div className="mt-4 overflow-auto">
          <table className="print-table min-w-full text-left text-xs text-zinc-700">
            <thead className="border-b border-zinc-200 text-[10px] uppercase tracking-wide text-zinc-500"><tr>
              <th className="whitespace-nowrap py-3 pr-3">Nama / NIP Lama</th><th className="py-3 pr-3">Presensi</th><th className="py-3 pr-3">Total layanan</th><th className="py-3 pr-3">Checkout</th><th className="py-3 pr-3">Hari tanpa checkout</th><th className="py-3 pr-3">Antrean pengganti</th>
              {componentKeys.map((key) => <th key={key} className="min-w-28 py-3 pr-3">{detailLabels[key]}</th>)}
              <th className="py-3 pr-3">Skor kinerja</th><th className="py-3 pr-3">Antrean selesai</th><th className="py-3 pr-3">Skor rating</th><th className="py-3 pr-3">Rata-rata / jumlah</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td className="py-5 text-zinc-500" colSpan={14 + componentKeys.length}>Memuat penilaian…</td></tr>
                : items.length ? items.map((item) => <tr key={item.userId} className="border-b border-zinc-100 align-top">
                  <td className="whitespace-nowrap py-3 pr-3"><p className="font-semibold text-zinc-900">{item.nama}</p><p className="text-zinc-500">{item.nipLama || "-"}</p></td>
                  <td className="whitespace-nowrap py-3 pr-3">{item.disiplinPersen === null ? "Tanpa Penugasan" : <>{item.disiplinPersen}%<br /><span className="text-zinc-500">{item.disiplinStatus}</span></>}</td>
                  <td className="py-3 pr-3 font-semibold">{item.totalLayanan}</td><td className="py-3 pr-3">{item.totalCheckout}</td><td className="py-3 pr-3">{item.hariTanpaCheckout}</td><td className="py-3 pr-3">{item.totalAntreanPengganti}</td>
                  {componentKeys.map((key) => <td key={key} className="py-3 pr-3">{!item.rincianCheckoutAda ? "—" : item.rincian[key] ?? 0}</td>)}
                  <td className="py-3 pr-3">{item.kinerjaSkor.toFixed(1)}%</td><td className="py-3 pr-3">{item.antreanSelesai}</td><td className="py-3 pr-3">{item.ratingSkor.toFixed(1)}</td><td className="whitespace-nowrap py-3 pr-3">{item.ratingRataRata.toFixed(2)} / {item.ratingJumlah}</td>
                </tr>) : <tr><td className="py-5 text-zinc-500" colSpan={14 + componentKeys.length}>Belum ada data penilaian untuk bulan dan role ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
