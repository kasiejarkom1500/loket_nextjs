"use client";

import { useEffect, useMemo, useState } from "react";

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

const PAGE_SIZE = 15;

export default function AdminVisitorsPage() {
  const today = new Date();
  const [from, setFrom] = useState(formatDateInput(today));
  const [to, setTo] = useState(formatDateInput(today));
  const [items, setItems] = useState<VisitorItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    const response = await fetch(`/api/admin/visitors?from=${from}&to=${to}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal memuat data.");
      return;
    }
    const data = await response.json();
    setItems(data.items ?? []);
    setStatus(null);
  };

  useEffect(() => { load(); }, [from, to]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((i) =>
      [i.number, i.visitorName, i.visitorPhone, i.visitorOrigin, i.serviceName, i.counterName]
        .join(" ").toLowerCase().includes(needle),
    );
  }, [items, query]);

  useEffect(() => { setPage(1); }, [query, from, to]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const handleExport = () => {
    window.location.href = `/api/admin/visitors/export?from=${from}&to=${to}`;
  };

  return (
    <>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Admin</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900">Daftar Pengunjung</h1>
      </header>

      {/* Filter */}
      <section className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">Dari</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>
            <span className="text-xs text-zinc-400">s/d</span>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">Sampai</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>
            <button type="button" onClick={handleExport} className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-5 text-xs font-bold text-white transition hover:bg-zinc-800">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Export Excel
            </button>
          </div>
          <div className="relative w-full max-w-sm">
            <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Cari nomor, nama, asal..." />
          </div>
        </div>
        {status ? <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{status}</div> : null}
      </section>

      {/* Table */}
      <section className="rounded-2xl border border-white/70 bg-white/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-sm font-bold text-zinc-900">Data Pengunjung <span className="ml-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-500">{filtered.length}</span></h2>
          {filtered.length > PAGE_SIZE && <p className="text-xs text-zinc-400">{Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length}</p>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Nomor</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Layanan</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Loket</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Tanggal</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Nama</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Telepon</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Asal</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Keperluan</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {paginated.length ? paginated.map((item) => (
                <tr key={item.id} className="group transition-colors hover:bg-blue-50/40">
                  <td className="whitespace-nowrap px-6 py-3.5 text-sm font-bold text-zinc-900">{item.number}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-zinc-600">{item.serviceName}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-zinc-600">{item.counterName}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                      item.status === "DONE" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                      item.status === "CALLED" ? "border-blue-200 bg-blue-50 text-blue-700" :
                      item.status === "SKIPPED" ? "border-amber-200 bg-amber-50 text-amber-700" :
                      "border-zinc-200 bg-zinc-50 text-zinc-500"
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3.5 text-xs text-zinc-700">{item.visitorName}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-zinc-500">{item.visitorPhone}</td>
                  <td className="px-4 py-3.5 text-xs text-zinc-500">{item.visitorOrigin}</td>
                  <td className="px-4 py-3.5 text-xs text-zinc-500">{item.visitorPurpose}</td>
                  <td className="max-w-[200px] truncate px-4 py-3.5 text-xs text-zinc-500">{item.staffPurposeDetail || "-"}</td>
                </tr>
              )) : (
                <tr>
                  <td className="px-6 py-12 text-center text-sm text-zinc-400" colSpan={10}>
                    <div className="flex flex-col items-center gap-2">
                      <svg className="h-8 w-8 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
                      Belum ada data pengunjung.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-3">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-40">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg> Sebelumnya
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1).reduce<(number | "...")[]>((acc, p, idx, arr) => { if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("..."); acc.push(p); return acc; }, []).map((p, idx) => p === "..." ? <span key={`d-${idx}`} className="px-1 text-xs text-zinc-300">…</span> : <button key={p} type="button" onClick={() => setPage(p)} className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${page === p ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-500 hover:bg-zinc-100"}`}>{p}</button>)}
            </div>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-40">
              Berikutnya <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>
        )}
      </section>
    </>
  );
}
