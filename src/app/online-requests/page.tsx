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
  skdLinkSent: string;
  responded: string;
  keterangan: string;
};

const skdOptions = ["", "Telah dikirim", "Belum dikirim", "Tidak dikirim"] as const;
const responseOptions = ["", "Ya", "Tidak"] as const;

export default function OnlineRequestsPage() {
  const [items, setItems] = useState<OnlineRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pendingOnly, setPendingOnly] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<OnlineRequest | null>(null);
  const [profile, setProfile] = useState<{ role: string } | null>(null);
  const [form, setForm] = useState({
    publikasi: "",
    skdLinkSent: "",
    responded: "",
  });
  const [saving, setSaving] = useState(false);

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
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return items;
    }
    return items.filter((item) => {
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
  }, [items, query]);

  const openDetail = (item: OnlineRequest) => {
    setSelected(item);
    setForm({
      publikasi: item.publikasi ?? "",
      skdLinkSent: item.skdLinkSent ?? "",
      responded: item.responded ?? "",
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
        responded: form.responded,
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

        <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={pendingOnly}
                  onChange={(event) => setPendingOnly(event.target.checked)}
                />
                Tampilkan yang belum diproses
              </label>
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {loading ? "Memuat..." : "Refresh"}
              </button>
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full max-w-md rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
              placeholder="Cari nama/instansi/no HP..."
            />
          </div>
          {status ? (
            <p className="mt-4 text-sm text-zinc-700">{status}</p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">
              Daftar Permintaan ({filtered.length})
            </h2>
          </div>
          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-left text-sm text-zinc-700">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.2em] text-zinc-500">
                <tr>
                  <th className="py-3 pr-4">Timestamp</th>
                  <th className="py-3 pr-4">Nama</th>
                  <th className="py-3 pr-4">No HP</th>
                  <th className="py-3 pr-4">Instansi</th>
                  <th className="py-3 pr-4">SKD</th>
                  <th className="py-3 pr-4">Respon</th>
                  <th className="py-3 pr-4">Petugas</th>
                  <th className="py-3 pr-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length ? (
                  filtered.map((item) => (
                    <tr key={item.rowNumber} className="border-b border-zinc-100">
                      <td className="py-3 pr-4">{item.timestamp || "-"}</td>
                      <td className="py-3 pr-4 font-semibold">{item.nama}</td>
                      <td className="py-3 pr-4">{item.phone}</td>
                      <td className="py-3 pr-4">{item.instansi}</td>
                      <td className="py-3 pr-4">{item.skdLinkSent || "-"}</td>
                      <td className="py-3 pr-4">{item.responded || "-"}</td>
                      <td className="py-3 pr-4">{item.petugasKonsultasi || "-"}</td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => openDetail(item)}
                          className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
                        >
                          Buka
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-4 text-sm text-zinc-500" colSpan={8}>
                      Belum ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-4xl rounded-3xl border border-white/70 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-8 py-5">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Detail Permintaan
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Baris: {selected.rowNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-sm font-semibold text-zinc-500 hover:text-zinc-800"
              >
                Tutup
              </button>
            </div>

            <div className="px-8 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Nama
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    {selected.nama}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    No Handphone
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    {selected.phone}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Instansi
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    {selected.instansi}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Timestamp
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    {selected.timestamp || "-"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Data/Konsultasi yang dibutuhkan
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">
                  {selected.kebutuhan || "-"}
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Kegunaan Data
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">
                  {selected.kegunaan || "-"}
                </p>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    PUBLIKASI YANG DISARANKAN
                  </label>
                  <textarea
                    value={form.publikasi}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        publikasi: event.target.value,
                      }))
                    }
                    className="min-h-[120px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
                    placeholder="Isi rekomendasi publikasi..."
                  />
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Apakah sudah dikirimkan link SKD ?
                    </label>
                    <select
                      value={form.skdLinkSent}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          skdLinkSent: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
                    >
                      {skdOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt || "-"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      YBS Telah Merespon
                    </label>
                    <select
                      value={form.responded}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          responded: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
                    >
                      {responseOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt || "-"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    Saat simpan, kolom <b>Petugas Konsultasi</b> akan otomatis diisi
                    dengan nama akun yang sedang login.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50 px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-6 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {saving ? "Menyimpan..." : "Simpan ke Google Sheet"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
