# 🎓 CartaExam & CartaExambro

**Platform Ujian Digital (Computer Based Test / CBT) Modern, Aman, Open-Source, dan Tahan Gangguan Jaringan untuk Sekolah di Seluruh Dunia.**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Android Native](https://img.shields.io/badge/Android-CartaExambro%20v1.1.0-green)](carta-exambro/README.md)

**CartaExam** adalah ekosistem asesmen digital lengkap yang terdiri dari:
1. **CartaExam Web** — Aplikasi web CBT berbasis **Next.js 14**, **Drizzle ORM** (SQLite / MySQL / PostgreSQL), **Tailwind CSS**, dan **shadcn/ui** untuk Admin, Guru, Pengawas, Tata Usaha, dan Siswa.
2. **CartaExambro (`carta-exambro/`)** — Aplikasi browser ujian native **Android** (Kotlin + WebView) dengan proteksi layar OS (`FLAG_SECURE`), anti-overlay, pemindai QR offline, auto-updater, dan tangkapan bukti pelanggaran.
3. **Integrasi Safe Exam Browser (SEB)** — Generator file konfigurasi `.seb` & QR Code langsung dari panel Admin untuk perangkat **Windows, macOS, iPhone, dan iPad**.

---

## 🌟 Fitur Utama

### 📚 1. Bank Soal Kaya Fitur & AI Generator
- **6 Tipe Soal Standar**: Pilihan Ganda (`mc`), PG Kompleks (`complex_mc`), Menjodohkan (`matching`), Isian Singkat (`short`), Benar/Salah (`true_false`), dan Esai (`essay`).
- **Rich Text & Matematika**: Editor TipTap dengan dukungan rumus **KaTeX / LaTeX** serta upload gambar soal.
- **Import Word (`.docx`)**: Impor soal dari dokumen Word lengkap dengan konversi rumus OMML ke LaTeX dan pratinjau instan.
- **AI Generator Soal (Streaming)**: Buat soal otomatis dari materi teks/dokumen menggunakan **Google Gemini**, **OpenRouter**, atau **OpenAI-Compatible** (OpenAI, Groq, Ollama lokal, dll.).

### 🛡️ 2. Keamanan Ujian Berlapis & Live Proctoring
- **Lockdown Mode**: Deteksi perpindahan tab/jendela, blokir copy-paste & klik kanan, deteksi screenshot/DevTools, serta watermark nama siswa anti-tamper.
- **Dukungan SEB & CartaExambro**: Wajibkan peserta membuka ujian lewat Safe Exam Browser atau CartaExambro Android.
- **Device Binding & Late Tolerance**: Penguncian 1 perangkat per siswa dan penguncian otomatis peserta terlambat (`LATE_ENTRY`).
- **Live Proctoring Real-Time (SSE)**: Pantau progres siswa secara instan via Server-Sent Events beserta aksi pengawas (*Reset Pelanggaran*, *Buka Kunci*, *Kunci Sementara*, *Reset Perangkat*, *Tambah Waktu*, *Paksa Selesai*, *Ulang Ujian*).
- **Bukti Screenshot Pelanggaran**: CartaExambro otomatis merekam tangkapan layar saat terjadi pelanggaran/overlay/split-screen dan mengirimkannya ke dashboard pengawas.

### 💳 3. Administrasi Siswa & Token Dispensasi (TU)
- Kunci/buka kelayakan peserta berdasarkan verifikasi administrasi (`cleared`, `locked`, `dispensation`), import/export Excel, serta cetak slip **Token Dispensasi** sekali pakai (`session`, `daily`, `weekly`, `permanent`).

### 📶 4. Ketahanan Jaringan Sekolah (Offline Queue & Server Timer)
- **Offline Answer Queue**: Jika Wi-Fi sekolah terputus mendadak saat ujian, jawaban siswa otomatis disimpan di perangkat lokal dan disinkronkan diam-diam saat koneksi pulih.
- **Server-Authoritative Heartbeat**: Sisa waktu ujian dikontrol server untuk mencegah manipulasi jam perangkat.

### ✍️ 5. Koreksi Otomatis, AI Essay Grading & Cetak Kertas
- **Auto-Grading & Partial Credit**: Penilaian instan untuk soal objektif termasuk bobot parsial PG Kompleks & Menjodohkan.
- **AI-Assisted Essay Grading**: Evaluasi jawaban esai siswa terhadap rubrik/model jawaban guru dengan rekomendasi skor dan umpan balik konstruktif.
- **Ekspor Excel 3 Sheet**: Rekap Nilai, Jawaban Esai, dan Statistik Sesi.
- **Cetak Naskah A4, LJK & Kunci**: Antisipasi mati listrik atau ujian luring langsung dari template ujian.

---

## 🛠️ Ringkasan Arsitektur Teknis

| Komponen | Teknologi |
|---|---|
| **Web Framework** | Next.js 14 (App Router), React 18, TypeScript |
| **UI & Styling** | Tailwind CSS, shadcn/ui (Radix UI), Lucide Icons, TipTap, KaTeX |
| **Database** | Multi-Provider via Drizzle ORM (**SQLite**, **MySQL/MariaDB**, **PostgreSQL**) — 20 Tabel |
| **Autentikasi** | Cookie sesi bertanda tangan HMAC-SHA256 + `bcryptjs` (+ Opsional SSO eksternal) |
| **AI Provider** | Google GenAI SDK (`gemini-2.5-flash`), OpenRouter, OpenAI-Compatible API |
| **Real-time** | Server-Sent Events (SSE) untuk Proctoring & AI Streaming |
| **Android Client** | Kotlin, ViewBinding, System WebView, ZXing QR, `MediaProjection`, `FLAG_SECURE` |
| **Pengujian** | Vitest + React Testing Library (Unit/Component), Playwright (E2E) |

---

## 🚀 Mulai Cepat (Quick Start — 5 Menit)

### Opsi A: Menggunakan Docker Compose (Paling Praktis)
```bash
git clone https://github.com/SiMahfud/carta-exam-web.git
cd CartaExam
cp .env.example .env
docker compose up -d --build
```
Buka **`http://localhost:3333`**.

### Opsi B: Menjalankan Secara Lokal dengan Node.js (Default SQLite)
**Prasyarat:** Node.js 20+ (rekomendasi Node 22 LTS).

```bash
# 1. Clone repositori & masuk ke folder proyek
git clone https://github.com/SiMahfud/carta-exam-web.git
cd CartaExam

# 2. Instal dependensi
npm install

# 3. Salin konfigurasi environment (default sudah menggunakan SQLite local.db)
cp .env.example .env

# 4. Buat skema database (20 tabel)
npm run db:push

# 5. Jalankan server development
npm run dev
```

Akses aplikasi di **`http://localhost:3333`**.

> **Akun Bawaan (Fresh Install):**
> - **Admin:** username `admin` | password `password123`
> - **Siswa Demo:** username `siswa` | password `password123`
>
> ⚠️ **Penting:** Segera ubah password `admin` setelah login pertama, dan isi identitas sekolah Anda di **Pengaturan Sekolah (`/admin/settings`)** serta atur `SESSION_SECRET` acak di `.env` sebelum masuk produksi.

---

## 🧪 Pengujian (Testing & QA)

```bash
# Menjalankan seluruh Unit & Component Test Suite (59 files, 307 tests)
npm run test:run

# Menjalankan laporan cakupan tes (Coverage)
npm run test:coverage

# Menjalankan pemeriksaan ESLint
npm run lint

# Menjalankan build produksi Next.js
npm run build

# Menjalankan End-to-End (E2E) tests dengan Playwright
npm run test:e2e
```

---

## 📚 Indeks Dokumentasi Lengkap

### Untuk Sekolah, Guru, Pengawas & Pengguna Umum
- 🚀 **[Panduan Instalasi, Deployment & White-Label](docs/deployment_and_customization.md)** — Mulai dari setup lokal pemula hingga server produksi MySQL/PostgreSQL + Nginx + Docker.
- 👩‍🏫 **[Panduan Guru & Operator](docs/user_guide_teachers.md)** — Mengelola bank soal, AI generator, template ujian, cetak LJK, dan penilaian.
- 🛡️ **[Panduan Pengawas, Tata Usaha & Siswa](docs/user_guide_proctor_and_student.md)** — Live proctoring, token administrasi/dispensasi, SEB, dan panduan ujian siswa.

### Untuk Pengembang, Sysadmin & Kontributor
- 📱 **[Dokumentasi CartaExambro (Android)](carta-exambro/README.md)** — Cara build APK, kustomisasi sekolah (`exambro-config.properties`), auto-updater, dan protokol keamanan OS.
- 📖 **[Dokumentasi API](docs/api_documentation.md)** — Referensi lengkap seluruh endpoint REST & SSE backend.
- 🗄️ **[Dokumentasi Skema Database](docs/database_schema.md)** — Diagram ERD dan spesifikasi 20 tabel multi-provider.
- ✅ **[Matriks Fitur](FEATURES.md)** & 🗺️ **[Roadmap](ROADMAP.md)** — Status kapabilitas lengkap aplikasi.
- 🤝 **[Panduan Kontribusi](CONTRIBUTING.md)** & 🤖 **[Panduan AI Agent](AGENTS.md)**.

---

## 📜 Lisensi

Proyek ini dirilis di bawah **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE)**.

Anda **bebas** menggunakan, memodifikasi, dan men-deploy CartaExam untuk keperluan pendidikan di sekolah, universitas, maupun lembaga mana pun di seluruh dunia — **tanpa biaya**.

Jika Anda **memodifikasi dan mendistribusikan** atau **meng-hosting versi modifikasi** sebagai layanan jaringan (SaaS), Anda **wajib** menyediakan source code lengkap versi modifikasi tersebut di bawah lisensi AGPL-3.0 yang sama. Ketentuan ini memastikan CartaExam **tetap gratis dan terbuka** untuk semua orang.
