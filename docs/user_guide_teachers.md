# 📚 Panduan Lengkap Guru & Operator — CartaExam

Selamat datang di Panduan Pengguna **CartaExam** (SMAN 1 Campurdarat). Panduan ini disusun untuk membantu Bapak/Ibu Guru dan Operator Sekolah dalam mengelola bank soal, menyelenggarakan ujian digital aman, memantau ujian secara live, dan melakukan koreksi nilai dengan bantuan AI.

---

## 📑 Daftar Isi
1. [Dasbor & Analitik Performa](#1-dasbor--analitik-performa)
2. [Manajemen Mata Pelajaran, Kelas & Siswa](#2-manajemen-mata-pelajaran-kelas--siswa)
3. [Manajemen Bank Soal & Pembuatan Soal AI](#3-manajemen-bank-soal--pembuatan-soal-ai)
4. [Template Ujian, Cetak Naskah & LJK Kertas](#4-template-ujian-cetak-naskah--ljk-kertas)
5. [Pelaksanaan & Pengawasan Ujian Real-Time (Live Proctoring)](#5-pelaksanaan--pengawasan-ujian-real-time-live-proctoring)
6. [Penilaian Esai Otomatis dengan AI (Google Gemini)](#6-penilaian-esai-otomatis-dengan-ai-google-gemini)
7. [Cadangan Data (Backup/Restore) & Log Aktivitas](#7-cadangan-data-backuprestore--log-aktivitas)

---

## 1. Dasbor & Analitik Performa
Setelah login ke panel Guru/Admin (`/admin`), Anda akan disajikan dasbor interaktif:
- **Metrik Cepat**: Total siswa aktif, bank soal terdaftar, dan sesi ujian yang sedang berlangsung.
- **Visualisasi Analitik**:
  - *Distribusi Kelulusan*: Menampilkan persentase siswa tuntas vs belum tuntas.
  - *Rata-rata Nilai per Mapel*: Grafik perbandingan capaian antar mata pelajaran.
  - *Komposisi Bank Soal*: Diagram proporsi tingkat kesulitan soal (Mudah, Sedang, Sulit).
- **Lonceng Notifikasi (Header)**: Memberitahukan sesi ujian yang sedang aktif dan lembar jawaban siswa yang siap diperiksa/dikoreksi.

---

## 2. Manajemen Mata Pelajaran, Kelas & Siswa
- **Mata Pelajaran (`/admin/subjects`)**: Tambah atau edit mapel beserta kode resminya (contoh: `MAT-10`).
- **Kelas & Rombel (`/admin/classes`)**: Kelola kelas per tingkat (10, 11, 12) dan tahun ajaran aktif.
- **Bulk Import Data Siswa & Guru (`/admin/users`)**:
  1. Klik tombol **"Import / Export Excel"**.
  2. Klik **"Unduh Template"** untuk mendapatkan format Excel resmi `.xlsx`.
  3. Isi data siswa dan upload kembali file tersebut. Sistem akan otomatis memvalidasi duplikasi sebelum disimpan.

---

## 3. Manajemen Bank Soal & Pembuatan Soal AI
CartaExam mendukung 6 tipe butir soal standar kurikulum merdeka:
1. **Pilihan Ganda (PG)**: 5 opsi (A-E) dengan formula matematika KaTeX/LaTeX.
2. **Pilihan Ganda Kompleks**: Lebih dari satu jawaban benar.
3. **Menjodohkan (Matching)**: Pasangan pernyataan kiri dan kanan.
4. **Isian Singkat**: Jawaban singkat dengan pencocokan otomatis (*case-insensitive*).
5. **Esai / Uraian**: Jawaban panjang dengan panduan rubrik penilaian.
6. **Benar / Salah**: Pernyataan benar atau salah.

### 🤖 Generator Soal AI (Google Gemini)
- Klik tombol **"AI Generator"** (ikon ✨) pada bank soal.
- Masukkan materi pembelajaran atau rangkuman teks.
- Pilih tipe dan jumlah soal yang diinginkan, lalu klik **"Generate Soal"**. Soal beserta kunci jawaban dan pembahasannya akan otomatis dibuat.

---

## 4. Template Ujian, Cetak Naskah & LJK Kertas
- **Template Ujian (`/admin/exam-templates`)**: Tentukan durasi (menit), batas kelulusan (KKM), opsi pengacakan butir soal, pengacakan opsi jawaban, serta mode keamanan *Lockdown Anti-Curang*.
- **🖨️ Cetak Naskah & LJK Kertas (`/admin/exam-templates/[id]/print`)**:
  - Jika terjadi kendala jaringan/listrik di sekolah, klik ikon **Print** pada template ujian.
  - Anda dapat langsung mencetak:
    - **Naskah Ujian**: Lengkap dengan kop sekolah resmi dan nomor soal rapi.
    - **Lembar Jawaban Komputer (LJK) A4**: Grid bubble A-E standar untuk pensil 2B.
    - **Lembar Kunci Jawaban Guru**: Panduan kunci dan pembobotan nilai untuk koreksi cepat.

---

## 5. Pelaksanaan & Pengawasan Ujian Real-Time (Live Proctoring)
Saat sesi ujian berlangsung, buka halaman detail sesi ujian (`/admin/exam-sessions/[id]`):
- **Live Feed (5 Detik)**: Aktifkan toggle **"Live (5s)"** di header monitoring. Data progress siswa dan status pengerjaan akan otomatis diperbarui secara berkala.
- **Kontrol Pengawas Terhadap Pelanggaran Siswa**:
  - *Reset Pelanggaran*: Mengembalikan hitungan pelanggaran menjadi 0 jika siswa mengalami kendala perangkat tidak sengaja.
  - *Buka Kunci Ujian*: Membuka kembali sesi siswa yang terblokir (*locked out*) akibat berpindah tab.
  - *Paksa Selesai*: Mengumpulkan lembar jawaban siswa dari meja pengawas jika waktu habis.

---

## 6. Penilaian Esai Otomatis dengan AI (Google Gemini)
Untuk memeriksa lembar jawaban esai siswa pada menu **Penilaian (`/admin/grading`)**:
1. Buka pengumpulan ujian siswa.
2. Klik tombol **"Evaluasi dengan AI"** (ikon ✨) pada butir soal esai.
3. Google Gemini AI akan membandingkan jawaban siswa terhadap kunci & rubrik guru, lalu memberikan:
   - **Rekomendasi Skor Otomatis** (misal: 8.5 / 10).
   - **Analisis Kekuatan & Kelemahan Jawaban**.
   - **Umpan Balik / Catatan Konstruktif** untuk siswa.
4. Guru dapat menyetujui rekomendasi nilai AI atau menyesuaikannya secara manual sebelum dipublikasikan.

---

## 7. Cadangan Data (Backup/Restore) & Log Aktivitas
- **Backup & Restore Database (`/admin/settings`)**:
  - Klik **"Unduh Cadangan Database"** untuk menyimpan seluruh snapshot data sekolah (bank soal, pengguna, kelas, mapel) ke file aman `.carta-backup.json`.
  - Gunakan tombol **"Pulihkan dari File"** jika ingin mengembalikan data ke server baru.
- **Log Aktivitas Sistem (`/admin/activity-logs`)**:
  - Telusuri audit keamanan: siapa yang mengubah nilai, kapan ujian dimulai, dan aktivitas penting lainnya.
  - Dapat difilter berdasarkan sesi ujian, bank soal, kelas, maupun nama pengguna.
