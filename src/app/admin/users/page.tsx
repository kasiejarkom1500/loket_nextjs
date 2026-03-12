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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    nama: "",
    nipLama: "",
    username: "",
    password: "",
    counterId: "",
    isAdmin: false,
  });

  useEffect(() => {
    const loadUsers = async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setUsers(data.users ?? []);
    };

    const loadCounters = async () => {
      const response = await fetch("/api/counters");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setCounters(data.counters ?? []);
    };

    loadUsers();
    loadCounters();
  }, []);

  const counterMap = useMemo(() => {
    const map = new Map<number, string>();
    counters.forEach((counter) => map.set(counter.id, counter.name));
    return map;
  }, [counters]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal menambah user.");
      return;
    }

    const data = await response.json();
    if (editingId) {
      setUsers((prev) =>
        prev.map((user) => (user.id === editingId ? data.user : user)),
      );
    } else {
      setUsers((prev) => [...prev, data.user]);
    }
    setForm({
      nama: "",
      nipLama: "",
      username: "",
      password: "",
      counterId: "",
      isAdmin: false,
    });
    setEditingId(null);
    setStatus(editingId ? "User berhasil diperbarui." : "User berhasil ditambahkan.");
  };

  const handleEdit = (user: User) => {
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
  };

  const handleDelete = async (user: User) => {
    const confirmed = window.confirm(
      `Hapus user ${user.nama}? Data penugasan harus kosong.`,
    );
    if (!confirmed) {
      return;
    }
    const response = await fetch(`/api/admin/users?id=${user.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal menghapus user.");
      return;
    }
    setUsers((prev) => prev.filter((item) => item.id !== user.id));
    setStatus("User berhasil dihapus.");
  };

  return (
    <>
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Admin User
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-900">
          Kelola Pengguna
        </h1>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            {editingId ? "Edit User" : "Tambah User"}
          </h2>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({
                  nama: "",
                  nipLama: "",
                  username: "",
                  password: "",
                  counterId: "",
                  isAdmin: false,
                });
                setStatus(null);
              }}
              className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
            >
              Batal Edit
            </button>
          ) : null}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Nama
              </label>
              <input
                value={form.nama}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, nama: event.target.value }))
                }
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
                placeholder="Nama lengkap"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                NIP Lama
              </label>
              <input
                value={form.nipLama}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, nipLama: event.target.value }))
                }
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
                placeholder="NIP Lama"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Username
              </label>
              <input
                value={form.username}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    username: event.target.value,
                  }))
                }
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
                placeholder="Username"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
                placeholder={
                  editingId ? "Kosongkan jika tidak diubah" : "Password"
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Loket (opsional)
              </label>
              <select
                value={form.counterId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    counterId: event.target.value,
                  }))
                }
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
              >
                <option value="">Tanpa Loket</option>
                {counters.map((counter) => (
                  <option key={counter.id} value={counter.id}>
                    {counter.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="isAdmin"
                type="checkbox"
                checked={form.isAdmin}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isAdmin: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
              />
              <label htmlFor="isAdmin" className="text-sm text-zinc-700">
                Jadikan admin
              </label>
            </div>
          </div>
          {status ? (
            <p className="mt-4 text-sm text-zinc-600">{status}</p>
          ) : null}
          <button
            type="submit"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            {editingId ? "Simpan Perubahan" : "Tambah User"}
          </button>
        </form>

      <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Daftar User</h2>
        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-left text-sm text-zinc-700">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="py-3 pr-4">Nama</th>
                <th className="py-3 pr-4">Username</th>
                <th className="py-3 pr-4">NIP Lama</th>
                <th className="py-3 pr-4">Admin</th>
                  <th className="py-3 pr-4">Loket</th>
                  <th className="py-3 pr-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.length ? (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-zinc-100">
                    <td className="py-3 pr-4">{user.nama}</td>
                    <td className="py-3 pr-4">{user.username}</td>
                    <td className="py-3 pr-4">{user.nipLama}</td>
                    <td className="py-3 pr-4">
                      {user.isAdmin ? "Ya" : "Tidak"}
                    </td>
                      <td className="py-3 pr-4">
                        {user.counterId
                          ? counterMap.get(user.counterId) ?? `Loket ${user.counterId}`
                          : "-"}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(user)}
                            className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
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
                    <td className="py-4 text-sm text-zinc-500" colSpan={6}>
                      Belum ada user.
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
