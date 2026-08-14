# CartaExam

**Platform Ujian Digital & Computer Based Test (CBT) Modern untuk SMAN 1 Campurdarat**

CartaExam adalah sistem ujian berbasis web berkinerja tinggi yang dirancang khusus untuk menyelenggarakan asesmen dan evaluasi pembelajaran yang aman, tahan gangguan jaringan (*offline resilient*), efisien, dan dilengkapi asisten AI.

---

## 🌟 Fitur Utama

### 🛡️ 1. Keamanan Ujian & Anti-Kecurangan (Lockdown Mode)
- **Deteksi Pelanggaran Real-time**: Mendeteksi otomatis aksi berpindah tab (*tab switch*), keluar mode layar penuh (*fullscreen exit*), dan upaya pintasan keyboard/screenshot.
- **Signed Session & Auth Guard**: Mengamankan identitas siswa dan hak akses API menggunakan HMAC-SHA256 token verification.
- **Seeded Deterministic Randomization**: Pengacakan butir soal dan opsi pilihan ganda unik per siswa yang konsisten dan anti-bocor.
- **Live Proctoring Feed**: Dashboard pengawas dengan auto-refresh 5 detik untuk memantau pengerjaan dan tombol aksi (*Reset Pelanggaran*, *Buka Kunci Ujian*, *Paksa Selesai*).

### 📶 2. PWA & Offline Resilience (Ketahanan Jaringan Sekolah)
- **Offline Queue**: Jawaban siswa otomatis tersimpan di memori perangkat lokal saat Wi-Fi sekolah terputus mendadak.
- **Background Auto-Sync**: Jawaban otomatis disinkronkan ke server secara hening saat koneksi kembali terhubung tanpa refresh halaman.
- **Web App Manifest**: Mendukung instalasi PWA di laptop, tablet, dan smartphone siswa.

### 🤖 3. AI-Assisted Essay Grading (Google Gemini)
- **Koreksi Esai Otomatis**: Analisis cerdas jawaban uraian siswa terhadap kunci dan rubrik penilaian guru menggunakan Google Gemini AI.
- **Feedback Konstruktif**: Rekomendasi skor instan beserta catatan kekuatan dan hal yang perlu ditingkatkan oleh siswa.

### 📊 4. Dashboard Analytics & Review Hasil Siswa
- **Visual Analytics**: Grafik distribusi nilai kelulusan, perbandingan rata-rata capaian antar mata pelajaran, dan komposisi bank soal.
- **Review Mode Siswa**: Siswa dapat meninjau skor, kunci jawaban, dan pembahasan setelah ujian dipublikasikan.

### 🖨️ 5. Alat Operasional & Cetak Naskah
- **Cetak Naskah Soal & LJK Kertas**: Generator cetak standar ujian nasional A4, Lembar Jawaban Komputer (LJK), dan kunci jawaban guru untuk antisipasi mati listrik.
- **Backup & Restore**: Ekspor dan pemulihan snapshot database lengkap sekolah dalam 1 klik.
- **Bulk User Import**: Template Excel `.xlsx` resmi untuk import ratusan siswa dan guru sekaligus.
- **Audit Activity Logs**: Rekam jejak audit keamanan seluruh aktivitas di sistem.

---

## 🛠️ Teknologi & Arsitektur

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes (Serverless & Stateful)
- **Database Support**: Multi-Provider (SQLite / MySQL / PostgreSQL) via Drizzle ORM
- **Math Formula**: KaTeX & LaTeX Rendering
- **Artificial Intelligence**: Google GenAI SDK (Gemini 2.5 Flash)
- **Testing**: Vitest, React Testing Library, Playwright

---

## 🚀 Memulai (Getting Started)

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Konfigurasi Environment
Salin file `.env.example` ke `.env` dan sesuaikan konfigurasi (default: SQLite `local.db`):
```bash
cp .env.example .env
```

### 3. Menjalankan Server Development
```bash
npm run dev
```
Akses aplikasi di browser pada alamat [http://localhost:3333](http://localhost:3333).

---

## 🧪 Pengujian (Testing & QA)

CartaExam dilengkapi dengan rangkaian test komprehensif:

```bash
# Menjalankan seluruh Unit & Component Test Suite (32 files, 178 tests)
npm run test:run

# Menjalankan ESLint verification (0 errors, 0 warnings)
npm run lint

# Menjalankan E2E testing dengan Playwright
npm run test:e2e
```

---

## 📚 Dokumentasi Terkait

- [Dokumentasi API](docs/api_documentation.md) - Rincian lengkap seluruh endpoint backend
- [Skema Database](docs/database_schema.md) - Diagram ERD dan struktur tabel multi-provider
- [Panduan Pengguna untuk Guru](docs/user_guide_teachers.md) - Panduan praktis operasional guru & operator
- [Roadmap Pengembangan](ROADMAP.md) - Rencana dan riwayat implementasi fitur
- [Fitur Lengkap](FEATURES.md) - Matriks kapabilitas aplikasi CartaExam
