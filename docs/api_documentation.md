---
layout: default
title: Dokumentasi API
nav_order: 5
description: "Referensi lengkap seluruh endpoint REST & SSE backend CartaExam."
---

# 📖 Dokumentasi API CartaExam

Referensi resmi seluruh endpoint backend **CartaExam** (Next.js App Router). Seluruh endpoint berada di bawah `/api` (kecuali callback SSO `/auth/sso` dan file statis dinamis `/uploads/[...path]`), dilindungi autentikasi berbasis cookie sesi **HMAC-SHA256** (`user_session`) dan otorisasi peran (`admin`, `teacher`, `student`).

---

## 🌐 Standar Umum
- **Base URL**: `/api`
- **Format Body**: `application/json` (kecuali upload `multipart/form-data` dan endpoint streaming SSE)
- **Autentikasi**: Cookie `httpOnly` `user_session` dari login `/login` atau `/auth/sso`
- **Format Error Umum**: `{ error: string }` atau `{ success: false, error: string }` dengan status HTTP `400`, `401`, `403`, `404`, `409`, `500`.

---

## 🔐 1. Autentikasi, Sesi & Informasi Publik

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/school-info` | Publik | Mengambil nama sekolah, alamat, logo, dan status apakah integrasi SSO PortoCarta aktif (`portoCartaEnabled`, `portoCartaUrl`). |
| `GET` | `/api/auth/session` | Authenticated | Mengambil informasi user yang sedang login (`id`, `name`, `role`). |
| `POST` | `/api/auth/reauth` | Publik | Memperbarui cookie `user_session` di tengah ujian jika sesi habis tanpa menutup halaman ujian. Body: `{ username, password }`. |
| `GET` | `/auth/sso` | Publik | Callback SSO PortoCarta. Query: `?token=<JWT_HMAC>&mode=popup&redirect=/student/exams`. |
| `GET` | `/api/seed` | Admin | Seeding akun demo awal (`admin` & `siswa`) dengan hash `bcrypt`. |

---

## 🏫 2. Admin, Analitik, Kesehatan Sistem & Backup

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/admin/stats` | Admin, Teacher | Statistik ringkas dashboard (total siswa, guru, bank soal, sesi aktif). |
| `GET` | `/api/admin/analytics` | Admin, Teacher | Distribusi nilai kelulusan, rata-rata nilai per mapel, dan komposisi bank soal. |
| `GET` | `/api/admin/activities` | Admin, Teacher | Audit log aktivitas sistem. Query: `limit`, `entityType`. |
| `GET` | `/api/admin/exam-schedule` | Admin, Teacher | Jadwal sesi ujian harian (filter `?date=YYYY-MM-DD`, default hari ini). |
| `GET` | `/api/admin/health` | Publik / Monitoring | Status konektivitas database, waktu respons (`ms`), dan versi aplikasi. |
| `POST` | `/api/admin/ai-test` | Admin | Menguji koneksi AI provider. Body: `{ provider, apiKey, model, baseUrl? }`. |
| `GET` | `/api/admin/backup` | Admin | Mengunduh snapshot JSON sistem (`subjects`, `classes`, `questionBanks`, `bankQuestions`, `examTemplates`, `settings`, `users`). |
| `POST` | `/api/admin/restore` | Admin | Memulihkan data dari file snapshot JSON hasil backup. |

---

## 💳 3. Administrasi Siswa & Token Dispensasi

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/admin/clearance` | Admin, Teacher | Daftar status administrasi siswa (`cleared`, `locked`, `dispensation`) beserta statistik. Query: `search`, `classId`, `status`. |
| `POST` | `/api/admin/clearance` | Admin, Teacher | Mengubah status administrasi 1 atau banyak siswa. Body: `{ studentIds, status, notes?, validUntil? }`. |
| `GET` | `/api/admin/clearance/export` | Admin, Teacher | Unduh template Excel (`?type=template`) atau ekspor data clearance (`?type=export&classId=...`). |
| `POST` | `/api/admin/clearance/import` | Admin, Teacher | Import massal status clearance siswa dari Excel (`multipart/form-data`, `mode=preview\|process`). |
| `GET` | `/api/admin/clearance/tokens` | Admin, Teacher | Daftar 100 token dispensasi terbaru. |
| `POST` | `/api/admin/clearance/tokens` | Admin, Teacher | Membuat token dispensasi sekali pakai. Body: `{ studentId?, customToken?, scope: 'session'\|'daily'\|'weekly'\|'permanent', notes?, expiresAt? }`. |
| `DELETE` | `/api/admin/clearance/tokens/[id]` | Admin, Teacher | Menghapus/mencabut token dispensasi. |

---

## 👥 4. Pengguna, Kelas & Mata Pelajaran

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` / `POST` | `/api/users` | Admin | Daftar & tambah user (`admin`, `teacher`, `student`). |
| `GET` / `PUT` / `DELETE` | `/api/users/[id]` | Admin | Detail, update, atau hapus user. |
| `GET` | `/api/users/bulk-export` | Admin | Unduh template import (`?type=template`) atau ekspor user (`?type=all\|students\|teachers`). |
| `POST` | `/api/users/bulk-import` | Admin | Import/update/delete massal user & pembuatan kelas otomatis dari Excel. |
| `GET` / `POST` | `/api/classes` | Admin, Teacher | Daftar & buat kelas baru. |
| `GET` / `PUT` / `DELETE` | `/api/classes/[id]` | Admin, Teacher | Detail, edit, atau hapus kelas. |
| `GET` / `POST` | `/api/classes/[id]/students` | Admin, Teacher | Daftar & daftarkan siswa ke kelas. |
| `DELETE` | `/api/classes/[id]/students/[studentId]` | Admin, Teacher | Keluarkan siswa dari kelas. |
| `GET` / `POST` | `/api/subjects` | Admin, Teacher | Daftar & buat mata pelajaran. |
| `GET` / `PUT` / `DELETE` | `/api/subjects/[id]` | Admin, Teacher | Detail, edit, atau hapus mata pelajaran. |

---

## 📚 5. Bank Soal, Scoring, Upload & AI Generator

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` / `POST` | `/api/question-banks` | Admin, Teacher | Daftar & buat bank soal. (Guru terisolasi ke bank miliknya/sesuai hak akses). |
| `GET` / `PUT` / `DELETE` | `/api/question-banks/[id]` | Admin, Teacher | Detail, ubah, atau hapus bank soal. |
| `POST` | `/api/question-banks/[id]/duplicate` | Admin, Teacher | Duplikasi bank soal beserta seluruh butir soalnya. |
| `GET` / `POST` | `/api/question-banks/[id]/questions` | Admin, Teacher | Daftar & tambah butir soal (`mc`, `complex_mc`, `matching`, `short`, `essay`, `true_false`). |
| `GET` / `PUT` / `DELETE` | `/api/question-banks/[id]/questions/[questionId]` | Admin, Teacher | Detail, edit, atau hapus butir soal. |
| `GET` | `/api/question-banks/[id]/questions/tags` | Admin, Teacher | Daftar seluruh tag unik dalam bank soal. |
| `POST` | `/api/ai/generate-questions/stream` | Admin, Teacher | **SSE Stream** pembuatan soal otomatis dari teks/file dengan live `thought`, `token`, dan `result` events. |
| `GET` / `POST` | `/api/scoring-templates` | Admin, Teacher | Daftar & buat template pembobotan nilai. |
| `POST` | `/api/upload` | Admin, Teacher | Upload media soal (JPG, PNG, WebP, GIF, SVG, PDF; maks 5 MB). |
| `GET` | `/uploads/[...path]` | Publik / Terbatas | Menyajikan file upload; khusus subfolder `violations/*` mewajibkan login `admin`/`teacher`. |

---

## 📝 6. Template Ujian, Sesi Ujian & Live Proctoring

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` / `POST` | `/api/exam-templates` | Admin, Teacher | Daftar & buat template ujian. |
| `GET` / `PUT` / `DELETE` | `/api/exam-templates/[id]` | Admin, Teacher | Detail, edit, atau hapus template ujian. |
| `POST` | `/api/exam-templates/[id]/duplicate` | Admin, Teacher | Duplikasi template ujian. |
| `GET` | `/api/exam-templates/[id]/preview` | Admin, Teacher | Pratinjau soal terurut/teracak untuk fitur cetak naskah A4, LJK, dan kunci guru. |
| `GET` / `POST` | `/api/exam-sessions` | Admin, Teacher | Daftar & jadwalkan sesi ujian baru. |
| `GET` / `PATCH` / `DELETE` | `/api/exam-sessions/[id]` | Admin, Teacher | Detail, ubah status/jadwal, atau hapus sesi ujian. |
| `POST` | `/api/exam-sessions/[id]/generate-questions` | Admin, Teacher | Generate & simpan paket `question_pools` per siswa sebelum ujian dimulai. |
| `GET` / `POST` / `DELETE` | `/api/exam-sessions/[id]/token` | Admin, Teacher | Lihat, generate, atau hapus token akses sesi ujian. |
| `GET` | `/api/exam-sessions/[id]/monitor` | Admin, Teacher | Snapshot progres seluruh peserta, jumlah pelanggaran, dan status sesi. |
| `GET` | `/api/exam-sessions/[id]/events` | Admin, Teacher | **SSE Stream** event proctoring real-time (`connected`, `student_start`, `violation`, `student_submit`, `student_heartbeat`, `proctor_action`, `session_update`). |
| `POST` | `/api/exam-sessions/[id]/monitor/action` | Admin, Teacher | Aksi pengawas per siswa: `reset_violations`, `lock_session`, `unlock_session`, `reset_device`, `force_submit`, `retake`. |
| `POST` | `/api/exam-sessions/[id]/participant-actions` | Admin, Teacher | Aksi massal pengawas untuk banyak `studentIds`: `reset_time`, `reset_violations`, `reset_permission`, `lock_session`, `add_time`, `force_finish`, `retake`. |
| `GET` | `/api/exam-sessions/[id]/violations/[studentId]` | Admin, Teacher | Detail log pelanggaran & URL screenshot bukti per siswa. |
| `GET` | `/api/exam-sessions/[id]/results` | Admin, Teacher | Rekap hasil pengerjaan sesi ujian. |
| `POST` | `/api/exam-sessions/[id]/resync-scores` | Admin, Teacher | Hitung ulang skor seluruh jawaban objektif berdasarkan kunci terbaru di bank soal. |
| `GET` | `/api/exam-sessions/[id]/export` | Admin, Teacher | Ekspor rekap nilai ke Excel `.xlsx` (3 sheet: Rekap Nilai, Jawaban Essay, Statistik). |

---

## 🎓 7. Portal & Runtime Ujian Siswa

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/student/profile` | Authenticated | Profil siswa login, kelas aktif, dan status administrative clearance. |
| `GET` | `/api/student/exams` | Student+ | Daftar sesi ujian yang ditugaskan beserta status (`upcoming`, `active`, `in_progress`, `completed`, `expired`). |
| `POST` | `/api/student/exams/[sessionId]/start` | Student+ | Memulai ujian (validasi jadwal, SEB/Exambro, clearance/token dispensasi, token proktor, late tolerance, dan buat submission). |
| `GET` | `/api/student/exams/[sessionId]/questions` | Student+ | Mengambil daftar soal & jawaban tersimpan sesuai urutan dan acak opsi deterministik siswa. |
| `POST` | `/api/student/exams/[sessionId]/answer` | Student+ | Menyimpan & auto-grade jawaban per butir soal (termasuk dukungan flag ragu-ragu). |
| `POST` | `/api/student/exams/[sessionId]/heartbeat` | Student+ | Sinkronisasi sisa waktu otoritatif dari server, validasi `deviceId`, dan deteksi clock tampering. |
| `POST` | `/api/student/exams/[sessionId]/violation` | Student+ | Mencatat pelanggaran lockdown (dengan cooldown server-side & auto-terminate sesuai mode). |
| `POST` | `/api/student/exams/[sessionId]/violation-evidence` | Student+ | Upload screenshot bukti pelanggaran JPEG/PNG/WebP (maks 2 MB, maks 5 foto per kejadian, dikirim oleh CartaExambro). |
| `POST` | `/api/student/exams/[sessionId]/submit` | Student+ | Finalisasi pengumpulan ujian dan perhitungan skor akhir. |
| `GET` | `/api/student/exams/[sessionId]/review` | Student+ | Melihat hasil, kunci jawaban, dan catatan koreksi guru (jika `allowReview` atau `published`). |

---

## ✍️ 8. Penilaian & AI Grading

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` | `/api/grading/stats` | Admin, Teacher | Statistik antrean penilaian manual & status publikasi. |
| `GET` | `/api/grading/submissions` | Admin, Teacher | Daftar lembar jawaban siswa untuk dikoreksi (mendukung filter sesi/kelas/status). |
| `GET` / `POST` | `/api/grading/submissions/[id]` | Admin, Teacher | Ambil detail lembar jawaban siswa & simpan skor/umpan balik manual per soal. |
| `POST` | `/api/grading/submissions/[id]/publish` | Admin, Teacher | Publikasikan nilai agar dapat dilihat siswa. |
| `POST` | `/api/grading/batch-publish` | Admin, Teacher | Publikasi massal banyak `submissionIds` sekaligus. |
| `POST` | `/api/grading/ai-assist` | Admin, Teacher | Evaluasi jawaban esai menggunakan AI provider aktif (`suggestedScore`, `feedback`, `strengths`, `improvements`). |

---

## 🛡️ 9. Safe Exam Browser (SEB), CartaExambro & Utilitas

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| `GET` / `PUT` | `/api/admin/seb-config` | Admin | Membaca & menyimpan konfigurasi SEB (`.seb-config.json`), Quit Password, URL filter, dan PIN darurat CartaExambro. |
| `GET` | `/api/seb/config` | Publik | Menghasilkan dan mengunduh file XML Apple Plist `cartaexam.seb`. |
| `GET` | `/api/seb/qr` | Publik | Menghasilkan QR Code `sebs://...` dalam format `svg` (default) atau `png` (`?format=png`). |
| `GET` | `/api/seb/quit-info` | Publik | Informasi `quitUrl` & status `hasQuitPassword` untuk tombol keluar SEB. |
| `GET` | `/api/exambro/version` | Publik | Metadata rilis APK CartaExambro terbaru (`versionCode`, `versionName`, `minSupportedVersionCode`, `forceUpdate`, `sha256`, `downloadUrl`). |
| `GET` | `/api/exambro/download` | Publik | Mengunduh file APK CartaExambro yang tersedia di server. |
| `GET` | `/api/search` | Admin, Teacher | Pencarian global soal, ujian, siswa, kelas, dan mapel (`?q=...&limit=5`). |
| `GET` / `POST` | `/api/saved-filters` | Authenticated | Daftar & simpan preset filter pribadi per halaman (`?page=...`). |
| `DELETE` | `/api/saved-filters/[id]` | Authenticated | Hapus preset filter tersimpan. |
| `GET` | `/api/notifications` | Authenticated | Notifikasi header (sesi aktif, ujian siap review, antrean koreksi). |
| `GET` | `/api/integration/ping` | Admin, Teacher | Uji konektivitas & latensi ke PortoCarta Master Hub (opsional). |
| `POST` | `/api/integration/pull-sync` | Admin, Teacher | Tarik data master (Mapel, Guru, Kelas, Siswa) dari PortoCarta (opsional). |
| `POST` | `/api/integration/sync-receive` | API Key (`X-API-Key` / Bearer) | Endpoint webhook penerima *push sync* dari PortoCarta (aktif hanya jika `PORTOCARTA_API_KEY` diset). |
