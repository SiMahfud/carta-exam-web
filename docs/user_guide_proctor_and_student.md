---
layout: default
title: Panduan Pengawas & Siswa
nav_order: 4
description: "Panduan untuk pengawas ruang, tata usaha, dan siswa peserta ujian."
---

# 🛡️ Panduan Pengawas Ruang, Tata Usaha & Siswa — CartaExam

Panduan praktis operasional harian selama pelaksanaan ujian untuk **Pengawas Ruang**, **Petugas Tata Usaha (Administrasi)**, dan **Siswa Peserta Ujian**.

---

## 📑 Daftar Isi
1. [Panduan Pengawas Ruang (Live Proctoring)](#1-panduan-pengawas-ruang-live-proctoring)
2. [Panduan Petugas Tata Usaha (Administrasi & Token Dispensasi)](#2-panduan-petugas-tata-usaha-administrasi--token-dispensasi)
3. [Panduan Siswa Peserta Ujian](#3-panduan-siswa-peserta-ujian)

---

## 1. Panduan Pengawas Ruang (Live Proctoring)

Buka menu **Sesi Ujian (`/admin/exam-sessions`)** lalu pilih sesi yang sedang berlangsung untuk masuk ke **Dashboard Monitoring**:

### A. Token Akses Ujian
- Jika ujian mewajibkan token, klik **Generate Token** di panel atas sesi ujian.
- Bacakan atau tampilkan kode token tersebut di proyektor kelas saat ujian dimulai. Token dapat diganti sewaktu-waktu agar siswa di luar ruangan tidak bisa masuk.

### B. Pemantauan Real-Time (SSE + Live Feed)
Pada tabel peserta, pengawas dapat melihat status setiap siswa secara real-time:
- **Status Pengerjaan**: `Belum Mulai`, `Mengerjakan`, `Selesai`, atau `Dihentikan/Terkunci`.
- **Progres Soal & Sisa Waktu**: Jumlah soal yang sudah dijawab.
- **Jumlah Pelanggaran & Bukti Screenshot**: Klik angka pelanggaran pada baris siswa untuk membuka log waktu pelanggaran dan foto tangkapan layar (jika siswa memakai **CartaExambro Android**).

### C. Aksi Pengawas Per Siswa & Massal
Pengawas dapat melakukan tindakan langsung dari menu aksi per siswa atau mencentang banyak siswa sekaligus:
| Aksi | Kegunaan |
|---|---|
| **Buka Kunci Sesi (`unlock_session`)** | Membuka kembali ujian siswa yang terblokir otomatis karena pelanggaran atau terlambat masuk (`LATE_ENTRY`). |
| **Reset Pelanggaran (`reset_violations`)** | Mengembalikan hitungan pelanggaran menjadi `0` dan menghapus log/bukti screenshot lama. |
| **Kunci Sementara (`lock_session`)** | Menghentikan sementara pengerjaan siswa jika pengawas menemukan kecurangan fisik di kelas (misal membawa HP kedua). |
| **Reset Perangkat (`reset_device`)** | Mengizinkan siswa berpindah HP/laptop baru ketika *Device Binding* aktif dan perangkat sebelumnya bermasalah. |
| **Tambah Waktu (`add_time`)** | Menambah menit ekstra (`bonusTimeMinutes`) bagi siswa yang sempat mengalami kendala teknis/listrik. |
| **Paksa Selesai (`force_submit`)** | Mengumpulkan lembar jawaban siswa dari meja pengawas. |
| **Ulang Ujian (`retake`)** | Menghapus pengerjaan sebelumnya agar siswa dapat mengulang dari awal. |

---

## 2. Panduan Petugas Tata Usaha (Administrasi & Token Dispensasi)

Menu **Administrasi Siswa (`/admin/administrasi`)** digunakan apabila sekolah memberlakukan verifikasi kelayakan administrasi (misalnya syarat kartu ujian atau administrasi sekolah) sebelum siswa dapat memulai ujian.

### Status Administrasi Siswa
1. **Terverifikasi (`cleared`)**: Status bawaan; siswa dapat langsung mengikuti semua ujian.
2. **Terkunci (`locked`)**: Saat siswa menekan *Mulai Kerjakan*, sistem akan meminta **Token Dispensasi** dari Tata Usaha.
3. **Dispensasi (`dispensation`)**: Siswa mendapat kelonggaran sementara sampai tanggal batas waktu (`validUntil`); setelah lewat, status otomatis kembali `locked`.

### Cara Mengelola Secara Massal atau Satuan
- **Import Excel**: Klik **Unduh Template** (`/api/admin/clearance/export?type=template`), isi kolom `NIS`, `Nama`, `Status` (`locked`/`cleared`/`dispensation`), dan `Catatan`, lalu unggah kembali lewat tombol **Import Excel**.
- **Menerbitkan & Mencetak Slip Token Dispensasi**:
  1. Pilih siswa yang berstatus `locked` → klik **Buat Token Dispensasi**.
  2. Pilih lingkup berlakunya token:
     - `session`: Hanya berlaku untuk 1 sesi ujian saat itu (tetap terkunci di sesi berikutnya).
     - `daily`: Berlaku hingga pukul 23:59 hari ini.
     - `weekly`: Berlaku selama 7 hari.
     - `permanent`: Membebaskan status administrasi seterusnya.
  3. Klik **Cetak Slip** untuk mencetak surat/token dispensasi resmi untuk diserahkan kepada siswa.

---

## 3. Panduan Siswa Peserta Ujian

### A. Persiapan Perangkat
Tergantung aturan yang ditetapkan guru/sekolah pada sesi ujian:
1. **Browser Biasa** (Chrome / Safari / Edge): Langsung buka alamat server CartaExam sekolah Anda.
2. **Safe Exam Browser (SEB)** (Windows / macOS / iPhone / iPad):
   - Instal aplikasi **Safe Exam Browser** dari [safeexambrowser.org](https://safeexambrowser.org) atau App Store (iOS).
   - Di halaman login atau dashboard siswa, klik **Buka di SEB**, unduh file `cartaexam.seb`, atau pindai **QR Code SEB** dengan kamera iPhone/iPad.
3. **CartaExambro Android**:
   - Unduh APK **CartaExambro** dari tombol di portal siswa (`/api/exambro/download`) atau dari admin sekolah.
   - Buka CartaExambro → klik **Scan QR Code Ujian** (atau ketik URL server sekolah).
   - Saat diminta izin sistem **"Cast / Share Entire Screen / Seluruh Layar"**, pilih **Entire Screen / Seluruh Layar** agar fitur keamanan aktif dan ujian dapat dimulai.

### B. Memulai & Mengerjakan Ujian
1. Login dengan username/NIS dan password Anda (atau tombol SSO jika sekolah Anda mengaktifkannya).
2. Pada halaman **Ujian Saya (`/student/exams`)**, pilih ujian berstatus **Aktif** dan klik **Mulai Kerjakan**.
3. Masukkan **Token Ujian** dari pengawas (jika diminta) atau **Token Dispensasi TU** (jika akun sedang terkunci administrasi).
4. Selama ujian berlangsung:
   - Jangan berpindah tab/aplikasi, keluar dari mode layar penuh, melakukan split-screen, atau mengambil screenshot.
   - Gunakan tombol **Ragu-ragu** untuk menandai soal yang ingin dicek ulang di navigasi nomor soal.
   - **Jika Wi-Fi/internet putus mendadak**: jangan panik atau menutup halaman. Jawaban Anda tersimpan otomatis di antrean lokal perangkat (*Offline Queue*) dan otomatis tersinkron ke server saat koneksi pulih.
5. Setelah selesai, klik **Selesai & Kumpulkan**. Jika guru mengaktifkan mode review, Anda dapat melihat nilai dan pembahasan pada halaman **Review**.

> **Keluar dari Aplikasi Pengaman Setelah Selesai:**
> - **SEB**: Gunakan tombol **Keluar dari SEB** yang tersedia di halaman login/dashboard.
> - **CartaExambro Android**: Saat tidak dalam sesi ujian aktif, tekan tombol **Keluar** atau tombol **Back** dan konfirmasi. Jika ujian masih aktif, hanya pengawas yang dapat keluar menggunakan **PIN Keluar Darurat**.
