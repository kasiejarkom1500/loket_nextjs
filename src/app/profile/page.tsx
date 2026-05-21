"use client";

import { useEffect, useState } from "react";
import AppNav from "@/components/AppNav";

type Profile = {
  nama: string;
  username: string;
  role: "ADMIN" | "LAYANAN_PUBLIK" | "PERMINTAAN_DATA";
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const response = await fetch("/api/auth/me");
      setLoading(false);
      if (!response.ok) {
        window.location.href = "/login?redirect=/profile";
        return;
      }
      const data = await response.json();
      const user = data.user as Profile;
      setProfile(user);
      setForm((prev) => ({ ...prev, username: user.username ?? "" }));
    };
    loadProfile();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setStatus("Konfirmasi password baru tidak sama.");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.username,
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    });
    setSaving(false);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/login?redirect=/profile";
        return;
      }
      setStatus(data.error ?? "Gagal memperbarui akun.");
      return;
    }

    setProfile(data.user ?? profile);
    setForm((prev) => ({
      ...prev,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }));
    setStatus("Akun berhasil diperbarui.");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_60%),linear-gradient(120deg,#f8fafc,#eff6ff)] px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <AppNav />

        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Akun
          </p>
          <h1 className="mt-3 text-3xl font-bold text-zinc-900">
            Pengaturan Login
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Ubah username dan password akun yang sedang digunakan.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/70 bg-white/85 p-7 shadow-sm"
        >
          {loading ? (
            <p className="text-sm text-zinc-500">Memuat profil...</p>
          ) : (
            <div className="grid gap-5">
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Nama
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  {profile?.nama ?? "-"}
                </p>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Username
                </span>
                <input
                  value={form.username}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  autoComplete="username"
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Password Saat Ini
                </span>
                <input
                  type="password"
                  value={form.currentPassword}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      currentPassword: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  autoComplete="current-password"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Password Baru
                  </span>
                  <input
                    type="password"
                    value={form.newPassword}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        newPassword: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    autoComplete="new-password"
                    placeholder="Kosongkan jika tidak diubah"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Konfirmasi Password Baru
                  </span>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        confirmPassword: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    autoComplete="new-password"
                    placeholder="Ulangi password baru"
                  />
                </label>
              </div>

              {status ? (
                <div
                  className={`rounded-xl px-4 py-3 text-sm font-medium ${
                    status.includes("berhasil")
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {status}
                </div>
              ) : null}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-6 text-xs font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
