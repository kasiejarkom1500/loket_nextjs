"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ── Searchable Select ── */
function SearchableUserSelect({
  users,
  value,
  onChange,
}: {
  users: { id: number; nama: string; username: string; isAdmin: boolean }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // focus input when opened
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (u) =>
        u.nama.toLowerCase().includes(needle) ||
        u.username.toLowerCase().includes(needle),
    );
  }, [users, search]);

  const selectedUser = users.find((u) => String(u.id) === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(""); }}
        className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-2.5 text-left text-sm outline-none transition ${
          open
            ? "border-blue-400 ring-2 ring-blue-100"
            : "border-zinc-200 hover:border-zinc-300"
        }`}
      >
        <span className={selectedUser ? "text-zinc-900" : "text-zinc-400"}>
          {selectedUser
            ? `${selectedUser.nama} (${selectedUser.username})`
            : "Pilih Petugas"}
        </span>
        <svg
          className={`h-4 w-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
          <div className="border-b border-zinc-100 px-3 py-2">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-8 pr-3 text-xs text-zinc-900 outline-none transition focus:border-blue-400"
                placeholder="Cari nama atau username..."
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length ? (
              filtered.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    onChange(String(u.id));
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-blue-50 ${
                    String(u.id) === value
                      ? "bg-blue-50 font-semibold text-blue-700"
                      : "text-zinc-700"
                  }`}
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-[10px] font-bold text-zinc-500">
                    {u.nama[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.nama}</p>
                    <p className="truncate text-[10px] text-zinc-400">
                      {u.username}{u.isAdmin ? " · Admin" : ""}
                    </p>
                  </div>
                  {String(u.id) === value && (
                    <svg className="h-4 w-4 flex-shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-center text-xs text-zinc-400">Tidak ditemukan</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type User = { id: number; nama: string; username: string; nipLama: string; isAdmin: boolean };
type Counter = { id: number; name: string };
type ShiftSetting = {
  shift: "PAGI" | "SIANG";
  startTime: string;
  endTime: string;
  earlyCheckInBufferMinutes: number;
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

const roles = [
  { value: "LAYANAN_PUBLIK", label: "Layanan Publik" },
  { value: "PERMINTAAN_DATA", label: "Permintaan Data" },
];
const shifts = [
  { value: "PAGI", label: "Pagi" },
  { value: "SIANG", label: "Siang" },
];
const formatDateInput = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const PAGE_SIZE = 10;
const emptyForm = { userId: "", role: "LAYANAN_PUBLIK", shift: "PAGI", counterId: "" };

export default function AssignmentPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filterDate, setFilterDate] = useState(() => formatDateInput(new Date()));
  const [status, setStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formDate, setFormDate] = useState(() => formatDateInput(new Date()));
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // upload
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMonth, setUploadMonth] = useState(() => filterDate.slice(0, 7));
  const [shiftSettings, setShiftSettings] = useState<ShiftSetting[]>([
    {
      shift: "PAGI",
      startTime: "00:00",
      endTime: "11:59",
      earlyCheckInBufferMinutes: 30,
    },
    {
      shift: "SIANG",
      startTime: "12:00",
      endTime: "23:59",
      earlyCheckInBufferMinutes: 30,
    },
  ]);
  const [shiftSettingsStatus, setShiftSettingsStatus] = useState<string | null>(null);
  const [shiftSettingsSaving, setShiftSettingsSaving] = useState(false);

  const selectedRole = form.role;

  useEffect(() => {
    const loadUsers = async () => { const r = await fetch("/api/admin/users"); if (r.ok) { const d = await r.json(); setUsers(d.users ?? []); } };
    const loadCounters = async () => { const r = await fetch("/api/counters"); if (r.ok) { const d = await r.json(); setCounters(d.counters ?? []); } };
    const loadShiftSettings = async () => {
      const r = await fetch("/api/admin/shift-settings");
      if (r.ok) {
        const d = await r.json();
        setShiftSettings(d.settings ?? []);
      }
    };
    loadUsers(); loadCounters(); loadShiftSettings();
  }, []);

  const refreshAssignments = useCallback(async (date?: string) => {
    const d = date ?? filterDate;
    const r = await fetch(`/api/admin/assignments?date=${d}`);
    if (r.ok) { const data = await r.json(); setAssignments(data.assignments ?? []); }
  }, [filterDate]);

  useEffect(() => { refreshAssignments(); }, [refreshAssignments]);
  useEffect(() => { setPage(1); }, [filterDate]);
  useEffect(() => { setUploadMonth(filterDate.slice(0, 7)); }, [filterDate]);

  const totalPages = Math.max(1, Math.ceil(assignments.length / PAGE_SIZE));
  const paginated = useMemo(() => assignments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [assignments, page]);

  // modal helpers
  const openAdd = () => { setEditingId(null); setFormDate(formatDateInput(new Date())); setForm(emptyForm); setStatus(null); setModalOpen(true); };
  const openEdit = (a: Assignment) => {
    setEditingId(a.id); setFormDate(a.date);
    setForm({ userId: String(a.user.id), role: a.role, shift: a.shift, counterId: a.counterId ? String(a.counterId) : "" });
    setStatus(null); setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditingId(null); setForm(emptyForm); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setStatus(null);
    const payload = {
      id: editingId,
      userId: Number(form.userId),
      role: form.role,
      shift: form.shift,
      date: formDate,
      counterId: selectedRole === "LAYANAN_PUBLIK" && form.counterId ? Number(form.counterId) : null,
    };
    const res = await fetch("/api/admin/assignments", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setStatus(d.error ?? "Gagal menyimpan penugasan."); return; }
    closeModal();
    setStatus(editingId ? "Penugasan diperbarui." : "Penugasan tersimpan.");
    await refreshAssignments();
  };

  const handleDelete = async (a: Assignment) => {
    if (!window.confirm(`Hapus penugasan ${a.user.nama} (${a.shift})?`)) return;
    const res = await fetch(`/api/admin/assignments?id=${a.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setStatus(d.error ?? "Gagal menghapus penugasan."); return; }
    setAssignments((p) => p.filter((i) => i.id !== a.id));
    setStatus("Penugasan dihapus.");
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setUploadStatus(null); setUploadErrors([]);
    const formElement = event.currentTarget;
    const fileInput = formElement.elements.namedItem("file") as HTMLInputElement;
    if (!fileInput?.files?.length) { setUploadStatus("Pilih file Excel terlebih dahulu."); return; }
    const data = new FormData(); data.append("file", fileInput.files[0]);
    setUploading(true);
    const month = uploadMonth?.trim();
    const qs = month ? `?month=${encodeURIComponent(month)}` : "";
    const res = await fetch(`/api/admin/assignments/import${qs}`, { method: "POST", body: data });
    setUploading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setUploadStatus(d.error ?? "Gagal upload."); return; }
    const payload = await res.json();
    setUploadStatus(`Berhasil memproses ${payload.created} baris.`);
    if (payload.errors?.length) {
      setUploadErrors(payload.errors.map((i: { row: number; error: string }) => `Baris ${i.row}: ${i.error}`));
    }
    await refreshAssignments();
  };

  const updateShiftSetting = (
    shift: "PAGI" | "SIANG",
    field: "startTime" | "endTime" | "earlyCheckInBufferMinutes",
    value: string | number,
  ) => {
    setShiftSettings((prev) =>
      prev.map((setting) =>
        setting.shift === shift ? { ...setting, [field]: value } : setting,
      ),
    );
  };

  const handleShiftSettingsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShiftSettingsSaving(true);
    setShiftSettingsStatus(null);
    const res = await fetch("/api/admin/shift-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: shiftSettings }),
    });
    setShiftSettingsSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setShiftSettingsStatus(d.error ?? "Gagal menyimpan jam shift.");
      return;
    }
    const payload = await res.json();
    setShiftSettings(payload.settings ?? shiftSettings);
    setShiftSettingsStatus("Jam shift tersimpan.");
  };

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Admin</p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">Jadwal Petugas per Shift</h1>
        </div>
        <button type="button" onClick={openAdd} className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-5 text-xs font-bold text-white transition hover:bg-zinc-800">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Tambah Penugasan
        </button>
      </header>

      {/* Upload section */}
      <form onSubmit={handleUpload} className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Upload Penugasan (Excel)</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Gunakan template:{" "}
              <a href="/templates/assignment_template.xlsx" className="font-bold text-blue-600 hover:underline">download template</a>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input aria-label="Bulan" type="month" value={uploadMonth} onChange={(e) => setUploadMonth(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <input name="file" type="file" accept=".xlsx" className="text-xs text-zinc-600" />
            <button type="submit" disabled={uploading} className="inline-flex h-9 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-xs font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400">
              {uploading ? "Mengunggah..." : "Upload Excel"}
            </button>
          </div>
        </div>
        {uploadStatus && <div className={`mt-3 rounded-xl px-4 py-2.5 text-xs font-medium ${uploadStatus.includes("Berhasil") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{uploadStatus}</div>}
        {uploadErrors.length ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
            {uploadErrors.map((err) => <p key={err}>{err}</p>)}
          </div>
        ) : null}
      </form>

      <form onSubmit={handleShiftSettingsSubmit} className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Pengaturan Jam Shift</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Jam ini menentukan shift aktif untuk login, presensi, dan daftar petugas aktif.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[640px]">
            {shiftSettings.map((setting) => (
              <div key={setting.shift} className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  {setting.shift === "PAGI" ? "Shift Pagi" : "Shift Siang"}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                      Mulai
                    </span>
                    <input
                      type="time"
                      value={setting.startTime}
                      onChange={(e) =>
                        updateShiftSetting(setting.shift, "startTime", e.target.value)
                      }
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                      Selesai
                    </span>
                    <input
                      type="time"
                      value={setting.endTime}
                      onChange={(e) =>
                        updateShiftSetting(setting.shift, "endTime", e.target.value)
                      }
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </label>
                </div>
                <label className="mt-3 flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
                    Buffer Login Awal (menit)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={setting.earlyCheckInBufferMinutes}
                    onChange={(e) =>
                      updateShiftSetting(
                        setting.shift,
                        "earlyCheckInBufferMinutes",
                        Number(e.target.value),
                      )
                    }
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </label>
              </div>
            ))}
          </div>
          <button
            type="submit"
            disabled={shiftSettingsSaving}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {shiftSettingsSaving ? "Menyimpan..." : "Simpan Jam Shift"}
          </button>
        </div>
        {shiftSettingsStatus ? (
          <div className={`mt-3 rounded-xl px-4 py-2.5 text-xs font-medium ${shiftSettingsStatus.includes("tersimpan") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {shiftSettingsStatus}
          </div>
        ) : null}
      </form>

      {/* Filter + status */}
      <section className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">Filter Tanggal</label>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </div>
          <p className="text-xs text-zinc-400">{assignments.length} penugasan</p>
        </div>
        {status && !modalOpen ? (
          <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${status.includes("diperbarui") || status.includes("tersimpan") || status.includes("dihapus") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{status}</div>
        ) : null}
      </section>

      {/* Table */}
      <section className="rounded-2xl border border-white/70 bg-white/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-sm font-bold text-zinc-900">Daftar Penugasan ({filterDate}) <span className="ml-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-500">{assignments.length}</span></h2>
          {assignments.length > PAGE_SIZE && <p className="text-xs text-zinc-400">{Math.min((page - 1) * PAGE_SIZE + 1, assignments.length)}–{Math.min(page * PAGE_SIZE, assignments.length)} dari {assignments.length}</p>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Petugas</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Role</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Shift</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Loket</th>
                <th className="sticky right-0 bg-zinc-50/90 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {paginated.length ? paginated.map((a) => (
                <tr key={a.id} className="group transition-colors hover:bg-blue-50/40">
                  <td className="px-6 py-3.5 text-sm font-semibold text-zinc-900">{a.user.nama}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      a.role === "LAYANAN_PUBLIK" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-violet-200 bg-violet-50 text-violet-700"
                    }`}>
                      {a.role === "LAYANAN_PUBLIK" ? "Layanan Publik" : "Permintaan Data"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      a.shift === "PAGI" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-sky-200 bg-sky-50 text-sky-700"
                    }`}>
                      {a.shift === "PAGI" ? "Pagi" : "Siang"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-zinc-500">{a.counter?.name ?? "-"}</td>
                  <td className="sticky right-0 bg-white px-4 py-3.5 text-right group-hover:bg-blue-50/40">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => openEdit(a)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(a)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-100">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td className="px-6 py-12 text-center text-sm text-zinc-400" colSpan={5}>Belum ada penugasan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {assignments.length > PAGE_SIZE && (
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-6 pt-[8vh] backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl border border-white/80 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-7 py-5">
              <h2 className="text-base font-bold text-zinc-900">{editingId ? "Edit Penugasan" : "Tambah Penugasan Baru"}</h2>
              <button type="button" onClick={closeModal} className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto px-7 py-6">
              <div className="grid gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Tanggal</label>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Petugas</label>
                  <SearchableUserSelect
                    users={users}
                    value={form.userId}
                    onChange={(v) => setForm((f) => ({ ...f, userId: v }))}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Role</label>
                    <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                      {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Shift</label>
                    <select value={form.shift} onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value }))} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                      {shifts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Loket (khusus layanan publik)</label>
                  <select value={form.counterId} onChange={(e) => setForm((f) => ({ ...f, counterId: e.target.value }))} disabled={selectedRole !== "LAYANAN_PUBLIK"} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-zinc-50 disabled:text-zinc-400">
                    <option value="">Pilih Loket</option>
                    {counters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              {status && modalOpen ? (
                <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${status.includes("diperbarui") || status.includes("tersimpan") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{status}</div>
              ) : null}
            </div>
            <div className="flex items-center justify-between border-t border-zinc-100 px-7 py-4">
              <button type="button" onClick={closeModal} className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-5 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900">Batal</button>
              <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 text-xs font-bold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:from-zinc-400 disabled:to-zinc-400">
                {saving && <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Penugasan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
