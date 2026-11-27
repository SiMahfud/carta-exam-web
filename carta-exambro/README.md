# 📱 CartaExambro (Android Native)

**CartaExambro** adalah aplikasi ujian native Android ringan (Kotlin + XML View + System WebView) pendamping **CartaExam**. Dirancang agar dapat digunakan oleh **sekolah mana pun di dunia** dalam mode publik generik (Scan QR / input URL) maupun dikustomisasi (*white-label*) untuk domain sekolah tertentu.

---

## ✨ Fitur Utama & Keamanan

### 1. Akses Fleksibel untuk Sekolah Mana Pun
- **Mode Publik Generik (Default)**: Tanpa konfigurasi ulang kode, siswa cukup memindai **QR Code** server CartaExam sekolah (`https://...`, `http://...`, `sebs://...`, `seb://...`) menggunakan scanner ZXing offline bawaan, atau mengetik URL server secara manual (mendukung server online HTTPS maupun server LAN HTTP lokal).
- **Mode White-Label Sekolah (Opsional)**: Sekolah dapat mengaktifkan tombol 1-klik langsung ke domain sekolahnya (beserta domain SSO opsional) cukup dengan menyalin `exambro-config.properties`.
- **In-App Auto-Updater (`AppUpdater.kt`)**: Aplikasi otomatis memeriksa pembaruan ke `/api/exambro/version` pada origin server sekolah yang sedang dipakai (baik online maupun LAN), mengunduh APK dari `/api/exambro/download`, dan memverifikasi integritas **SHA-256** sebelum instalasi.

### 2. Proteksi Layar & Anti-Kecurangan Tingkat OS
- **Blokir Tangkapan Layar Sistem (`FLAG_SECURE`)**: Menonaktifkan screenshot manual, perekaman layar, pratinjau *Recent Apps*, Circle to Search, dan Gemini Live Screen Share.
- **Screen Pinning & Immersive Mode**: Mengaktifkan `startLockTask()` saat sesi ujian aktif dan menyembunyikan bar navigasi sistem.
- **Anti-Overlay & Floating App**:
  - `window.setHideOverlayWindows(true)` (Android 12+) menyembunyikan floating widget non-sistem.
  - `dispatchTouchEvent` memeriksa `FLAG_WINDOW_IS_OBSCURED` dan `FLAG_WINDOW_IS_PARTIALLY_OBSCURED` (Android 10+).
  - Pemindaian frame `MediaProjection` berkala (`ScreenCaptureService`) mendeteksi piksel terang non-hitam di atas jendela `FLAG_SECURE` untuk menangkap overlay sistem (seperti Assistant / Gemini Live).
- **Deteksi Multi-Tasking, Mic & Screen Recording**:
  - `onStop` (`APP_SWITCH`), `onWindowFocusChanged` (`WINDOW_BLUR`), `onMultiWindowModeChanged` (`SPLIT_SCREEN`), `onPictureInPictureModeChanged` (`PIP_MODE`).
  - `AudioManager.activeRecordingConfigurations` mendeteksi aplikasi lain yang memakai mikrofon (`MICROPHONE_IN_USE`).
  - `DisplayManager` & `WindowManager.addScreenRecordingCallback` (Android 15+) mendeteksi layar virtual eksternal / Share Screen (`SCREEN_RECORDING`).
- **Bukti Screenshot Pelanggaran (`MediaProjection` + `ViolationUploader`)**:
  - Mengambil tangkapan layar JPEG terkompresi (lebar maks. 720px, mendukung mode *burst* 1–3 foto) dan mengunggahnya secara berurutan ke `/api/student/exams/[sessionId]/violation-evidence` agar pengawas dapat melihat bukti visual di dashboard monitoring.
- **PIN Keluar Darurat Pengawas**:
  - Ketika ujian sedang aktif, siswa tidak dapat keluar via tombol Back/Exit; pengawas harus memasukkan PIN darurat (default `CARTA2026`, dapat diganti dari Admin Settings CartaExam Web).

---

## 🛠️ Kustomisasi untuk Sekolah Anda (White-Label)

Jika ingin membangun APK khusus dengan nama sekolah dan tombol akses 1-klik ke server Anda:

1. Masuk ke folder `carta-exambro/`:
   ```bash
   cp exambro-config.properties.example exambro-config.properties
   ```
2. Edit `carta-exambro/exambro-config.properties`:
   ```properties
   applicationId=id.sch.sekolahanda.cartaexambro
   schoolName=SMA Negeri 1 Nusantara
   defaultExamUrl=https://exam.sekolahanda.sch.id
   examDomain=exam.sekolahanda.sch.id
   ssoDomain=
   defaultProctorExitPin=CARTA2026
   ```
3. *(Jangan commit `exambro-config.properties` jika menyimpan konfigurasi internal; file ini sudah masuk `.gitignore`.)*

> Jika Anda **tidak** membuat `exambro-config.properties`, Gradle otomatis membangun APK **Mode Publik Generik** (`applicationId = org.cartaexam.exambro`) yang bisa dipakai sekolah mana saja via QR Code atau URL manual.

---

## 🏗️ Cara Build APK

### Prasyarat
- **JDK 17**
- **Android Studio** (atau Android SDK Command-line Tools dengan **Android SDK Platform 35**, `minSdk = 24`, `targetSdk = 35`)

### A. Menggunakan Android Studio (Untuk Pemula)
1. Buka folder `carta-exambro/` melalui **File → Open** di Android Studio.
2. Tunggu proses **Gradle Sync** selesai.
3. Untuk APK uji coba (debug):
   - Pilih menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
4. Untuk APK rilis (ukuran kecil, R8 minify & resource shrinking aktif):
   - Pilih **Build → Generate Signed Bundle / APK → APK**.
   - Buat atau pilih keystore `.jks` Anda, lalu simpan hasil `app-release.apk`.

### B. Menggunakan Command Line (Untuk Developer / CI)
1. *(Opsional untuk release signed build)* Siapkan `carta-exambro/keystore.properties`:
   ```properties
   storeFile=your-release-key.jks
   storePassword=YOUR_STORE_PASSWORD
   keyAlias=your_key_alias
   keyPassword=YOUR_KEY_PASSWORD
   ```
2. Jalankan Gradle:
   ```bash
   cd carta-exambro
   ./gradlew assembleRelease   # atau gradlew.bat assembleRelease di Windows
   ```
   Hasil APK berada di `app/build/outputs/apk/release/app-release.apk`.

> ⚠️ **Keamanan:** Jangan pernah meng-commit file `*.jks`, `*.keystore`, atau `keystore.properties` ke repositori publik. Semuanya sudah diblokir oleh `.gitignore`.

---

## 🚀 Menyajikan APK & Auto-Update dari Server CartaExam

Agar siswa dapat mengunduh APK langsung dari portal CartaExam (`/api/exambro/download`) dan aplikasi mendapat notifikasi pembaruan otomatis (`/api/exambro/version`):

1. Salin `app-release.apk` ke folder root server CartaExam:
   ```text
   public/downloads/CartaExambro.apk
   ```
2. Perbarui file metadata `public/downloads/exambro-version.json`:
   ```json
   {
     "versionCode": 2,
     "versionName": "1.1.0",
     "minSupportedVersionCode": 1,
     "forceUpdate": false,
     "changelog": "Perbaikan stabilitas dan dukungan auto-update."
   }
   ```
   - Set `"forceUpdate": true` atau naikkan `"minSupportedVersionCode"` jika ingin **mewajibkan** semua siswa update sebelum bisa masuk ujian.

---

## 🔌 Spesifikasi Integrasi Web ↔ Android (`CartaExambroBridge`)

### Identifikasi Client
- `User-Agent`: `<DefaultWebViewUA> CartaExambro/<versionName>`
- Header HTTP tambahan pada navigasi & upload:
  - `X-CartaExambro: <versionName>`
  - `X-Exambro-App: CartaExambro`

### JavaScript Interface (`window.CartaExambroBridge`)
- `isExambro(): Boolean`
- `getAppVersion(): String`
- `onExamStateChanged(sessionId, studentId, isActive)` — Mengaktifkan/menonaktifkan monitor OS & LockTask.
- `setScreenshotConfig(configJson)` — Mengirim kebijakan burst screenshot dari `exam_templates.violationSettings`.
- `setProctorExitPinHash(sha256Hex)` — Mengirim hash SHA-256 PIN darurat pengawas dari `.seb-config.json`.

### Callback Web (`window.__cartaExambroApplyViolationResult`)
- Setelah `ViolationUploader` mengirim bukti & log pelanggaran ke backend, `ExamActivity` memanggil `window.__cartaExambroApplyViolationResult(responseJson, type, details)` agar UI web langsung memperbarui counter pelanggaran atau menampilkan status terminasi.
