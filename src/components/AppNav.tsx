"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Profile = {
  nama: string;
  username: string;
  role: "ADMIN" | "LAYANAN_PUBLIK" | "PERMINTAAN_DATA";
  counterId?: number | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/assignments", label: "Penugasan", icon: "📋" },
  { href: "/admin/services", label: "Layanan", icon: "🔧" },
  { href: "/admin/users", label: "User", icon: "👥" },
  { href: "/admin/security-officers", label: "Satpam", icon: "🛡️" },
  { href: "/admin/visitors", label: "Pengunjung", icon: "👤" },
  { href: "/admin/rating-recap", label: "Rekap Rating", icon: "⭐" },
  { href: "/admin/attendance-recap", label: "Rekap Presensi", icon: "📊" },
  { href: "/online-requests", label: "Permintaan Online", icon: "💬" },
  { href: "/profile", label: "Akun", icon: "👤" },
];

const DATA_OFFICER_NAV: NavItem[] = [
  { href: "/attendance", label: "Presensi", icon: "📅" },
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

const ROLE_GRADIENT: Record<string, string> = {
  ADMIN: "from-blue-500 to-indigo-600",
  LAYANAN_PUBLIK: "from-amber-500 to-orange-600",
  PERMINTAAN_DATA: "from-emerald-500 to-teal-600",
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  LAYANAN_PUBLIK: "Layanan Publik",
  PERMINTAAN_DATA: "Permintaan Data",
};

function AppNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      // API /auth/me returns { user: { ... } } and counterId at root level for staff
      setProfile({
        ...(data.user ?? {}),
        counterId: data.counterId ?? data.user?.counterId ?? null,
      });
    };
    load();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  if (!profile) return null;

  const gradient = ROLE_GRADIENT[profile.role] ?? "from-zinc-500 to-zinc-700";
  const roleLabel = ROLE_LABEL[profile.role] ?? profile.role;

  // Build nav items based on role
  let navItems: NavItem[];
  if (profile.role === "ADMIN") {
    navItems = ADMIN_NAV;
  } else if (profile.role === "LAYANAN_PUBLIK") {
    const cid = profile.counterId;
    navItems = [
      {
        href: cid ? `/loket/${cid}` : "/loket",
        label: "Antrian",
        icon: "🎫",
      },
      {
        href: cid ? `/loket/${cid}?tab=attendance` : "/loket?tab=attendance",
        label: "Presensi",
        icon: "📅",
      },
      {
        href: "/online-requests",
        label: "Permintaan Online",
        icon: "💬",
      },
      {
        href: "/profile",
        label: "Akun",
        icon: "👤",
      },
    ];
  } else {
    navItems = DATA_OFFICER_NAV;
  }

  const isAdminRole = profile.role === "ADMIN";

  return (
    <nav className="flex flex-col gap-2">
      {/* Main bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
        {/* Left side */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Home */}
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900"
            title="Beranda"
          >
            <span>🏠</span>
            <span className="hidden sm:inline">Beranda</span>
          </Link>

          {/* Role badge */}
          <div className={`hidden sm:flex items-center gap-1.5 rounded-xl bg-gradient-to-r ${gradient} px-3 py-2`}>
            <span className="text-xs font-bold text-white">{roleLabel}</span>
          </div>
        </div>

        {/* Right: profile + logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
            <div
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-xs font-bold text-white`}
            >
              {getInitials(profile.nama)}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold leading-tight text-zinc-900">
                {profile.nama}
              </p>
              <p className="text-[10px] leading-tight text-zinc-400">
                {roleLabel}
              </p>
            </div>
          </div>

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

      {/* Nav links bar (always shown) */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
        {navItems.map((item) => {
          let isActive: boolean;
          if (isAdminRole) {
            isActive = !!pathname?.startsWith(item.href);
          } else if (item.href.includes("?tab=")) {
            // Match by tab param
            const tabValue = new URL(item.href, "http://x").searchParams.get("tab");
            isActive = !!pathname?.startsWith(item.href.split("?")[0]) && searchParams.get("tab") === tabValue;
          } else {
            // Default link (no ?tab=) is active when there's no tab param set
            const basePath = item.href.split("?")[0];
            isActive = !!pathname?.startsWith(basePath) && !searchParams.get("tab");
          }
          return (
            <a
              key={item.href}
              href={item.href}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition ${
                isActive
                  ? `bg-gradient-to-r ${gradient} text-white shadow-sm`
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

export default function AppNav() {
  return (
    <Suspense fallback={null}>
      <AppNavInner />
    </Suspense>
  );
}
