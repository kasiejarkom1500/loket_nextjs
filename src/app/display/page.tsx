"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { firebaseClientDb, firebaseClientReady } from "@/lib/firebase-client";

type CalledQueue = {
  queueId: number;
  number: string;
  counterId: number;
  counterName: string;
  serviceName: string;
  calledAt: string | null;
  status: "CALLED" | "COMPLETED";
};

type CounterState = {
  queueId: number;
  number: string;
  serviceName: string;
  calledAt: string | null;
};

type RealtimeState = {
  updatedAt: string;
  called: CalledQueue[];
  counters: Record<string, CounterState | null>;
};

export default function DisplayPage() {
  const [state, setState] = useState<RealtimeState | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [lastAnnounced, setLastAnnounced] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const calledList = useMemo(() => state?.called ?? [], [state]);
  const calledActive = useMemo(
    () => calledList.filter((item) => item.status === "CALLED"),
    [calledList],
  );
  const calledCompleted = useMemo(
    () => calledList.filter((item) => item.status === "COMPLETED"),
    [calledList],
  );
  const latestCall = useMemo(() => calledActive[0] ?? null, [calledActive]);

  useEffect(() => {
    if (!audioEnabled || !latestCall) {
      return;
    }
    const key = `${latestCall.queueId}-${latestCall.counterId}`;
    if (lastAnnounced === key) {
      return;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    setLastAnnounced(key);
  }, [audioEnabled, latestCall, lastAnnounced]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fbcfe8,transparent_55%),radial-gradient(circle_at_bottom,#bfdbfe,transparent_55%),linear-gradient(120deg,#fef2f2,#f8fafc)] px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Display Dinding
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-semibold text-zinc-900">
                Panggilan Antrian
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                Realtime via Firebase Realtime Database.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !audioEnabled;
                setAudioEnabled(next);
                if (next && audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play().catch(() => {});
                }
              }}
              className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-xs font-semibold transition ${
                audioEnabled
                  ? "bg-emerald-600 text-white"
                  : "border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
              }`}
            >
              {audioEnabled ? "Suara Aktif" : "Aktifkan Suara"}
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Sedang Dipanggil
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {calledActive.length ? (
                calledActive.map((item) => (
                  <div
                    key={`${item.queueId}-${item.counterId}`}
                    className="rounded-2xl border border-amber-200 bg-white px-5 py-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-zinc-500">
                      <span>{item.counterName}</span>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">
                        Dipanggil
                      </span>
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-zinc-900">
                      {item.number}
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">
                      {item.serviceName}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">
                  Belum ada antrian yang dipanggil.
                </p>
              )}
            </div>

            {calledCompleted.length ? (
              <div className="mt-8">
                <h3 className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Terakhir Selesai
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {calledCompleted.map((item) => (
                    <div
                      key={`${item.queueId}-${item.counterId}-done`}
                      className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                    >
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                        <span>{item.counterName}</span>
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                          Selesai
                        </span>
                      </div>
                      <p className="mt-2 text-xl font-semibold text-zinc-900">
                        {item.number}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Status Loket
            </h2>
            <div className="mt-6 flex flex-col gap-4">
              {state?.counters ? (
                Object.entries(state.counters).map(([id, counter]) => (
                  <div
                    key={id}
                    className="rounded-2xl border border-zinc-200 bg-white px-5 py-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Loket {id}
                    </p>
                    {counter ? (
                      <>
                        <p className="mt-3 text-2xl font-semibold text-zinc-900">
                          {counter.number}
                        </p>
                        <p className="mt-2 text-sm text-zinc-500">
                          {counter.serviceName}
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-zinc-500">
                        Belum ada panggilan.
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">
                  Menunggu data realtime.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
      <audio ref={audioRef} src="/audio/notify.wav" preload="auto" />
    </div>
  );
}
