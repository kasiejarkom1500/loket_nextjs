"use client";

import { useEffect, useMemo, useState } from "react";

type User = {
  id: number;
  nama: string;
  username: string;
  nipLama: string;
  isAdmin: boolean;
  counterId: number | null;
};

type Counter = {
  id: number;
  name: string;
};

const PAGE_SIZE = 10;
const emptyForm = {
  nama: "",
  nipLama: "",
  username: "",
  password: "",
  counterId: "",
  isAdmin: false,
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  /* modal state */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) return;
      const data = await response.json();
      setUsers(data.users ?? []);
    };
    const loadCounters = async () => {
      const response = await fetch("/api/counters");
      if (!response.ok) return;
      const data = await response.json();
      setCounters(data.counters ?? []);
    };
    loadUsers();
    loadCounters();
  }, []);

  const counterMap = useMemo(() => {
    const map = new Map<number, string>();
    counters.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [counters]);

  /* ── filter + pagination ── */
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (u) =>
        u.nama.toLowerCase().includes(needle) ||
        u.username.toLowerCase().includes(needle) ||
        u.nipLama.toLowerCase().includes(needle),
    );
  }, [users, query]);

  useEffect(() => { setPage(1); }, [query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  /* ── modal helpers ── */
  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setStatus(null);
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingId(user.id);
    setForm({
      nama: user.nama,
      nipLama: user.nipLama,
      username: user.username,
      password: "",
      counterId: user.counterId ? String(user.counterId) : "",
      isAdmin: user.isAdmin,
    });
    setStatus(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    const payload = {
      id: editingId,
      nama: form.nama,
      nipLama: form.nipLama,
      username: form.username,
      password: form.password,
      isAdmin: form.isAdmin,
      counterId: form.counterId ? Number(form.counterId) : null,
    };
    const response = await fetch("/api/admin/users", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal menyimpan user.");
      return;
    }
    const data = await response.json();
    if (editingId) {
      setUsers((prev) => prev.map((u) => (u.id === editingId ? data.user : u)));
    } else {
      setUsers((prev) => [...prev, data.user]);
    }
    closeModal();
    setStatus(editingId ? "User berhasil diperbarui." : "User berhasil ditambahkan.");
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Hapus user ${user.nama}? Data penugasan harus kosong.`)) return;
    const response = await fetch(`/api/admin/users?id=${user.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal menghapus user.");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    setStatus("User berhasil dihapus.");
  };

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Admin</p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">Kelola Pengguna</h1>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-5 text-xs font-bold text-white transition hover:bg-zinc-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tambah User
        </button>
      </header>

      {/* Search + status */}
      <section className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="Cari nama, username, NIP..."
            />
          </div>
          <p className="text-xs text-zinc-400">{filtered.length} pengguna</p>
        </div>
        {status && !modalOpen ? (
          <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${status.includes("berhasil") || status.includes("dihapus") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {status}
          </div>
        ) : null}
      </section>

      {/* Table */}
      <section className="rounded-2xl border border-white/70 bg-white/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-sm font-bold text-zinc-900">
            Daftar User{" "}
            <span className="ml-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-500">{filtered.length}</span>
          </h2>
          <p className="text-xs text-zinc-400">
            {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Nama</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Username</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">NIP Lama</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Admin</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Loket</th>
                <th className="sticky right-0 bg-zinc-50/90 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {paginated.length ? (
                paginated.map((user) => (
                  <tr key={user.id} className="group transition-colors hover:bg-blue-50/40">
                    <td className="px-6 py-3.5 text-sm font-semibold text-zinc-900">{user.nama}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-zinc-600">{user.username}</td>
                    <td className="px-4 py-3.5 text-xs text-zinc-500">{user.nipLama || "-"}</td>
                    <td className="px-4 py-3.5">
                      {user.isAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ya
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">Tidak</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-zinc-500">
                      {user.counterId ? counterMap.get(user.counterId) ?? `Loket ${user.counterId}` : "-"}
                    </td>
                    <td className="sticky right-0 bg-white px-4 py-3.5 text-right group-hover:bg-blue-50/40">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                          </svg>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-100"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-12 text-center text-sm text-zinc-400" colSpan={6}>
                    <div className="flex flex-col items-center gap-2">
                      <svg className="h-8 w-8 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                      Belum ada user.
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
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-40">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
              Sebelumnya
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1).reduce<(number | "...")[]>((acc, p, idx, arr) => { if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("..."); acc.push(p); return acc; }, []).map((p, idx) => p === "..." ? <span key={`d-${idx}`} className="px-1 text-xs text-zinc-300">…</span> : <button key={p} type="button" onClick={() => setPage(p)} className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${page === p ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-500 hover:bg-zinc-100"}`}>{p}</button>)}
            </div>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-40">
              Berikutnya
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>
        )}
      </section>

      {/* ═══════════ MODAL ═══════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-6 pt-[8vh] backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl border border-white/80 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-7 py-5">
              <h2 className="text-base font-bold text-zinc-900">
                {editingId ? "Edit User" : "Tambah User Baru"}
              </h2>
              <button type="button" onClick={closeModal} className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-7 py-6">
              <div className="grid gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Nama</label>
                  <input value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Nama lengkap" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">NIP Lama</label>
                  <input value={form.nipLama} onChange={(e) => setForm((f) => ({ ...f, nipLama: e.target.value }))} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="NIP Lama" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Username</label>
                    <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Username" required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Password</label>
                    <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder={editingId ? "Kosongkan jika tidak diubah" : "Password"} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Loket (opsional)</label>
                  <select value={form.counterId} onChange={(e) => setForm((f) => ({ ...f, counterId: e.target.value }))} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                    <option value="">Tanpa Loket</option>
                    {counters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3 transition hover:border-zinc-300">
                  <input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm((f) => ({ ...f, isAdmin: e.target.checked }))} className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-zinc-700">Jadikan admin</span>
                </label>
              </div>

              {status && modalOpen ? (
                <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${status.includes("berhasil") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {status}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-zinc-100 px-7 py-4">
              <button type="button" onClick={closeModal} className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-5 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900">
                Batal
              </button>
              <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 text-xs font-bold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:from-zinc-400 disabled:to-zinc-400">
                {saving && <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah User"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
