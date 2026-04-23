"use client";

import { useEffect, useState } from "react";
import AppNav from "@/components/AppNav";

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<{
    checkInAt: string | null;
    checkOutAt: string | null;
  } | null>(null);
  const [profile, setProfile] = useState<{
    nama: string;
    username: string;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    dataRequestOffline: "",
    dataConsultOffline: "",
    dataRequestOnline: "",
    dataConsultOnline: "",
    dataNotes: "",
  });

  useEffect(() => {
    const loadAttendance = async () => {
      const response = await fetch("/api/attendance/status");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setAttendance(data.attendance ?? null);
    };
    const loadProfile = async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setProfile(data.user ?? null);
    };
    loadAttendance();
    loadProfile();
  }, []);

  const isDataOfficer = profile?.role === "PERMINTAAN_DATA";

  const handleCheckIn = async () => {
    setLoading(true);
    const response = await fetch("/api/attendance/check-in", {
      method: "POST",
    });
    setLoading(false);
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setAttendance(data.attendance ?? null);
    setStatus("Presensi datang tersimpan.");
    setTimeout(() => setStatus(null), 3000);
  };

  const handleCheckOut = async () => {
    if (
      !form.dataRequestOffline ||
      !form.dataConsultOffline ||
      !form.dataRequestOnline ||
      !form.dataConsultOnline
    ) {
      setStatus("Lengkapi semua isian presensi pulang terlebih dahulu.");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/attendance/check-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "Gagal presensi pulang.");
      return;
    }
    const data = await response.json();
    setAttendance(data.attendance ?? null);
    setStatus("Presensi pulang tersimpan.");
    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_60%),linear-gradient(120deg,#fff7ed,#f8fafc)] px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <AppNav />
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Presensi Permintaan Data
          </p>
          <h1 className="mt-3 text-3xl font-bold text-zinc-900">
            Presensi Datang & Pulang
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Datang:{" "}
            <span className={attendance?.checkInAt ? "font-semibold text-emerald-600" : "text-zinc-400"}>
              {attendance?.checkInAt ? "Sudah" : "Belum"}
            </span>
            {" "}&nbsp;·&nbsp;{" "}
            Pulang:{" "}
            <span className={attendance?.checkOutAt ? "font-semibold text-emerald-600" : "text-zinc-400"}>
              {attendance?.checkOutAt ? "Sudah" : "Belum"}
            </span>
          </p>
        </header>

        <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={loading || Boolean(attendance?.checkInAt)}
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            Presensi Datang
          </button>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Permintaan data datang langsung
              </label>
              <input
                type="number"
                value={form.dataRequestOffline}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    dataRequestOffline: event.target.value,
                  }))
                }
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Konsultasi statistik datang langsung
              </label>
              <input
                type="number"
                value={form.dataConsultOffline}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    dataConsultOffline: event.target.value,
                  }))
                }
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Permintaan data online (WA)
              </label>
              <input
                type="number"
                value={form.dataRequestOnline}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    dataRequestOnline: event.target.value,
                  }))
                }
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Konsultasi statistik online (WA)
              </label>
              <input
                type="number"
                value={form.dataConsultOnline}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    dataConsultOnline: event.target.value,
                  }))
                }
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Komentar/Saran (opsional)
            </label>
            <textarea
              value={form.dataNotes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, dataNotes: event.target.value }))
              }
              className="mt-2 min-h-[90px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="button"
            onClick={handleCheckOut}
            disabled={loading || Boolean(attendance?.checkOutAt)}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-6 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            Presensi Pulang
          </button>
          {status ? <p className="mt-4 text-sm text-zinc-600">{status}</p> : null}
        </section>
      </div>
    </div>
  );
}
