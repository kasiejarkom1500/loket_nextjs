"use client";

import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin/assignments", label: "Penugasan" },
  { href: "/admin/users", label: "User" },
];

export default function AdminNav() {
  const pathname = usePathname();

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
      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
      >
        Logout
      </button>
    </div>
  );
}
