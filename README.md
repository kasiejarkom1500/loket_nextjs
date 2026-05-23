# Sistem Antrian BPS Provinsi Jambi

Aplikasi antrian layanan BPS Provinsi Jambi berbasis Next.js + Prisma + MySQL,
lengkap dengan kiosk, display realtime, dashboard loket, rating, dan admin
penugasan. Aplikasi juga mendukung permintaan online dari Google Sheets dan
integrasi WhatsApp linked-device untuk notifikasi serta chat petugas.

## Fitur

- Kiosk: ambil nomor antrian, isi data pengunjung, dan cetak tiket.
- Display: tampilan panggilan realtime dengan audio notifikasi.
- Loket: panggil nomor, pilih nomor tertentu, ubah layanan, catat detail
  keperluan, dan selesaikan layanan.
- Rating: penilaian layanan dari pengunjung setelah antrean selesai.
- Presensi petugas: check-in/check-out per shift dan rekap pekerjaan harian.
- Permintaan online: tarik data Google Form dari Google Sheets dan update status
  tindak lanjut.
- WhatsApp:
  - Admin scan QR untuk login nomor WhatsApp sebagai perangkat tertaut.
  - Petugas Layanan Publik dan Permintaan Data bisa membaca serta membalas chat
    dari halaman web.
  - Notifikasi otomatis nomor antrean dibuat/dipanggil dapat diaktifkan via env.
  - Pesan status/broadcast WhatsApp difilter agar tidak masuk inbox.
- Admin:
  - CRUD user, layanan, petugas keamanan, dan penugasan.
  - Import penugasan via Excel.
  - Rekap pengunjung, rating, dan presensi.
- Auth: login admin atau petugas berdasarkan assignment shift.

## Teknologi

- Next.js (App Router)
- Prisma ORM + MySQL
- Firebase Realtime Database (realtime display/loket)
- Baileys (WhatsApp linked-device)
- Google Sheets API
- Tailwind CSS

## Setup

1. Install dependencies

```bash
npm install
```

2. Siapkan env

Copy `.env.example` menjadi `.env`, lalu isi minimal:

```env
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

3. Push schema + generate client

```bash
npx prisma db push
npx prisma generate
```

4. Seed data (services, counters, admin)

```bash
npx prisma db seed
```

Admin default:
- username: `admin`
- password: `admin123`

5. Jalankan dev server

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
- `/admin/whatsapp` - login WhatsApp via QR, status koneksi, dan uji kirim
- `/whatsapp` - inbox dan balas chat WhatsApp untuk petugas login
- `/online-requests` - tindak lanjut permintaan online
- `/attendance` - presensi role Permintaan Data

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

## WhatsApp

Integrasi WhatsApp memakai Baileys sebagai perangkat tertaut. Ini bukan
WhatsApp Business Cloud API, sehingga tidak membutuhkan biaya API bisnis, tetapi
bergantung pada sesi WhatsApp Web dari nomor pengelola.

### Setup WhatsApp

Tambahkan env berikut:

```env
WHATSAPP_AUTH_DIR=".baileys_auth"
WHATSAPP_LOG_LEVEL="silent"
WHATSAPP_MARK_ONLINE="0"
WHATSAPP_NOTIFY_QUEUE_CREATED="0"
WHATSAPP_NOTIFY_QUEUE_CALLED="0"
```

Alur login:

1. Login sebagai admin.
2. Buka `/admin/whatsapp`.
3. Scan QR dari WhatsApp HP melalui menu Perangkat Tertaut.
4. Setelah status `Terhubung`, petugas dapat membuka `/whatsapp` untuk membaca
   dan membalas chat.

Session WhatsApp disimpan di folder `.baileys_auth/` dan sudah diabaikan oleh
git. Jangan commit folder ini karena berisi kredensial perangkat tertaut.

### Chat Petugas

Halaman `/whatsapp` dapat diakses user login. Petugas role `LAYANAN_PUBLIK` dan
`PERMINTAAN_DATA` dapat memilih percakapan, membaca pesan masuk, dan mengirim
balasan teks.

Catatan teknis:

- WhatsApp kadang mengirim identitas chat sebagai JID internal seperti
  `...@lid`. Sistem menyimpan JID asli tersebut agar balasan dikirim ke
  percakapan yang benar.
- Pesan `status@broadcast` dan broadcast lain difilter agar status WhatsApp tidak
  tampil sebagai chat.
- Riwayat chat saat ini disimpan di memori proses server. Jika server restart,
  daftar chat di web akan kosong lagi, meskipun pesan tetap ada di aplikasi
  WhatsApp HP.
- Saat ini media gambar/dokumen belum didukung. Sistem baru menangani teks dan
  caption media.

### Notifikasi Antrean via WhatsApp

Aktifkan env berikut setelah nomor WhatsApp berhasil terhubung:

```env
WHATSAPP_NOTIFY_QUEUE_CREATED="1"
WHATSAPP_NOTIFY_QUEUE_CALLED="1"
```

Jika aktif:

- Saat pengunjung mengambil nomor di `/kiosk`, sistem mengirim nomor antrean ke
  WhatsApp pengunjung.
- Saat nomor dipanggil dari loket, sistem mengirim pemberitahuan menuju loket.

## Permintaan Online dan Google Sheets

Halaman `/online-requests` membaca data dari Google Sheets, misalnya hasil
Google Form permintaan data. Konfigurasi env:

```env
NEXT_PUBLIC_ONLINE_REQUESTS_POLL_MS="15000"
GOOGLE_SHEETS_ENABLED="0"
GOOGLE_SHEETS_CLIENT_EMAIL=""
GOOGLE_SHEETS_PRIVATE_KEY=""
GOOGLE_SHEETS_SPREADSHEET_ID=""
GOOGLE_SHEETS_SHEET_NAME="Form Responses 1"
```

Set `GOOGLE_SHEETS_ENABLED="1"` untuk mengaktifkan append/sinkronisasi tertentu
dari alur aplikasi ke Google Sheets.

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
- Jika memakai WhatsApp di Docker, mount folder session agar login tidak hilang
  saat container dibuat ulang:

```yml
services:
  app:
    volumes:
      - ./whatsapp-auth:/app/.baileys_auth
```

## Lisensi

Private - internal BPS Provinsi Jambi.
