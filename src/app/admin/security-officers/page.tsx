"use client";

import { useEffect, useState } from "react";

type SecurityOfficer = {
  id: number;
  name: string;
};

export default function SecurityOfficersPage() {
  const [officers, setOfficers] = useState<SecurityOfficer[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/admin/security-officers");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setOfficers(data.securityOfficers ?? []);
    };
    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const response = await fetch("/api/admin/security-officers", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, name }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal menyimpan satpam.");
      return;
    }
    const data = await response.json();
    if (editingId) {
      setOfficers((prev) =>
        prev.map((item) => (item.id === editingId ? data.securityOfficer : item)),
      );
    } else {
      setOfficers((prev) => [...prev, data.securityOfficer]);
    }
    setEditingId(null);
    setName("");
    setStatus(editingId ? "Satpam diperbarui." : "Satpam ditambahkan.");
  };

  const handleEdit = (officer: SecurityOfficer) => {
    setEditingId(officer.id);
    setName(officer.name);
    setStatus(null);
  };

  const handleDelete = async (officer: SecurityOfficer) => {
    const confirmed = window.confirm(`Hapus satpam ${officer.name}?`);
    if (!confirmed) {
      return;
    }
    const response = await fetch(
      `/api/admin/security-officers?id=${officer.id}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal menghapus satpam.");
      return;
    }
    setOfficers((prev) => prev.filter((item) => item.id !== officer.id));
    setStatus("Satpam dihapus.");
  };

  return (
    <>
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Admin Satpam
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-900">
          Kelola Satpam
        </h1>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            {editingId ? "Edit Satpam" : "Tambah Satpam"}
          </h2>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setName("");
                setStatus(null);
              }}
              className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
            >
              Batal Edit
            </button>
          ) : null}
        </div>
        <div className="mt-4">
          <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Nama Satpam
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
            placeholder="Nama satpam"
          />
        </div>
        {status ? <p className="mt-4 text-sm text-zinc-600">{status}</p> : null}
        <button
          type="submit"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          {editingId ? "Simpan Perubahan" : "Tambah Satpam"}
        </button>
      </form>

      <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Daftar Satpam</h2>
        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-left text-sm text-zinc-700">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="py-3 pr-4">Nama</th>
                <th className="py-3 pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {officers.length ? (
                officers.map((officer) => (
                  <tr key={officer.id} className="border-b border-zinc-100">
                    <td className="py-3 pr-4">{officer.name}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(officer)}
                          className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(officer)}
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
                  <td className="py-4 text-sm text-zinc-500" colSpan={2}>
                    Belum ada satpam.
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
