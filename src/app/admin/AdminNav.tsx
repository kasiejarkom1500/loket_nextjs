"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin/assignments", label: "Penugasan" },
  { href: "/admin/services", label: "Layanan" },
  { href: "/admin/users", label: "User" },
  { href: "/admin/security-officers", label: "Satpam" },
  { href: "/admin/visitors", label: "Pengunjung" },
  { href: "/admin/rating-recap", label: "Rekap Rating" },
];

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
    <div className="flex flex-col gap-3 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`inline-flex h-10 items-center justify-center rounded-full px-5 text-xs font-semibold transition ${
                isActive
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
              }`}
            >
              {item.label}
            </a>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {profile ? (
          <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-4 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
              {profile.nama
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-zinc-900">
                {profile.nama}
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                {profile.role.replace("_", " ")}
              </p>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
