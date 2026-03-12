"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_60%),linear-gradient(120deg,#fff7ed,#f8fafc)] px-6 py-12">
      <div className="mx-auto flex max-w-md flex-col gap-8">
        <header className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Login Loket
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-zinc-900">
            Masuk ke Dashboard Loket
          </h1>
        </header>

      <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-sm"
        >
          <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Username
          </label>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
            placeholder="Masukkan username"
            autoComplete="username"
          />

          <label className="mt-6 block text-xs uppercase tracking-[0.2em] text-zinc-500">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-amber-500"
            placeholder="Masukkan password"
            autoComplete="current-password"
          />

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Mode Login
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  name="mode"
                  value="staff"
                  checked={mode === "staff"}
                  onChange={() => setMode("staff")}
                />
                Petugas (Shift)
              </label>
              <label className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  name="mode"
                  value="admin"
                  checked={mode === "admin"}
                  onChange={() => setMode("admin")}
                />
                Admin
              </label>
            </div>
          </div>

          {error ? (
            <p className="mt-4 text-sm text-rose-600">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>

          <button
            type="button"
            onClick={handleSsoLogin}
            disabled={ssoLoading}
            className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-full border border-zinc-300 bg-white px-8 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            {ssoLoading ? "Menghubungkan SSO..." : "Login SSO SICAKEP"}
          </button>
        </form>
      </div>
    </div>
  );
}
