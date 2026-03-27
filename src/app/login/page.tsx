"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"admin" | "staff">("staff");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, mode }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Login gagal");
      return;
    }

    const data = (await response.json()) as {
      counterId: number | null;
      role: "ADMIN" | "LAYANAN_PUBLIK" | "PERMINTAAN_DATA";
      mode: "admin" | "staff";
    };
    const redirect = searchParams.get("redirect");
    if (redirect) {
      router.replace(redirect);
      return;
    }
    if (data.role === "ADMIN" && data.mode === "admin") {
      router.replace("/admin/assignments");
      return;
    }
    if (data.role === "PERMINTAAN_DATA") {
      router.replace("/attendance");
      return;
    }
    if (data.counterId) {
      router.replace(`/loket/${data.counterId}`);
      return;
    }
    router.replace("/");
  };

  const handleSsoLogin = async () => {
    setError(null);
    setSsoLoading(true);
    const response = await fetch("/api/auth/sso-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, mode }),
    });
    setSsoLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Login SSO gagal");
      return;
    }

    const data = (await response.json()) as {
      counterId: number | null;
      role: "ADMIN" | "LAYANAN_PUBLIK" | "PERMINTAAN_DATA";
      mode: "admin" | "staff";
    };

    const redirect = searchParams.get("redirect");
    if (redirect) {
      router.replace(redirect);
      return;
    }
    if (data.role === "ADMIN" && data.mode === "admin") {
      router.replace("/admin/assignments");
      return;
    }
    if (data.role === "PERMINTAAN_DATA") {
      router.replace("/attendance");
      return;
    }
    if (data.counterId) {
      router.replace(`/loket/${data.counterId}`);
      return;
    }
    router.replace("/");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 14,
    border: "1px solid #e4e4e7",
    background: "#fafafa",
    padding: "14px 16px 14px 44px",
    fontSize: 14,
    color: "#18181b",
    outline: "none",
    transition: "border-color .2s, background .2s, box-shadow .2s",
  };

  const modeOption = (value: "admin" | "staff", label: string, desc: string, iconD: string) => {
    const active = mode === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => setMode(value)}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderRadius: 14,
          border: active ? "2px solid #f59e0b" : "1px solid #e4e4e7",
          background: active ? "linear-gradient(135deg, #fffbeb, #fef3c7)" : "#fafafa",
          padding: "14px 16px",
          cursor: "pointer",
          transition: "all .2s",
          textAlign: "left",
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: active ? "linear-gradient(135deg, #f59e0b, #ea580c)" : "#e4e4e7",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background .2s",
        }}>
          <Icon d={iconD} size={20} stroke color={active ? "#fff" : "#a1a1aa"} />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: active ? "#92400e" : "#3f3f46" }}>{label}</p>
          <p style={{ fontSize: 11, color: active ? "#b45309" : "#a1a1aa", marginTop: 2 }}>{desc}</p>
        </div>
      </button>
    );
  };

  return (
    <>
      <style>{`
        .login-page { color-scheme: light; background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 40%, #fffbeb 100%); color: #18181b; }
        @keyframes loginFadeIn { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        .login-card { animation: loginFadeIn .5s cubic-bezier(.16,1,.3,1) both; }
        .login-input:focus { border-color: #f59e0b !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(245,158,11,.12) !important; }
        .login-btn-primary { background: linear-gradient(135deg, #f59e0b, #ea580c); }
        .login-btn-primary:hover:not(:disabled) { box-shadow: 0 8px 24px rgba(245,158,11,.35); }
        .login-btn-primary:disabled { background: #d4d4d8; cursor: not-allowed; }
        .login-btn-sso:hover:not(:disabled) { border-color: #a1a1aa; background: #f4f4f5; }
      `}</style>

      <div className="login-page" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", fontFamily: "var(--font-geist-sans), 'Segoe UI', system-ui, sans-serif" }}>

        {/* decorative background shapes */}
        <div style={{ position: "fixed", top: -120, right: -120, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,36,.15), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "fixed", bottom: -100, left: -100, width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(147,197,253,.15), transparent 70%)", pointerEvents: "none" }} />

        <div style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: 28 }}>

          {/* ── header ── */}
          <header style={{ textAlign: "center" }}>
            {/* logo / badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, background: "rgba(254,243,199,.8)", padding: "6px 18px", marginBottom: 20 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #f59e0b, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" size={14} stroke color="#fff" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#92400e" }}>BPS Provinsi Jambi</span>
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#18181b", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Masuk ke<br />
              <span style={{ background: "linear-gradient(135deg, #f59e0b, #ea580c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Dashboard Loket
              </span>
            </h1>
            <p style={{ marginTop: 8, fontSize: 14, color: "#71717a", lineHeight: 1.5 }}>
              Silakan masuk dengan akun petugas atau admin Anda.
            </p>
          </header>

          {/* ── form card ── */}
          <form
            onSubmit={handleSubmit}
            className="login-card"
            style={{
              borderRadius: 28,
              border: "1px solid rgba(255,255,255,.7)",
              background: "rgba(255,255,255,.85)",
              backdropFilter: "blur(20px)",
              padding: "32px",
              boxShadow: "0 8px 32px rgba(0,0,0,.06)",
            }}
          >
            {/* username */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#a1a1aa", marginBottom: 8 }}>
                Username
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <Icon d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" size={18} stroke color="#d4d4d8" />
                </div>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="login-input"
                  style={inputStyle}
                  placeholder="Masukkan username"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#a1a1aa", marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <Icon d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" size={18} stroke color="#d4d4d8" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  style={{ ...inputStyle, paddingRight: 44 }}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}
                >
                  {showPassword ? (
                    <Icon d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" size={18} stroke color="#a1a1aa" />
                  ) : (
                    <Icon d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" size={18} stroke color="#a1a1aa" />
                  )}
                </button>
              </div>
            </div>

            {/* mode selector */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#a1a1aa", marginBottom: 10 }}>
                Mode Login
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                {modeOption(
                  "staff",
                  "Petugas",
                  "Login shift harian",
                  "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                )}
                {modeOption(
                  "admin",
                  "Admin",
                  "Kelola sistem",
                  "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                )}
              </div>
            </div>

            {/* error */}
            {error ? (
              <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8, borderRadius: 12, background: "#fff1f2", padding: "12px 16px", fontSize: 13, color: "#e11d48" }}>
                <Icon d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" size={18} stroke color="#e11d48" />
                {error}
              </div>
            ) : null}

            {/* login button */}
            <button
              type="submit"
              disabled={loading}
              className="login-btn-primary"
              style={{
                width: "100%",
                height: 48,
                borderRadius: 14,
                border: "none",
                fontSize: 14,
                fontWeight: 800,
                color: "#fff",
                cursor: loading ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
                  Memproses…
                </>
              ) : (
                <>
                  <Icon d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" size={18} stroke color="#fff" />
                  Masuk
                </>
              )}
            </button>

            {/* divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "20px 0" }}>
              <div style={{ flex: 1, height: 1, background: "#e4e4e7" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.15em" }}>atau</span>
              <div style={{ flex: 1, height: 1, background: "#e4e4e7" }} />
            </div>

            {/* SSO button */}
            <button
              type="button"
              onClick={handleSsoLogin}
              disabled={ssoLoading}
              className="login-btn-sso"
              style={{
                width: "100%",
                height: 48,
                borderRadius: 14,
                border: "1px solid #e4e4e7",
                background: "#fff",
                fontSize: 14,
                fontWeight: 700,
                color: "#3f3f46",
                cursor: ssoLoading ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all .2s",
              }}
            >
              {ssoLoading ? (
                <>
                  <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: .25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: .75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Menghubungkan SSO…
                </>
              ) : (
                <>
                  <Icon d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" size={18} stroke color="#71717a" />
                  Login SSO SICAKEP
                </>
              )}
            </button>
          </form>

          {/* footer */}
          <p style={{ textAlign: "center", fontSize: 12, color: "#a1a1aa" }}>
            © 2026 BPS Provinsi Jambi — Sistem Antrian
          </p>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
