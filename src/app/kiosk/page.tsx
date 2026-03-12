"use client";

import { useEffect, useMemo, useState } from "react";

type Service = {
  id: number;
  code: string;
  name: string;
  color: string | null;
};

type QueueResponse = {
  queue: {
    id: number;
    number: string;
    serviceId: number;
  };
};

export default function KioskPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [ticket, setTicket] = useState<QueueResponse["queue"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [form, setForm] = useState({
    visitorName: "",
    visitorPhone: "",
    visitorOrigin: "",
    visitorPurpose: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!ticket) {
      return;
    }
    const timer = setTimeout(() => window.print(), 150);
    return () => clearTimeout(timer);
  }, [ticket]);

  const formattedDate = useMemo(() => {
    if (!now) {
      return "";
    }
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(now);
  }, [now]);

  const serviceColors = [
    "from-amber-500/95 to-orange-400/95 text-white",
    "from-blue-600/95 to-indigo-500/95 text-white",
    "from-emerald-600/95 to-green-500/95 text-white",
    "from-rose-500/95 to-pink-500/95 text-white",
  ];

  const selectedServiceName = useMemo(() => {
    if (!selectedService) {
      return null;
    }
    return services.find((service) => service.id === selectedService)?.name ?? null;
  }, [services, selectedService]);

  const handleGenerate = async () => {
    if (!selectedService) {
      return;
    }
    setFormError(null);
    if (
      !form.visitorName.trim() ||
      !form.visitorPhone.trim() ||
      !form.visitorOrigin.trim() ||
      !form.visitorPurpose.trim()
    ) {
      setFormError("Semua data pengunjung wajib diisi.");
      return;
    }
    if (!/^\d{10,13}$/.test(form.visitorPhone.trim())) {
      setFormError("Nomor telepon harus 10-13 digit.");
      return;
    }
    setLoading(true);
    setTicket(null);
    const response = await fetch("/api/queue/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: selectedService,
        visitorName: form.visitorName,
        visitorPhone: form.visitorPhone,
        visitorOrigin: form.visitorOrigin,
        visitorPurpose: form.visitorPurpose,
      }),
    });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setFormError(data.error ?? "Gagal mencetak nomor.");
      return;
    }
    const data: QueueResponse = await response.json();
    setTicket(data.queue);
    setIsModalOpen(false);
    setForm({
      visitorName: "",
      visitorPhone: "",
      visitorOrigin: "",
      visitorPurpose: "",
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_60%),linear-gradient(120deg,#fff7ed,#f8fafc)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="no-print rounded-3xl border border-white/70 bg-white/75 p-8 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Kiosk Pengunjung
              </p>
              <h1 className="mt-3 text-4xl font-semibold text-zinc-900 sm:text-5xl">
                Ambil nomor antrian Anda
              </h1>
              <p className="mt-3 max-w-2xl text-base text-zinc-600">
                Sentuh layanan yang diinginkan untuk mendapatkan nomor antrian.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white/90 px-6 py-4 text-right shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Waktu Sekarang
              </p>
              <p
                className="mt-2 text-lg font-semibold text-zinc-900"
                suppressHydrationWarning
              >
                {formattedDate || "Memuat waktu..."}
              </p>
            </div>
          </div>
        </header>

        <section className="no-print grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service, index) => {
            const fallbackColor = serviceColors[index % serviceColors.length];
            const colorClass = service.color
              ? "text-white"
              : `bg-gradient-to-br ${fallbackColor}`;
            return (
            <button
              key={service.id}
              type="button"
              onClick={() => {
                setSelectedService(service.id);
                setFormError(null);
                setIsModalOpen(true);
              }}
              className={`group relative min-h-[180px] rounded-3xl border border-white/70 px-8 py-8 text-left shadow-lg transition hover:-translate-y-1 ${colorClass} ${
                selectedService === service.id ? "ring-4 ring-amber-200" : ""
              }`}
              style={service.color ? { backgroundColor: service.color } : undefined}
            >
              <div className="flex h-full flex-col justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/80">
                    Layanan {service.code}
                  </p>
                  <h2 className="mt-4 text-2xl font-semibold">
                    {service.name}
                  </h2>
                </div>
                <p className="text-sm font-medium text-white/80">
                  Tekan pada area kotak ini
                </p>
              </div>
            </button>
          );
          })}
        </section>

        <div className="no-print flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {ticket ? (
            <div className="rounded-2xl border border-amber-200 bg-white/95 px-8 py-4 text-zinc-900 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-amber-600">
                Nomor Antrian
              </p>
              <p className="mt-2 text-3xl font-semibold">{ticket.number}</p>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Pilih layanan untuk mencetak nomor.
            </p>
          )}
        </div>

        <section className="print-only">
          {ticket ? (
            <div className="mx-auto w-[320px] rounded-2xl border border-zinc-300 px-6 py-6 text-center text-zinc-900">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Nomor Antrian
              </p>
              <p className="mt-4 text-4xl font-semibold">{ticket.number}</p>
              {selectedServiceName ? (
                <p className="mt-2 text-sm font-semibold text-zinc-700">
                  {selectedServiceName}
                </p>
              ) : null}
              <p className="mt-3 text-sm text-zinc-600">
                Terima kasih. Mohon menunggu panggilan.
              </p>
            </div>
          ) : null}
        </section>
      </div>

      {isModalOpen ? (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-2xl rounded-3xl border border-white/70 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-8 py-5">
              <h2 className="text-lg font-semibold text-zinc-900">
                Data Pengunjung
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-sm font-semibold text-zinc-500 hover:text-zinc-800"
              >
                Tutup
              </button>
            </div>
            <div className="px-8 py-6">
              <p className="text-sm text-zinc-600">
                Lengkapi data sebelum mencetak nomor antrian.
              </p>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Nama
                  </label>
                  <input
                    value={form.visitorName}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        visitorName: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
                    placeholder="Nama Anda"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Nomor Telepon
                  </label>
                  <input
                    value={form.visitorPhone}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        visitorPhone: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
                    placeholder="Nomor Telepon"
                  />
                  <p className="text-xs text-zinc-500">
                    Format: 0XXXXXXXXXX (10-13 digits)
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Asal
                  </label>
                  <input
                    value={form.visitorOrigin}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        visitorOrigin: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
                    placeholder="Asal Instansi"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Keperluan
                  </label>
                  <input
                    value={form.visitorPurpose}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        visitorPurpose: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
                    placeholder="Keperluan"
                  />
                </div>
              </div>
              {formError ? (
                <p className="mt-4 text-sm text-rose-600">{formError}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50 px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 bg-white px-8 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!selectedService || loading}
                className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-10 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {loading ? "Mencetak..." : "Submit & Cetak"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
