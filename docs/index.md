---
layout: default
title: Beranda
nav_order: 1
description: "Platform Ujian Digital (CBT) open-source, aman, dan tahan gangguan jaringan untuk sekolah di seluruh dunia."
permalink: /
---

# 🎓 CartaExam & CartaExambro
{: .fs-9 }

Platform Ujian Digital (CBT) Modern, Aman, Open-Source, dan Tahan Gangguan Jaringan untuk Sekolah di Seluruh Dunia.
{: .fs-6 .fw-300 }

[Mulai Cepat](#-mulai-cepat){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 }
[Lihat di GitHub](https://github.com/SiMahfud/carta-exam-web){: .btn .fs-5 .mb-4 .mb-md-0 }
[Download Release v1.1.0](https://github.com/SiMahfud/carta-exam-web/releases/tag/v1.1.0){: .btn .fs-5 .mb-4 .mb-md-0 }

---

## Apa itu CartaExam?

**CartaExam** adalah ekosistem asesmen digital lengkap yang terdiri dari:

1. **CartaExam Web** — Aplikasi web CBT berbasis **Next.js 14**, **Drizzle ORM** (SQLite / MySQL / PostgreSQL), **Tailwind CSS**, dan **shadcn/ui**.
2. **CartaExambro** — Aplikasi browser ujian native **Android** (Kotlin + WebView) dengan proteksi layar OS, anti-overlay, dan bukti screenshot pelanggaran.
3. **Integrasi Safe Exam Browser (SEB)** — Generator file `.seb` & QR Code untuk perangkat **Windows, macOS, iPhone, dan iPad**.

---

## 🌟 Fitur Utama

### 📚 Bank Soal & AI Generator
- **6 tipe soal**: Pilihan Ganda, PG Kompleks, Menjodohkan, Isian Singkat, Benar/Salah, dan Esai
- **Rich Text & Matematika**: Editor TipTap + KaTeX/LaTeX + upload gambar
- **Import Word (.docx)**: Konversi rumus OMML → LaTeX otomatis
- **AI Question Generator (Streaming)**: Google Gemini, OpenRouter, atau OpenAI-Compatible

### 🛡️ Keamanan Ujian & Live Proctoring
- **Lockdown Mode**: Deteksi tab switch, blokir copy-paste, watermark anti-tamper
- **Safe Exam Browser (SEB)** & **CartaExambro Android**: Proteksi tingkat OS
- **Device Binding**: 1 perangkat per siswa
- **Live Proctoring Real-Time (SSE)**: 7 aksi pengawas langsung

### 📶 Ketahanan Jaringan
- **Offline Answer Queue**: Jawaban tersimpan lokal & auto-sync saat online
- **Server-Authoritative Timer**: Anti-manipulasi jam perangkat

### ✍️ Penilaian & Ekspor
- **Auto-Grading & Partial Credit** untuk soal objektif
- **AI Essay Grading** berdasarkan rubrik guru
- **Ekspor Excel 3 Sheet** & **Cetak Naskah A4, LJK, Kunci Jawaban**

### 💳 Administrasi
- **Student Clearance & Token Dispensasi** (sesi, harian, mingguan, permanen)
- **Bulk Import/Export Excel** untuk siswa, kelas, mapel
- **Activity Logs & Analytics Dashboard**

---

## 🛠️ Arsitektur Teknis

| Komponen | Teknologi |
|:--|:--|
| **Web Framework** | Next.js 14 (App Router), React 18, TypeScript |
| **UI & Styling** | Tailwind CSS, shadcn/ui, TipTap, KaTeX |
| **Database** | SQLite / MySQL / PostgreSQL via Drizzle ORM (20 tabel) |
| **Autentikasi** | Cookie HMAC-SHA256 + bcryptjs (+ SSO opsional) |
| **AI Provider** | Google GenAI SDK, OpenRouter, OpenAI-Compatible |
| **Real-time** | Server-Sent Events (SSE) |
| **Android Client** | Kotlin, ViewBinding, System WebView, ZXing QR |
| **Testing** | 59 test files, 307 tests (Vitest + Playwright) |

---

## 🚀 Mulai Cepat

### Opsi A: Docker Compose (Paling Praktis)

```bash
git clone https://github.com/SiMahfud/carta-exam-web.git
cd carta-exam-web
cp .env.example .env
docker compose up -d --build
```

### Opsi B: Node.js + SQLite (Tanpa Docker)

```bash
git clone https://github.com/SiMahfud/carta-exam-web.git
cd carta-exam-web
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Buka **`http://localhost:3333`** — Login: `admin` / `password123`

{: .warning }
> Segera ganti password `admin` setelah login pertama dan atur `SESSION_SECRET` acak di `.env` sebelum masuk produksi.

---

## 📚 Dokumentasi

| Dokumen | Untuk Siapa |
|:--|:--|
| [Panduan Instalasi & Deployment](deployment_and_customization) | Semua pengguna — dari pemula hingga sysadmin |
| [Panduan Guru & Operator](user_guide_teachers) | Guru, operator ujian |
| [Panduan Pengawas & Siswa](user_guide_proctor_and_student) | Pengawas, TU, siswa |
| [Dokumentasi API](api_documentation) | Developer & integrator |
| [Skema Database](database_schema) | Developer & DBA |
| [CartaExambro Android](https://github.com/SiMahfud/carta-exam-web/blob/master/carta-exambro/README.md) | Developer Android |
| [Matriks Fitur](https://github.com/SiMahfud/carta-exam-web/blob/master/FEATURES.md) | Semua |
| [Roadmap](https://github.com/SiMahfud/carta-exam-web/blob/master/ROADMAP.md) | Kontributor |
| [Panduan Kontribusi](https://github.com/SiMahfud/carta-exam-web/blob/master/CONTRIBUTING.md) | Kontributor |

---

## 📜 Lisensi

**[AGPL-3.0](https://github.com/SiMahfud/carta-exam-web/blob/master/LICENSE)** — Bebas digunakan, dimodifikasi, dan di-deploy oleh siapa saja. Jika Anda memodifikasi dan mendistribusikan atau meng-hosting sebagai layanan, Anda wajib membuka source code di bawah lisensi yang sama.

---

## 🤝 Kontribusi

Kami menerima kontribusi dari siapa saja! Lihat [Panduan Kontribusi](https://github.com/SiMahfud/carta-exam-web/blob/master/CONTRIBUTING.md) untuk memulai.

[Laporkan Bug](https://github.com/SiMahfud/carta-exam-web/issues/new?template=bug_report.md){: .btn .btn-outline .mr-2 }
[Usulkan Fitur](https://github.com/SiMahfud/carta-exam-web/issues/new?template=feature_request.md){: .btn .btn-outline }
