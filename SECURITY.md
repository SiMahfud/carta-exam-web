# 🔒 Kebijakan Keamanan (Security Policy)

## Versi yang Didukung

| Versi | Dukungan Keamanan |
|---|---|
| 1.1.x (terbaru) | ✅ Aktif didukung |
| < 1.1.0 | ❌ Tidak didukung — harap upgrade |

## Melaporkan Kerentanan (Vulnerability)

Jika Anda menemukan celah keamanan di CartaExam atau CartaExambro, **jangan** membuat Issue publik. Silakan laporkan secara **pribadi** agar kami dapat memperbaikinya sebelum dieksploitasi.

### Cara Melaporkan

1. **Email**: Kirim laporan ke **simahfud@gmail.com** dengan subjek `[SECURITY] CartaExam — <ringkasan singkat>`
2. **GitHub Private Vulnerability Reporting**: Gunakan fitur [**Security Advisories**](https://github.com/SiMahfud/carta-exam-web/security/advisories/new) di tab Security repositori ini.

### Informasi yang Dibutuhkan

Sertakan detail berikut dalam laporan Anda:

- **Deskripsi** kerentanan (apa yang terjadi dan dampaknya)
- **Langkah reproduksi** (step-by-step untuk memicu bug)
- **Versi** CartaExam / CartaExambro yang terpengaruh
- **Lingkungan** (OS, browser, database provider, versi Node.js)
- **Bukti** (screenshot, log, atau proof-of-concept) jika memungkinkan
- **Saran perbaikan** (opsional, sangat dihargai)

### Respons Kami

| Tahap | Target Waktu |
|---|---|
| Konfirmasi penerimaan laporan | ≤ 48 jam |
| Penilaian awal & triase | ≤ 7 hari |
| Perbaikan & rilis patch | ≤ 30 hari (tergantung kompleksitas) |

Kami akan mengkredit pelapor dalam release notes (kecuali Anda meminta untuk tetap anonim).

## Praktik Keamanan yang Sudah Diterapkan

- **Password Hashing**: Semua password di-hash dengan `bcryptjs` (tidak ada plaintext)
- **Session**: Cookie bertanda tangan HMAC-SHA256 dengan `httpOnly`, `sameSite`, dan `secure` adaptif
- **Input Validation**: Validasi Zod di seluruh API endpoint
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **CSRF Protection**: Cookie `sameSite: lax` + validasi origin
- **Secret Management**: Semua secret via environment variables (`.env`), tidak ada hardcoded fallback
- **Android Security**: `FLAG_SECURE`, anti-overlay, screen pinning, SHA-256 APK integrity check

## Catatan Penting untuk Deployer

> ⚠️ **Sebelum masuk produksi**, pastikan:
> 1. Ganti `SESSION_SECRET` dengan string acak minimal 32 karakter (`openssl rand -hex 32`)
> 2. Ganti password default `admin` / `password123` segera setelah login pertama
> 3. Gunakan HTTPS di production (via Nginx + Certbot atau Cloudflare)
> 4. Jangan expose file `.env`, `*.db`, atau `keystore.properties` ke publik

---

Terima kasih telah membantu menjaga CartaExam tetap aman untuk semua pengguna! 🙏
