# Panduan Pengguna CartaExam untuk Guru

Selamat datang di Panduan Guru CartaExam. Dokumen ini menjelaskan cara menggunakan aplikasi untuk mengelola kelas, membuat ujian, dan menilai hasil ujian siswa.

## Daftar Isi
1. [Ringkasan Dasbor](#ringkasan-dasbor)
2. [Mengelola Mata Pelajaran & Kelas](#mengelola-mata-pelajaran--kelas)
3. [Manajemen Bank Soal](#manajemen-bank-soal)
4. [Membuat & Menjadwalkan Ujian](#membuat--menjadwalkan-ujian)
5. [Memantau Ujian](#memantau-ujian)
6. [Penilaian & Hasil](#penilaian--hasil)

---

## Ringkasan Dasbor
Setelah login, Anda akan melihat Dasbor Admin. Ini memberikan gambaran cepat tentang:
- **Statistik Real-time**: Jumlah siswa, ujian selesai, dan sesi aktif.
- **Log Aktivitas**: Riwayat tindakan terbaru dalam sistem.
- **Pengumpulan Terbaru**: Daftar siswa yang baru saja menyelesaikan ujian.
- Tautan cepat untuk mengelola Kelas, Ujian, dan Bank Soal.

## Mengelola Mata Pelajaran & Kelas

### Membuat Mata Pelajaran
1. Navigasi ke **Mata Pelajaran** (Subjects) di sidebar.
2. Klik **Tambah Mata Pelajaran** (Add Subject).
3. Masukkan **Nama** (misal: Matematika) dan **Kode** (misal: MAT).
4. Klik **Simpan** (Save).

### Membuat Kelas
1. Navigasi ke **Kelas** (Classes) di sidebar.
2. Klik **Tambah Kelas** (Add Class).
3. Masukkan **Nama Kelas** (misal: X-1), **Tingkat Kelas**, dan **Tahun Ajaran**.
4. Tetapkan **Wali Kelas** (opsional).
5. Klik **Simpan** (Save).

### Menambahkan Siswa ke Kelas
1. Buka **Kelas** tertentu dari daftar.
2. Pergi ke tab **Siswa** (Students).
3. Klik **Tambah Siswa** (Add Students).
4. Pilih siswa dari daftar untuk mendaftarkan mereka ke dalam kelas.

## Manajemen Bank Soal
Bank Soal memungkinkan Anda membuat dan menggunakan kembali soal untuk berbagai ujian.

### Membuat Bank Soal
1. Navigasi ke **Bank Soal** (Question Banks).
2. Klik **Buat Bank** (Create Bank).
3. Pilih **Mata Pelajaran** dan beri **Nama** bank (misal: "UTS Biologi 2025").
4. Klik **Buat** (Create).

### Menambahkan Soal
1. Buka Bank Soal yang telah Anda buat.
2. Klik **Tambah Soal** (Add Question).
3. Pilih **Tipe Soal**:
   - **Pilihan Ganda**: Opsi standar A-E.
   - **Pilihan Ganda Kompleks**: Lebih dari satu jawaban benar.
   - **Menjodohkan**: Mencocokkan pasangan item.
   - **Isian Singkat**: Input teks dengan kata kunci penilaian otomatis.
   - **Esai**: Input teks panjang yang memerlukan penilaian manual.
4. Isi konten soal, opsi, dan jawaban benar.
5. Atur **Tingkat Kesulitan** dan **Tag** (opsional).
6. Klik **Simpan Soal** (Save Question).

## Membuat & Menjadwalkan Ujian

### Langkah 1: Buat Template Ujian
Template Ujian mendefinisikan aturan dan struktur ujian.
1. Navigasi ke **Template Ujian** (Exam Templates).
2. Klik **Buat Template** (Create Template).
3. **Info Umum**: Nama, Mata Pelajaran, Durasi.
4. **Soal**: Pilih **Bank Soal** mana yang akan diambil. Anda dapat memilih untuk:
   - Menggunakan semua soal dari bank.
   - Memilih sejumlah soal secara acak.
   - Memfilter berdasarkan tag atau kesulitan.
5. **Pengaturan**:
   - Aktifkan **Lockdown Browser** (mencegah pindah tab).
   - Acak Urutan Soal.
   - Acak Urutan Jawaban.
6. Klik **Simpan Template** (Save Template).

### Langkah 2: Jadwalkan Sesi Ujian
Sesi adalah pelaksanaan ujian untuk kelompok siswa tertentu.
1. Navigasi ke **Sesi Ujian** (Exam Sessions).
2. Klik **Jadwalkan Sesi** (Schedule Session).
3. Pilih **Template Ujian** yang Anda buat.
4. Atur **Waktu Mulai** dan **Waktu Selesai**.
5. **Tugaskan Ke**: Pilih **Kelas** atau **Siswa** tertentu.
6. Klik **Jadwalkan** (Schedule).

## Memantau Ujian
Selama sesi aktif, Anda dapat memantau kemajuan siswa.
1. Pergi ke **Sesi Ujian** dan klik pada sesi **Aktif**.
2. Anda akan melihat dasbor langsung yang menampilkan:
   - Siapa yang sudah mulai.
   - Kemajuan saat ini (soal terjawab).
   - **Pelanggaran**: Peringatan untuk pindah tab atau perilaku mencurigakan.
3. Anda dapat melakukan aksi terhadap siswa:
   - **Reset Waktu**: Mengatur ulang sisa waktu siswa.
   - **Paksa Selesai**: Menghentikan ujian siswa secara paksa.
   - **Ujian Ulang**: Mengizinkan siswa untuk memulai ulang ujian dari awal.

## Penilaian & Hasil

### Penilaian Otomatis
- Soal Pilihan Ganda, Menjodohkan, dan Isian Singkat dinilai secara otomatis setelah pengumpulan.

### Penilaian Manual (Esai)
1. Navigasi ke **Penilaian** (Grading).
2. Anda akan melihat daftar pengumpulan dengan fitur:
   - **Filter & Pencarian**: Cari berdasarkan nama siswa atau filter berdasarkan kelas.
   - **Pengurutan**: Urutkan berdasarkan tanggal, nama, atau sesi.
   - **Status**: Lihat status "Menunggu Penilaian Manual".
3. Klik pada pengumpulan untuk membuka antarmuka penilaian.
4. Tinjau jawaban esai siswa.
5. Berikan nilai dan tambahkan komentar umpan balik.
6. Klik **Simpan Nilai** (Save Grades).

### Melihat Hasil
1. Pergi ke detail **Sesi Ujian**.
2. Klik pada tab **Hasil** (Results).
3. Anda dapat melihat nilai akhir untuk semua siswa.
4. Ekspor hasil ke CSV/Excel (jika tersedia).
