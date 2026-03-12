"use client";

import { useState } from "react";

export default function RatingPage() {
  const [queueId, setQueueId] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );

  const handleSubmit = async () => {
    if (!queueId || !score) {
      return;
    }
    setStatus("sending");
    const response = await fetch("/api/rating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queueId: Number(queueId), score, comment }),
    });
    setStatus(response.ok ? "done" : "error");
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
            Masukkan ID antrian dan pilih skor 1-5.
          </p>
        </header>

        <section className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm">
          <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            ID Antrian
          </label>
          <input
            type="number"
            value={queueId}
            onChange={(event) => setQueueId(event.target.value)}
            className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
            placeholder="Contoh: 12"
          />

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Skor
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScore(value)}
                  className={`h-12 w-12 rounded-full border text-sm font-semibold transition ${
                    score === value
                      ? "border-amber-500 bg-amber-100 text-amber-900"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
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
