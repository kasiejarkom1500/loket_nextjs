"use client";

import { useEffect, useState } from "react";

type Profile = {
  nama: string;
  username: string;
  role: "ADMIN" | "LAYANAN_PUBLIK" | "PERMINTAAN_DATA";
  counterId?: number | null;
};

type MenuItem = {
  icon: string;
  title: string;
  desc: string;
  href: string;
  color: string;
  accent: string;
};

/* ──────────────────── PUBLIC MENU (tanpa login) ──────────────────── */

const PUBLIC_MENU: MenuItem[] = [
  {
    icon: "🔐",
    title: "Login Petugas",
    desc: "Masuk sebagai petugas atau admin untuk mengelola antrian.",
    href: "/login",
    color: "from-amber-500 to-orange-600",
    accent: "bg-amber-50 border-amber-200 hover:border-amber-300",
  },
  {
    icon: "🎫",
    title: "Kiosk Antrian",
    desc: "Ambil nomor antrian sesuai layanan yang dibutuhkan.",
    href: "/kiosk",
    color: "from-emerald-500 to-teal-600",
    accent: "bg-emerald-50 border-emerald-200 hover:border-emerald-300",
  },
  {
    icon: "⭐",
    title: "Penilaian Pengunjung",
    desc: "Berikan penilaian terhadap layanan yang telah diterima.",
    href: "/rating",
    color: "from-yellow-500 to-amber-600",
    accent: "bg-yellow-50 border-yellow-200 hover:border-yellow-300",
  },
  {
    icon: "📺",
    title: "Tampilan TV Antrian",
    desc: "Layar display realtime untuk antrian yang sedang dipanggil.",
    href: "/display",
    color: "from-blue-500 to-indigo-600",
    accent: "bg-blue-50 border-blue-200 hover:border-blue-300",
  },
];

/* ──────────────────── ROLE-BASED MENUS (setelah login) ──────────────────── */

const ADMIN_MENU: MenuItem[] = [
  {
    icon: "📋",
    title: "Penugasan",
    desc: "Atur penugasan petugas per shift dan loket.",
    href: "/admin/assignments",
    color: "from-blue-500 to-indigo-600",
    accent: "bg-blue-50 border-blue-200 hover:border-blue-300",
  },
  {
    icon: "🔧",
    title: "Layanan",
    desc: "Kelola jenis layanan yang tersedia di loket.",
    href: "/admin/services",
    color: "from-violet-500 to-purple-600",
    accent: "bg-violet-50 border-violet-200 hover:border-violet-300",
  },
  {
    icon: "👥",
    title: "User",
    desc: "Tambah, edit, atau hapus akun petugas.",
    href: "/admin/users",
    color: "from-amber-500 to-orange-600",
    accent: "bg-amber-50 border-amber-200 hover:border-amber-300",
  },
  {
    icon: "🛡️",
    title: "Satpam",
    desc: "Kelola daftar petugas keamanan harian.",
    href: "/admin/security-officers",
    color: "from-slate-500 to-zinc-600",
    accent: "bg-slate-50 border-slate-200 hover:border-slate-300",
  },
  {
    icon: "👤",
    title: "Data Pengunjung",
    desc: "Lihat riwayat pengunjung yang pernah dilayani.",
    href: "/admin/visitors",
    color: "from-teal-500 to-emerald-600",
    accent: "bg-teal-50 border-teal-200 hover:border-teal-300",
  },
  {
    icon: "⭐",
    title: "Rekap Rating",
    desc: "Lihat rekap penilaian layanan dari pengunjung.",
    href: "/admin/rating-recap",
    color: "from-yellow-500 to-amber-600",
    accent: "bg-yellow-50 border-yellow-200 hover:border-yellow-300",
  },
  {
    icon: "📊",
    title: "Rekap Presensi",
    desc: "Pantau presensi datang dan pulang petugas.",
    href: "/admin/attendance-recap",
    color: "from-rose-500 to-pink-600",
    accent: "bg-rose-50 border-rose-200 hover:border-rose-300",
  },
  {
    icon: "💬",
    title: "Permintaan Online",
    desc: "Data permintaan data melalui WhatsApp / Google Form.",
    href: "/online-requests",
    color: "from-lime-500 to-green-600",
    accent: "bg-lime-50 border-lime-200 hover:border-lime-300",
  },
];

const PUBLIC_OFFICER_MENU: MenuItem[] = [
  {
    icon: "🎫",
    title: "Dashboard Loket",
    desc: "Panggil antrian dan layani pengunjung di loket Anda.",
    href: "/loket",
    color: "from-amber-500 to-orange-600",
    accent: "bg-amber-50 border-amber-200 hover:border-amber-300",
  },
  {
    icon: "📅",
    title: "Presensi",
    desc: "Catat presensi datang dan pulang shift hari ini.",
    href: "/loket",
    color: "from-emerald-500 to-teal-600",
    accent: "bg-emerald-50 border-emerald-200 hover:border-emerald-300",
  },
  {
    icon: "💬",
    title: "Permintaan Online",
    desc: "Tindak lanjuti permintaan pelayanan publik dari Google Form.",
    href: "/online-requests",
    color: "from-blue-500 to-indigo-600",
    accent: "bg-blue-50 border-blue-200 hover:border-blue-300",
  },
  {
    icon: "WA",
    title: "Chat WhatsApp",
    desc: "Baca dan balas pesan WhatsApp masyarakat dari website.",
    href: "/whatsapp",
    color: "from-emerald-500 to-green-600",
    accent: "bg-emerald-50 border-emerald-200 hover:border-emerald-300",
  },
];

const DATA_OFFICER_MENU: MenuItem[] = [
  {
    icon: "📅",
    title: "Presensi",
    desc: "Catat presensi datang dan pulang serta rekap kerja harian.",
    href: "/attendance",
    color: "from-emerald-500 to-teal-600",
    accent: "bg-emerald-50 border-emerald-200 hover:border-emerald-300",
  },
  {
    icon: "💬",
    title: "Permintaan Online",
    desc: "Lihat dan tindak lanjuti permintaan data via WhatsApp / Google Form.",
    href: "/online-requests",
    color: "from-blue-500 to-indigo-600",
    accent: "bg-blue-50 border-blue-200 hover:border-blue-300",
  },
  {
    icon: "WA",
    title: "Chat WhatsApp",
    desc: "Baca dan balas pesan WhatsApp masyarakat dari website.",
    href: "/whatsapp",
    color: "from-emerald-500 to-green-600",
    accent: "bg-emerald-50 border-emerald-200 hover:border-emerald-300",
  },
];

const ROLE_META: Record<
  string,
  { label: string; subtitle: string; gradient: string; badge: string }
> = {
  ADMIN: {
    label: "Administrator",
    subtitle: "Anda memiliki akses penuh ke seluruh pengaturan sistem.",
    gradient: "from-blue-600 to-indigo-700",
    badge: "bg-blue-100 text-blue-800",
  },
  LAYANAN_PUBLIK: {
    label: "Petugas Layanan Publik",
    subtitle: "Akses dashboard loket dan presensi shift Anda.",
    gradient: "from-amber-500 to-orange-600",
    badge: "bg-amber-100 text-amber-800",
  },
  PERMINTAAN_DATA: {
    label: "Petugas Permintaan Data",
    subtitle: "Akses presensi dan data permintaan online hari ini.",
    gradient: "from-emerald-500 to-teal-600",
    badge: "bg-emerald-100 text-emerald-800",
  },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* ──────────────────── MENU CARD COMPONENT ──────────────────── */

function MenuCard({ item }: { item: MenuItem }) {
  return (
    <a
      key={item.href + item.title}
      href={item.href}
      className={`group relative overflow-hidden rounded-2xl border-2 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${item.accent}`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-gradient-to-b ${item.color}`}
      />
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-2xl shadow-sm`}
        >
          {item.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-zinc-900">{item.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {item.desc}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-zinc-400 transition-all group-hover:text-zinc-700">
        Buka
        <svg
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
          />
        </svg>
      </div>
    </a>
  );
}

/* ──────────────────── MAIN PAGE ──────────────────── */

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        // Tidak login — tampilkan menu publik
        setIsGuest(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setProfile({
        ...(data.user ?? {}),
        counterId: data.counterId ?? data.user?.counterId ?? null,
      });
      setLoading(false);
    };
    load();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="h-8 w-8 animate-spin text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-sm text-zinc-500">Memuat...</p>
        </div>
      </div>
    );
  }

  /* ── GUEST / PUBLIC VIEW ── */
  if (isGuest || !profile) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.12)_0%,transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.08)_0%,transparent_50%),linear-gradient(160deg,#f8fafc_0%,#f1f5f9_100%)]">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-16">
          {/* Header */}
          <header className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-3xl shadow-lg">
              🏛️
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600">
              BPS Provinsi Jambi
            </p>
            <h1 className="mt-3 text-3xl font-bold text-zinc-900 sm:text-4xl">
              Sistem Antrian Layanan
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-zinc-500">
              Platform antrian resmi untuk pengambilan nomor, tampilan panggilan
              loket, dan penilaian layanan pengunjung.
            </p>
          </header>

          {/* Divider */}
          <div className="my-10 flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Pilih Menu
            </span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          {/* Menu grid */}
          <section className="grid gap-4 sm:grid-cols-2">
            {PUBLIC_MENU.map((item) => (
              <MenuCard key={item.title} item={item} />
            ))}
          </section>

          {/* Footer */}
          <footer className="mt-auto pt-12 text-center text-xs text-zinc-400">
            © {new Date().getFullYear()} BPS Provinsi Jambi — Sistem Antrian
          </footer>
        </div>
      </div>
    );
  }

  /* ── AUTHENTICATED VIEW ── */
  const meta = ROLE_META[profile.role] ?? ROLE_META.ADMIN;

  let menuItems: MenuItem[];
  if (profile.role === "ADMIN") {
    menuItems = ADMIN_MENU;
  } else if (profile.role === "LAYANAN_PUBLIK") {
    const cid = profile.counterId;
    menuItems = PUBLIC_OFFICER_MENU.map((item) => {
      if (item.title === "Dashboard Loket") {
        return { ...item, href: cid ? `/loket/${cid}` : "/loket" };
      }
      if (item.title === "Presensi") {
        return {
          ...item,
          href: cid ? `/loket/${cid}?tab=attendance` : "/loket?tab=attendance",
        };
      }
      return item;
    });
  } else {
    menuItems = DATA_OFFICER_MENU;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.12)_0%,transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.08)_0%,transparent_50%),linear-gradient(160deg,#f8fafc_0%,#f1f5f9_100%)]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
        {/* Top bar */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient} text-sm font-bold text-white shadow-sm`}
            >
              {getInitials(profile.nama)}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-zinc-900">
                {profile.nama}
              </p>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.badge}`}
              >
                {meta.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900"
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
            Keluar
          </button>
        </header>

        {/* Hero greeting */}
        <section className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            BPS Provinsi Jambi — Sistem Antrian
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-zinc-900 sm:text-4xl">
            Selamat datang,{" "}
            <span
              className={`bg-gradient-to-r ${meta.gradient} bg-clip-text text-transparent`}
            >
              {profile.nama.split(" ")[0]}
            </span>
            !
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-500">
            {meta.subtitle}
          </p>
        </section>

        {/* Divider */}
        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Menu Utama
          </span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        {/* Menu grid */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((item) => (
            <MenuCard key={item.href + item.title} item={item} />
          ))}
        </section>

        {/* Footer */}
        <footer className="mt-auto pt-12 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} BPS Provinsi Jambi — Sistem Antrian
        </footer>
      </div>
    </div>
  );
}
