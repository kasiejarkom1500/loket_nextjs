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

/* ── icon paths (heroicons outline) ── */
const serviceIcons = [
  "M9 2.25a.75.75 0 0 1 .75.75v.5h4.5V3a.75.75 0 0 1 1.5 0v.75h.75A2.25 2.25 0 0 1 18.75 6v12a2.25 2.25 0 0 1-2.25 2.25H7.5A2.25 2.25 0 0 1 5.25 18V6A2.25 2.25 0 0 1 7.5 3.75h.75V3A.75.75 0 0 1 9 2.25ZM7.5 5.25A.75.75 0 0 0 6.75 6v12c0 .414.336.75.75.75h9a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75h-9Zm2.25 4.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75Z",
  "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75Zm6-3.75c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v10.5c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0 1 9 19.875v-10.5Zm6-3.375c0-.621.504-1.125 1.125-1.125h2.25C18.496 4.875 19 5.379 19 6v13.875c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0 1 15 19.875V6Z",
  "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
  "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21",
];

const serviceGradients = [
  { from: "#f59e0b", to: "#ea580c" },
  { from: "#3b82f6", to: "#6366f1" },
  { from: "#10b981", to: "#059669" },
  { from: "#f43f5e", to: "#ec4899" },
  { from: "#8b5cf6", to: "#7c3aed" },
  { from: "#14b8a6", to: "#0d9488" },
];

const formFields = [
  {
    key: "visitorName" as const,
    label: "Nama",
    placeholder: "Nama lengkap Anda",
    icon: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
  },
  {
    key: "visitorPhone" as const,
    label: "Nomor Telepon",
    placeholder: "08XXXXXXXXXX",
    icon: "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z",
    hint: "Format: 0XXXXXXXXXX (10-13 digit)",
  },
  {
    key: "visitorOrigin" as const,
    label: "Asal Instansi",
    placeholder: "Nama instansi / perusahaan",
    icon: "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21",
  },
  {
    key: "visitorPurpose" as const,
    label: "Keperluan",
    placeholder: "Tujuan kunjungan Anda",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  },
];

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

export default function KioskPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [ticket, setTicket] = useState<QueueResponse["queue"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [now, setNow] = useState<Date | null>(null);
  const [form, setForm] = useState({
    visitorName: "",
    visitorPhone: "",
    visitorOrigin: "",
    visitorPurpose: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showTicket, setShowTicket] = useState(false);

  useEffect(() => {
    const loadServices = async () => {
      setServicesLoading(true);
      const response = await fetch("/api/services");
      if (!response.ok) {
        setServicesLoading(false);
        return;
      }
      const data = await response.json();
      setServices(data.services ?? []);
      setServicesLoading(false);
    };
    loadServices();
  }, []);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!ticket) return;
    setShowTicket(true);
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, [ticket]);

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

  const selectedServiceData = useMemo(() => {
    if (!selectedService) return null;
    return services.find((s) => s.id === selectedService) ?? null;
  }, [services, selectedService]);

  const handleGenerate = async () => {
    if (!selectedService) return;
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
    setShowTicket(false);
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
    setForm({ visitorName: "", visitorPhone: "", visitorOrigin: "", visitorPurpose: "" });
  };

  return (
    <>
      <style>{`
        .kiosk-page { color-scheme: light; background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 40%, #fffbeb 100%); color: #18181b; }
        @keyframes kfadeUp   { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes kscaleIn  { from { opacity:0; transform:scale(.92) }       to { opacity:1; transform:scale(1) } }
        @keyframes kticketPop{ 0%{opacity:0;transform:scale(.6) rotate(-4deg)} 60%{transform:scale(1.06) rotate(1deg)} 100%{opacity:1;transform:scale(1) rotate(0)} }
        @keyframes kshimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .k-card   { animation: kfadeUp .5s cubic-bezier(.16,1,.3,1) both }
        .k-modal  { animation: kscaleIn .3s cubic-bezier(.16,1,.3,1) both }
        .k-ticket { animation: kticketPop .5s cubic-bezier(.16,1,.3,1) both }
        .k-shimmer{ background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:kshimmer 1.5s ease-in-out infinite; border-radius:1.75rem; }
        .k-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,.15) }
        .k-card:active{ transform: scale(.98) }
        .k-gradient-text { background: linear-gradient(135deg, #f59e0b, #ea580c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .k-input:focus { border-color: #f59e0b; background: #fff; box-shadow: 0 0 0 3px rgba(245,158,11,.12) }
        .k-submit { background: linear-gradient(135deg, #f59e0b, #ea580c); }
        .k-submit:hover:not(:disabled) { box-shadow: 0 8px 24px rgba(245,158,11,.35) }
        .k-submit:disabled { background: #d4d4d8; cursor: not-allowed; }
      `}</style>

      <div className="kiosk-page" style={{ minHeight: "100vh", padding: "2rem 1rem", fontFamily: "var(--font-geist-sans), 'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>

          {/* ═══════════ HEADER ═══════════ */}
          <header
            className="no-print"
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 32,
              border: "1px solid rgba(255,255,255,.7)",
              backgroundColor: "rgba(255,255,255,.82)",
              backdropFilter: "blur(20px)",
              padding: "2.5rem",
              boxShadow: "0 8px 32px rgba(0,0,0,.06)",
            }}
          >
            {/* decorative blobs */}
            <div style={{ position: "absolute", top: -80, right: -80, width: 256, height: 256, borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,36,.25), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -64, left: -64, width: 192, height: 192, borderRadius: "50%", background: "radial-gradient(circle, rgba(147,197,253,.25), transparent 70%)", pointerEvents: "none" }} />

            <div style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
              <div style={{ maxWidth: 560 }}>
                {/* badge */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, background: "rgba(254,243,199,.8)", padding: "6px 16px", marginBottom: 16 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.25em", color: "#92400e" }}>Kiosk Pengunjung</span>
                </div>
                <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, lineHeight: 1.1, color: "#18181b", letterSpacing: "-0.02em" }}>
                  Ambil Nomor<br />
                  <span className="k-gradient-text">Antrian Anda</span>
                </h1>
                <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.6, color: "#71717a" }}>
                  Sentuh layanan yang diinginkan untuk mendapatkan nomor antrian.
                </p>
              </div>

              {/* clock */}
              <div style={{ flexShrink: 0, borderRadius: 20, border: "1px solid #f4f4f5", background: "rgba(255,255,255,.92)", padding: "20px 28px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.35em", color: "#a1a1aa" }}>Waktu Sekarang</p>
                <p style={{ marginTop: 8, fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", color: "#18181b", fontVariantNumeric: "tabular-nums" }} suppressHydrationWarning>
                  {formattedTime || "—"}
                </p>
                <p style={{ marginTop: 4, fontSize: 12, color: "#71717a" }} suppressHydrationWarning>
                  {formattedDate || "Memuat…"}
                </p>
              </div>
            </div>
          </header>

          {/* ═══════════ SERVICE CARDS ═══════════ */}
          <section className="no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {servicesLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="k-shimmer" style={{ height: 200 }} />
                ))
              : services.map((service, index) => {
                  const grad = serviceGradients[index % serviceGradients.length];
                  const iconPath = serviceIcons[index % serviceIcons.length];
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => {
                        setSelectedService(service.id);
                        setFormError(null);
                        setIsModalOpen(true);
                      }}
                      className="k-card"
                      style={{
                        animationDelay: `${index * 80}ms`,
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        minHeight: 200,
                        borderRadius: 28,
                        border: "1px solid rgba(255,255,255,.2)",
                        padding: "28px",
                        textAlign: "left",
                        color: "#fff",
                        background: service.color
                          ? service.color
                          : `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
                        boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                        cursor: "pointer",
                        transition: "transform .3s ease, box-shadow .3s ease",
                      }}
                    >
                      {/* icon */}
                      <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.2)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                        <Icon d={iconPath} size={24} stroke color="rgba(255,255,255,.9)" />
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", color: "rgba(255,255,255,.55)" }}>
                          Layanan {service.code}
                        </p>
                        <h2 style={{ marginTop: 8, fontSize: 22, fontWeight: 700, lineHeight: 1.3 }}>
                          {service.name}
                        </h2>
                      </div>
                      {/* CTA */}
                      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.65)" }}>
                        <span>Sentuh untuk memilih</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
                          <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L11.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 1 1-1.04-1.08l3.158-2.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </button>
                  );
                })}
          </section>

          {/* ═══════════ TICKET RESULT (on‑screen) ═══════════ */}
          {showTicket && ticket ? (
            <div
              className="no-print k-ticket"
              style={{
                margin: "0 auto",
                maxWidth: 420,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                borderRadius: 32,
                border: "1px solid rgba(251,191,36,.25)",
                background: "linear-gradient(180deg, #fff, #fffbeb)",
                padding: "32px",
                boxShadow: "0 12px 40px rgba(0,0,0,.08)",
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" size={28} stroke color="#d97706" />
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", color: "#d97706" }}>
                Nomor Antrian Anda
              </p>
              <p style={{ fontSize: 56, fontWeight: 900, letterSpacing: "-0.03em", color: "#18181b", lineHeight: 1 }}>
                {ticket.number}
              </p>
              {selectedServiceData ? (
                <span style={{ borderRadius: 9999, background: "#f4f4f5", padding: "4px 16px", fontSize: 13, fontWeight: 600, color: "#52525b" }}>
                  {selectedServiceData.name}
                </span>
              ) : null}
              <p style={{ fontSize: 14, color: "#71717a" }}>
                Terima kasih. Mohon menunggu panggilan.
              </p>
              <button
                type="button"
                onClick={() => { setShowTicket(false); setTicket(null); setSelectedService(null); }}
                style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, border: "1px solid #e4e4e7", background: "#fff", padding: "10px 24px", fontSize: 13, fontWeight: 700, color: "#3f3f46", cursor: "pointer", transition: "background .2s" }}
              >
                <Icon d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" size={16} stroke color="#3f3f46" />
                Ambil Antrian Baru
              </button>
            </div>
          ) : !showTicket && !servicesLoading && services.length > 0 ? (
            <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "16px 0", fontSize: 14, color: "#a1a1aa" }}>
              <Icon d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" size={18} stroke color="#d4d4d8" />
              Pilih layanan di atas untuk mencetak nomor antrian.
            </div>
          ) : null}

          {/* ═══════════ PRINT TICKET ═══════════ */}
          <section className="print-only">
            {ticket ? (
              <div style={{ margin: "0 auto", width: 320, borderRadius: 16, border: "1px solid #d4d4d8", padding: 24, textAlign: "center", color: "#18181b" }}>
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.3em", color: "#71717a" }}>Nomor Antrian</p>
                <p style={{ marginTop: 16, fontSize: 36, fontWeight: 700 }}>{ticket.number}</p>
                {selectedServiceData ? <p style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: "#3f3f46" }}>{selectedServiceData.name}</p> : null}
                <p style={{ marginTop: 12, fontSize: 13, color: "#52525b" }}>Terima kasih. Mohon menunggu panggilan.</p>
              </div>
            ) : null}
          </section>
        </div>

        {/* ═══════════ MODAL ═══════════ */}
        {isModalOpen ? (
          <div className="no-print" style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.32)", backdropFilter: "blur(4px)", padding: 16 }}>
            <div className="k-modal" style={{ width: "100%", maxWidth: 640, borderRadius: 32, border: "1px solid rgba(255,255,255,.6)", background: "#fff", boxShadow: "0 24px 64px rgba(0,0,0,.14)", overflow: "hidden" }}>

              {/* modal header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f4f4f5", padding: "20px 32px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" size={20} color="#d97706" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 17, fontWeight: 800, color: "#18181b" }}>Data Pengunjung</h2>
                    <p style={{ fontSize: 12, color: "#a1a1aa" }}>Lengkapi data sebelum mencetak nomor antrian</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#a1a1aa", transition: "background .2s" }}
                >
                  <Icon d="M6 18 18 6M6 6l12 12" size={20} stroke color="#a1a1aa" />
                </button>
              </div>

              {/* service badge */}
              {selectedServiceData ? (
                <div style={{ borderBottom: "1px solid #f4f4f5", background: "#fafafa", padding: "12px 32px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, background: "#fff", padding: "5px 14px", fontSize: 12, fontWeight: 700, color: "#52525b", boxShadow: "0 1px 3px rgba(0,0,0,.06)", border: "1px solid #f4f4f5" }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: selectedServiceData.color ?? serviceGradients[services.indexOf(selectedServiceData) % serviceGradients.length].from,
                    }} />
                    {selectedServiceData.name}
                  </span>
                </div>
              ) : null}

              {/* form fields */}
              <div style={{ padding: "24px 32px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
                  {formFields.map((field) => (
                    <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#a1a1aa" }}>
                        {field.label}
                      </label>
                      <div style={{ position: "relative" }}>
                        <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#d4d4d8" }}>
                          <Icon d={field.icon} size={16} stroke color="#d4d4d8" />
                        </div>
                        <input
                          value={form[field.key]}
                          onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          className="k-input"
                          placeholder={field.placeholder}
                          style={{
                            width: "100%",
                            borderRadius: 12,
                            border: "1px solid #e4e4e7",
                            background: "#fafafa",
                            padding: "12px 16px 12px 40px",
                            fontSize: 14,
                            color: "#18181b",
                            outline: "none",
                            transition: "border-color .2s, background .2s, box-shadow .2s",
                          }}
                        />
                      </div>
                      {field.hint ? (
                        <p style={{ fontSize: 11, color: "#a1a1aa" }}>{field.hint}</p>
                      ) : null}
                    </div>
                  ))}
                </div>

                {formError ? (
                  <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8, borderRadius: 12, background: "#fff1f2", padding: "12px 16px", fontSize: 13, color: "#e11d48" }}>
                    <Icon d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" size={18} stroke color="#e11d48" />
                    {formError}
                  </div>
                ) : null}
              </div>

              {/* modal footer */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "flex-end", borderTop: "1px solid #f4f4f5", background: "#fafafa", padding: "20px 32px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ height: 44, borderRadius: 12, border: "1px solid #e4e4e7", background: "#fff", padding: "0 24px", fontSize: 13, fontWeight: 700, color: "#52525b", cursor: "pointer", transition: "background .2s" }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!selectedService || loading}
                  className="k-submit"
                  style={{
                    height: 44,
                    borderRadius: 12,
                    border: "none",
                    padding: "0 28px",
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#fff",
                    cursor: loading ? "wait" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "box-shadow .3s",
                  }}
                >
                  {loading ? (
                    <>
                      <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle style={{ opacity: .25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path style={{ opacity: .75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Mencetak…
                    </>
                  ) : (
                    <>
                      <Icon d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m0 0a48.103 48.103 0 0 1 10.5 0m-10.5 0V5.625c0-.621.504-1.125 1.125-1.125h8.25c.621 0 1.125.504 1.125 1.125v2.009" size={16} stroke color="#fff" />
                      Submit &amp; Cetak
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
