"use client";

import { useEffect, useMemo, useState } from "react";

type WhatsAppStatus = {
  status: "idle" | "connecting" | "qr" | "connected" | "disconnected";
  qrDataUrl: string | null;
  phone: string | null;
  lastError: string | null;
  updatedAt: string;
  messages: {
    id: string;
    from: string;
    name: string;
    text: string;
    timestamp: string;
    direction: "in" | "out";
  }[];
};

const statusLabels: Record<WhatsAppStatus["status"], string> = {
  idle: "Belum login",
  connecting: "Menghubungkan",
  qr: "Menunggu scan QR",
  connected: "Terhubung",
  disconnected: "Terputus",
};

function displayChatTarget(value: string) {
  return value.replace("@s.whatsapp.net", "");
}

export default function WhatsAppAdminPage() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sendState, setSendState] = useState<string | null>(null);

  const loadStatus = async () => {
    const response = await fetch("/api/admin/whatsapp/status", {
      cache: "no-store",
    });
    if (!response.ok) {
      setLoading(false);
      return;
    }
    const data = await response.json();
    setStatus(data);
    setLoading(false);
  };

  useEffect(() => {
    const initialLoad = setTimeout(() => void loadStatus(), 0);
    const timer = setInterval(() => void loadStatus(), 2500);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(timer);
    };
  }, []);

  const badgeClass = useMemo(() => {
    if (!status) return "bg-zinc-100 text-zinc-600";
    if (status.status === "connected") return "bg-emerald-50 text-emerald-700";
    if (status.status === "qr" || status.status === "connecting") {
      return "bg-amber-50 text-amber-700";
    }
    return "bg-rose-50 text-rose-700";
  }, [status]);

  const handleSend = async () => {
    setSendState(null);
    const response = await fetch("/api/admin/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSendState(data.error ?? "Gagal mengirim pesan.");
      return;
    }
    setSendState("Pesan terkirim.");
    setMessage("");
  };

  const handleLogout = async (clearSession: boolean) => {
    await fetch("/api/admin/whatsapp/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearSession }),
    });
    await loadStatus();
  };

  return (
    <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
              Pengaturan WhatsApp
            </p>
            <h1 className="mt-2 text-2xl font-bold text-zinc-950">
              Login perangkat tertaut
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Scan QR ini dari WhatsApp di HP pengelola melalui menu Perangkat
              Tertaut. Sesi tersimpan di server selama folder auth tidak
              dihapus dan akun tidak di-logout dari HP.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeClass}`}>
            {status ? statusLabels[status.status] : "Memuat"}
          </span>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[320px_minmax(0,1fr)]">
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            {loading ? (
              <p className="text-sm font-semibold text-zinc-400">Memuat QR...</p>
            ) : status?.qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={status.qrDataUrl}
                alt="QR login WhatsApp"
                className="h-[280px] w-[280px] rounded-xl bg-white"
              />
            ) : status?.status === "connected" ? (
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-black text-emerald-700">
                  WA
                </div>
                <p className="mt-4 text-sm font-bold text-zinc-900">
                  WhatsApp terhubung
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Nomor: {status.phone ?? "-"}
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-600">
                  QR belum tersedia.
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Tunggu beberapa detik atau muat ulang halaman.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                Status koneksi
              </p>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Status</dt>
                  <dd className="font-semibold text-zinc-900">
                    {status ? statusLabels[status.status] : "-"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Nomor login</dt>
                  <dd className="font-mono text-xs font-semibold text-zinc-900">
                    {status?.phone ?? "-"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Update</dt>
                  <dd className="text-xs text-zinc-500">
                    {status?.updatedAt
                      ? new Date(status.updatedAt).toLocaleString("id-ID")
                      : "-"}
                  </dd>
                </div>
              </dl>
              {status?.lastError ? (
                <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {status.lastError}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadStatus()}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 shadow-sm hover:border-zinc-300"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => void handleLogout(false)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 shadow-sm hover:border-zinc-300"
              >
                Logout
              </button>
              <button
                type="button"
                onClick={() => void handleLogout(true)}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 shadow-sm hover:bg-rose-100"
              >
                Hapus Sesi
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside className="flex flex-col gap-6">
        <section className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-zinc-950">Uji kirim pesan</h2>
          <div className="mt-4 flex flex-col gap-3">
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="08xxxxxxxxxx"
              className="h-11 rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-blue-400"
            />
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tulis pesan..."
              rows={4}
              className="rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={status?.status !== "connected"}
              className="h-11 rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              Kirim
            </button>
            {sendState ? (
              <p className="rounded-xl bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">
                {sendState}
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-zinc-950">Pesan masuk terbaru</h2>
          <div className="mt-4 flex max-h-[360px] flex-col gap-3 overflow-auto">
            {status?.messages?.length ? (
              status.messages.map((item, index) => (
                <div
                  key={`${item.direction}-${item.from}-${item.id}-${index}`}
                  className="rounded-xl border border-zinc-200 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-xs font-bold text-zinc-900">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {new Date(item.timestamp).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-zinc-400">
                    {displayChatTarget(item.from)}
                  </p>
                  <p className="mt-2 text-sm leading-5 text-zinc-700">{item.text}</p>
                </div>
              ))
            ) : (
              <p className="rounded-xl bg-zinc-50 px-3 py-4 text-center text-xs text-zinc-400">
                Belum ada pesan masuk selama server ini aktif.
              </p>
            )}
          </div>
        </section>
      </aside>
    </main>
  );
}
