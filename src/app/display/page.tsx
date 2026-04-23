"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type SoundEvent = {
  id: number;
  queueId: number;
  number: string;
  serviceName: string;
  counterId: number;
  createdAt: string;
};

export default function DisplayPage() {
  const [state, setState] = useState<RealtimeState | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [lastAnnounced, setLastAnnounced] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSoundId = useRef<number | null>(null);

  const buildAnnouncementFiles = useCallback(
    (queueNumber: string, _counterId: number, serviceName: string) => {
      const [prefix, rawDigits] = queueNumber.split("-");
      const letter = prefix?.trim().toLowerCase();
      const digits = rawDigits?.trim() || queueNumber.replace(/\D/g, "");
      const isDataService = serviceName
        .toLowerCase()
        .includes("permintaan data");
      const files = ["/audio/intro.wav"];

      if (letter) {
        files.push(`/audio/letter-${letter}.wav`);
      }

      digits.split("").forEach((digit) => {
        files.push(`/audio/angka-${digit}.wav`);
      });

      files.push("/audio/loket.wav");
      files.push(
        isDataService
          ? "/audio/permintaan-data.wav"
          : "/audio/pelayanan-publik.wav",
      );

      return files;
    },
    [],
  );

  const playAudioSequence = useCallback(async (files: string[]) => {
    for (const file of files) {
      await new Promise<void>((resolve) => {
        const audio = new Audio(file);
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio
          .play()
          .then(() => {})
          .catch(() => resolve());
      });
    }
  }, []);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (firebaseClientReady && firebaseClientDb) {
      const stateRef = ref(firebaseClientDb, "state");
      const soundRef = ref(firebaseClientDb, "sound");
      const unsubscribeState = onValue(stateRef, (snapshot) => {
        if (snapshot.exists()) {
          setState(snapshot.val());
        }
      });
      const unsubscribeSound = onValue(soundRef, (snapshot) => {
        const value = snapshot.val() as SoundEvent | null;
        if (!value || !audioEnabled) {
          return;
        }
        if (lastSoundId.current === value.id) {
          return;
        }
        lastSoundId.current = value.id;
        const files = buildAnnouncementFiles(
          value.number,
          value.counterId,
          value.serviceName,
        );
        playAudioSequence(files).catch(() => {});
      });
      return () => {
        unsubscribeState();
        unsubscribeSound();
      };
    }

    const fetchOnce = async () => {
      const response = await fetch("/api/queue/current");
      if (!response.ok) return;
      const data = await response.json();
      setState(data);
    };
    fetchOnce();
  }, [audioEnabled, buildAnnouncementFiles, playAudioSequence]);

  const calledList = useMemo(() => state?.called ?? [], [state]);
  const calledActive = useMemo(
    () => calledList.filter((i) => i.status === "CALLED"),
    [calledList],
  );
  const calledCompleted = useMemo(
    () => calledList.filter((i) => i.status === "COMPLETED"),
    [calledList],
  );
  const latestCall = useMemo(() => calledActive[0] ?? null, [calledActive]);

  const formattedTime = useMemo(() => {
    if (!now) return "";
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(now);
  }, [now]);

  const formattedDate = useMemo(() => {
    if (!now) return "";
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(now);
  }, [now]);

  useEffect(() => {
    if (!audioEnabled || !latestCall) return;
    const key = `${latestCall.queueId}-${latestCall.counterId}`;
    if (lastAnnounced === key) return;
    const files = buildAnnouncementFiles(
      latestCall.number,
      latestCall.counterId,
      latestCall.serviceName,
    );
    playAudioSequence(files).catch(() => {});
    setLastAnnounced(key);
  }, [
    audioEnabled,
    latestCall,
    lastAnnounced,
    buildAnnouncementFiles,
    playAudioSequence,
  ]);

  const counterEntries = state?.counters
    ? Object.entries(state.counters)
    : [];

  return (
    <>
      <style>{`
        @keyframes dfadeUp   { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes dpulse    { 0%,100% { opacity:1 } 50% { opacity:.5 } }
        @keyframes dslideIn  { from { opacity:0; transform:translateX(-10px) } to { opacity:1; transform:translateX(0) } }
        @keyframes dglow     { 0%,100% { box-shadow: 0 0 24px rgba(251,191,36,.08) } 50% { box-shadow: 0 0 48px rgba(251,191,36,.18) } }
        .d-card    { animation: dfadeUp .5s cubic-bezier(.16,1,.3,1) both; }
        .d-active  { animation: dglow 2.5s ease-in-out infinite; }
        .d-pulse   { animation: dpulse 1.5s ease-in-out infinite; }
        .d-slide   { animation: dslideIn .4s cubic-bezier(.16,1,.3,1) both; }
      `}</style>

      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.10)_0%,transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.06)_0%,transparent_50%),linear-gradient(160deg,#f8fafc_0%,#eef2f7_100%)]"
        style={{ padding: "2rem 1.5rem", fontFamily: "var(--font-geist-sans), 'Segoe UI', system-ui, sans-serif" }}
      >
        <div className="mx-auto flex max-w-[1400px] flex-col gap-7">

          {/* ═══════════ HEADER ═══════════ */}
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5">
                <span className="d-pulse h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-700">
                  Display Antrian — Live
                </span>
              </div>
              <h1 className="text-[clamp(1.75rem,4vw,3rem)] font-extrabold leading-tight tracking-tight text-zinc-900">
                Panggilan Antrian
              </h1>
              <p className="mt-1.5 text-sm text-zinc-500">
                Realtime via Firebase — BPS Provinsi Jambi
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Clock */}
              <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-center shadow-sm">
                <p
                  className="text-[28px] font-extrabold tabular-nums tracking-tight text-zinc-900"
                  suppressHydrationWarning
                >
                  {formattedTime || "—"}
                </p>
                <p
                  className="mt-0.5 text-[11px] text-zinc-400"
                  suppressHydrationWarning
                >
                  {formattedDate || ""}
                </p>
              </div>

              {/* Audio toggle */}
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
                className={`flex h-11 items-center gap-2 rounded-xl px-5 text-[13px] font-bold transition-all ${
                  audioEnabled
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md"
                    : "border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:border-zinc-300 hover:text-zinc-700"
                }`}
              >
                {audioEnabled ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.531V19.94a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                  </svg>
                )}
                {audioEnabled ? "Suara Aktif" : "Aktifkan Suara"}
              </button>
            </div>
          </header>

          {/* ═══════════ MAIN GRID ═══════════ */}
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns:
                counterEntries.length > 0 ? "2fr 1fr" : "1fr",
            }}
          >
            {/* ── LEFT: Called Queues ── */}
            <div className="d-card flex flex-col gap-6 rounded-3xl border border-zinc-200/80 bg-white/90 p-8 shadow-sm backdrop-blur-sm">

              {/* Section: Sedang Dipanggil */}
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                    <svg className="h-[18px] w-[18px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-extrabold text-zinc-900">
                    Sedang Dipanggil
                  </h2>
                </div>

                {calledActive.length ? (
                  <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                    {calledActive.map((item, i) => (
                      <div
                        key={`${item.queueId}-${item.counterId}`}
                        className={`d-slide ${i === 0 ? "d-active" : ""}`}
                        style={{ animationDelay: `${i * 80}ms` }}
                      >
                        <div
                          className={`rounded-2xl p-5 ${
                            i === 0
                              ? "border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50"
                              : "border border-zinc-200 bg-zinc-50/80"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                              {item.counterName}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                              <span className="d-pulse h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Dipanggil
                            </span>
                          </div>
                          <p
                            className={`mt-3 font-black leading-none tracking-tight text-zinc-900 ${
                              i === 0 ? "text-5xl" : "text-4xl"
                            }`}
                          >
                            {item.number}
                          </p>
                          <p className="mt-2 text-[13px] text-zinc-500">
                            {item.serviceName}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 py-10 text-zinc-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span className="text-sm">
                      Belum ada antrian yang dipanggil
                    </span>
                  </div>
                )}
              </div>

              {/* Section: Terakhir Selesai */}
              {calledCompleted.length ? (
                <div>
                  <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                      <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-zinc-400">
                      Terakhir Selesai
                    </h3>
                  </div>
                  <div
                    className="grid gap-3"
                    style={{
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(220px, 1fr))",
                    }}
                  >
                    {calledCompleted.map((item, i) => (
                      <div
                        key={`${item.queueId}-${item.counterId}-done`}
                        className="d-slide rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3.5"
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                            {item.counterName}
                          </span>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Selesai
                          </span>
                        </div>
                        <p className="mt-2 text-[22px] font-extrabold tracking-tight text-zinc-500">
                          {item.number}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* ── RIGHT: Counter Status ── */}
            {counterEntries.length > 0 ? (
              <div
                className="d-card flex flex-col gap-4 rounded-3xl border border-zinc-200/80 bg-white/90 p-7 shadow-sm backdrop-blur-sm"
                style={{ animationDelay: "100ms" }}
              >
                <div className="mb-1 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 shadow-sm">
                    <svg className="h-[18px] w-[18px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-extrabold text-zinc-900">
                    Status Loket
                  </h2>
                </div>

                {counterEntries.map(([id, counter], i) => (
                  <div
                    key={id}
                    className="d-slide"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div
                      className={`rounded-2xl px-5 py-4 ${
                        counter
                          ? "border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-violet-50/50"
                          : "border border-zinc-100 bg-zinc-50/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                          Loket {id}
                        </span>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            counter ? "bg-emerald-500" : "bg-zinc-300"
                          }`}
                        />
                      </div>
                      {counter ? (
                        <>
                          <p className="mt-2.5 text-[28px] font-black leading-none tracking-tight text-zinc-900">
                            {counter.number}
                          </p>
                          <p className="mt-1.5 text-xs text-zinc-500">
                            {counter.serviceName}
                          </p>
                        </>
                      ) : (
                        <p className="mt-2.5 text-[13px] text-zinc-400">
                          Menunggu panggilan…
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="d-card flex items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white/60 p-8"
                style={{ animationDelay: "100ms" }}
              >
                <p className="text-sm text-zinc-400">
                  Menunggu data realtime…
                </p>
              </div>
            )}
          </div>
        </div>

        <audio ref={audioRef} src="/audio/notify.wav" preload="auto" />
      </div>
    </>
  );
}
