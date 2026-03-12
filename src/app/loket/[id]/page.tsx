"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { onValue, ref } from "firebase/database";
import { firebaseClientDb, firebaseClientReady } from "@/lib/firebase-client";

type CounterState = {
  queueId: number;
  number: string;
  serviceName: string;
  calledAt: string | null;
  visitorName: string;
  visitorPhone: string;
  visitorOrigin: string;
  visitorPurpose: string;
  staffPurposeDetail: string;
};

type RealtimeState = {
  updatedAt: string;
  counters: Record<string, CounterState | null>;
  pending: Array<{
    queueId: number;
    number: string;
    serviceName: string;
    createdAt: string;
    visitorName: string;
    visitorPhone: string;
    visitorOrigin: string;
    visitorPurpose: string;
  }>;
};

export default function LoketPage() {
  const params = useParams<{ id: string }>();
  const counterId = Number(params.id);
  const [state, setState] = useState<RealtimeState | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [services, setServices] = useState<Array<{ id: number; name: string }>>(
    [],
  );
  const [staffNote, setStaffNote] = useState("");
  const currentQueue = useMemo(
    () => (state?.counters ? state.counters[String(counterId)] : null),
    [state, counterId],
  );
  const [lastQueueId, setLastQueueId] = useState<number | null>(null);

  useEffect(() => {
    if (firebaseClientReady && firebaseClientDb) {
      const stateRef = ref(firebaseClientDb, "state");
      const unsubscribe = onValue(stateRef, (snapshot) => {
        if (snapshot.exists()) {
          setState(snapshot.val());
        }
      });
      return () => unsubscribe();
    }

    const fetchOnce = async () => {
      const response = await fetch("/api/queue/current");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setState(data);
    };
    fetchOnce();
  }, []);

  useEffect(() => {
    const loadServices = async () => {
      const response = await fetch("/api/services");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setServices(data.services ?? []);
    };
    loadServices();
  }, []);

  useEffect(() => {
    if (!currentQueue) {
      return;
    }
    if (lastQueueId === currentQueue.queueId) {
      return;
    }
    setLastQueueId(currentQueue.queueId);
    setStaffNote(currentQueue.staffPurposeDetail || "");
    setToast(`Antrian ${currentQueue.number} dipanggil.`);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [currentQueue, lastQueueId]);

  useEffect(() => {
    if (!currentQueue) {
      return;
    }
    setStaffNote(currentQueue.staffPurposeDetail || "");
  }, [currentQueue?.queueId, currentQueue?.staffPurposeDetail]);

  const refreshState = async () => {
    const response = await fetch("/api/queue/current");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setState(data);
  };

  const handleCallNext = async () => {
    if (!counterId) {
      return;
    }
    setLoading(true);
    const response = await fetch("/api/queue/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterId }),
    });
    setLoading(false);
    if (!response.ok) {
      return;
    }
    if (!firebaseClientReady) {
      await refreshState();
    }
  };

  const handleComplete = async () => {
    if (!currentQueue?.queueId) {
      return;
    }
    setLoading(true);
    const response = await fetch("/api/queue/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queueId: currentQueue.queueId }),
    });
    setLoading(false);
    if (!response.ok) {
      return;
    }
    if (!firebaseClientReady) {
      await refreshState();
    }
  };

  const handleTakeQueue = async (queueId: number) => {
    if (!counterId) {
      return;
    }
    setLoading(true);
    const response = await fetch("/api/queue/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterId, queueId }),
    });
    setLoading(false);
    if (!response.ok) {
      return;
    }
    if (!firebaseClientReady) {
      await refreshState();
    }
  };

  const handleChangeService = async (queueId: number, serviceId: number) => {
    setLoading(true);
    const response = await fetch("/api/queue/update-service", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queueId, serviceId }),
    });
    setLoading(false);
    if (!response.ok) {
      return;
    }
    if (!firebaseClientReady) {
      await refreshState();
    }
  };

  const handleSaveStaffNote = async () => {
    if (!currentQueue) {
      return;
    }
    const response = await fetch("/api/queue/update-staff-purpose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queueId: currentQueue.queueId,
        staffPurposeDetail: staffNote,
      }),
    });
    if (!response.ok) {
      return;
    }
    if (!firebaseClientReady) {
      await refreshState();
    }
    setToast("Detail keperluan disimpan.");
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_60%),linear-gradient(120deg,#f8fafc,#eff6ff)] px-6 py-12">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Dashboard Loket
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
          >
            Keluar
          </button>
        </header>
        <div>
          <h1 className="text-4xl font-semibold text-zinc-900">
            Loket {counterId || "-"}
          </h1>
          <p className="mt-3 text-sm text-zinc-600">
            Panggil antrian berikutnya dan tandai selesai pelayanan.
          </p>
        </div>

        <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Antrian Saat Ini
          </p>
          {currentQueue ? (
            <>
              <p className="mt-4 text-4xl font-semibold text-zinc-900">
                {currentQueue.number}
              </p>
              <p className="mt-2 text-sm text-zinc-600">
                {currentQueue.serviceName}
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Nama
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    {currentQueue.visitorName}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Nomor Telepon
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    {currentQueue.visitorPhone}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Asal
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    {currentQueue.visitorOrigin}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Keperluan
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    {currentQueue.visitorPurpose}
                  </p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Detail Keperluan (Petugas)
                </p>
                <textarea
                  value={staffNote}
                  onChange={(event) => setStaffNote(event.target.value)}
                  className="mt-3 min-h-[90px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-500"
                  placeholder="Catatan tambahan dari petugas."
                />
                <button
                  type="button"
                  onClick={handleSaveStaffNote}
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-xs font-semibold text-white transition hover:bg-zinc-800"
                >
                  Simpan Detail
                </button>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Belum ada antrian yang dipanggil untuk loket ini.
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCallNext}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              Panggil Selanjutnya
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={!currentQueue || loading}
              className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 bg-white px-8 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:text-zinc-400"
            >
              Selesai
            </button>
          </div>
        </section>
        <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">
              Daftar Antrian Baru
            </h2>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Total: {state?.pending?.length ?? 0}
            </p>
          </div>
          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-left text-sm text-zinc-700">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.2em] text-zinc-500">
                <tr>
                  <th className="py-3 pr-4">Nomor</th>
                  <th className="py-3 pr-4">Layanan</th>
                  <th className="py-3 pr-4">Nama</th>
                  <th className="py-3 pr-4">Telepon</th>
                  <th className="py-3 pr-4">Asal</th>
                  <th className="py-3 pr-4">Keperluan</th>
                  <th className="py-3 pr-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {state?.pending?.length ? (
                  state.pending.map((queue) => (
                    <tr key={queue.queueId} className="border-b border-zinc-100">
                      <td className="py-3 pr-4 font-semibold">
                        {queue.number}
                      </td>
                      <td className="py-3 pr-4">{queue.serviceName}</td>
                      <td className="py-3 pr-4">{queue.visitorName}</td>
                      <td className="py-3 pr-4">{queue.visitorPhone}</td>
                      <td className="py-3 pr-4">{queue.visitorOrigin}</td>
                      <td className="py-3 pr-4">{queue.visitorPurpose}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={
                              services.find(
                                (service) => service.name === queue.serviceName,
                              )?.id ?? ""
                            }
                            onChange={(event) =>
                              handleChangeService(
                                queue.queueId,
                                Number(event.target.value),
                              )
                            }
                            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700"
                          >
                            {services.map((service) => (
                              <option key={service.id} value={service.id}>
                                {service.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleTakeQueue(queue.queueId)}
                            className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
                          >
                            Ambil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-4 text-sm text-zinc-500" colSpan={7}>
                      Belum ada antrian baru.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        {toast ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {toast}
          </div>
        ) : null}
      </div>
      <audio ref={audioRef} src="/audio/notify.wav" preload="auto" />
    </div>
  );
}
