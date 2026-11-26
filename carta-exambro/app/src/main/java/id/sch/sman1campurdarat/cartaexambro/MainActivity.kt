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
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import id.sch.sman1campurdarat.cartaexambro.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var pendingTargetUrl: String? = null

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

        binding.btnOpenDefault.setOnClickListener {
            startExamFlow(BuildConfig.DEFAULT_EXAM_URL)
        }

        binding.btnScanQr.setOnClickListener {
            checkCameraAndScan()
        }

        binding.btnOpenManual.setOnClickListener {
            openManualUrl()
        }

        binding.etManualUrl.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_GO) {
                openManualUrl()
                true
            } else {
                false
            }
        }
    }

    private fun openManualUrl() {
        val raw = binding.etManualUrl.text?.toString()?.trim().orEmpty()
        val candidate = if (raw.isEmpty()) BuildConfig.DEFAULT_EXAM_URL else raw
        val normalized = normalizeUrl(candidate)
        if (normalized == null) {
            Toast.makeText(
                this,
                "Masukkan URL http:// atau https:// yang valid.",
                Toast.LENGTH_SHORT
            ).show()
            return
        }
        startExamFlow(normalized)
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

    private fun startExamFlow(targetUrl: String) {
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
