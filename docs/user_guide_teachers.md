# 📚 Panduan Lengkap Guru & Operator — CartaExam

Selamat datang di Panduan Pengguna **CartaExam**. Panduan ini disusun langkah demi langkah untuk membantu Guru, Operator Sekolah, dan Administrator dalam mengelola kelas, membuat soal (manual, Word DOCX, maupun AI), menyelenggarakan ujian aman, hingga menilai dan mengekspor hasil.

> Untuk panduan khusus **Pengawas Ruang, Tata Usaha (Administrasi), dan Siswa**, lihat [Panduan Pengawas, Tata Usaha & Siswa](user_guide_proctor_and_student.md).

---

## 📑 Daftar Isi
1. [Dasbor & Analitik Performa](#1-dasbor--analitik-performa)
2. [Mata Pelajaran, Kelas & Import Pengguna Excel](#2-mata-pelajaran-kelas--import-pengguna-excel)
3. [Bank Soal, Import DOCX & AI Generator](#3-bank-soal-import-docx--ai-generator)
4. [Template Ujian, Keamanan & Cetak Naskah/LJK](#4-template-ujian-keamanan--cetak-naskahljk)
5. [Menjadwalkan Sesi Ujian & Token Akses](#5-menjadwalkan-sesi-ujian--token-akses)
6. [Penilaian Manual, Koreksi Esai AI & Ekspor Excel](#6-penilaian-manual-koreksi-esai-ai--ekspor-excel)
7. [Pengaturan Sekolah, SEB/Exambro & Backup/Restore](#7-pengaturan-sekolah-sebexambro--backuprestore)

---

## 1. Dasbor & Analitik Performa

Setelah login di `/login` sebagai **Admin** atau **Guru**, Anda masuk ke panel `/admin`:
- **Statistik Ringkas**: Jumlah siswa, bank soal, dan sesi ujian aktif.
- **Jadwal Ujian Hari Ini**: Daftar sesi ujian yang berlangsung atau terjadwal hari ini.
- **Visualisasi Analitik**: Grafik distribusi nilai kelulusan, rata-rata nilai per mata pelajaran, dan komposisi tingkat kesulitan soal.
- **Pencarian Global (`Ctrl+K`) & Lonceng Notifikasi**: Cari cepat soal/siswa/sesi dari mana saja dan pantau antrean koreksi esai.

---

## 2. Mata Pelajaran, Kelas & Import Pengguna Excel

1. **Mata Pelajaran (`/admin/subjects`)**: Buat daftar mapel beserta kode uniknya (mis. `MAT-10`, `BIO-11`).
2. **Kelas & Rombel (`/admin/classes`)**: Buat kelas per tingkat (10, 11, 12) dan tahun ajaran, lalu daftarkan siswa atau wali kelas.
3. **Import Massal Siswa & Guru (`/admin/users` — Khusus Admin)**:
   - Klik **Import / Export Excel** → **Unduh Template** (`template_import_users.xlsx`).
   - Kolom yang tersedia: `action` (`add`/`update`/`delete`), `id`, `nama`, `username`, `password`, `role` (`student`/`teacher`/`admin`), `kelas`, `grade`, `tahun_ajaran`.
   - Jika kolom `kelas`, `grade`, dan `tahun_ajaran` diisi untuk siswa, **kelas otomatis dibuat dan siswa langsung dimasukkan ke kelas tersebut** saat import!

---

## 3. Bank Soal, Import DOCX & AI Generator

Buka menu **Bank Soal (`/admin/question-banks`)**:
- **6 Tipe Soal yang Didukung**:
  1. **Pilihan Ganda (`mc`)**: 4–5 opsi (A–E) dengan editor teks kaya & rumus matematika KaTeX/LaTeX.
  2. **Pilihan Ganda Kompleks (`complex_mc`)**: Lebih dari 1 jawaban benar (mendukung *partial credit*).
  3. **Menjodohkan (`matching`)**: Pasangan pernyataan kiri dan kanan.
  4. **Isian Singkat (`short`)**: Daftar kunci jawaban yang diterima (*case-insensitive*).
  5. **Benar / Salah (`true_false`)**.
  6. **Esai / Uraian (`essay`)**: Dilengkapi kunci model jawaban & rubrik penilaian.
- **Upload Gambar**: Gambar pada soal atau opsi jawaban dapat diunggah langsung (JPG, PNG, WebP, GIF, SVG maks. 5 MB).
- **Import Soal dari Word (`.docx`)**:
  - Unduh template Word resmi dari tombol **Import DOCX**.
  - Mendukung pratinjau langsung lengkap dengan rumus matematika Word (OMML → KaTeX) dan ekstraksi gambar otomatis, serta opsi **Replace All**.
- **AI Generator Soal (Streaming)**:
  - Klik tombol **AI Generator** pada bank soal.
  - Tempelkan materi, topik, atau unggah dokumen/gambar referensi.
  - Tentukan jumlah & tipe soal serta tingkat kesulitan (`easy`/`medium`/`hard`). Soal, kunci jawaban, dan pembahasan dihasilkan secara *live streaming*.

---

## 4. Template Ujian, Keamanan & Cetak Naskah/LJK

Buka **Template Ujian (`/admin/exam-templates`)** untuk membuat cetak biru ujian yang dapat dipakai berulang:
- **Komposisi Soal & Pool**: Pilih satu atau beberapa bank soal, filter tag topik, dan tentukan jumlah soal per tipe (atau aktifkan *Question Pool* agar setiap siswa mendapat subset soal acak).
- **4 Mode Pengacakan Soal**:
  - `all`: Acak semua soal.
  - `by_type`: Acak hanya tipe soal tertentu.
  - `exclude_type`: Acak semua kecuali tipe tertentu.
  - `specific_numbers`: Acak hanya nomor urut tertentu.
  - Tersedia opsi **Acak Opsi Jawaban** dan **Esai Selalu di Akhir**.
- **Pengaturan Keamanan & Lockdown**:
  - Deteksi perpindahan tab/jendela, blokir copy-paste & klik kanan, deteksi screenshot & DevTools.
  - **Mode Pelanggaran**: `strict` (otomatis hentikan ujian jika mencapai `maxViolations`), `lenient` (catat tanpa menghentikan, kecuali melebihi `maxAwaySeconds`), atau `disabled`.
  - **Wajib Safe Exam Browser (`requireSeb`)** dan/atau **Wajib CartaExambro (`requireExambro`)**: Mengunci akses hanya melalui aplikasi ujian resmi.
  - **Device Binding**: Mengunci pengerjaan siswa pada 1 perangkat saja.
  - **Toleransi Keterlambatan (`lateToleranceMinutes`)**: Siswa yang masuk melewati batas toleransi otomatis dikunci (`LATE_ENTRY`) dan harus meminta izin pengawas.
- **🖨️ Cetak Naskah Soal, LJK & Kunci (`/admin/exam-templates/[id]/print`)**:
  - Gunakan ikon **Print** pada template untuk mencetak versi kertas (Naskah Soal A4 dengan kop sekolah Anda, LJK bubble A–E, dan Kunci Jawaban Guru).

---

## 5. Menjadwalkan Sesi Ujian & Token Akses

Buka **Sesi Ujian (`/admin/exam-sessions`)**:
1. Klik **Buat Sesi Baru**, pilih Template Ujian, isi Nama Sesi, Waktu Mulai & Waktu Selesai.
2. Pilih target peserta: **Per Kelas** atau **Siswa Tertentu** (dilengkapi fitur cari dan filter kelas).
3. Jika template mengaktifkan **Wajib Token**, buka halaman detail sesi (`/admin/exam-sessions/[id]`) untuk membangkitkan **Token Akses** dan bagikan kepada peserta di ruang ujian.
4. *(Opsional)* Klik **Generate Paket Soal** sebelumnya untuk mengunci alokasi `question_pools` peserta sebelum sesi dimulai.

---

## 6. Penilaian Manual, Koreksi Esai AI & Ekspor Excel

Buka **Penilaian (`/admin/grading`)**:
- **Soal Objektif** (`mc`, `complex_mc`, `matching`, `short`, `true_false`) dinilai otomatis oleh sistem saat siswa menjawab/mengumpulkan. Jika terjadi revisi kunci di bank soal setelah ujian, gunakan fitur **Resync Skor** pada halaman hasil sesi.
- **Koreksi Esai dengan AI**:
  1. Buka lembar jawaban siswa (`/admin/grading/[id]`).
  2. Pada soal esai, klik **Evaluasi dengan AI**.
  3. AI membandingkan jawaban siswa dengan model jawaban/rubrik dan memberi **Rekomendasi Skor**, **Kekuatan**, **Hal yang Perlu Ditingkatkan**, serta **Feedback** siap pakai.
  4. Guru dapat menerima atau mengubah skor sebelum klik **Publikasikan Nilai** (atau gunakan **Batch Publish** untuk banyak siswa sekaligus).
- **Ekspor Hasil Excel**: Dari halaman hasil sesi (`/admin/exam-sessions/[id]/results`), unduh file `.xlsx` berisi **3 sheet**: *Rekap Nilai*, *Jawaban Essay*, dan *Statistik*.

---

## 7. Pengaturan Sekolah, SEB/Exambro & Backup/Restore

Di menu **Pengaturan Sekolah (`/admin/settings`)** (Khusus Admin):
- **Identitas & White-Label**: Ubah nama sekolah, logo, favicon, alamat, pengumuman landing page, yang otomatis tampil di portal siswa, login, dan kop cetak.
- **Konfigurasi AI**: Pilih & uji koneksi Gemini, OpenRouter, atau OpenAI-Compatible.
- **Konfigurasi SEB & PIN Darurat Exambro**: Atur URL server, Quit Password SEB, URL filter, PIN keluar darurat CartaExambro, serta unduh file `.seb` / QR Code.
- **Cadangan Database**: Ekspor seluruh data sekolah ke file `.json` dan pulihkan kapan saja lewat menu **Backup & Restore**.
- **Log Aktivitas (`/admin/activity-logs`)**: Audit seluruh perubahan penting di sistem.
