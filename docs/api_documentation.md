# 📖 Dokumentasi API CartaExam

Dokumentasi resmi seluruh endpoint backend CartaExam (Next.js App Router). Seluruh rute API terletak di bawah `/api` dan dilindungi oleh layer otentikasi role-based (`requireAuth`, `requireStudent`, `requireTeacher`).

---

## 🌐 URL Dasar & Standar Respons
- **Base URL**: `/api`
- **Format Payload**: `application/json`
- **Autentikasi**: Cookie sesi bertanda tangan HMAC-SHA256 (`user_session`)

---

## 📑 Daftar Endpoint

### 📊 1. Analitik & Dashboard (Admin & Teacher)
- **GET** `/api/admin/analytics`
  - Mengambil statistik komprehensif: distribusi skor kelulusan, performa rata-rata per mata pelajaran, komposisi bank soal, dan ringkasan nilai sistem.
- **GET** `/api/admin/stats`
  - Statistik cepat dashboard (total siswa, guru, sesi aktif, dan submission).
- **GET** `/api/admin/activities`
  - Mengambil rekam jejak audit log aktivitas sistem.
  - Query Params: `limit` (default: 50), `entityType` (`exam_session`, `question_bank`, `subject`, `class`, `user`).

---

### 🤖 2. Penilaian & AI-Assisted Grading
- **GET** `/api/grading/submissions`
  - Menampilkan daftar pengerjaan siswa yang perlu diperiksa atau dinilai.
- **GET** `/api/grading/submissions/[id]`
  - Mengambil detail lembar jawaban siswa lengkap dengan panduan & rubrik guru.
- **POST** `/api/grading/submissions/[id]`
  - Menyimpan koreksi nilai manual dan catatan guru.
- **POST** `/api/grading/ai-assist`
  - Menganalisis jawaban esai siswa menggunakan Google Gemini AI.
  - Body: `{ questionText: string, studentAnswer: string, maxPoints: number, guidelines?: string, rubric?: Array }`
  - Response: `{ suggestedScore: number, feedback: string, strengths: string[], improvements: string[] }`

---

### 📡 3. Sesi Ujian & Live Proctoring
- **GET** `/api/exam-sessions`
  - Mengambil daftar semua sesi ujian terjadwal.
- **POST** `/api/exam-sessions`
  - Membuat sesi ujian baru.
- **GET** `/api/exam-sessions/[id]`
  - Mengambil detail konfigurasi sesi ujian.
- **PATCH** `/api/exam-sessions/[id]`
  - Memperbarui jadwal, status, atau target kelas sesi ujian.
- **DELETE** `/api/exam-sessions/[id]`
  - Menghapus sesi ujian dan membersihkan alokasi pool soal.
- **GET** `/api/exam-sessions/[id]/monitor`
  - Mengambil status pengerjaan seluruh peserta (live progress, pelanggaran, waktu mulai).
- **POST** `/api/exam-sessions/[id]/monitor/action`
  - Aksi pengawas real-time: `reset_violations`, `unlock_session`, `force_submit`.
  - Body: `{ studentId: string, action: string }`
- **GET/POST/DELETE** `/api/exam-sessions/[id]/token`
  - Mengambil, membangkitkan (generate), atau menghapus token akses dinamis ujian.
- **GET** `/api/exam-sessions/[id]/results`
  - Mengambil rekapitulasi nilai dan ekspor hasil ujian.

---

### 🎓 4. Portal Siswa (Student Exam Runtime)
- **GET** `/api/student/exams`
  - Mengambil daftar ujian yang ditugaskan ke siswa yang sedang login.
- **POST** `/api/student/exams/[sessionId]/start`
  - Memulai pengerjaan ujian siswa (verifikasi token & generate urutan soal teracak).
- **GET** `/api/student/exams/[sessionId]/questions`
  - Mengambil daftar soal dan status jawaban siswa.
- **POST** `/api/student/exams/[sessionId]/answer`
  - Menyimpan jawaban siswa untuk butir soal tertentu.
- **POST** `/api/student/exams/[sessionId]/violation`
  - Mencatat log pelanggaran lockdown (pindah tab, screenshot attempt, dll).
- **POST** `/api/student/exams/[sessionId]/submit`
  - Menyelesaikan dan mengumpulkan lembar ujian secara final.
- **GET** `/api/student/exams/[sessionId]/review`
  - Menampilkan hasil nilai, kunci jawaban, pembahasan, dan catatan guru setelah ujian selesai.

---

### 🔔 5. Notifikasi Sistem
- **GET** `/api/notifications`
  - Mengambil daftar notifikasi personal (jadwal ujian aktif, nilai siap direview, lembar siap dikoreksi).

---

### 💾 6. Backup, Restore & Data Tools (Admin Only)
- **GET** `/api/admin/backup`
  - Mengunduh snapshot database lengkap sekolah dalam format `.carta-backup.json`.
- **POST** `/api/admin/restore`
  - Memulihkan data dari file snapshot `.carta-backup.json`.
- **GET** `/api/users/bulk-export`
  - Mengunduh template resmi Excel (`type=template`) atau mengekspor data pengguna (`type=all|students|teachers`).
- **POST** `/api/users/bulk-import`
  - Memvalidasi dan memasukkan data siswa & guru secara massal dari file Excel/CSV.

---

### 📚 7. Bank Soal & Template Ujian
- **GET/POST** `/api/question-banks`
- **GET/PUT/DELETE** `/api/question-banks/[id]`
- **GET/POST** `/api/question-banks/[id]/questions`
- **GET/PUT/DELETE** `/api/question-banks/[id]/questions/[questionId]`
- **GET/POST** `/api/exam-templates`
- **GET/PUT/DELETE** `/api/exam-templates/[id]`
- **GET** `/api/exam-templates/[id]/preview`
  - Mengambil pratinjau soal template ujian untuk cetak naskah & LJK.

---

### 👥 8. Kelas & Pengguna
- **GET/POST** `/api/classes`
- **GET/PUT/DELETE** `/api/classes/[id]`
- **POST** `/api/classes/[id]/students`
- **GET/POST** `/api/users`
- **GET/PUT/DELETE** `/api/users/[id]`
- **POST** `/api/upload`
  - Upload file multimedia soal (gambar/audio) dengan whitelist MIME dan batas 5MB.
