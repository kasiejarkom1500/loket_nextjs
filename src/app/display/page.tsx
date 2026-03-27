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

/* ── small reusable SVG icon ── */
function Icon({ d, size = 20, stroke = false, color }: { d: string; size?: number; stroke?: boolean; color?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      style={{ width: size, height: size, flexShrink: 0 }}
      fill={stroke ? "none" : "currentColor"}
      stroke={stroke ? "currentColor" : "none"}
      strokeWidth={stroke ? 1.5 : 0}
      color={color}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

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
  const calledActive = useMemo(() => calledList.filter((i) => i.status === "CALLED"), [calledList]);
  const calledCompleted = useMemo(() => calledList.filter((i) => i.status === "COMPLETED"), [calledList]);
  const latestCall = useMemo(() => calledActive[0] ?? null, [calledActive]);

  const formattedTime = useMemo(() => {
    if (!now) return "";
    return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now);
  }, [now]);

  const formattedDate = useMemo(() => {
    if (!now) return "";
    return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(now);
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
  }, [audioEnabled, latestCall, lastAnnounced, buildAnnouncementFiles, playAudioSequence]);

  const counterEntries = state?.counters ? Object.entries(state.counters) : [];

  return (
    <>
      <style>{`
        .display-page { color-scheme: light; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); color: #f8fafc; }
        @keyframes dfadeUp   { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes dpulse    { 0%,100% { opacity:1 } 50% { opacity:.6 } }
        @keyframes dslideIn  { from { opacity:0; transform:translateX(-12px) } to { opacity:1; transform:translateX(0) } }
        @keyframes dglow     { 0%,100% { box-shadow: 0 0 20px rgba(251,191,36,.15) } 50% { box-shadow: 0 0 40px rgba(251,191,36,.3) } }
        .d-card    { animation: dfadeUp .5s cubic-bezier(.16,1,.3,1) both; }
        .d-active  { animation: dglow 2s ease-in-out infinite; }
        .d-pulse   { animation: dpulse 1.5s ease-in-out infinite; }
        .d-slide   { animation: dslideIn .4s cubic-bezier(.16,1,.3,1) both; }
      `}</style>

      <div className="display-page" style={{ minHeight: "100vh", padding: "2rem 1.5rem", fontFamily: "var(--font-geist-sans), 'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>

          {/* ═══════════ HEADER ═══════════ */}
          <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, background: "rgba(251,191,36,.12)", padding: "6px 16px", marginBottom: 12 }}>
                <span className="d-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.25em", color: "#fbbf24" }}>Display Dinding — Live</span>
              </div>
              <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.02em", color: "#f8fafc", lineHeight: 1.1 }}>
                Panggilan Antrian
              </h1>
              <p style={{ marginTop: 6, fontSize: 14, color: "#94a3b8" }}>
                Realtime via Firebase — BPS Provinsi Jambi
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* clock */}
              <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.05)", backdropFilter: "blur(12px)", padding: "12px 20px", textAlign: "center" }}>
                <p style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", color: "#f8fafc" }} suppressHydrationWarning>
                  {formattedTime || "—"}
                </p>
                <p style={{ fontSize: 11, color: "#64748b", marginTop: 2 }} suppressHydrationWarning>
                  {formattedDate || ""}
                </p>
              </div>

              {/* audio toggle */}
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
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  height: 44, borderRadius: 12, border: "none",
                  padding: "0 20px", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", transition: "all .2s",
                  background: audioEnabled ? "linear-gradient(135deg, #22c55e, #16a34a)" : "rgba(255,255,255,.08)",
                  color: audioEnabled ? "#fff" : "#94a3b8",
                }}
              >
                {audioEnabled ? (
                  <Icon d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" size={16} stroke color="#fff" />
                ) : (
                  <Icon d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.531V19.94a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" size={16} stroke color="#94a3b8" />
                )}
                {audioEnabled ? "Suara Aktif" : "Aktifkan Suara"}
              </button>
            </div>
          </header>

          {/* ═══════════ MAIN GRID ═══════════ */}
          <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr", ...(counterEntries.length > 0 ? { gridTemplateColumns: "2fr 1fr" } : {}) }}>

            {/* ── LEFT: Called Queues ── */}
            <div className="d-card" style={{ borderRadius: 28, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.04)", backdropFilter: "blur(12px)", padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Section: Sedang Dipanggil */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(251,191,36,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" size={18} stroke color="#fbbf24" />
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>Sedang Dipanggil</h2>
                </div>

                {calledActive.length ? (
                  <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                    {calledActive.map((item, i) => (
                      <div
                        key={`${item.queueId}-${item.counterId}`}
                        className={i === 0 ? "d-active d-slide" : "d-slide"}
                        style={{
                          animationDelay: `${i * 80}ms`,
                          borderRadius: 20,
                          border: i === 0 ? "2px solid rgba(251,191,36,.4)" : "1px solid rgba(255,255,255,.08)",
                          background: i === 0
                            ? "linear-gradient(135deg, rgba(251,191,36,.1), rgba(245,158,11,.06))"
                            : "rgba(255,255,255,.03)",
                          padding: "20px 24px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8" }}>
                            {item.counterName}
                          </span>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            borderRadius: 9999, padding: "3px 10px",
                            fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
                            background: "rgba(251,191,36,.15)", color: "#fbbf24",
                          }}>
                            <span className="d-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24" }} />
                            Dipanggil
                          </span>
                        </div>
                        <p style={{ marginTop: 12, fontSize: i === 0 ? 48 : 36, fontWeight: 900, letterSpacing: "-0.03em", color: "#f8fafc", lineHeight: 1 }}>
                          {item.number}
                        </p>
                        <p style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
                          {item.serviceName}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "40px 0", borderRadius: 16, border: "1px dashed rgba(255,255,255,.08)", color: "#475569" }}>
                    <Icon d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" size={20} stroke color="#475569" />
                    <span style={{ fontSize: 14 }}>Belum ada antrian yang dipanggil</span>
                  </div>
                )}
              </div>

              {/* Section: Terakhir Selesai */}
              {calledCompleted.length ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(34,197,94,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" size={16} stroke color="#22c55e" />
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#64748b" }}>Terakhir Selesai</h3>
                  </div>
                  <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                    {calledCompleted.map((item, i) => (
                      <div
                        key={`${item.queueId}-${item.counterId}-done`}
                        className="d-slide"
                        style={{
                          animationDelay: `${i * 60}ms`,
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,.05)",
                          background: "rgba(255,255,255,.02)",
                          padding: "14px 18px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#64748b" }}>
                            {item.counterName}
                          </span>
                          <span style={{
                            borderRadius: 9999, padding: "2px 8px",
                            fontSize: 10, fontWeight: 700,
                            background: "rgba(34,197,94,.1)", color: "#22c55e",
                          }}>
                            Selesai
                          </span>
                        </div>
                        <p style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: "#94a3b8", letterSpacing: "-0.02em" }}>
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
              <div className="d-card" style={{ animationDelay: "100ms", borderRadius: 28, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.04)", backdropFilter: "blur(12px)", padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" size={18} stroke color="#818cf8" />
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>Status Loket</h2>
                </div>

                {counterEntries.map(([id, counter], i) => (
                  <div
                    key={id}
                    className="d-slide"
                    style={{
                      animationDelay: `${i * 80}ms`,
                      borderRadius: 16,
                      border: counter
                        ? "1px solid rgba(99,102,241,.15)"
                        : "1px solid rgba(255,255,255,.05)",
                      background: counter
                        ? "linear-gradient(135deg, rgba(99,102,241,.06), rgba(139,92,246,.04))"
                        : "rgba(255,255,255,.02)",
                      padding: "16px 20px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#64748b" }}>
                        Loket {id}
                      </span>
                      {counter ? (
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                      ) : (
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#475569" }} />
                      )}
                    </div>
                    {counter ? (
                      <>
                        <p style={{ marginTop: 10, fontSize: 28, fontWeight: 900, color: "#f8fafc", letterSpacing: "-0.02em", lineHeight: 1 }}>
                          {counter.number}
                        </p>
                        <p style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                          {counter.serviceName}
                        </p>
                      </>
                    ) : (
                      <p style={{ marginTop: 10, fontSize: 13, color: "#475569" }}>
                        Menunggu panggilan…
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="d-card" style={{ animationDelay: "100ms", borderRadius: 28, border: "1px dashed rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontSize: 14, color: "#475569" }}>Menunggu data realtime…</p>
              </div>
            )}
          </div>
        </div>

        <audio ref={audioRef} src="/audio/notify.wav" preload="auto" />
      </div>
    </>
  );
}
