# CartaExambro (Android Native)

Aplikasi ujian native Android ringan (Kotlin + XML View + System WebView) untuk **CartaExam SMAN 1 Campurdarat**.

## Fitur Keamanan & Integrasi
- **Akses Langsung & SSO PortoCarta:** Membuka `https://exam.sman1campurdarat.sch.id` dan mendukung alur login SSO `https://porto.sman1campurdarat.sch.id` dengan cookie WebView persisten.
- **Scan QR Code & Input URL Manual:** Mendukung QR Code link ujian (`https://...` maupun `sebs://...`) secara offline (ZXing) dan input URL manual.
- **Proteksi Layar OS (`FLAG_SECURE`):** Memblokir screenshot manual, perekaman layar, Recent Apps preview, Circle to Search, dan Gemini Live Share Screen.
- **Blokir Overlay & Deteksi Sentuhan Terhalang:**
  - `window.setHideOverlayWindows(true)` (Android 12+) menyembunyikan floating widget non-sistem.
  - `dispatchTouchEvent` memeriksa `FLAG_WINDOW_IS_OBSCURED` & `FLAG_WINDOW_IS_PARTIALLY_OBSCURED` (Android 10+).
  - Deteksi `onWindowFocusChanged`, `onMultiWindowModeChanged` (Split Screen), `onPictureInPictureModeChanged`, `AudioManager.activeRecordingConfigurations` (mikrofon dipakai app lain), serta `addScreenRecordingCallback` (Android 15+) / `DisplayManager` virtual display.
- **Screenshot Bukti Pelanggaran (`MediaProjection`):** Mengambil tangkapan seluruh layar saat terdeteksi pelanggaran/overlay, mengompres ke JPEG ringan (lebar maks 720px), lalu mengunggah ke `/api/student/exams/[sessionId]/violation-evidence` dan melaporkannya melalui `window.__cartaExambroReportViolation` (`CartaExambroBridge`).

## Cara Build APK di Android Studio
1. Buka folder `carta-exambro/` menggunakan **Android Studio** (JDK 17, Android SDK Platform 35).
2. Tunggu Gradle Sync selesai (Android Studio otomatis mengunduh Gradle wrapper jar jika belum ada).
3. Untuk APK uji coba: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
4. Untuk APK rilis kecil (R8 minify & resource shrinking aktif):
   - **Build → Generate Signed Bundle / APK → APK**, buat keystore baru (`.jks`), **jangan commit file `.jks` atau `keystore.properties` ke Git** (sudah masuk `.gitignore`).
