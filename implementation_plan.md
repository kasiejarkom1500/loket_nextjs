# Sistem Antrian Next.js + MySQL

Aplikasi web untuk sistem antrian multi-loket menggunakan Next.js (App Router), Prisma ORM, dan MySQL. 

## User Review Required
> [!IMPORTANT]
> - Apakah nama database MySQL yang akan digunakan? (Secara default kita akan menggunakan `antrian_db`).
> - Apakah Anda memiliki kredensial MySQL yang spesifik? (Username dan Password default root biasanya kosong atau `root:root`).
> - Realtime untuk `PC Dinding` dan `Loket` menggunakan Firebase Realtime Database + Admin SDK (tanpa polling).

## Proposed Changes

### Setup & Database (Prisma + Firebase)
- Inisialisasi Next.js (`npx create-next-app@latest`) dengan TailwindCSS.
- Install Prisma (`npm i prisma @prisma/client`)
- Koneksi MySQL di `.env`.
- Install Firebase (`npm i firebase firebase-admin`)
- Install util tambahan (`npm i bcryptjs jose xlsx`)

#### [NEW] prisma/schema.prisma
Model yang akan dibuat:
- `Service` (Layanan contoh: CS, Teller)
- `Counter` (Loket contoh: Loket 1, Loket 2)
- `User` (Petugas/Admin: nip_lama, username, password, nama, isAdmin)
- `Assignment` (Penugasan per tanggal + shift + role)
- `Visitor` (Data pengunjung)
- `Queue` (Nomor Antrian: A-001, status: PENDING, CALLED, COMPLETED, staffPurposeDetail)
- `Rating` (Penilaian dari pengunjung)

#### [NEW] Firebase Realtime Database
- Client SDK untuk subscribe perubahan (Display + Loket).
- Admin SDK untuk broadcast update saat antrian dipanggil/selesai.
- Service account bisa disuplai via `.env` atau file JSON di folder `firebase/`.

### API Routes (Backend)
Pembuatan Server Actions / API Routes untuk:
- `app/api/services/route.ts` - List layanan.
- `app/api/counters/route.ts` - List loket.
- `app/api/queue/generate/route.ts` - Ambil nomor antrian + data pengunjung.
- `app/api/queue/current/route.ts` - Snapshot antrian (fallback non-Firebase).
- `app/api/queue/call/route.ts` - Panggil antrian (pilih nomor atau next).
- `app/api/queue/complete/route.ts` - Selesaikan antrian.
- `app/api/queue/update-service/route.ts` - Ubah layanan sebelum dipanggil.
- `app/api/queue/update-staff-purpose/route.ts` - Simpan detail keperluan petugas.
- `app/api/rating/route.ts` - Simpan rating.
- `app/api/auth/login/route.ts` - Login petugas/admin.
- `app/api/auth/logout/route.ts` - Logout.
- `app/api/admin/users/route.ts` - CRUD user.
- `app/api/admin/assignments/route.ts` - CRUD penugasan.
- `app/api/admin/assignments/import/route.ts` - Import penugasan via Excel.

### Frontend Pages (UI)
Fitur akan dibagi menjadi beberapa halaman:

#### [NEW] app/kiosk/page.tsx
Halaman untuk mesin tiket (Kiosk). Pengunjung memilih layanan, isi data pengunjung via modal, lalu cetak nomor antrian otomatis.

#### [NEW] app/display/page.tsx
Halaman PC di dinding. Menampilkan nomor yang sedang dipanggil serta ringkasannya per layanan, realtime via Firebase. Audio notifikasi menggunakan file.

#### [NEW] app/loket/[id]/page.tsx
Halaman untuk petugas loket. Terdapat tombol "Panggil Selanjutnya" (Call Next) dan "Selesai" (Complete). Menampilkan data pengunjung realtime, tabel antrian pending, ambil nomor tertentu, dan catatan keperluan petugas.

#### [NEW] app/rating/page.tsx
Halaman PC Penilaian (*Customer Feedback*). Menampilkan antarmuka untuk memberikan bintang 1-5 atau pilihan (Sangat Puas, Puas, Tidak Puas).

#### [NEW] app/login/page.tsx
Login dengan mode Admin atau Petugas (berdasarkan assignment shift).

#### [NEW] app/admin/assignments/page.tsx
Admin untuk CRUD penugasan + upload Excel.

#### [NEW] app/admin/users/page.tsx
Admin untuk CRUD user.

## Verification Plan
### Automated Tests
- Build Next.js app untuk memastikan tidak ada error saat kompilasi.

### Manual Verification
- Jalankan di `localhost:3000`.
- Login admin dan atur penugasan (manual atau upload Excel).
- Buka `/kiosk`, `/display`, `/loket/1`, `/rating`.
- Lakukan simulasi pengunjung mengambil nomor di kiosk (isi data pengunjung).
- Pastikan loket bisa memanggil nomor pengunjung dan display dinding ter-update realtime.
- Coba ubah layanan sebelum dipanggil dan simpan detail keperluan petugas.
- Setelah selesai pelayanan, pengunjung memberi rating. Keberhasilan data tersimpan di MySQL diverifikasi.
