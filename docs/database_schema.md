# Dokumentasi Skema Database CartaExam

Dokumen ini menjelaskan skema database untuk aplikasi CartaExam. Aplikasi ini menggunakan SQLite dengan Drizzle ORM.

## Ringkasan

Database diatur ke dalam beberapa modul:
- **Manajemen Pengguna (User Management)**: Pengguna, peran (role).
- **Manajemen Mata Pelajaran & Kelas (Subject & Class Management)**: Mata pelajaran, kelas, pendaftaran siswa.
- **Manajemen Bank Soal (Question Bank Management)**: Bank soal, butir soal.
- **Template Penilaian (Scoring Templates)**: Konfigurasi penilaian yang dapat digunakan kembali.
- **Template & Sesi Ujian (Exam Templates & Sessions)**: Konfigurasi ujian dan sesi terjadwal.
- **Legacy/Integrasi**: Tabel untuk kompatibilitas ke belakang dan pelaksanaan ujian aktif.

## Tabel

### Manajemen Pengguna

#### `users`
Menyimpan informasi pengguna untuk admin, guru, dan siswa.

| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `name` | TEXT | Nama Lengkap |
| `username` | TEXT | Username unik |
| `password` | TEXT | Password ter-hash |
| `role` | TEXT | Enum: `admin`, `teacher`, `student` |
| `created_at` | INTEGER | Timestamp |

### Manajemen Mata Pelajaran & Kelas

#### `subjects`
Mata pelajaran yang diajarkan di sekolah.

| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `name` | TEXT | Nama mata pelajaran |
| `code` | TEXT | Kode unik mata pelajaran (misal: "MAT") |
| `description` | TEXT | Deskripsi opsional |
| `created_at` | INTEGER | Timestamp |

#### `classes`
Kelas atau tingkat kelas.

| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `name` | TEXT | Nama kelas (misal: "X-1") |
| `grade` | INTEGER | Tingkat kelas (10, 11, 12) |
| `academic_year` | TEXT | Tahun ajaran (misal: "2025/2026") |
| `teacher_id` | TEXT | Foreign Key -> `users.id` (Wali kelas) |
| `created_at` | INTEGER | Timestamp |

#### `class_students`
Relasi many-to-many antara kelas dan siswa.

| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `class_id` | TEXT | Foreign Key -> `classes.id` |
| `student_id` | TEXT | Foreign Key -> `users.id` |
| `enrolled_at` | INTEGER | Timestamp |

### Manajemen Bank Soal

#### `question_banks`
Kumpulan soal untuk mata pelajaran tertentu.

| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `subject_id` | TEXT | Foreign Key -> `subjects.id` |
| `name` | TEXT | Nama bank soal |
| `description` | TEXT | Deskripsi opsional |
| `created_by` | TEXT | Foreign Key -> `users.id` |
| `created_at` | INTEGER | Timestamp |
| `updated_at` | INTEGER | Timestamp |

#### `bank_questions`
Butir soal individu dalam bank soal.

| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `bank_id` | TEXT | Foreign Key -> `question_banks.id` |
| `type` | TEXT | Enum: `mc` (PG), `complex_mc` (PG Kompleks), `matching` (Menjodohkan), `short` (Isian Singkat), `essay` (Esai), `true_false` (Benar/Salah) |
| `content` | JSON | Konten soal dan opsi jawaban |
| `answer_key` | JSON | Data kunci jawaban |
| `tags` | JSON | Array tag |
| `difficulty` | TEXT | Enum: `easy` (Mudah), `medium` (Sedang), `hard` (Sulit) |
| `default_points` | INTEGER | Poin default untuk soal ini |
| `created_by` | TEXT | Foreign Key -> `users.id` |
| `created_at` | INTEGER | Timestamp |

### Template Penilaian

#### `scoring_templates`
Aturan penilaian yang dapat digunakan kembali.

| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `name` | TEXT | Nama template |
| `default_weights` | JSON | Bobot untuk setiap tipe soal |
| `allow_partial_credit` | BOOLEAN | Apakah mengizinkan nilai parsial |
| `partial_credit_rules` | JSON | Aturan perhitungan nilai parsial |

### Template & Sesi Ujian

#### `exam_templates`
Cetak biru (blueprint) untuk ujian, mendefinisikan aturan, waktu, dan pemilihan soal.

| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `name` | TEXT | Nama template |
| `subject_id` | TEXT | Foreign Key -> `subjects.id` |
| `bank_ids` | JSON | Array ID bank soal sumber |
| `duration_minutes` | INTEGER | Durasi ujian |
| `randomize_questions` | BOOLEAN | Acak urutan soal |
| `randomize_answers` | BOOLEAN | Acak urutan jawaban |
| `enable_lockdown` | BOOLEAN | Aktifkan lockdown browser |
| `violation_settings` | JSON | Detail pengaturan pelanggaran (detectTabSwitch, cooldown, dll) |
| `created_by` | TEXT | Foreign Key -> `users.id` |

#### `exam_sessions`
Sesi terjadwal dari template ujian.

| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `template_id` | TEXT | Foreign Key -> `exam_templates.id` |
| `session_name` | TEXT | Nama sesi |
| `start_time` | INTEGER | Waktu mulai terjadwal |
| `end_time` | INTEGER | Waktu selesai terjadwal |
| `status` | TEXT | Enum: `scheduled`, `active`, `completed`, `cancelled` |
| `target_type` | TEXT | Enum: `class`, `individual` |
| `target_ids` | JSON | ID kelas atau siswa yang ditugaskan |
| `access_token` | TEXT | Token akses statis untuk sesi jika diaktifkan |

#### `question_pools`
Menyimpan set soal spesifik yang dihasilkan untuk siswa dalam sesi (jika menggunakan pengacakan).

| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `session_id` | TEXT | Foreign Key -> `exam_sessions.id` |
| `student_id` | TEXT | Foreign Key -> `users.id` |
| `selected_questions` | JSON | Array dari `bank_questions.id` |
| `question_order` | JSON | Urutan soal |

### Eksekusi Ujian (Legacy/Aktif)

#### `exams`
(Legacy/Integrasi) Merepresentasikan instansi ujian.

| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `title` | TEXT | Judul ujian |
| `session_id` | TEXT | Foreign Key -> `exam_sessions.id` |
| `duration_minutes` | INTEGER | Durasi |

#### `questions`
Soal yang diinstansiasi untuk ujian tertentu.

| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `exam_id` | TEXT | Foreign Key -> `exams.id` |
| `bank_question_id` | TEXT | Foreign Key -> `bank_questions.id` |
| `type` | TEXT | Tipe soal |
| `content` | JSON | Konten |
| `answer_key` | JSON | Kunci jawaban |

#### `submissions`
Pengumpulan jawaban siswa untuk ujian.

| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `exam_id` | TEXT | Foreign Key -> `exams.id` |
| `user_id` | TEXT | Foreign Key -> `users.id` |
| `session_id` | TEXT | Foreign Key -> `exam_sessions.id` |
| `score` | INTEGER | Total nilai |
| `status` | TEXT | Enum: `in_progress`, `completed`, `terminated` |
| `violation_count` | INTEGER | Jumlah pelanggaran terdeteksi |
| `bonus_time_minutes` | INTEGER | Waktu tambahan yang diberikan guru (menit) |

#### `answers`
Jawaban individu dalam pengumpulan.

| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `submission_id` | TEXT | Foreign Key -> `submissions.id` |
| `question_id` | TEXT | Foreign Key -> `questions.id` |
| `student_answer` | JSON | Jawaban siswa |
| `is_correct` | BOOLEAN | Status kebenaran |
| `score` | INTEGER | Nilai untuk jawaban ini |

#### `exam_tokens`
Token dinamis untuk akses ujian.

| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `exam_id` | TEXT | Foreign Key -> `exams.id` |
| `token` | TEXT | String token |
| `valid_until` | INTEGER | Waktu kedaluwarsa |
