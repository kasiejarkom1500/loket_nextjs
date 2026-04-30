# Sistem Antrian BPS Provinsi Jambi

Aplikasi antrian layanan BPS Provinsi Jambi berbasis Next.js + Prisma + MySQL,
lengkap dengan kiosk, display realtime, dashboard loket, rating, dan admin
penugasan.

## Fitur

- Kiosk: ambil nomor + isi data pengunjung (modal), auto print.
- Display: realtime panggilan + audio notifikasi.
- Loket: panggil nomor, pilih nomor tertentu, detail pengunjung realtime.
- Admin: CRUD user, CRUD penugasan, import penugasan via Excel.
- Auth: login admin atau petugas (berdasarkan assignment shift).

## Teknologi

- Next.js (App Router)
- Prisma ORM + MySQL
- Firebase Realtime Database (realtime display/loket)
- Tailwind CSS

## Setup

1) Install dependencies

```bash
npm install
```

2) Siapkan env

Copy `.env.example` menjadi `.env`, lalu isi minimal:

```bash
DATABASE_URL="mysql://root:@localhost:3306/antrian_db"
AUTH_SECRET="random_string"
NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
NEXT_PUBLIC_FIREBASE_DATABASE_URL=""
NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=""
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""
FIREBASE_SERVICE_ACCOUNT_PATH="firebase/serviceAccount.json"
```

Catatan:
- Jika pakai service account JSON, cukup isi `FIREBASE_SERVICE_ACCOUNT_PATH`.
- Pastikan file JSON tidak dikomit (sudah di `.gitignore`).

3) Push schema + generate client

```bash
npx prisma db push
npx prisma generate
```

4) Seed data (services, counters, admin)

```bash
npx prisma db seed
```

Admin default:
- username: `admin`
- password: `admin123`

5) Jalankan dev server

```bash
npm run dev
```

## Rute Utama

- `/kiosk` - ambil nomor antrian
- `/display` - display panggilan realtime
- `/loket/1` - dashboard loket (butuh login petugas)
- `/rating` - penilaian layanan
- `/login` - login admin/petugas
- `/admin/users` - kelola user
- `/admin/assignments` - kelola penugasan + import Excel

## Import Penugasan (Excel)

Download template di `/templates/assignment_template.xlsx`.
Kolom yang dipakai:

- `tanggal` (format dd/mm/yyyy)
- `shift` (PAGI/SIANG)
- `role` (LAYANAN_PUBLIK/PERMINTAAN_DATA)
- `nip_lama` (kunci user)
- `counter` (opsional, wajib untuk LAYANAN_PUBLIK)

## Catatan Realtime

Realtime display dan loket memakai Firebase Realtime Database. Pastikan
konfigurasi Firebase sudah benar agar update live berjalan.

## Deploy dengan Docker

Prerequisite:
- Docker + Docker Compose

1) Pastikan `.env` sudah terisi (lihat `.env.example`).
2) Jalankan:

```bash
docker compose up --build
```

Jika ingin menjalankan MySQL lokal via Docker (opsional), aktifkan profile `localdb`:

```bash
docker compose --profile localdb up --build
```

Catatan untuk profile `localdb`:
- Atur `DATABASE_URL` di `.env` menjadi `mysql://root:@db:3306/antrian_db`

3) Akses:
- App: `http://localhost:3000`

### Mount Firebase Service Account (disarankan)

Credential Firebase Admin SDK (`serviceAccount.json`) sebaiknya **tidak dibundel ke image**.
Simpan file JSON di server (atau di folder repo di host), lalu mount sebagai volume read-only.

Contoh jika file ada di folder repo host `./firebase/serviceAccount.json`:

```yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./firebase/serviceAccount.json:/app/firebase/serviceAccount.json:ro
```

Lalu pastikan `.env` berisi:

```env
FIREBASE_SERVICE_ACCOUNT_PATH="firebase/serviceAccount.json"
```

Contoh jika file ada di path server (absolut), misal `/opt/loket/serviceAccount.json`:

```yml
    volumes:
      - /opt/loket/serviceAccount.json:/app/firebase/serviceAccount.json:ro
```

Catatan:
- Container `app` akan menjalankan `prisma db push` dan `prisma db seed` saat start.
- Untuk mematikan auto push/seed, set env:
  - `PRISMA_DB_PUSH_ON_START=0`
  - `PRISMA_SEED_ON_START=0`

## Lisensi

Private - internal BPS Provinsi Jambi.
