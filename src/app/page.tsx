export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fde68a,transparent_55%),radial-gradient(circle_at_bottom,#99f6e4,transparent_45%),linear-gradient(120deg,#fef3c7,#f8fafc)]">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-6">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            BPS Provinsi Jambi
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-zinc-900 sm:text-5xl">
            Antrian layanan yang rapi, cepat, dan mudah dipantau.
          </h1>
          <p className="max-w-2xl text-lg text-zinc-700">
            Platform antrian resmi BPS Provinsi Jambi untuk kiosk, display
            panggilan, dashboard petugas, dan penilaian layanan.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Kiosk",
              desc: "Ambil nomor antrian berdasarkan layanan.",
              href: "/kiosk",
            },
            {
              title: "Display",
              desc: "Tampilan dinding panggilan loket realtime.",
              href: "/display",
            },
            {
              title: "Loket",
              desc: "Dashboard petugas untuk memanggil dan menyelesaikan.",
              href: "/loket/1",
            },
            {
              title: "Rating",
              desc: "Masukan pengunjung setelah dilayani.",
              href: "/rating",
            },
          ].map((item) => (
            <a
              key={item.title}
              href={item.href}
              className="group rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-white hover:bg-white"
            >
              <h2 className="text-xl font-semibold text-zinc-900">
                {item.title}
              </h2>
              <p className="mt-3 text-sm text-zinc-600">{item.desc}</p>
              <p className="mt-6 text-sm font-semibold text-amber-700">
                Buka halaman {"->"}
              </p>
            </a>
          ))}
        </section>
      </main>
    </div>
  );
}
