# ✅ CartaExam & CartaExambro — Matriks Fitur Lengkap

> **Referensi Cepat**: Status implementasi aktual seluruh kapabilitas platform CartaExam (Web + Android Native + SEB).

---

## 🌟 Ringkasan Kapabilitas Produksi

| Kategori | Fitur | Status | Keterangan |
|---|---|---|---|
| **Ketahanan Jaringan** | PWA Manifest & Offline Queue | ✅ | Antrean jawaban lokal `localStorage` + auto-sync saat online kembali |
| **AI Multi-Provider** | Gemini / OpenRouter / OpenAI-Compatible | ✅ | Streaming AI Question Generator + AI Essay Grading Assist + uji koneksi |
| **Proctoring Live** | Monitoring Real-Time (SSE) | ✅ | Stream event langsung (`events/route.ts`) + kontrol aksi pengawas |
| **Keamanan Browser** | Safe Exam Browser (SEB) + CartaExambro | ✅ | Generator `.seb` Plist, QR Code SEB, `requireSeb`/`requireExambro`, Android native app |
| **Bukti Pelanggaran** | Screenshot Burst Evidence (`MediaProjection`) | ✅ | Unggah otomatis 1–3 JPEG saat overlay/app-switch/split-screen di CartaExambro |
| **Administrasi TU** | Student Clearance & Dispensation Tokens | ✅ | Status `cleared`/`locked`/`dispensation`, Excel import/export, cetak slip token |
| **Analitik & Review** | Dashboard Analytics & Student Review | ✅ | Grafik kelulusan, rata-rata mapel, komposisi soal, dan review pembahasan |
| **Cetak Luring** | Generator Naskah A4, LJK & Kunci Guru | ✅ | Kop sekolah dinamis dari pengaturan sekolah |
| **Data Tools** | Backup/Restore JSON & Bulk User Excel | ✅ | Snapshot database + import/update/delete massal dengan auto-create kelas |
| **Audit Sistem** | Activity Logs Explorer | ✅ | Log audit aktivitas di `/admin/activity-logs` |
| **Notifikasi & Pencarian** | Notification Bell & Global Search (`Ctrl+K`) | ✅ | Pencarian cepat soal, ujian, siswa, kelas, dan mapel |

---

## 📚 Sistem Bank Soal

| Fitur | Status | Keterangan |
|---|---|---|
| Pilihan Ganda (`mc`) | ✅ | 4–5 opsi (A–E), KaTeX math, gambar |
| Pilihan Ganda Kompleks (`complex_mc`) | ✅ | Multi-jawaban benar dengan *partial credit* |
| Menjodohkan (`matching`) | ✅ | Pasangan kiri-kanan + *partial credit* |
| Isian Singkat (`short`) | ✅ | Pencocokan *case-insensitive* multi-jawaban |
| Benar / Salah (`true_false`) | ✅ | Penilaian otomatis |
| Esai / Uraian (`essay`) | ✅ | Model jawaban & rubrik penilaian + AI assist |
| Rich Text & Math (TipTap + KaTeX) | ✅ | Format teks, gambar (upload maks 5 MB), formula LaTeX |
| Import Soal Word (`.docx`) | ✅ | Konversi rumus OMML → MathML → LaTeX, ekstraksi gambar, pratinjau & Replace All |
| AI Question Generator (SSE) | ✅ | Streaming *thought* & *token*, dukungan konteks teks/file |
| Duplikasi Bank Soal, Tag & Kesulitan | ✅ | Clone bank, tag topik, level `easy`/`medium`/`hard`, default points |

---

## 📝 Manajemen Template & Sesi Ujian

| Fitur | Status | Keterangan |
|---|---|---|
| Template Ujian & Question Pool | ✅ | Multi-bank, filter tag, komposisi per tipe, atau penarikan pool acak |
| 4 Mode Pengacakan Deterministik | ✅ | `all`, `by_type`, `exclude_type`, `specific_numbers` + acak opsi jawaban + esai di akhir |
| Duplikasi Template & Scoring Template | ✅ | Clone template & atur bobot nilai kustom / *partial credit* |
| Penjadwalan Sesi & Target Peserta | ✅ | Penugasan per kelas atau per siswa dengan filter & pencarian |
| Token Akses Sesi Dinamis | ✅ | Generate / hapus token pengawas per sesi |
| Toleransi Keterlambatan (`lateToleranceMinutes`) | ✅ | Penguncian otomatis peserta terlambat (`LATE_ENTRY`) |
| Aksi Pengawas Per-Siswa & Massal | ✅ | `reset_violations`, `lock_session`, `unlock_session`, `reset_device`, `add_time`, `force_submit`, `retake` |
| Ekspor Hasil Excel 3 Sheet | ✅ | Sheet *Rekap Nilai*, *Jawaban Essay*, dan *Statistik* |
| Resync Skor Objektif | ✅ | Hitung ulang skor jawaban jika kunci di bank soal direvisi |

---

## 🔐 Keamanan Web & CartaExambro Android

| Fitur | Status | Keterangan |
|---|---|---|
| Web Lockdown Mode | ✅ | Tab switch, window blur, copy/paste/cut, klik kanan, shortcut screenshot, watermark anti-tamper |
| Mobile Web Security | ✅ | Deteksi split-screen & floating window di browser mobile (`mobile-security.ts`) |
| Device Binding | ✅ | Penguncian pengerjaan ke 1 perangkat (`device_id`) |
| Server-Authoritative Heartbeat | ✅ | Timer dikontrol server & deteksi manipulasi jam perangkat |
| Safe Exam Browser (SEB) | ✅ | File `.seb`, deep link `sebs://`, QR Code, Config Key SHA-256, Quit URL `/seb-quit` |
| CartaExambro Android Native | ✅ | `FLAG_SECURE`, `setHideOverlayWindows`, `startLockTask`, anti-mic/screen-recording, QR offline, auto-updater SHA-256, konfigurasi white-label |

---

## 🔧 Infrastruktur, Kualitas & Dokumentasi

| Item | Status | Keterangan |
|---|---|---|
| Multi-Database Provider | ✅ | SQLite (`better-sqlite3`), MySQL (`mysql2`), PostgreSQL (`postgres`) via Drizzle ORM (20 tabel) |
| Docker & PM2 Deployment | ✅ | `Dockerfile`, `docker-compose.yml`, dan `pm2.config.js` siap pakai |
| White-Label & Standalone Mode | ✅ | Identitas sekolah dinamis (`school_settings`), integrasi PortoCarta opsional |
| Pengujian Otomatis | ✅ | 59 test file (307 unit/component/API tests) dengan Vitest + E2E Playwright |
| Dokumentasi Publik Lengkap | ✅ | Panduan deployment, guru, pengawas/siswa, API, skema DB, dan Android CartaExambro |
