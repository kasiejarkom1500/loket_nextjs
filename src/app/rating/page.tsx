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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fde68a,transparent_55%),linear-gradient(120deg,#fef9c3,#f8fafc)] px-6 py-12">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <header>
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Penilaian Pengunjung
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-zinc-900">
            Beri nilai layanan kami
          </h1>
          <p className="mt-3 text-sm text-zinc-600">
            Pilih nama pengunjung yang sudah dilayani lalu beri skor 1-5.
          </p>
        </header>

        <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
          <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Pilih Antrian
          </label>
          <select
            value={selectedQueueId ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedQueueId(value ? Number(value) : null);
            }}
            className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
          >
            <option value="">Pilih pengunjung yang sudah dilayani</option>
            {queues.map((queue) => (
              <option key={queue.id} value={queue.id}>
                {queue.number} - {queue.visitorName}
              </option>
            ))}
          </select>

          {queues.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              Belum ada antrian selesai hari ini.
            </p>
          ) : null}

          {selectedQueue ? (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white/90 px-4 py-3 text-sm text-zinc-700">
              <p>
                Petugas Layanan Publik:{" "}
                <span className="font-semibold text-zinc-900">
                  {selectedQueue.publicOfficerName}
                </span>
              </p>
              {selectedQueue.dataOfficerName ? (
                <p>
                  Petugas Permintaan Data:{" "}
                  <span className="font-semibold text-zinc-900">
                    {selectedQueue.dataOfficerName}
                  </span>
                </p>
              ) : null}
              <p>
                Satpam:{" "}
                <span className="font-semibold text-zinc-900">
                  {selectedQueue.securityOfficerName}
                </span>
              </p>
            </div>
          ) : null}

          <div className="mt-6 space-y-6">
            {[
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
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {item.label}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={`${item.label}-${value}`}
                      type="button"
                      onClick={() => item.setValue(value)}
                      className={`h-12 w-12 rounded-full border text-sm font-semibold transition ${
                        item.value === value
                          ? "border-amber-500 bg-amber-100 text-amber-900"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Catatan (opsional)
            </label>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="mt-3 min-h-[120px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
              placeholder="Contoh: Pelayanannya cepat dan ramah."
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === "sending"}
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {status === "sending" ? "Mengirim..." : "Kirim Penilaian"}
          </button>

          {status === "done" ? (
            <p className="mt-4 text-sm text-emerald-600">
              Terima kasih! Penilaian Anda sudah tersimpan.
            </p>
          ) : null}
          {status === "error" ? (
            <p className="mt-4 text-sm text-rose-600">
              Gagal menyimpan penilaian. Coba lagi nanti.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
