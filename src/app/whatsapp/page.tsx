"use client";

import { useEffect, useMemo, useState } from "react";
import AppNav from "@/components/AppNav";

type ChatMessage = {
  id: string;
  from: string;
  name: string;
  text: string;
  timestamp: string;
  direction: "in" | "out";
  kind: "text" | "image";
  mediaUrl: string | null;
  mimeType: string | null;
  fileName: string | null;
};

type ChatStatus = {
  status: "idle" | "connecting" | "qr" | "connected" | "disconnected";
  phone: string | null;
  lastError: string | null;
  updatedAt: string;
  messages: ChatMessage[];
};

const statusLabel: Record<ChatStatus["status"], string> = {
  idle: "Belum login",
  connecting: "Menghubungkan",
  qr: "Menunggu scan admin",
  connected: "Terhubung",
  disconnected: "Terputus",
};

function displayChatTarget(value: string) {
  return value.replace("@s.whatsapp.net", "");
}

function formatMessageSummary(message: ChatMessage) {
  if (message.kind === "image") {
    return message.text && message.text !== "[Gambar]"
      ? `📷 ${message.text}`
      : "📷 Gambar";
  }
  return message.direction === "out" ? `Anda: ${message.text}` : message.text;
}

export default function WhatsAppChatPage() {
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [targetPhone, setTargetPhone] = useState("");
  const [draft, setDraft] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const loadStatus = async () => {
    const response = await fetch("/api/whatsapp/status", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setStatus(data);
  };

  useEffect(() => {
    const initialLoad = setTimeout(() => void loadStatus(), 0);
    const timer = setInterval(() => void loadStatus(), 2500);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(timer);
    };
  }, []);

  const conversations = useMemo(() => {
    const map = new Map<string, ChatMessage[]>();
    for (const message of status?.messages ?? []) {
      const current = map.get(message.from) ?? [];
      current.push(message);
      map.set(message.from, current);
    }
    return Array.from(map.entries()).map(([phone, messages]) => ({
      phone,
      name: messages.find((item) => item.name && item.name !== "Petugas")?.name ?? phone,
      lastMessage: messages[0],
    }));
  }, [status?.messages]);

  const typedPhone = targetPhone.trim();
  const activePhone = selectedPhone ?? typedPhone ?? conversations[0]?.phone ?? null;
  const activeConversation = conversations.find((item) => item.phone === activePhone);
  const isNewConversation = Boolean(activePhone && !activeConversation);

  const selectedMessages = useMemo(() => {
    return (status?.messages ?? [])
      .filter((item) => item.from === activePhone)
      .slice()
      .reverse();
  }, [activePhone, status?.messages]);

  const handleSend = async () => {
    if (!activePhone || (!draft.trim() && !imageFile)) {
      return;
    }
    setInfo(null);
    const hasImage = Boolean(imageFile);
    const body = hasImage ? new FormData() : null;
    if (body) {
      body.append("phone", activePhone);
      body.append("message", draft.trim());
      body.append("image", imageFile as File);
    }
    const response = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: hasImage ? undefined : { "Content-Type": "application/json" },
      body: hasImage
        ? body
        : JSON.stringify({ phone: activePhone, message: draft.trim() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setInfo(data.error ?? "Gagal mengirim balasan.");
      return;
    }
    setDraft("");
    setImageFile(null);
    setInfo("Balasan terkirim.");
    setSelectedPhone(activePhone);
    setTargetPhone(activePhone);
    await loadStatus();
  };

  const connected = status?.status === "connected";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_60%),linear-gradient(120deg,#fff7ed,#f8fafc)] px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <AppNav />

        <main className="grid min-h-[640px] overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-sm lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b border-zinc-200 bg-zinc-50/70 lg:border-b-0 lg:border-r">
            <div className="border-b border-zinc-200 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
                WhatsApp
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <h1 className="text-xl font-bold text-zinc-950">Chat masuk</h1>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    connected
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {status ? statusLabel[status.status] : "Memuat"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Login nomor WhatsApp dilakukan admin di halaman Pengaturan
                WhatsApp. Petugas bisa membalas setelah status terhubung.
              </p>
              <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
                <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Nomor tujuan
                </label>
                <input
                  value={targetPhone}
                  onChange={(event) => {
                    setTargetPhone(event.target.value);
                    setSelectedPhone(null);
                  }}
                  placeholder="08xxxxxxxxxx"
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-blue-400"
                />
                <p className="mt-2 text-[11px] leading-5 text-zinc-400">
                  Isi nomor untuk mulai chat baru atau pilih percakapan yang sudah ada.
                </p>
              </div>
            </div>

            <div className="max-h-[520px] overflow-auto p-3">
              {conversations.length ? (
                conversations.map((conversation) => (
                  <button
                    key={conversation.phone}
                    type="button"
                    onClick={() => {
                      setSelectedPhone(conversation.phone);
                      setTargetPhone(conversation.phone);
                    }}
                    className={`mb-2 w-full rounded-xl border p-3 text-left transition ${
                      activePhone === conversation.phone
                        ? "border-blue-200 bg-blue-50"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-bold text-zinc-900">
                        {conversation.name}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {new Date(
                          conversation.lastMessage.timestamp,
                        ).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-zinc-400">
                      {displayChatTarget(conversation.phone)}
                    </p>
                    <p className="mt-2 truncate text-xs text-zinc-500">
                      {formatMessageSummary(conversation.lastMessage)}
                    </p>
                  </button>
                ))
              ) : (
                <p className="rounded-xl bg-white px-3 py-6 text-center text-xs text-zinc-400">
                  Belum ada pesan masuk selama server ini aktif.
                </p>
              )}
            </div>
          </aside>

          <section className="flex min-h-[640px] flex-col">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4">
              <div>
                <p className="text-sm font-bold text-zinc-950">
                  {activePhone
                    ? displayChatTarget(activePhone)
                    : "Pilih percakapan"}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Nomor login: {status?.phone ?? "-"}
                </p>
                {isNewConversation ? (
                  <p className="mt-1 text-xs font-semibold text-amber-600">
                    Percakapan baru
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void loadStatus()}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-zinc-300"
              >
                Refresh
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-white px-5 py-5">
              {selectedMessages.length ? (
                <div className="flex flex-col gap-3">
                  {selectedMessages.map((message, index) => (
                    <div
                      key={`${message.direction}-${message.from}-${message.id}-${index}`}
                      className={`flex ${
                        message.direction === "out" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                          message.direction === "out"
                            ? "bg-zinc-950 text-white"
                            : "border border-zinc-200 bg-zinc-50 text-zinc-800"
                        }`}
                      >
                        {message.kind === "image" && message.mediaUrl ? (
                          <a
                            href={message.mediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={message.mediaUrl}
                              alt={message.text || "Gambar WhatsApp"}
                              className="max-h-72 w-full rounded-xl object-cover"
                            />
                          </a>
                        ) : null}
                        <p className={message.kind === "image" ? "mt-2" : ""}>
                          {message.text}
                        </p>
                        <p
                          className={`mt-1 text-[10px] ${
                            message.direction === "out"
                              ? "text-zinc-300"
                              : "text-zinc-400"
                          }`}
                        >
                          {new Date(message.timestamp).toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-center">
                  <div className="max-w-sm text-sm leading-6 text-zinc-400">
                    {isNewConversation ? (
                      <p>
                        Belum ada riwayat untuk nomor ini. Kirim pesan pertama
                        dari bawah untuk memulai percakapan.
                      </p>
                    ) : (
                      <p>
                        Pilih percakapan di sisi kiri untuk membaca dan
                        membalas pesan WhatsApp.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-200 bg-zinc-50 p-4">
              {info ? (
                <p className="mb-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-zinc-600">
                  {info}
                </p>
              ) : null}
              {imageFile ? (
                <div className="mb-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-semibold">{imageFile.name}</p>
                    <button
                      type="button"
                      onClick={() => setImageFile(null)}
                      className="text-zinc-400 hover:text-zinc-700"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="flex gap-3">
                <label className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-xs font-bold text-zinc-600 hover:border-zinc-300">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                  Gambar
                </label>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={
                    connected
                      ? imageFile
                        ? "Tambahkan caption..."
                        : "Tulis balasan..."
                      : "WhatsApp belum terhubung. Hubungi admin untuk scan QR."
                  }
                  rows={2}
                  disabled={!connected || !activePhone}
                  className="min-h-12 flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!connected || !activePhone || (!draft.trim() && !imageFile)}
                  className="h-12 rounded-xl bg-zinc-950 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {isNewConversation ? "Kirim awal" : "Kirim"}
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
