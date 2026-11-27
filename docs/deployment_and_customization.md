# 🚀 Panduan Instalasi, Deployment & Kustomisasi (Self-Hosting)

Panduan ini dirancang untuk **semua kalangan**: mulai dari operator sekolah/guru yang baru pertama kali menjalankan server (*Mode Cepat*), hingga administrator sistem/DevOps yang ingin men-deploy CartaExam untuk ribuan siswa secara online (*Mode Produksi*).

---

## 📋 Daftar Isi
1. [Kebutuhan Sistem](#1-kebutuhan-sistem)
2. [Cara Tercepat: Docker Compose (Pemula & Produksi)](#2-cara-tercepat-docker-compose-pemula--produksi)
3. [Instalasi Manual Lokal / LAN Sekolah (SQLite)](#3-instalasi-manual-lokal--lan-sekolah-sqlite)
4. [Setup Produksi Skala Besar (MySQL / PostgreSQL + PM2 + Nginx)](#4-setup-produksi-skala-besar-mysql--postgresql--pm2--nginx)
5. [Kustomisasi Identitas Sekolah (White-Label)](#5-kustomisasi-identitas-sekolah-white-label)
6. [Konfigurasi AI Multi-Provider](#6-konfigurasi-ai-multi-provider)
7. [Konfigurasi Safe Exam Browser (SEB) & CartaExambro](#7-konfigurasi-safe-exam-browser-seb--cartaexambro)
8. [Integrasi Opsional PortoCarta (SSO & Sync)](#8-integrasi-opsional-portocarta-sso--sync)
9. [Troubleshooting Umum](#9-troubleshooting-umum)

---

## 1. Kebutuhan Sistem

| Komponen | Minimum (Uji Coba / < 150 Siswa) | Rekomendasi Produksi (500+ Siswa Serentak) |
|---|---|---|
| **OS** | Windows 10/11, macOS, atau Linux | Ubuntu 22.04 / 24.04 LTS / Debian 12 |
| **Runtime** | Node.js 20+ (disarankan Node 22 LTS) atau Docker | Node.js 22 LTS + PM2 (atau Docker) |
| **Database** | SQLite (bawaan, tanpa instalasi tambahan) | MySQL 8+ / MariaDB 10.6+ atau PostgreSQL 15+ |
| **RAM** | 2 GB | 4–8 GB |
| **Storage** | 5 GB (untuk gambar soal & bukti pelanggaran) | 20 GB+ SSD |

---

## 2. Cara Tercepat: Docker Compose (Pemula & Produksi)

Jika server/PC sudah terpasang **Docker Desktop** (Windows/Mac) atau **Docker Engine** (Linux):

```bash
# 1. Clone repositori
git clone https://github.com/SiMahfud/carta-exam-web.git
cd CartaExam

# 2. Salin konfigurasi environment
cp .env.example .env
# (Opsional) Edit .env dan ganti SESSION_SECRET dengan string acak minimal 32 karakter

# 3. Bangun dan jalankan aplikasi
docker compose up -d --build
```

Aplikasi otomatis menginisialisasi seluruh 20 tabel database, membuat akun awal, dan berjalan di **`http://localhost:3333`**.

> **Login Awal:**
> - **Admin:** username `admin` | password `password123`
> - **Siswa Demo:** username `siswa` | password `password123`
>
> ⚠️ **Wajib:** Segera ganti password `admin` setelah login pertama melalui menu **Manajemen User** (`/admin/users`).

---

## 3. Instalasi Manual Lokal / LAN Sekolah (SQLite)

Cocok untuk uji coba di laptop atau jaringan Wi-Fi/LAN lokal sekolah tanpa internet.

```bash
# 1. Clone repositori
git clone https://github.com/SiMahfud/carta-exam-web.git
cd CartaExam

# 2. Instal seluruh dependensi Node.js
npm install

# 3. Buat file konfigurasi .env
cp .env.example .env
```

Buka file `.env` dan pastikan konfigurasi dasar sudah sesuai (default sudah memakai SQLite):
```env
DB_TYPE=sqlite
DB_NAME=local.db
SESSION_SECRET=ganti-dengan-string-acak-minimal-32-karakter
APP_URL=http://localhost:3333
NEXT_PUBLIC_APP_URL=http://localhost:3333
```

Kemudian dorong skema database dan jalankan server:
```bash
# 4. Buat seluruh tabel database (20 tabel)
npm run db:push

# 5. Jalankan mode development (atau gunakan build + start untuk produksi)
npm run dev
```

Buka browser dan akses **`http://localhost:3333`** (atau `http://<IP-LAN-SERVER>:3333` dari HP/laptop siswa di jaringan yang sama).

> **Tips Jaringan LAN Tanpa HTTPS:**
> CartaExam otomatis mendeteksi akses via `localhost` maupun IP lokal (`192.168.x.x`, `10.x.x.x`, `172.x.x.x`) dan menonaktifkan flag cookie `Secure` secara adaptif (`src/lib/session.ts`). Jika mengalami kendala cookie di jaringan lokal tertentu, Anda dapat memaksa `COOKIE_SECURE=false` di `.env`.

---

## 4. Setup Produksi Skala Besar (MySQL / PostgreSQL + PM2 + Nginx)

Untuk ujian sekolah dengan ratusan hingga ribuan peserta serentak, sangat disarankan menggunakan **MySQL/MariaDB** atau **PostgreSQL** agar tidak terjadi antrean penulisan (*write lock*).

### A. Konfigurasi `.env` Produksi
Contoh menggunakan MySQL / MariaDB:
```env
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=cartaexam
DB_PASS=password_database_yang_kuat
DB_NAME=carta_exam

SESSION_SECRET=isi_dengan_hasil_openssl_rand_hex_32
APP_URL=https://exam.sekolahanda.sch.id
NEXT_PUBLIC_APP_URL=https://exam.sekolahanda.sch.id
```

Buat database kosong terlebih dahulu di MySQL:
```sql
CREATE DATABASE carta_exam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Lalu sinkronkan seluruh skema dan bangun aplikasi:
```bash
npm run db:push
npm run build
```

### B. Jalankan dengan PM2
Repositori sudah menyertakan [pm2.config.js](../pm2.config.js):
```bash
npm install -g pm2
pm2 start pm2.config.js
pm2 save
pm2 startup
```

### C. Reverse Proxy Nginx (Mendukung Live Proctoring SSE)
CartaExam menggunakan **Server-Sent Events (SSE)** untuk feed Live Proctoring (`/api/exam-sessions/[id]/events`) dan streaming AI Generator. Pastikan `proxy_buffering off;` aktif di Nginx:

```nginx
server {
    listen 80;
    server_name exam.sekolahanda.sch.id;

    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:3333;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # Penting untuk SSE (Live Proctoring & AI Stream)
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
    }
}
```
Aktifkan HTTPS dengan Certbot (`sudo certbot --nginx -d exam.sekolahanda.sch.id`) atau gunakan **Cloudflare Tunnel**.

---

## 5. Kustomisasi Identitas Sekolah (White-Label)

Setelah login sebagai **Admin**, buka menu **Pengaturan Sekolah (`/admin/settings`)**:
1. **Identitas Sekolah**: Isi Nama Sekolah, Deskripsi, upload Logo Sekolah (PNG transparan), dan Favicon.
2. **Halaman Depan (Landing Page)**: Sesuaikan Judul Hero, Deskripsi, Pengumuman Penting, serta Informasi Kontak (Email, Telepon, Alamat) yang otomatis dipakai pada halaman publik maupun **kop cetak naskah ujian/LJK & slip dispensasi**.
3. Simpan perubahan. Nama dan logo sekolah otomatis diperbarui di landing page, halaman login, kartu profil siswa, hingga kop cetak PDF/print.

---

## 6. Konfigurasi AI Multi-Provider

CartaExam mendukung 3 jenis penyedia AI untuk **Pembuat Soal Otomatis (AI Generator)** dan **Koreksi Esai AI**:

1. **Google Gemini** (default: `gemini-2.5-flash`)
2. **OpenRouter** (akses ratusan model seperti Gemini, Claude, DeepSeek, Llama)
3. **OpenAI-Compatible** (OpenAI, Groq, Together AI, Ollama lokal, vLLM, dll.)

**Cara Mengaktifkan (Tanpa Edit Kode):**
1. Login sebagai Admin → **Pengaturan Sekolah (`/admin/settings`)**.
2. Gulir ke bagian **Konfigurasi AI**.
3. Pilih **Provider**, masukkan **API Key**, **Model**, dan (khusus OpenAI-Compatible) **Base URL** (mis. `https://api.groq.com/openai/v1` atau `http://localhost:11434/v1`).
4. Klik tombol **Uji Koneksi AI** untuk memverifikasi latensi sebelum menyimpan.

*(Alternatif untuk Gemini saja: set `GOOGLE_GENERATIVE_AI_API_KEY` dan `GOOGLE_GENERATIVE_AI_MODEL` di `.env`.)*

---

## 7. Konfigurasi Safe Exam Browser (SEB) & CartaExambro

### A. Safe Exam Browser (Windows, macOS, iOS/iPadOS)
1. Buka **Pengaturan Sekolah (`/admin/settings`) → Konfigurasi Safe Exam Browser (SEB)**.
2. Pastikan **URL CartaExam** sesuai dengan domain/IP server Anda (mis. `https://exam.sekolahanda.sch.id`).
3. Atur **Quit Password SEB** (disarankan diisi agar siswa tidak bisa menutup SEB secara paksa dengan `Ctrl+Q` / tombol Home selama ujian berlangsung).
4. Atur **PIN / Password Keluar Darurat CartaExambro** (bawaan: `CARTA2026`, sangat disarankan diganti).
5. Klik **Simpan Konfigurasi SEB**.
6. Bagikan **QR Code SEB** (`/api/seb/qr`), tautan `sebs://...`, atau file unduhan **`cartaexam.seb`** (`/api/seb/config`) ke siswa.

### B. Aplikasi Android CartaExambro
- Untuk membangun APK khusus sekolah Anda atau mendistribusikan APK generik ke siswa melalui server CartaExam (`/api/exambro/download` & auto-update `/api/exambro/version`), lihat panduan lengkap di **[carta-exambro/README.md](../carta-exambro/README.md)**.
- Ringkasnya, letakkan APK hasil build di:
  - `public/downloads/CartaExambro.apk`
  - dan sesuaikan metadata di `public/downloads/exambro-version.json`.

---

## 8. Integrasi Opsional PortoCarta (SSO & Sync)

Secara default, CartaExam berjalan dalam **Mode Standalone** (pengguna dikelola langsung lewat Excel Import atau menu Manajemen User).

Jika sekolah Anda menggunakan portal induk **PortoCarta**, aktifkan di `.env`:
```env
PORTOCARTA_URL=https://porto.sekolahanda.sch.id
NEXT_PUBLIC_PORTOCARTA_URL=https://porto.sekolahanda.sch.id
PORTOCARTA_API_KEY=kunci_rahasia_bersama_minimal_32_karakter
```
Setelah diaktifkan:
- Halaman login otomatis menampilkan tombol **Masuk dengan Akun PortoCarta**.
- Admin dapat menguji koneksi dan menarik data master (Siswa, Guru, Kelas, Mapel) dari menu **Pengaturan Sekolah** (`/api/integration/pull-sync`), atau menerima *webhook push sync* di `/api/integration/sync-receive`.

---

## 9. Troubleshooting Umum

| Gejala | Penyebab Umum | Solusi |
|---|---|---|
| Login gagal terus padahal password benar | Mengakses server HTTP (LAN/IP) dengan `COOKIE_SECURE=true` | Hapus `COOKIE_SECURE` dari `.env` atau set `COOKIE_SECURE=false` untuk akses HTTP lokal. |
| Akun `admin / password123` gagal setelah fresh install | Belum menjalankan `npm run db:push` | Jalankan `npm run db:push`, hapus file DB kosong jika perlu, lalu restart server. |
| Live Proctoring tidak update otomatis di balik Nginx | Nginx melakukan buffering pada response SSE | Tambahkan `proxy_buffering off;` dan `proxy_cache off;` pada konfigurasi `location /` Nginx. |
| Siswa ditolak masuk dengan pesan "Memerlukan SEB / Exambro" | Template ujian mengaktifkan `requireSeb` / `requireExambro` | Matikan opsi tersebut di Template Ujian jika ingin mengizinkan browser biasa, atau arahkan siswa membuka lewat SEB/CartaExambro. |
| Gambar upload tidak muncul setelah deploy ulang | Folder `public/uploads/` belum dipersist (Docker volume) | Pastikan volume `/app/public/uploads` ter-mount di `docker-compose.yml`. |
