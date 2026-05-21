"use client";

import { useCallback, useEffect, useState } from "react";
import AppNav from "@/components/AppNav";

type AttendanceMeta = {
  shift: "PAGI" | "SIANG";
  startTime: string | null;
  endTime: string | null;
  lateMinutes: number;
};

function formatLate(minutes: number) {
  if (minutes < 60) {
    return `${minutes} menit`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} jam ${rest} menit` : `${hours} jam`;
}

function AttendanceBadge({
  label,
  done,
  detail,
  lateMinutes,
}: {
  label: string;
  done: boolean;
  detail?: string;
  lateMinutes?: number;
}) {
  const isLate = done && typeof lateMinutes === "number" && lateMinutes > 0;
  const style = done
    ? isLate
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-zinc-200 bg-zinc-50 text-zinc-500";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${style}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold">
        {done ? "Sudah Presensi" : "Belum Presensi"}
      </p>
      {detail ? <p className="mt-1 text-xs font-medium">{detail}</p> : null}
      {isLate ? (
        <p className="mt-1 text-xs font-bold">
          Terlambat {formatLate(lateMinutes)}
        </p>
      ) : null}
    </div>
  );
}

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<{
    checkInAt: string | null;
    checkOutAt: string | null;
  } | null>(null);
  const [attendanceMeta, setAttendanceMeta] = useState<AttendanceMeta | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    dataRequestOffline: "",
    dataConsultOffline: "",
    dataRequestOnline: "",
    dataConsultOnline: "",
    dataNotes: "",
  });

  const loadAttendance = useCallback(async () => {
    const response = await fetch("/api/attendance/status");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setAttendance(data.attendance ?? null);
    setAttendanceMeta(data.meta ?? null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAttendance();
  }, [loadAttendance]);

  const handleCheckIn = async () => {
    setLoading(true);
    const response = await fetch("/api/attendance/check-in", {
      method: "POST",
    });
    setLoading(false);
    if (!response.ok) {
      return;
    }
    await loadAttendance();
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
      return false;
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
      return false;
    }
    await loadAttendance();
    setStatus("Presensi pulang tersimpan.");
    setTimeout(() => setStatus(null), 3000);
    return true;
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
            Shift {attendanceMeta?.shift === "SIANG" ? "Siang" : "Pagi"}
            {attendanceMeta?.startTime && attendanceMeta?.endTime
              ? ` · ${attendanceMeta.startTime}-${attendanceMeta.endTime}`
              : ""}
          </p>
        </header>

        <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm">
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Presensi Petugas Permintaan Data
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AttendanceBadge
                label="Presensi Datang"
                done={Boolean(attendance?.checkInAt)}
                detail={
                  attendanceMeta?.startTime
                    ? `Mulai shift ${attendanceMeta.startTime}`
                    : undefined
                }
                lateMinutes={attendanceMeta?.lateMinutes}
              />
              <AttendanceBadge
                label="Presensi Pulang"
                done={Boolean(attendance?.checkOutAt)}
                detail={
                  attendanceMeta?.endTime
                    ? `Selesai shift ${attendanceMeta.endTime}`
                    : undefined
                }
              />
            </div>
            <div className="flex flex-wrap gap-3 sm:justify-end">
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={loading || Boolean(attendance?.checkInAt)}
                className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                Presensi Datang
              </button>
              <button
                type="button"
                onClick={() => setAttendanceOpen(true)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                Presensi Pulang
              </button>
            </div>
          </div>
        </section>
        {status ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {status}
          </div>
        ) : null}
      </div>
      {status ? (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-lg">
          {status}
        </div>
      ) : null}
      {attendanceOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-4xl rounded-3xl border border-white/70 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-8 py-5">
              <h2 className="text-lg font-semibold text-zinc-900">
                Presensi Pulang - Permintaan Data
              </h2>
              <button
                type="button"
                onClick={() => setAttendanceOpen(false)}
                className="text-sm font-semibold text-zinc-500 hover:text-zinc-800"
              >
                Tutup
              </button>
            </div>
            <div className="px-8 py-6">
              <div className="grid gap-5 md:grid-cols-2">
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
            </div>
            <div className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50 px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setAttendanceOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const saved = await handleCheckOut();
                  if (saved) {
                    setAttendanceOpen(false);
                  }
                }}
                disabled={loading || Boolean(attendance?.checkOutAt)}
                className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-6 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                Simpan Presensi Pulang
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
