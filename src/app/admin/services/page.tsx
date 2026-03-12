"use client";

import { useEffect, useState } from "react";

type Service = {
  id: number;
  code: string;
  name: string;
  color: string | null;
};

const defaultColor = "#f59e0b";

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    color: defaultColor,
  });

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/admin/services");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setServices(data.services ?? []);
    };
    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const response = await fetch("/api/admin/services", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        code: form.code,
        name: form.name,
        color: form.color,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal menyimpan layanan.");
      return;
    }
    const data = await response.json();
    if (editingId) {
      setServices((prev) =>
        prev.map((item) => (item.id === editingId ? data.service : item)),
      );
    } else {
      setServices((prev) => [...prev, data.service]);
    }
    setEditingId(null);
    setForm({ code: "", name: "", color: defaultColor });
    setStatus(editingId ? "Layanan diperbarui." : "Layanan ditambahkan.");
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setForm({
      code: service.code,
      name: service.name,
      color: service.color ?? defaultColor,
    });
    setStatus(null);
  };

  const handleDelete = async (service: Service) => {
    const confirmed = window.confirm(`Hapus layanan ${service.name}?`);
    if (!confirmed) {
      return;
    }
    const response = await fetch(`/api/admin/services?id=${service.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal menghapus layanan.");
      return;
    }
    setServices((prev) => prev.filter((item) => item.id !== service.id));
    setStatus("Layanan dihapus.");
  };

  return (
    <>
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Admin Layanan
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-900">
          Kelola Layanan
        </h1>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            {editingId ? "Edit Layanan" : "Tambah Layanan"}
          </h2>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({ code: "", name: "", color: defaultColor });
                setStatus(null);
              }}
              className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
            >
              Batal Edit
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Kode Layanan
            </label>
            <input
              value={form.code}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, code: event.target.value }))
              }
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
              placeholder="Contoh: A"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Nama Layanan
            </label>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
              placeholder="Contoh: Layanan Publik"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Warna
              </label>
              <input
                type="color"
                value={form.color}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, color: event.target.value }))
                }
                className="h-11 w-20 cursor-pointer rounded-xl border border-zinc-200 bg-white px-2 py-1"
              />
            </div>
            <div className="flex h-11 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-700">
              {form.color.toUpperCase()}
            </div>
          </div>
        </div>

        {status ? <p className="mt-4 text-sm text-zinc-600">{status}</p> : null}
        <button
          type="submit"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          {editingId ? "Simpan Perubahan" : "Tambah Layanan"}
        </button>
      </form>

      <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          Daftar Layanan
        </h2>
        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-left text-sm text-zinc-700">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="py-3 pr-4">Kode</th>
                <th className="py-3 pr-4">Nama</th>
                <th className="py-3 pr-4">Warna</th>
                <th className="py-3 pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {services.length ? (
                services.map((service) => (
                  <tr key={service.id} className="border-b border-zinc-100">
                    <td className="py-3 pr-4 font-semibold">{service.code}</td>
                    <td className="py-3 pr-4">{service.name}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-6 w-6 rounded-full border border-zinc-200"
                          style={{ backgroundColor: service.color ?? "#e5e7eb" }}
                        />
                        <span className="text-xs text-zinc-500">
                          {(service.color ?? "-").toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(service)}
                          className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(service)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:border-rose-300"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-4 text-sm text-zinc-500" colSpan={4}>
                    Belum ada layanan.
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
