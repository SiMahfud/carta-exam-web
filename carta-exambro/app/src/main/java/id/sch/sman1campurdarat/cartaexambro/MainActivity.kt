package id.sch.sman1campurdarat.cartaexambro

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import id.sch.sman1campurdarat.cartaexambro.databinding.ActivityMainBinding
import java.util.concurrent.atomic.AtomicBoolean

class MainActivity : AppCompatActivity() {

    companion object {
        private const val PREFS_NAME = "carta_exambro_prefs"
        private const val KEY_LAST_EXAM_ORIGIN = "last_exam_origin"
        private const val KEY_LAST_MANUAL_URL = "last_manual_url"
    }

    private lateinit var binding: ActivityMainBinding
    private var pendingTargetUrl: String? = null
    private var pendingUpdateInfo: AppUpdater.UpdateInfo? = null
    private var pendingExamAfterOptionalUpdate: String? = null
    private var isCheckingPreExam: Boolean = false

    private val checkedOrigins = mutableSetOf<String>()
    private val mandatoryBlockedOrigins = mutableMapOf<String, AppUpdater.UpdateInfo>()

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) {
        // Lanjutkan permintaan MediaProjection meskipun notifikasi ditolak (foreground service tetap jalan)
        requestScreenCaptureAndLaunch()
    }

    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            launchQrScanner()
        } else {
            Toast.makeText(
                this,
                "Izin kamera diperlukan untuk memindai QR Code ujian.",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    private val installPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        val info = pendingUpdateInfo ?: return@registerForActivityResult
        if (AppUpdater.canRequestPackageInstalls(this)) {
            startApkDownloadAndInstall(info)
        } else {
            Toast.makeText(
                this,
                "Aktifkan izin \"Izinkan dari sumber ini\" agar pembaruan dapat dipasang.",
                Toast.LENGTH_LONG
            ).show()
            if (info.isMandatory) {
                showUpdateAvailableDialog(info, pendingExamAfterOptionalUpdate)
            }
        }
    }

    private val qrLauncher = registerForActivityResult(ScanContract()) { result ->
        val rawContent = result.contents?.trim()
        if (rawContent.isNullOrEmpty()) return@registerForActivityResult

        val normalized = normalizeUrl(rawContent)
        if (normalized == null) {
            Toast.makeText(this, "QR Code bukan URL ujian yang valid.", Toast.LENGTH_LONG).show()
            return@registerForActivityResult
        }

        binding.etManualUrl.setText(normalized)
        startExamFlow(normalized)
    }

    private val mediaProjectionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val url = pendingTargetUrl ?: BuildConfig.DEFAULT_EXAM_URL
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val serviceIntent = Intent(this, ScreenCaptureService::class.java).apply {
                action = ScreenCaptureService.ACTION_START
                putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, result.resultCode)
                putExtra(ScreenCaptureService.EXTRA_RESULT_DATA, result.data)
            }
            ContextCompat.startForegroundService(this, serviceIntent)

            val examIntent = Intent(this, ExamActivity::class.java).apply {
                putExtra(ExamActivity.EXTRA_TARGET_URL, url)
            }
            startActivity(examIntent)
        } else {
            AlertDialog.Builder(this)
                .setTitle("Izin Keamanan Diperlukan")
                .setMessage(
                    "Untuk mengikuti ujian dengan CartaExambro, pilih \"Entire screen / Seluruh layar\" pada dialog sistem agar pelanggaran overlay dapat direkam."
                )
                .setPositiveButton("Coba Lagi") { _, _ ->
                    requestScreenCaptureAndLaunch()
                }
                .setNegativeButton("Batal", null)
                .show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.tvVersion.text = "CartaExambro v${BuildConfig.VERSION_NAME} • Android Native"
        binding.tvSchoolName.text = BuildConfig.SCHOOL_NAME.ifBlank { getString(R.string.school_name) }

        val savedManualUrl = getPrefs().getString(KEY_LAST_MANUAL_URL, null)
        if (!savedManualUrl.isNullOrBlank()) {
            binding.etManualUrl.setText(savedManualUrl)
        }

        val quickLaunchUrl = resolveQuickLaunchUrl()
        if (quickLaunchUrl != null) {
            binding.btnOpenDefault.visibility = android.view.View.VISIBLE
            binding.tvServerTitle.text = if (BuildConfig.SSO_DOMAIN.isNotBlank()) {
                "SERVER UTAMA & SSO"
            } else {
                "SERVER UJIAN SEKOLAH"
            }
            binding.tvServerDesc.text = if (BuildConfig.SSO_DOMAIN.isNotBlank()) {
                "Terhubung ke $quickLaunchUrl dengan dukungan SSO ${BuildConfig.SSO_DOMAIN}."
            } else {
                "Langsung terhubung ke $quickLaunchUrl."
            }
            binding.btnOpenDefault.setOnClickListener {
                startExamFlow(quickLaunchUrl)
            }
        } else {
            binding.btnOpenDefault.visibility = android.view.View.GONE
            binding.btnScanQr.setBackgroundResource(R.drawable.bg_button_primary)
        }

        binding.btnScanQr.setOnClickListener {
            checkCameraAndScan()
        }

        binding.btnOpenManual.setOnClickListener {
            openManualUrl()
        }

        binding.btnCheckUpdate.setOnClickListener {
            val targetOrigin = resolvePreferredUpdateOrigin()
            if (targetOrigin.isNullOrBlank()) {
                Toast.makeText(
                    this,
                    "Masukkan URL server CartaExam atau pindai QR Code terlebih dahulu.",
                    Toast.LENGTH_LONG
                ).show()
            } else {
                checkUpdateManually(targetOrigin)
            }
        }

        binding.etManualUrl.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_GO) {
                openManualUrl()
                true
            } else {
                false
            }
        }

        // Cek pembaruan secara senyap saat aplikasi dibuka mengikuti server terakhir / default
        runSilentStartupUpdateCheck(resolvePreferredUpdateOrigin())
    }

    private fun getPrefs() = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun saveExamOrigin(targetUrl: String, saveManualText: Boolean) {
        val origin = AppUpdater.extractOrigin(targetUrl) ?: return
        getPrefs().edit().apply {
            putString(KEY_LAST_EXAM_ORIGIN, origin)
            if (saveManualText) {
                putString(KEY_LAST_MANUAL_URL, targetUrl)
            }
            apply()
        }
    }

    private fun resolveQuickLaunchUrl(): String? {
        if (BuildConfig.DEFAULT_EXAM_URL.isNotBlank()) {
            return BuildConfig.DEFAULT_EXAM_URL
        }
        val lastOrigin = getPrefs().getString(KEY_LAST_EXAM_ORIGIN, null)
        return lastOrigin?.takeIf { it.isNotBlank() }
    }

    private fun resolvePreferredUpdateOrigin(): String? {
        val manualText = binding.etManualUrl.text?.toString()?.trim().orEmpty()
        if (manualText.isNotEmpty()) {
            val normalized = normalizeUrl(manualText)
            val manualOrigin = normalized?.let { AppUpdater.extractOrigin(it) }
            if (manualOrigin != null) {
                return manualOrigin
            }
        }
        val lastOrigin = getPrefs().getString(KEY_LAST_EXAM_ORIGIN, null)
        if (!lastOrigin.isNullOrBlank()) {
            return lastOrigin
        }
        return BuildConfig.DEFAULT_EXAM_URL.takeIf { it.isNotBlank() }
    }

    private fun runSilentStartupUpdateCheck(origin: String?) {
        if (origin.isNullOrBlank()) return
        AppUpdater.checkForUpdate(origin, timeoutMs = 4500) { result ->
            if (isFinishing || isDestroyed) return@checkForUpdate
            result.onSuccess { info ->
                checkedOrigins.add(info.origin)
                if (info.isMandatory) {
                    mandatoryBlockedOrigins[info.origin] = info
                }
                if (info.hasUpdate) {
                    showUpdateAvailableDialog(info, continueExamUrl = null)
                }
            }
        }
    }

    private fun checkUpdateManually(origin: String) {
        binding.btnCheckUpdate.isEnabled = false
        binding.btnCheckUpdate.text = "Memeriksa pembaruan..."
        AppUpdater.checkForUpdate(origin, timeoutMs = 6000) { result ->
            binding.btnCheckUpdate.isEnabled = true
            binding.btnCheckUpdate.text = getString(R.string.btn_check_update)
            if (isFinishing || isDestroyed) return@checkForUpdate

            result.onSuccess { info ->
                checkedOrigins.add(info.origin)
                if (info.isMandatory) {
                    mandatoryBlockedOrigins[info.origin] = info
                }
                if (info.hasUpdate) {
                    showUpdateAvailableDialog(info, continueExamUrl = null)
                } else {
                    Toast.makeText(
                        this,
                        "CartaExambro sudah versi terbaru (v${BuildConfig.VERSION_NAME}).",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }.onFailure { err ->
                Toast.makeText(
                    this,
                    "Gagal memeriksa pembaruan ke $origin: ${err.message ?: "Tidak dapat terhubung"}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun openManualUrl() {
        val raw = binding.etManualUrl.text?.toString()?.trim().orEmpty()
        val candidate = if (raw.isEmpty()) resolveQuickLaunchUrl().orEmpty() else raw
        if (candidate.isEmpty()) {
            Toast.makeText(
                this,
                "Masukkan URL server CartaExam sekolah Anda (misal https://exam.sekolahanda.sch.id).",
                Toast.LENGTH_LONG
            ).show()
            return
        }
        val normalized = normalizeUrl(candidate)
        if (normalized == null) {
            Toast.makeText(
                this,
                "Masukkan URL http:// atau https:// yang valid.",
                Toast.LENGTH_SHORT
            ).show()
            return
        }
        startExamFlow(normalized, saveManualText = raw.isNotEmpty())
    }

    private fun checkCameraAndScan() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
        ) {
            launchQrScanner()
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun launchQrScanner() {
        val options = ScanOptions().apply {
            setCaptureActivity(QrScanActivity::class.java)
            setPrompt("Arahkan kamera ke QR Code link ujian CartaExam")
            setBeepEnabled(false)
            setOrientationLocked(true)
            setDesiredBarcodeFormats(ScanOptions.QR_CODE)
        }
        qrLauncher.launch(options)
    }

    private fun startExamFlow(targetUrl: String, saveManualText: Boolean = false) {
        if (isCheckingPreExam) return
        saveExamOrigin(targetUrl, saveManualText)

        val targetOrigin = AppUpdater.extractOrigin(targetUrl)
        if (targetOrigin == null) {
            proceedWithExamPermissions(targetUrl)
            return
        }

        mandatoryBlockedOrigins[targetOrigin]?.let { blockedInfo ->
            showUpdateAvailableDialog(blockedInfo, continueExamUrl = null)
            return
        }

        if (checkedOrigins.contains(targetOrigin)) {
            proceedWithExamPermissions(targetUrl)
            return
        }

        // Cek pembaruan singkat terhadap server ujian tujuan (online maupun LAN lokal)
        isCheckingPreExam = true
        setLaunchButtonsEnabled(false)
        AppUpdater.checkForUpdate(targetOrigin, timeoutMs = 2500) { result ->
            isCheckingPreExam = false
            setLaunchButtonsEnabled(true)
            if (isFinishing || isDestroyed) return@checkForUpdate

            checkedOrigins.add(targetOrigin)
            val info = result.getOrNull()
            if (info != null && info.hasUpdate) {
                if (info.isMandatory) {
                    mandatoryBlockedOrigins[targetOrigin] = info
                    showUpdateAvailableDialog(info, continueExamUrl = null)
                } else {
                    showUpdateAvailableDialog(info, continueExamUrl = targetUrl)
                }
            } else {
                proceedWithExamPermissions(targetUrl)
            }
        }
    }

    private fun setLaunchButtonsEnabled(enabled: Boolean) {
        binding.btnOpenDefault.isEnabled = enabled
        binding.btnScanQr.isEnabled = enabled
        binding.btnOpenManual.isEnabled = enabled
    }

    private fun proceedWithExamPermissions(targetUrl: String) {
        pendingTargetUrl = targetUrl
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            requestScreenCaptureAndLaunch()
        }
    }

    private fun showUpdateAvailableDialog(
        info: AppUpdater.UpdateInfo,
        continueExamUrl: String?
    ) {
        if (isFinishing || isDestroyed) return

        pendingExamAfterOptionalUpdate = continueExamUrl
        val sizeText = AppUpdater.formatBytes(info.fileSize)
        val changelogText = info.changelog.ifBlank {
            "Peningkatan stabilitas dan keamanan ujian."
        }
        val title = if (info.isMandatory) {
            "Pembaruan Wajib Tersedia"
        } else {
            "Pembaruan Aplikasi Tersedia"
        }
        val message = buildString {
            append("Versi terpasang: v${BuildConfig.VERSION_NAME}\n")
            append("Versi terbaru: v${info.versionName} ($sizeText)\n")
            append("Sumber: ${info.origin}\n\n")
            append("Catatan rilis:\n$changelogText")
            if (info.isMandatory) {
                append("\n\nVersi aplikasi ini harus diperbarui terlebih dahulu sebelum memulai ujian.")
            }
        }

        val builder = AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setCancelable(!info.isMandatory)
            .setPositiveButton("Update Sekarang") { _, _ ->
                beginUpdateInstallFlow(info)
            }

        if (!info.isMandatory) {
            val negativeText = if (continueExamUrl != null) "Nanti (Lanjut Ujian)" else "Nanti"
            builder.setNegativeButton(negativeText) { _, _ ->
                continueExamUrl?.let { proceedWithExamPermissions(it) }
            }
        }

        builder.show()
    }

    private fun beginUpdateInstallFlow(info: AppUpdater.UpdateInfo) {
        pendingUpdateInfo = info
        if (!AppUpdater.canRequestPackageInstalls(this)) {
            AlertDialog.Builder(this)
                .setTitle("Izin Pemasangan Diperlukan")
                .setMessage(
                    "Android meminta izin satu kali agar CartaExambro dapat memasang pembaruan APK secara langsung. Pada layar berikutnya, aktifkan \"Izinkan dari sumber ini\" lalu kembali ke aplikasi."
                )
                .setCancelable(!info.isMandatory)
                .setPositiveButton("Buka Pengaturan") { _, _ ->
                    installPermissionLauncher.launch(AppUpdater.buildInstallPermissionIntent(this))
                }
                .apply {
                    if (!info.isMandatory) {
                        setNegativeButton("Batal") { _, _ ->
                            pendingExamAfterOptionalUpdate?.let { proceedWithExamPermissions(it) }
                        }
                    }
                }
                .show()
            return
        }

        startApkDownloadAndInstall(info)
    }

    private fun startApkDownloadAndInstall(info: AppUpdater.UpdateInfo) {
        if (isFinishing || isDestroyed) return

        val dp = resources.displayMetrics.density
        val pad = (20 * dp).toInt()
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, (12 * dp).toInt(), pad, (8 * dp).toInt())
        }
        val tvStatus = TextView(this).apply {
            text = "Menghubungkan ke server..."
            textSize = 13f
            setPadding(0, 0, 0, (12 * dp).toInt())
        }
        val progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            isIndeterminate = true
            max = 100
        }
        container.addView(tvStatus)
        container.addView(progressBar)

        val cancelled = AtomicBoolean(false)
        val dialogBuilder = AlertDialog.Builder(this)
            .setTitle("Mengunduh CartaExambro v${info.versionName}")
            .setView(container)
            .setCancelable(false)

        if (!info.isMandatory) {
            dialogBuilder.setNegativeButton("Batal") { d, _ ->
                cancelled.set(true)
                d.dismiss()
            }
        }

        val progressDialog = dialogBuilder.create()
        progressDialog.show()

        AppUpdater.downloadApk(
            context = this,
            info = info,
            cancelled = cancelled,
            onProgress = { percent, downloaded, total ->
                if (!progressDialog.isShowing) return@downloadApk
                if (percent >= 0 && total > 0L) {
                    progressBar.isIndeterminate = false
                    progressBar.progress = percent
                    tvStatus.text =
                        "Mengunduh... $percent% (${AppUpdater.formatBytes(downloaded)} / ${AppUpdater.formatBytes(total)})"
                } else {
                    progressBar.isIndeterminate = true
                    tvStatus.text = "Mengunduh... ${AppUpdater.formatBytes(downloaded)}"
                }
            },
            onSuccess = { apkFile ->
                if (progressDialog.isShowing) {
                    progressDialog.dismiss()
                }
                if (isFinishing || isDestroyed) return@downloadApk

                val launched = AppUpdater.launchApkInstaller(this, apkFile)
                if (!launched) {
                    Toast.makeText(
                        this,
                        "Tidak dapat membuka installer Android di perangkat ini.",
                        Toast.LENGTH_LONG
                    ).show()
                }
            },
            onError = { errMsg ->
                if (progressDialog.isShowing) {
                    progressDialog.dismiss()
                }
                if (isFinishing || isDestroyed) return@downloadApk

                AlertDialog.Builder(this)
                    .setTitle("Gagal Mengunduh Pembaruan")
                    .setMessage(errMsg)
                    .setCancelable(!info.isMandatory)
                    .setPositiveButton("Coba Lagi") { _, _ ->
                        startApkDownloadAndInstall(info)
                    }
                    .apply {
                        if (!info.isMandatory) {
                            setNegativeButton("Tutup") { _, _ ->
                                pendingExamAfterOptionalUpdate?.let { proceedWithExamPermissions(it) }
                            }
                        }
                    }
                    .show()
            }
        )
    }

    private fun requestScreenCaptureAndLaunch() {
        val projectionManager =
            getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        mediaProjectionLauncher.launch(projectionManager.createScreenCaptureIntent())
    }

    private fun normalizeUrl(raw: String): String? {
        var cleaned = raw.trim()
        if (cleaned.startsWith("sebs://", ignoreCase = true)) {
            cleaned = "https://" + cleaned.substring(7)
        } else if (cleaned.startsWith("seb://", ignoreCase = true)) {
            cleaned = "http://" + cleaned.substring(6)
        } else if (!cleaned.startsWith("http://", ignoreCase = true) &&
            !cleaned.startsWith("https://", ignoreCase = true)
        ) {
            cleaned = "https://$cleaned"
        }

        val uri = Uri.parse(cleaned)
        val scheme = uri.scheme?.lowercase()
        val host = uri.host
        return if ((scheme == "https" || scheme == "http") && !host.isNullOrBlank()) {
            uri.toString()
        } else {
            null
        }
    }
}
