# CartaExam

**Platform Ujian Modern untuk SMAN 1 Campurdarat**

CartaExam adalah aplikasi ujian berbasis web yang dirancang untuk memberikan pengalaman ujian yang aman, efisien, dan mudah digunakan bagi siswa dan guru.

## Fitur Utama

- **Keamanan Ujian (Lockdown)**: Mencegah kecurangan dengan fitur deteksi pindah tab, pencegahan copy-paste, dan mode layar penuh.
- **Bank Soal Fleksibel**: Mendukung berbagai tipe soal:
  - Pilihan Ganda (Multiple Choice)
  - Pilihan Ganda Kompleks (Complex Multiple Choice)
  - Menjodohkan (Matching)
  - Isian Singkat (Short Answer)
  - Esai (Essay)
- **Manajemen Ujian**: Penjadwalan sesi ujian, pengacakan soal dan jawaban, serta pengaturan durasi.
- **Monitoring Real-time**: Guru dapat memantau status pengerjaan siswa dan pelanggaran secara langsung.
- **Penilaian Otomatis**: Hasil ujian langsung tersedia untuk soal objektif.

## Teknologi

Aplikasi ini dibangun menggunakan teknologi modern:
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Database**: SQLite
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn/UI](https://ui.shadcn.com/)

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

Dokumentasi lengkap tersedia di folder `docs/`:

- [Dokumentasi API](docs/api_documentation.md)
- [Panduan Pengguna untuk Guru](docs/user_guide_teachers.md)
- [Skema Database](docs/database_schema.md)
