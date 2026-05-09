"use client";

import { useEffect, useMemo, useState } from "react";
import AppNav from "@/components/AppNav";

type OnlineRequest = {
  rowNumber: number;
  timestamp: string;
  nama: string;
  instansi: string;
  email: string;
  phone: string;
  kebutuhan: string;
  kegunaan: string;
  publikasi: string;
  petugasKonsultasi: string;
  petugasPelayananPengaduan: string;
  skdLinkSent: string;
  keterangan: string;
  completionStatus?: string;
};

const skdOptions = ["", "Telah dikirim", "Belum dikirim", "Tidak dikirim"] as const;

/* ── Status badge config ── */
const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  "Selesai transaksi data": {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Transaksi Data",
  },
  "Selesai SKD": {
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
    dot: "bg-blue-500",
    label: "SKD",
  },
  "Selesai pelayanan publik": {
    bg: "bg-violet-50 border-violet-200",
    text: "text-violet-700",
    dot: "bg-violet-500",
    label: "Pelayanan Publik",
  },
};

function StatusBadge({ status }: { status?: string }) {
  if (!status || !STATUS_STYLES[status]) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
        Belum diproses
      </span>
    );
  }
  const s = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${s.bg} ${s.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

/* ── Status selector for the form (clickable cards) ── */
function StatusSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const options = [
    {
      value: "Selesai transaksi data",
      label: "Transaksi Data",
      icon: "📊",
      desc: "Selesai melalui transaksi data.",
      border: "border-emerald-300 bg-emerald-50 ring-emerald-500",
      idle: "border-zinc-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40",
    },
    {
      value: "Selesai SKD",
      label: "SKD",
      icon: "📄",
      desc: "Selesai melalui Self-Service Kiosk.",
      border: "border-blue-300 bg-blue-50 ring-blue-500",
      idle: "border-zinc-200 bg-white hover:border-blue-200 hover:bg-blue-50/40",
    },
    {
      value: "Selesai pelayanan publik",
      label: "Pelayanan Publik",
      icon: "🏛️",
      desc: "Selesai melalui pelayanan langsung.",
      border: "border-violet-300 bg-violet-50 ring-violet-500",
      idle: "border-zinc-200 bg-white hover:border-violet-200 hover:bg-violet-50/40",
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
        Status Penyelesaian
      </label>
      <div className="grid gap-2">
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(isActive ? "" : opt.value)}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                isActive ? `${opt.border} ring-1` : opt.idle
              }`}
            >
              <span className="text-xl">{opt.icon}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${isActive ? "text-zinc-900" : "text-zinc-600"}`}>
                  {opt.label}
                </p>
                <p className="text-[11px] text-zinc-400">{opt.desc}</p>
              </div>
              {isActive && (
                <svg className="h-5 w-5 flex-shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function OnlineRequestsPage() {
  const [items, setItems] = useState<OnlineRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pendingOnly, setPendingOnly] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const POLL_MS = Number(process.env.NEXT_PUBLIC_ONLINE_REQUESTS_POLL_MS ?? "15000");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<OnlineRequest | null>(null);
  const [profile, setProfile] = useState<{ role: string } | null>(null);
  const [form, setForm] = useState({
    publikasi: "",
    skdLinkSent: "",
    completionStatus: "",
  });
  const [saving, setSaving] = useState(false);
  const isPublicServiceOfficer = profile?.role === "LAYANAN_PUBLIK";

  const load = async () => {
    setLoading(true);
    setStatus(null);
    const response = await fetch(
      `/api/sheets/online-requests?limit=150&pending=${pendingOnly ? "1" : "0"}`,
    );
    setLoading(false);
    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/login?redirect=/online-requests";
        return;
      }
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal memuat data Google Sheet.");
      return;
    }
    const data = await response.json();
    setItems(data.items ?? []);
  };

  useEffect(() => {
    load();
  }, [pendingOnly]);

  // Auto-refresh list (helps avoid manual refresh after new Google Form submissions)
  useEffect(() => {
    if (!Number.isFinite(POLL_MS) || POLL_MS <= 0) {
      return;
    }
    const id = window.setInterval(() => {
      // Avoid overwriting the current editing modal state
      if (selected || saving) {
        return;
      }
      load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [POLL_MS, selected, saving, pendingOnly]);

  useEffect(() => {
    const loadProfile = async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setProfile(data.user ?? null);
    };
    loadProfile();
  }, []);

  const filtered = useMemo(() => {
    let result = items;

    // Status filter
    if (statusFilter === "pending") {
      result = result.filter((i) => !i.completionStatus);
    } else if (statusFilter !== "all") {
      result = result.filter((i) => i.completionStatus === statusFilter);
    }

    // Text search
    const needle = query.trim().toLowerCase();
    if (needle) {
      result = result.filter((item) => {
        const haystack = [
          item.nama,
          item.instansi,
          item.phone,
          item.email,
          item.kebutuhan,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      });
    }

    return result;
  }, [items, query, statusFilter]);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [query, pendingOnly, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const openDetail = (item: OnlineRequest) => {
    setSelected(item);
    setForm({
      publikasi: item.publikasi ?? "",
      skdLinkSent: item.skdLinkSent ?? "",
      completionStatus: item.completionStatus ?? "",
    });
    setStatus(null);
  };

  const handleSave = async () => {
    if (!selected) {
      return;
    }
    setSaving(true);
    const response = await fetch("/api/sheets/online-requests/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rowNumber: selected.rowNumber,
        publikasi: form.publikasi,
        skdLinkSent: form.skdLinkSent,
        completionStatus: form.completionStatus,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/login?redirect=/online-requests";
        return;
      }
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal menyimpan ke Google Sheet.");
      return;
    }
    setStatus("Berhasil menyimpan perubahan.");
    setSelected(null);
    await load();
  };

  /* ── Stats for summary cards ── */
  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter((i) => !i.completionStatus).length;
    const transaksi = items.filter((i) => i.completionStatus === "Selesai transaksi data").length;
    const skd = items.filter((i) => i.completionStatus === "Selesai SKD").length;
    const publik = items.filter((i) => i.completionStatus === "Selesai pelayanan publik").length;
    return { total, pending, transaksi, skd, publik };
  }, [items]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_60%),linear-gradient(120deg,#f8fafc,#eff6ff)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <AppNav />

        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Permintaan Online (WA)
          </p>
          <h1 className="mt-3 text-3xl font-bold text-zinc-900">
            Data dari Google Form
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Lihat dan isi tindak lanjut tanpa membuka Google Sheets.
          </p>
        </header>

        {/* ── Summary ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Total", value: stats.total, color: "text-zinc-900", bg: "bg-white border-zinc-200" },
            { label: "Belum Diproses", value: stats.pending, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
            { label: "Transaksi Data", value: stats.transaksi, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
            { label: "SKD", value: stats.skd, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
            { label: "Pelayanan Publik", value: stats.publik, color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-2xl border px-4 py-3 shadow-sm ${s.bg}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                {s.label}
              </p>
              <p className={`mt-1 text-2xl font-extrabold ${s.color}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Search & Filter ── */}
        <section className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-700 transition hover:border-zinc-300">
                <input
                  type="checkbox"
                  checked={pendingOnly}
                  onChange={(event) => setPendingOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-xs font-semibold">Belum diproses saja</span>
              </label>
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-5 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {loading ? (
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                  </svg>
                )}
                {loading ? "Memuat..." : "Refresh"}
              </button>
            </div>
            <div className="relative w-full max-w-md">
              <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Cari nama, instansi, atau no HP..."
              />
            </div>
          </div>
          {status && !selected ? (
            <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${status.includes("Berhasil") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {status}
            </div>
          ) : null}
        </section>

        {/* ── Status Filter Tabs ── */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: "Semua", count: items.length, active: "bg-zinc-900 text-white", idle: "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300" },
            { key: "pending", label: "Belum Diproses", count: stats.pending, active: "bg-amber-500 text-white", idle: "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300" },
            { key: "Selesai transaksi data", label: "Transaksi Data", count: stats.transaksi, active: "bg-emerald-600 text-white", idle: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300" },
            { key: "Selesai SKD", label: "SKD", count: stats.skd, active: "bg-blue-600 text-white", idle: "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300" },
            { key: "Selesai pelayanan publik", label: "Pelayanan Publik", count: stats.publik, active: "bg-violet-600 text-white", idle: "border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300" },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition ${
                statusFilter === f.key ? f.active : f.idle
              }`}
            >
              {f.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                statusFilter === f.key ? "bg-white/25" : "bg-black/5"
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        <section className="rounded-2xl border border-white/70 bg-white/80 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
            <h2 className="text-sm font-bold text-zinc-900">
              Daftar Permintaan{" "}
              <span className="ml-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-500">
                {filtered.length}
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Menampilkan {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60">
                  <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Timestamp</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Nama</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">No HP</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Instansi</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">SKD</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Petugas</th>
                  <th className="sticky right-0 bg-zinc-50/90 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {paginatedItems.length ? (
                  paginatedItems.map((item) => (
                    <tr
                      key={item.rowNumber}
                      className="group transition-colors hover:bg-blue-50/40"
                    >
                      <td className="whitespace-nowrap px-6 py-3.5 text-xs text-zinc-500">
                        {item.timestamp || "-"}
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3.5 text-sm font-semibold text-zinc-900">
                        {item.nama}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-zinc-600">
                        {item.phone}
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-3.5 text-xs text-zinc-600">
                        {item.instansi || "-"}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={item.completionStatus} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-zinc-500">
                        {item.skdLinkSent || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-zinc-500">
                        {item.petugasPelayananPengaduan ||
                          item.petugasKonsultasi ||
                          "-"}
                      </td>
                      <td className="sticky right-0 bg-white px-4 py-3.5 text-right group-hover:bg-blue-50/40">
                        <button
                          type="button"
                          onClick={() => openDetail(item)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                          </svg>
                          Buka
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-6 py-12 text-center text-sm text-zinc-400" colSpan={8}>
                      <div className="flex flex-col items-center gap-2">
                        <svg className="h-8 w-8 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                        </svg>
                        Belum ada data permintaan.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Sebelumnya
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    // Show first, last, and pages around current
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - page) <= 1) return true;
                    return false;
                  })
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                      acc.push("...");
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === "..." ? (
                      <span key={`dots-${idx}`} className="px-1 text-xs text-zinc-300">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${
                          page === p
                            ? "bg-zinc-900 text-white shadow-sm"
                            : "text-zinc-500 hover:bg-zinc-100"
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Berikutnya
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ═══════════ DETAIL MODAL ═══════════ */}
      {selected ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-6 pt-[5vh] backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-white/80 bg-white shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-7 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white shadow-sm">
                  {selected.nama?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900">
                    {selected.nama}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Baris #{selected.rowNumber} · {selected.timestamp || "-"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="max-h-[70vh] overflow-y-auto px-7 py-6">

              {/* Info cards */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">No Handphone</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900 font-mono">{selected.phone}</p>
                </div>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Instansi</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">{selected.instansi || "-"}</p>
                </div>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Email</p>
                  <p className="mt-1 truncate text-sm font-semibold text-zinc-900">{selected.email || "-"}</p>
                </div>
              </div>

              {/* Kebutuhan & Kegunaan */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    Data / Konsultasi yang Dibutuhkan
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                    {selected.kebutuhan || "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    Kegunaan Data
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                    {selected.kegunaan || "-"}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-zinc-200" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                  Tindak Lanjut
                </span>
                <div className="h-px flex-1 bg-zinc-200" />
              </div>

              {/* Form section */}
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Left: Publikasi */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Publikasi yang Disarankan
                  </label>
                  <textarea
                    value={form.publikasi}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        publikasi: event.target.value,
                      }))
                    }
                    className="min-h-[100px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    placeholder="Isi rekomendasi publikasi..."
                  />

                  <label className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Apakah sudah dikirimkan link SKD?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {skdOptions.filter(Boolean).map((opt) => {
                      const isActive = form.skdLinkSent === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              skdLinkSent: isActive ? "" : opt,
                            }))
                          }
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                            isActive
                              ? "border-blue-300 bg-blue-50 text-blue-700"
                              : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Status Penyelesaian */}
                <div className="flex flex-col gap-4">
                  <StatusSelector
                    value={form.completionStatus}
                    onChange={(v) =>
                      setForm((prev) => ({ ...prev, completionStatus: v }))
                    }
                  />

                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
                    <span className="font-bold">Info:</span> Saat simpan, kolom{" "}
                    <b>
                      {isPublicServiceOfficer
                        ? "Petugas Pelayanan dan Pengaduan"
                        : "Petugas Konsultasi"}
                    </b>{" "}
                    akan otomatis diisi dengan nama akun yang sedang login.
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between border-t border-zinc-100 px-7 py-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-5 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 text-xs font-bold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:from-zinc-400 disabled:to-zinc-400"
              >
                {saving ? (
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                  </svg>
                )}
                {saving ? "Menyimpan..." : "Simpan ke Google Sheet"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
