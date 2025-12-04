# Dokumentasi API CartaExam

Dokumen ini menguraikan endpoint API yang tersedia di aplikasi CartaExam. Semua rute API terletak di bawah `/api`.

## URL Dasar
`/api`

## Endpoint

### Kelas (Classes)
Mengelola kelas dan pendaftaran siswa.

- **GET** `/api/classes`
  - Mengambil daftar semua kelas.
- **POST** `/api/classes`
  - Membuat kelas baru.
- **GET** `/api/classes/[id]`
  - Mengambil detail kelas tertentu.
- **PUT** `/api/classes/[id]`
  - Memperbarui kelas tertentu.
- **DELETE** `/api/classes/[id]`
  - Menghapus kelas tertentu.
- **POST** `/api/classes/[id]/students`
  - Menambahkan siswa ke kelas.
  - Validasi: Siswa tidak boleh terdaftar di kelas lain (aturan 1 siswa = 1 kelas).

### Mata Pelajaran (Subjects)
Mengelola mata pelajaran.

- **GET** `/api/subjects`
  - Mengambil daftar semua mata pelajaran.
- **POST** `/api/subjects`
  - Membuat mata pelajaran baru.
- **GET** `/api/subjects/[id]`
  - Mengambil detail mata pelajaran tertentu.
- **PUT** `/api/subjects/[id]`
  - Memperbarui mata pelajaran tertentu.
- **DELETE** `/api/subjects/[id]`
  - Menghapus mata pelajaran tertentu.

### Bank Soal (Question Banks)
Mengelola bank soal dan butir soal.

- **GET** `/api/question-banks`
  - Menampilkan daftar semua bank soal.
- **POST** `/api/question-banks`
  - Membuat bank soal baru.
- **GET** `/api/question-banks/[id]`
  - Mendapatkan detail bank soal (termasuk soal di dalamnya).
- **PUT** `/api/question-banks/[id]`
  - Memperbarui bank soal.
- **DELETE** `/api/question-banks/[id]`
  - Menghapus bank soal.

### Template Ujian (Exam Templates)
Mengelola template ujian (cetak biru).

- **GET** `/api/exam-templates`
  - Menampilkan daftar semua template ujian.
- **POST** `/api/exam-templates`
  - Membuat template ujian baru.
- **GET** `/api/exam-templates/[id]`
  - Mendapatkan detail template ujian.
- **PUT** `/api/exam-templates/[id]`
  - Memperbarui template ujian.
- **DELETE** `/api/exam-templates/[id]`
  - Menghapus template ujian.

### Sesi Ujian (Exam Sessions)
Mengelola sesi ujian terjadwal.

- **GET** `/api/exam-sessions`
  - Menampilkan daftar semua sesi ujian.
- **POST** `/api/exam-sessions`
  - Menjadwalkan sesi ujian baru.
- **GET** `/api/exam-sessions/[id]`
  - Mendapatkan detail sesi ujian.
- **PUT** `/api/exam-sessions/[id]`
  - Memperbarui sesi ujian (misal: ubah status, waktu).
- **DELETE** `/api/exam-sessions/[id]`
  - Membatalkan/Menghapus sesi ujian.

### Penilaian (Grading)
Mengelola penilaian hasil ujian.

- **GET** `/api/grading`
  - Menampilkan daftar pengumpulan yang perlu dinilai.
- **GET** `/api/grading/[submissionId]`
  - Mendapatkan pengumpulan spesifik untuk dinilai.
- **POST** `/api/grading/[submissionId]`
  - Menyimpan nilai untuk pengumpulan.

### Template Penilaian (Scoring Templates)
Mengelola aturan penilaian yang dapat digunakan kembali.

- **GET** `/api/scoring-templates`
  - Menampilkan daftar template penilaian.
- **POST** `/api/scoring-templates`
  - Membuat template penilaian.

### Pengguna (Users)
Mengelola pengguna (siswa, guru, admin).

- **GET** `/api/users`
  - Menampilkan daftar pengguna.
  - Query Params:
    - `role`: Filter berdasarkan role (`admin`, `teacher`, `student`).
    - `unassigned`: Jika `true`, hanya menampilkan siswa yang belum terdaftar di kelas manapun.
- **POST** `/api/users`
  - Membuat pengguna baru.
- **GET** `/api/users/[id]`
  - Mengambil detail pengguna tertentu.
- **PUT** `/api/users/[id]`
  - Memperbarui data pengguna.
- **DELETE** `/api/users/[id]`
  - Menghapus pengguna.

### Siswa (Student)
Endpoint untuk pelaksanaan ujian siswa.

- **GET** `/api/student/exams`
  - Menampilkan daftar ujian yang ditugaskan untuk siswa saat ini.
- **POST** `/api/student/exam/[examId]/start`
  - Memulai sesi ujian.
- **POST** `/api/student/exam/[examId]/submit`
  - Mengumpulkan ujian.
- **POST** `/api/student/exam/[examId]/answer`
  - Menyimpan jawaban.
