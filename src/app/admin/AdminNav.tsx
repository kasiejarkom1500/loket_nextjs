"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin/assignments", label: "Penugasan", icon: "📋" },
  { href: "/admin/services", label: "Layanan", icon: "🔧" },
  { href: "/admin/users", label: "User", icon: "👥" },
  { href: "/admin/security-officers", label: "Satpam", icon: "🛡️" },
  { href: "/admin/visitors", label: "Pengunjung", icon: "👤" },
  { href: "/admin/rating-recap", label: "Rekap Rating", icon: "⭐" },
  { href: "/admin/attendance-recap", label: "Rekap Presensi", icon: "📊" },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: "WA" },
  { href: "/online-requests", label: "Permintaan Online", icon: "💬" },
  { href: "/profile", label: "Akun", icon: "👤" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminNav() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<{
    nama: string;
    username: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setProfile(data.user ?? null);
    };
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <nav className="flex flex-col gap-3">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
        {/* Logo + Home */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900"
          >
            <span>🏠</span>
            <span className="hidden sm:inline">Beranda</span>
          </Link>

          <div className="h-5 w-px bg-zinc-200" />

          <div className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-3 py-2">
            <span className="text-sm">⚙️</span>
            <span className="text-xs font-bold text-white">Admin Panel</span>
          </div>
        </div>

        {/* Profile + Logout */}
        <div className="flex items-center gap-3">
          {profile && (
            <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                {getInitials(profile.nama)}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold leading-tight text-zinc-900">
                  {profile.nama}
                </p>
                <p className="text-[10px] leading-tight text-zinc-400">
                  Administrator
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
              />
            </svg>
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>

      {/* Navigation links */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition ${
                isActive
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
