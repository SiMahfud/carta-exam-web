# CartaExam

**Platform Ujian Modern untuk SMAN 1 Campurdarat**

CartaExam adalah aplikasi ujian berbasis web yang dirancang untuk memberikan pengalaman ujian yang aman, efisien, dan mudah digunakan bagi siswa dan guru.

## Fitur Utama

- **Keamanan Ujian (Lockdown)**: Mencegah kecurangan dengan fitur deteksi pindah tab, pencegahan copy-paste, mode layar penuh, dan token dinamis.
- **Bank Soal Fleksibel**: Mendukung berbagai tipe soal:
  - Pilihan Ganda (Multiple Choice)
  - Pilihan Ganda Kompleks (Complex Multiple Choice)
  - Menjodohkan (Matching)
  - Isian Singkat (Short Answer)
  - Esai (Essay)
  - **Rich Text Support**: Dukungan gambar dan format teks pada soal dan jawaban.
- **Manajemen Ujian**: Penjadwalan sesi ujian, pengacakan soal dan jawaban, serta pengaturan durasi.
- **Monitoring Real-time**: Guru dapat memantau status pengerjaan siswa, pelanggaran, dan melakukan aksi (Reset Waktu, Paksa Selesai, Ujian Ulang) secara langsung.
- **Dashboard Admin Canggih**: Statistik real-time, log aktivitas sistem, dan pemantauan kesehatan server.
- **Sistem Penilaian Efisien**:
  - Penilaian otomatis untuk soal objektif.
  - Dashboard penilaian dengan filter, pencarian, dan pengurutan canggih.
  - Tampilan detail jawaban siswa (termasuk visualisasi untuk soal Menjodohkan).

## Teknologi

Aplikasi ini dibangun menggunakan teknologi modern:
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Database**: SQLite
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn/UI](https://ui.shadcn.com/)

## Konfigurasi Database

Aplikasi ini mendukung beberapa provider database:
- **SQLite** (Default)
- **MySQL** / **MariaDB**
- **PostgreSQL**

Anda dapat mengatur provider database melalui environment variable `DATABASE_PROVIDER` dan `DATABASE_URL` di file `.env`. Lihat `.env.example` untuk contoh konfigurasi.

## Memulai (Getting Started)

1.  **Clone repository**
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Setup Database**:
    ```bash
    npm run db:push
    # atau
    npx drizzle-kit push
    ```
4.  **Jalankan server development**:
    ```bash
    npm run dev
    ```
5.  Buka [http://localhost:3000](http://localhost:3000) di browser.

## Dokumentasi

Dokumentasi lengkap tersedia untuk membantu Anda memahami dan berkontribusi pada proyek ini:

### 📖 Dokumentasi Pengguna
- [Dokumentasi API](docs/api_documentation.md) - Referensi lengkap API endpoints
- [Panduan Pengguna untuk Guru](docs/user_guide_teachers.md) - Cara menggunakan aplikasi
- [Skema Database](docs/database_schema.md) - Struktur database lengkap

### 🗺️ Pengembangan & Roadmap
- [ROADMAP.md](ROADMAP.md) - **Roadmap pengembangan lengkap** dengan checklist fitur, spesifikasi teknis, dan prioritas
- [FEATURES.md](FEATURES.md) - **Status fitur saat ini** - Lihat apa yang sudah, sedang, dan akan dikembangkan

### 🤝 Kontribusi
- [CONTRIBUTING.md](CONTRIBUTING.md) - **Panduan kontribusi** untuk pengembang dan kontributor
- [AGENTS.md](AGENTS.md) - **Panduan khusus untuk AI Agents** - Context lengkap untuk AI coding assistants

## 🤝 Berkontribusi

Kami sangat terbuka untuk kontribusi! Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan lengkap cara berkontribusi.

**Untuk AI Agents**: Lihat [AGENTS.md](AGENTS.md) untuk context teknis dan panduan pengembangan.

### Area yang Membutuhkan Bantuan
- 🎨 Dark mode implementation
- 📊 Advanced analytics & reporting
- 🧪 Testing infrastructure
- 📱 Mobile responsiveness
- 🔒 Security enhancements

Lihat [ROADMAP.md](ROADMAP.md) untuk daftar lengkap fitur yang direncanakan.

## Future Roadmap

Lihat [ROADMAP.md](ROADMAP.md) dan [FEATURES.md](FEATURES.md) untuk roadmap lengkap. Berikut highlight fitur utama:

- [ ] **AI-Powered Question Generation**: Membuat soal otomatis menggunakan AI berdasarkan materi pelajaran.
- [ ] **Analitik Lanjutan**: Laporan mendalam tentang performa siswa dan analisis butir soal.
- [ ] **Aplikasi Mobile**: Aplikasi native untuk siswa (Android/iOS) untuk pengalaman ujian yang lebih baik.
- [ ] **Integrasi LMS**: Sinkronisasi nilai dan data siswa dengan Google Classroom atau Moodle.
- [ ] **Dark Mode**: Dukungan tema gelap untuk kenyamanan mata.
- [ ] **Notifikasi Real-time**: Pemberitahuan instan untuk guru saat ada pelanggaran atau ujian selesai.

## 📄 License

[Specify your license here]

## 🙏 Acknowledgments

Dikembangkan untuk SMAN 1 Campurdarat dengan tujuan meningkatkan kualitas dan efisiensi pelaksanaan ujian.

---

**Status Proyek**: 🟡 Beta - Menuju Production Ready  
**Versi**: 0.1.0  
**Last Updated**: December 2, 2025
