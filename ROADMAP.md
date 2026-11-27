# 🗺️ CartaExam Development Roadmap

> **Status Proyek**: 🟢 Public Release Ready (Web Platform + Safe Exam Browser + CartaExambro Android)  
> **Lisensi**: MIT License

---

## ✅ Fase yang Telah Diselesaikan

### Fase 1: Core CBT & Bank Soal
- [x] Manajemen User (`admin`, `teacher`, `student`), Mata Pelajaran, dan Kelas
- [x] 6 Tipe Soal (`mc`, `complex_mc`, `matching`, `short`, `essay`, `true_false`)
- [x] Rich Text Editor (TipTap) + Formula Matematika (KaTeX) + Upload Multimedia
- [x] Import Soal dari Word (`.docx`) dengan konversi OMML Math & pratinjau

### Fase 2: Keamanan Berlapis, Proctoring & Ketahanan Jaringan
- [x] 4 Mode Pengacakan Soal Deterministik & Acak Opsi Jawaban
- [x] Lockdown Mode (tab switch, blur, copy-paste, screenshot shortcut, watermark anti-tamper)
- [x] Mobile Browser Security (deteksi split-screen & floating window)
- [x] Server-Authoritative Timer (`heartbeat`) & Device Binding
- [x] Offline Answer Queue & Background Auto-Sync (`localStorage`)
- [x] Live Proctoring Real-Time via Server-Sent Events (SSE) + Aksi Pengawas

### Fase 3: AI Multi-Provider, Administrasi & Ekosistem Sekolah
- [x] Multi-Provider AI (Google Gemini, OpenRouter, OpenAI-Compatible) untuk **AI Question Generator (Streaming)** & **AI Essay Grading**
- [x] Student Administrative Clearance (`cleared`, `locked`, `dispensation`) & Token Dispensasi berscope + cetak slip
- [x] Cetak Naskah Ujian A4, LJK Bubble Sheet, dan Kunci Jawaban Guru
- [x] Safe Exam Browser (SEB) Config Generator (`.seb`, `sebs://`, QR Code, Quit Password)
- [x] Integrasi Opsional PortoCarta SSO & Master Data Sync

### Fase 4: CartaExambro Android Native & Rilis Publik
- [x] Aplikasi Android Native (`carta-exambro/`) dengan `FLAG_SECURE`, `setHideOverlayWindows`, `MediaProjection` overlay & screenshot evidence, `startLockTask`, dan ZXing QR Scanner offline
- [x] In-App Self-Updater dengan verifikasi SHA-256 (`/api/exambro/version` & `/api/exambro/download`)
- [x] Mode Standalone & White-Label Publik (`exambro-config.properties`, `school_settings` dinamis, `Dockerfile` + `docker-compose.yml`, lisensi MIT)
- [x] Pembaruan lengkap dokumentasi teknis & panduan pengguna awam/ahli

---

## 🔭 Rencana Pengembangan Masa Depan (Community / Post-Release)
- [ ] Dukungan soal audio/video langsung di editor bank soal
- [ ] Analisis butir soal lanjutan (tingkat kesukaran empiris & daya pembeda)
- [ ] Pilihan multi-bahasa antarmuka (i18n: Indonesia / English)
- [ ] Paket rilis APK generik otomatis via GitHub Actions Release
