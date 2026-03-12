"use client";

import { useEffect, useMemo, useState } from "react";

type User = {
  id: number;
  nama: string;
  username: string;
  nipLama: string;
  isAdmin: boolean;
};

type Assignment = {
  id: number;
  role: "LAYANAN_PUBLIK" | "PERMINTAAN_DATA";
  shift: "PAGI" | "SIANG";
  date: string;
  counterId: number | null;
  user: User;
  counter?: Counter | null;
};

type Counter = {
  id: number;
  name: string;
};

const roles = [
  { value: "LAYANAN_PUBLIK", label: "Layanan Publik" },
  { value: "PERMINTAAN_DATA", label: "Permintaan Data" },
];

const shifts = [
  { value: "PAGI", label: "Pagi" },
  { value: "SIANG", label: "Siang" },
];

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AssignmentPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [formDate, setFormDate] = useState(() =>
    formatDateInput(new Date()),
  );
  const [filterDate, setFilterDate] = useState(() =>
    formatDateInput(new Date()),
  );
  const [form, setForm] = useState({
    userId: "",
    role: "LAYANAN_PUBLIK",
    shift: "PAGI",
    counterId: "",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const selectedRole = form.role;

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

  useEffect(() => {
    const loadAssignments = async () => {
      const response = await fetch(
        `/api/admin/assignments?date=${filterDate}`,
      );
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setAssignments(data.assignments ?? []);
    };
    loadAssignments();
  }, [filterDate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    const payload = {
      id: editingId,
      userId: Number(form.userId),
      role: form.role,
      shift: form.shift,
      date: formDate,
      counterId:
        selectedRole === "LAYANAN_PUBLIK" && form.counterId
          ? Number(form.counterId)
          : null,
    };

    const response = await fetch("/api/admin/assignments", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal menyimpan penugasan.");
      return;
    }

    setStatus(editingId ? "Penugasan diperbarui." : "Penugasan tersimpan.");
    setForm((prev) => ({ ...prev, userId: "", counterId: "" }));
    setEditingId(null);

    const refreshed = await fetch(
      `/api/admin/assignments?date=${filterDate}`,
    );
    const data = await refreshed.json();
    setAssignments(data.assignments ?? []);
  };

  const handleEdit = (assignment: Assignment) => {
    setEditingId(assignment.id);
    setFormDate(assignment.date);
    setForm({
      userId: String(assignment.user.id),
      role: assignment.role,
      shift: assignment.shift,
      counterId: assignment.counterId ? String(assignment.counterId) : "",
    });
    setStatus(null);
  };

  const handleDelete = async (assignment: Assignment) => {
    const confirmed = window.confirm(
      `Hapus penugasan ${assignment.user.nama} (${assignment.shift})?`,
    );
    if (!confirmed) {
      return;
    }
    const response = await fetch(
      `/api/admin/assignments?id=${assignment.id}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal menghapus penugasan.");
      return;
    }
    setAssignments((prev) => prev.filter((item) => item.id !== assignment.id));
    setStatus("Penugasan dihapus.");
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUploadStatus(null);
    setUploadErrors([]);
    const formElement = event.currentTarget;
    const fileInput = formElement.elements.namedItem("file") as HTMLInputElement;
    if (!fileInput?.files?.length) {
      setUploadStatus("Pilih file Excel terlebih dahulu.");
      return;
    }
    const data = new FormData();
    data.append("file", fileInput.files[0]);
    setUploading(true);
    const response = await fetch("/api/admin/assignments/import", {
      method: "POST",
      body: data,
    });
    setUploading(false);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      setUploadStatus(errorData.error ?? "Gagal upload.");
      return;
    }
    const payload = await response.json();
    setUploadStatus(`Berhasil memproses ${payload.created} baris.`);
    if (payload.errors?.length) {
      setUploadErrors(
        payload.errors.map(
          (item: { row: number; error: string }) =>
            `Baris ${item.row}: ${item.error}`,
        ),
      );
    }
    const refreshed = await fetch(
      `/api/admin/assignments?date=${filterDate}`,
    );
    const refreshedData = await refreshed.json();
    setAssignments(refreshedData.assignments ?? []);
  };

  return (
    <>
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Admin Penugasan
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-900">
          Jadwal Petugas per Shift
        </h1>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            {editingId ? "Edit Penugasan" : "Tambah Penugasan"}
          </h2>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormDate(formatDateInput(new Date()));
                setForm({
                  userId: "",
                  role: "LAYANAN_PUBLIK",
                  shift: "PAGI",
                  counterId: "",
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
                Tanggal
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(event) => setFormDate(event.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Petugas
              </label>
              <select
                value={form.userId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, userId: event.target.value }))
                }
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
              >
                <option value="">Pilih Petugas</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.nama} ({user.username}
                    {user.isAdmin ? " - Admin" : ""})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Role
              </label>
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, role: event.target.value }))
                }
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Shift
              </label>
              <select
                value={form.shift}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, shift: event.target.value }))
                }
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
              >
                {shifts.map((shift) => (
                  <option key={shift.value} value={shift.value}>
                    {shift.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Loket (khusus layanan publik)
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
                disabled={selectedRole !== "LAYANAN_PUBLIK"}
              >
                <option value="">Pilih Loket</option>
                {counters.map((counter) => (
                  <option key={counter.id} value={counter.id}>
                    {counter.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {status ? (
            <p className="mt-4 text-sm text-zinc-600">{status}</p>
          ) : null}
          <button
            type="submit"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            {editingId ? "Simpan Perubahan" : "Simpan Penugasan"}
          </button>
        </form>

      <form
        onSubmit={handleUpload}
        className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm"
      >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                Upload Penugasan (Excel)
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Gunakan template:{" "}
                <a
                  href="/templates/assignment_template.xlsx"
                  className="font-semibold text-amber-700"
                >
                  download template
                </a>
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                name="file"
                type="file"
                accept=".xlsx"
                className="text-sm text-zinc-600"
              />
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {uploading ? "Mengunggah..." : "Upload Excel"}
              </button>
            </div>
          </div>
          {uploadStatus ? (
            <p className="mt-4 text-sm text-zinc-600">{uploadStatus}</p>
          ) : null}
          {uploadErrors.length ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
              {uploadErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}
      </form>

      <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">
              Daftar Penugasan ({filterDate})
            </h2>
            <div className="flex items-center gap-3">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Filter Tanggal
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(event) => setFilterDate(event.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-left text-sm text-zinc-700">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.2em] text-zinc-500">
                <tr>
                  <th className="py-3 pr-4">Petugas</th>
                  <th className="py-3 pr-4">Role</th>
                  <th className="py-3 pr-4">Shift</th>
                <th className="py-3 pr-4">Loket</th>
                <th className="py-3 pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length ? (
                assignments.map((assignment) => (
                  <tr key={assignment.id} className="border-b border-zinc-100">
                      <td className="py-3 pr-4">
                        {assignment.user.nama}
                      </td>
                      <td className="py-3 pr-4">
                        {assignment.role === "LAYANAN_PUBLIK"
                          ? "Layanan Publik"
                          : "Permintaan Data"}
                      </td>
                      <td className="py-3 pr-4">
                        {assignment.shift === "PAGI" ? "Pagi" : "Siang"}
                      </td>
                    <td className="py-3 pr-4">
                      {assignment.counter?.name ?? "-"}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(assignment)}
                          className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(assignment)}
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
                  <td className="py-4 text-sm text-zinc-500" colSpan={5}>
                    Belum ada penugasan.
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
