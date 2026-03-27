"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { firebaseClientDb, firebaseClientReady } from "@/lib/firebase-client";

type CompletedQueue = {
  id: number;
  number: string;
  visitorName: string;
  publicOfficerName: string;
  dataOfficerName: string | null;
  securityOfficerName: string;
  hasDataOfficer: boolean;
};

const SCORE_LABELS: Record<number, string> = {
  1: "Sangat Buruk",
  2: "Buruk",
  3: "Cukup",
  4: "Baik",
  5: "Sangat Baik",
};

const SCORE_EMOJIS: Record<number, string> = {
  1: "😠",
  2: "😟",
  3: "😐",
  4: "😊",
  5: "😍",
};

const SCORE_COLORS: Record<
  number,
  { bg: string; border: string; text: string; ring: string }
> = {
  1: {
    bg: "bg-rose-50",
    border: "border-rose-400",
    text: "text-rose-700",
    ring: "ring-rose-300",
  },
  2: {
    bg: "bg-orange-50",
    border: "border-orange-400",
    text: "text-orange-700",
    ring: "ring-orange-300",
  },
  3: {
    bg: "bg-amber-50",
    border: "border-amber-400",
    text: "text-amber-700",
    ring: "ring-amber-300",
  },
  4: {
    bg: "bg-lime-50",
    border: "border-lime-500",
    text: "text-lime-700",
    ring: "ring-lime-300",
  },
  5: {
    bg: "bg-emerald-50",
    border: "border-emerald-500",
    text: "text-emerald-700",
    ring: "ring-emerald-300",
  },
};

function StarRating({
  label,
  value,
  setValue,
}: {
  label: string;
  value: number | null;
  setValue: (v: number) => void;
}) {
  const colors = value ? SCORE_COLORS[value] : null;
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
        {label}
      </p>
      <div className="mt-4 flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((score) => {
          const isSel = value === score;
          const c = SCORE_COLORS[score];
          return (
            <button
              key={score}
              type="button"
              onClick={() => setValue(score)}
              title={SCORE_LABELS[score]}
              className={`flex h-14 w-14 flex-col items-center justify-center rounded-2xl border-2 text-xl transition-all duration-200 ${
                isSel
                  ? `${c.bg} ${c.border} ${c.text} scale-110 ring-2 ${c.ring} shadow-sm`
                  : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-white hover:scale-105"
              }`}
            >
              <span>{SCORE_EMOJIS[score]}</span>
            </button>
          );
        })}
      </div>
      {value ? (
        <p
          className={`mt-3 text-xs font-semibold ${colors?.text ?? "text-zinc-500"}`}
        >
          {SCORE_EMOJIS[value]} {SCORE_LABELS[value]}
        </p>
      ) : (
        <p className="mt-3 text-xs text-zinc-400">Belum dipilih</p>
      )}
    </div>
  );
}

export default function RatingPage() {
  const [queues, setQueues] = useState<CompletedQueue[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<number | null>(null);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [publicScore, setPublicScore] = useState<number | null>(null);
  const [dataScore, setDataScore] = useState<number | null>(null);
  const [securityScore, setSecurityScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );

  const selectedQueue = queues.find((queue) => queue.id === selectedQueueId);

  const loadQueues = async () => {
    const response = await fetch("/api/queue/completed-today");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setQueues(data.queues ?? []);
  };

  useEffect(() => {
    loadQueues();
  }, []);

  useEffect(() => {
    if (!firebaseClientReady || !firebaseClientDb) {
      return;
    }
    const stateRef = ref(firebaseClientDb, "state");
    const unsubscribe = onValue(stateRef, () => {
      loadQueues();
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (!selectedQueueId || !overallScore || !publicScore || !securityScore) {
      return;
    }
    if (selectedQueue?.hasDataOfficer && !dataScore) {
      return;
    }
    setStatus("sending");
    const response = await fetch("/api/rating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queueId: selectedQueueId,
        score: overallScore,
        publicOfficerScore: publicScore,
        dataOfficerScore: selectedQueue?.hasDataOfficer ? dataScore : null,
        securityOfficerScore: securityScore,
        comment,
      }),
    });
    setStatus(response.ok ? "done" : "error");
    if (response.ok) {
      setQueues((prev) => prev.filter((queue) => queue.id !== selectedQueueId));
      setSelectedQueueId(null);
      setOverallScore(null);
      setPublicScore(null);
      setDataScore(null);
      setSecurityScore(null);
      setComment("");
    }
  };

  const isFormComplete =
    !!selectedQueueId &&
    !!overallScore &&
    !!publicScore &&
    !!securityScore &&
    (!selectedQueue?.hasDataOfficer || !!dataScore);

  const ratingItems = [
    {
      label: "Pelayanan Umum",
      value: overallScore,
      setValue: setOverallScore,
    },
    {
      label: "Petugas Layanan Publik",
      value: publicScore,
      setValue: setPublicScore,
    },
    ...(selectedQueue?.hasDataOfficer
      ? [
          {
            label: "Petugas Permintaan Data",
            value: dataScore,
            setValue: setDataScore,
          },
        ]
      : []),
    {
      label: "Satpam",
      value: securityScore,
      setValue: setSecurityScore,
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#fde68a_0%,transparent_55%),linear-gradient(160deg,#fefce8_0%,#f8fafc_60%)] px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        {/* Header */}
        <header className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl shadow-inner">
            ⭐
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">
            Penilaian Pengunjung
          </p>
          <h1 className="mt-3 text-3xl font-bold text-zinc-900">
            Beri nilai layanan kami
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Pilih nama pengunjung yang sudah dilayani, lalu berikan penilaian
            untuk setiap aspek pelayanan.
          </p>
        </header>

        {/* Select Queue */}
        <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Pilih Antrian
          </label>

          {queues.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
              <span className="text-4xl">📋</span>
              <p className="mt-3 text-sm font-medium text-zinc-500">
                Belum ada antrian selesai hari ini.
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Daftar akan muncul setelah pelayanan selesai.
              </p>
            </div>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-1">
              {queues.map((queue) => {
                const isSel = selectedQueueId === queue.id;
                return (
                  <button
                    key={queue.id}
                    type="button"
                    onClick={() => {
                      setSelectedQueueId(queue.id);
                      setOverallScore(null);
                      setPublicScore(null);
                      setDataScore(null);
                      setSecurityScore(null);
                      setComment("");
                      setStatus("idle");
                    }}
                    className={`flex items-center gap-4 rounded-2xl border-2 px-4 py-3 text-left transition-all duration-200 ${
                      isSel
                        ? "border-amber-400 bg-amber-50 shadow-sm ring-2 ring-amber-200"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                        isSel
                          ? "bg-amber-400 text-white"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {queue.number.split("-")[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-900">
                        {queue.visitorName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Antrian {queue.number}
                      </p>
                    </div>
                    {isSel && (
                      <span className="text-amber-500">
                        <svg
                          className="h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Officer Info */}
          {selectedQueue && (
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-600 mb-2">
                Petugas yang Melayani
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">👤</span>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Layanan Publik
                    </p>
                    <p className="text-xs font-semibold text-zinc-800">
                      {selectedQueue.publicOfficerName}
                    </p>
                  </div>
                </div>
                {selectedQueue.dataOfficerName && (
                  <div className="flex items-center gap-2">
                    <span className="text-base">📊</span>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                        Permintaan Data
                      </p>
                      <p className="text-xs font-semibold text-zinc-800">
                        {selectedQueue.dataOfficerName}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-base">🛡️</span>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Satpam
                    </p>
                    <p className="text-xs font-semibold text-zinc-800">
                      {selectedQueue.securityOfficerName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Rating Section */}
        {selectedQueue && (
          <section className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Penilaian
            </p>
            {ratingItems.map((item) => (
              <StarRating
                key={item.label}
                label={item.label}
                value={item.value}
                setValue={item.setValue}
              />
            ))}
          </section>
        )}

        {/* Comment */}
        {selectedQueue && (
          <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Catatan{" "}
              <span className="text-zinc-300 font-normal normal-case tracking-normal">
                (opsional)
              </span>
            </label>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="mt-3 min-h-[100px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              placeholder="Contoh: Pelayanannya cepat dan ramah."
            />
          </section>
        )}

        {/* Submit */}
        {selectedQueue && (
          <div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormComplete || status === "sending"}
              className={`w-full inline-flex h-14 items-center justify-center rounded-2xl text-sm font-semibold transition-all duration-200 ${
                isFormComplete && status !== "sending"
                  ? "bg-zinc-900 text-white hover:bg-zinc-800 shadow-md hover:shadow-lg"
                  : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
              }`}
            >
              {status === "sending" ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Mengirim...
                </span>
              ) : (
                "Kirim Penilaian"
              )}
            </button>

            {status === "done" && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <span className="text-xl">✅</span>
                <p className="text-sm font-medium text-emerald-700">
                  Terima kasih! Penilaian Anda sudah tersimpan.
                </p>
              </div>
            )}
            {status === "error" && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                <span className="text-xl">❌</span>
                <p className="text-sm font-medium text-rose-700">
                  Gagal menyimpan penilaian. Coba lagi nanti.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
