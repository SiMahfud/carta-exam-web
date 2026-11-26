package id.sch.sman1campurdarat.cartaexambro

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.hardware.display.DisplayManager
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import id.sch.sman1campurdarat.cartaexambro.databinding.ActivityExamBinding
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.function.Consumer

class ExamActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_TARGET_URL = "extra_target_url"
        private const val NATIVE_COOLDOWN_MS = 5000L
        private const val MIC_CHECK_INTERVAL_MS = 4000L
    }

    private lateinit var binding: ActivityExamBinding

    private var initialOrigin: String = BuildConfig.DEFAULT_EXAM_URL
    private val allowedHosts = mutableSetOf(
        BuildConfig.EXAM_DOMAIN,
        BuildConfig.SSO_DOMAIN
    )

    @Volatile
    private var activeSessionId: String? = null

    @Volatile
    private var activeStudentId: String = ""

    @Volatile
    private var isExamSessionActive: Boolean = false

    @Volatile
    private var isInternalDialogVisible: Boolean = false

    @Volatile
    private var isExitingIntentionally: Boolean = false

    private val lastViolationTimes = ConcurrentHashMap<String, Long>()
    private val mainHandler = Handler(Looper.getMainLooper())
    private lateinit var customUserAgent: String

    private var displayManager: DisplayManager? = null
    private var audioManager: AudioManager? = null
    private var screenRecordingCallback: Consumer<Int>? = null

    private val displayListener = object : DisplayManager.DisplayListener {
        override fun onDisplayAdded(displayId: Int) {
            checkExternalOrVirtualDisplays()
        }

        override fun onDisplayRemoved(displayId: Int) {}
        override fun onDisplayChanged(displayId: Int) {}
    }

    private val micMonitorRunnable = object : Runnable {
        override fun run() {
            if (isExamSessionActive && !isFinishing) {
                checkActiveMicrophoneUsage()
            }
            mainHandler.postDelayed(this, MIC_CHECK_INTERVAL_MS)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Pasang proteksi layar tingkat OS sebelum render UI
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SECURE or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            window.setHideOverlayWindows(true)
        }

        binding = ActivityExamBinding.inflate(layoutInflater)
        setContentView(binding.root)
        enableImmersiveMode()

        val targetUrl = intent.getStringExtra(EXTRA_TARGET_URL) ?: BuildConfig.DEFAULT_EXAM_URL
        val parsedUri = Uri.parse(targetUrl)
        parsedUri.host?.let { allowedHosts.add(it.lowercase()) }
        initialOrigin = "${parsedUri.scheme ?: "https"}://${parsedUri.authority ?: BuildConfig.EXAM_DOMAIN}"

        setupTopBar()
        setupWebView(targetUrl)
        setupSecurityMonitors()
        setupBackNavigation()
    }

    private fun setupTopBar() {
        binding.btnReload.setOnClickListener {
            binding.webView.reload()
        }
        binding.btnExit.setOnClickListener {
            showExitConfirmationDialog()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView(targetUrl: String) {
        val webView = binding.webView
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        val defaultUa = WebSettings.getDefaultUserAgent(this)
        customUserAgent = "$defaultUa CartaExambro/${BuildConfig.VERSION_NAME}"

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            userAgentString = customUserAgent
            mediaPlaybackRequiresUserGesture = false
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            allowFileAccess = false
            allowContentAccess = false
        }

        val bridge = ExamWebBridge { sessionId, studentId, active ->
            mainHandler.post {
                activeSessionId = sessionId.takeIf { it.isNotBlank() }
                activeStudentId = studentId
                isExamSessionActive = active && activeSessionId != null
                updateStatusBadge()
                if (isExamSessionActive) {
                    tryStartLockTask()
                }
            }
        }
        webView.addJavascriptInterface(bridge, "CartaExambroBridge")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress in 1..99) {
                    binding.progressBar.visibility = View.VISIBLE
                    binding.progressBar.progress = newProgress
                } else {
                    binding.progressBar.visibility = View.GONE
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val uri = request?.url ?: return false
                val rawUrl = uri.toString()
                val scheme = uri.scheme?.lowercase().orEmpty()

                if (scheme == "intent") {
                    val resolvedUrl = resolveIntentUrl(rawUrl)
                    if (resolvedUrl != null) {
                        val resolvedHost = Uri.parse(resolvedUrl).host?.lowercase().orEmpty()
                        if (isHostAllowed(resolvedHost)) {
                            view?.loadUrl(resolvedUrl, exambroHeaders())
                        } else {
                            Toast.makeText(
                                this@ExamActivity,
                                "Akses ke domain luar ($resolvedHost) diblokir selama ujian.",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    } else {
                        Toast.makeText(
                            this@ExamActivity,
                            "Tautan intent SSO tidak dapat diproses.",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                    return true
                }

                if (scheme == "sebs" || scheme == "seb") {
                    val httpsUrl = if (scheme == "sebs") {
                        "https://" + rawUrl.substring(7)
                    } else {
                        "http://" + rawUrl.substring(6)
                    }
                    val targetHost = Uri.parse(httpsUrl).host?.lowercase().orEmpty()
                    if (isHostAllowed(targetHost)) {
                        view?.loadUrl(httpsUrl, exambroHeaders())
                    }
                    return true
                }

                if (scheme != "http" && scheme != "https") {
                    return true
                }

                val host = uri.host?.lowercase() ?: return true

                if (!isHostAllowed(host)) {
                    Toast.makeText(
                        this@ExamActivity,
                        "Akses ke domain luar ($host) diblokir selama ujian.",
                        Toast.LENGTH_SHORT
                    ).show()
                    return true
                }

                // Biarkan WebView menangani navigasi & redirect SSO PortoCarta secara native;
                // identitas CartaExambro tetap terkirim via custom User-Agent.
                return false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                CookieManager.getInstance().flush()
                syncSessionFromUrl(url)
            }
        }

        webView.loadUrl(targetUrl, exambroHeaders())
    }

    private fun exambroHeaders(): Map<String, String> = mapOf(
        "X-CartaExambro" to BuildConfig.VERSION_NAME,
        "X-Exambro-App" to "CartaExambro"
    )

    private fun resolveIntentUrl(rawIntentUrl: String): String? {
        try {
            val parsed = Intent.parseUri(rawIntentUrl, Intent.URI_INTENT_SCHEME)
            val dataUri = parsed.data
            if (dataUri != null) {
                val dataScheme = dataUri.scheme?.lowercase()
                if (dataScheme == "http" || dataScheme == "https") {
                    return dataUri.toString()
                }
            }
            val fallback = parsed.getStringExtra("browser_fallback_url")
            if (!fallback.isNullOrBlank() &&
                (fallback.startsWith("https://", ignoreCase = true) ||
                    fallback.startsWith("http://", ignoreCase = true))
            ) {
                return fallback
            }
        } catch (_: Exception) {
        }

        // Fallback manual: ubah intent://<host/path>#Intent;... -> https://<host/path>
        val withoutPrefix = rawIntentUrl.removePrefix("intent://")
        val beforeHash = withoutPrefix.substringBefore("#Intent;")
        if (beforeHash.isNotBlank()) {
            val schemeMatch = Regex("scheme=(https?)").find(withoutPrefix)
            val targetScheme = schemeMatch?.groupValues?.getOrNull(1) ?: "https"
            return "$targetScheme://$beforeHash"
        }
        return null
    }

    private fun isHostAllowed(host: String): Boolean {
        return allowedHosts.any { allowed ->
            host == allowed || host.endsWith(".$allowed")
        }
    }

    private fun syncSessionFromUrl(url: String?) {
        if (url.isNullOrBlank()) return
        val uri = Uri.parse(url)
        val path = uri.path ?: return
        // Deteksi pola /student/exams/<sessionId> (kecuali /review)
        val regex = Regex("^/student/exams/([^/]+)$")
        val match = regex.find(path)
        if (match != null) {
            val detectedId = match.groupValues[1]
            if (detectedId.isNotBlank() && activeSessionId == null) {
                activeSessionId = detectedId
                updateStatusBadge()
            }
        } else if (path == "/student/exams" || path == "/login") {
            isExamSessionActive = false
            activeSessionId = null
            updateStatusBadge()
        }
    }

    private fun updateStatusBadge() {
        val statusText = when {
            isExamSessionActive -> "Ujian Aktif • Anti-Cheat & Screenshot Siap"
            ScreenCaptureService.isRunning -> "CartaExambro • Terproteksi"
            else -> "CartaExambro • Mode Standar"
        }
        binding.tvStatusBadge.text = statusText
    }

    private fun setupSecurityMonitors() {
        displayManager = getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        displayManager?.registerDisplayListener(displayListener, mainHandler)

        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        mainHandler.postDelayed(micMonitorRunnable, MIC_CHECK_INTERVAL_MS)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            val callback = Consumer<Int> { state ->
                if (state == WindowManager.SCREEN_RECORDING_STATE_VISIBLE) {
                    // Abaikan jika hanya VirtualDisplay internal milik ScreenCaptureService sendiri
                    if (hasExternalVirtualDisplay()) {
                        triggerViolationWithScreenshot(
                            "SCREEN_RECORDING",
                            "Perekaman atau berbagi layar eksternal terdeteksi oleh Android 15"
                        )
                    }
                }
            }
            screenRecordingCallback = callback
            windowManager.addScreenRecordingCallback(mainExecutor, callback)
        }
    }

    override fun dispatchTouchEvent(ev: MotionEvent?): Boolean {
        if (ev != null && isExamSessionActive && !isInternalDialogVisible) {
            val obscured = (ev.flags and MotionEvent.FLAG_WINDOW_IS_OBSCURED) != 0
            val partiallyObscured = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                (ev.flags and MotionEvent.FLAG_WINDOW_IS_PARTIALLY_OBSCURED) != 0
            } else {
                false
            }
            if (obscured || partiallyObscured) {
                triggerViolationWithScreenshot(
                    "OVERLAY_DETECTED",
                    "Sentuhan terdeteksi saat sebagian layar tertutup jendela/floating widget lain"
                )
            }
        }
        return super.dispatchTouchEvent(ev)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            enableImmersiveMode()
        } else if (isExamSessionActive && !isInternalDialogVisible && !isExitingIntentionally && !isFinishing) {
            triggerViolationWithScreenshot(
                "WINDOW_BLUR",
                "Jendela ujian kehilangan fokus (kemungkinan Assistant/Gemini/dialog aplikasi lain dibuka)"
            )
        }
    }

    override fun onMultiWindowModeChanged(isInMultiWindowMode: Boolean, newConfig: Configuration) {
        super.onMultiWindowModeChanged(isInMultiWindowMode, newConfig)
        if (isInMultiWindowMode && isExamSessionActive) {
            triggerViolationWithScreenshot(
                "SPLIT_SCREEN",
                "Mode layar terbelah (Split Screen) terdeteksi di level OS"
            )
        }
    }

    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean,
        newConfig: Configuration
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        if (isInPictureInPictureMode && isExamSessionActive) {
            triggerViolationWithScreenshot(
                "PIP_MODE",
                "Mode Picture-in-Picture terdeteksi"
            )
        }
    }

    override fun onStop() {
        super.onStop()
        if (isExamSessionActive && !isExitingIntentionally && !isFinishing) {
            triggerViolationWithScreenshot(
                "APP_SWITCH",
                "Siswa meminimalkan atau berpindah keluar dari aplikasi CartaExambro",
                preferDirectApi = true
            )
        }
    }

    private fun hasExternalVirtualDisplay(): Boolean {
        val dm = displayManager ?: return false
        return dm.displays.any { display ->
            display.displayId != android.view.Display.DEFAULT_DISPLAY &&
                display.name != ScreenCaptureService.VIRTUAL_DISPLAY_NAME
        }
    }

    private fun checkExternalOrVirtualDisplays() {
        if (!isExamSessionActive) return
        if (hasExternalVirtualDisplay()) {
            triggerViolationWithScreenshot(
                "SCREEN_RECORDING",
                "Layar eksternal atau virtual display (Share Screen/Cast) terdeteksi"
            )
        }
    }

    private fun checkActiveMicrophoneUsage() {
        val am = audioManager ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val activeConfigs = am.activeRecordingConfigurations
            if (activeConfigs.isNotEmpty()) {
                triggerViolationWithScreenshot(
                    "MICROPHONE_IN_USE",
                    "Mikrofon terdeteksi sedang digunakan aplikasi lain selama ujian berlangsung"
                )
            }
        }
    }

    private fun triggerViolationWithScreenshot(
        type: String,
        details: String,
        preferDirectApi: Boolean = false
    ) {
        val sessionId = activeSessionId ?: return
        val now = System.currentTimeMillis()
        val lastTime = lastViolationTimes[type] ?: 0L
        if (now - lastTime < NATIVE_COOLDOWN_MS) return
        lastViolationTimes[type] = now

        // Ambil screenshot seluruh layar (MediaProjection) saat pelanggaran terjadi
        val jpegBytes = ScreenCaptureService.captureScreenshotJpeg()

        ViolationUploader.uploadEvidenceAndDispatch(
            origin = initialOrigin,
            sessionId = sessionId,
            studentId = activeStudentId,
            type = type,
            details = details,
            jpegBytes = jpegBytes,
            userAgent = customUserAgent
        ) { evidenceUrl ->
            if (preferDirectApi) {
                ViolationUploader.sendFallbackViolation(
                    origin = initialOrigin,
                    sessionId = sessionId,
                    studentId = activeStudentId,
                    type = type,
                    details = details,
                    evidenceUrl = evidenceUrl,
                    userAgent = customUserAgent
                )
                return@uploadEvidenceAndDispatch
            }

            mainHandler.post {
                if (isFinishing || isDestroyed) return@post
                val escapedType = JSONObject.quote(type)
                val escapedDetails = JSONObject.quote(details)
                val escapedEvidence = evidenceUrl?.let { JSONObject.quote(it) } ?: "undefined"

                val js = """
                    (function() {
                        if (typeof window.__cartaExambroReportViolation === 'function') {
                            window.__cartaExambroReportViolation($escapedType, $escapedDetails, $escapedEvidence);
                            return true;
                        }
                        return false;
                    })();
                """.trimIndent()

                binding.webView.evaluateJavascript(js) { result ->
                    if (result != "true") {
                        ViolationUploader.sendFallbackViolation(
                            origin = initialOrigin,
                            sessionId = sessionId,
                            studentId = activeStudentId,
                            type = type,
                            details = details,
                            evidenceUrl = evidenceUrl,
                            userAgent = customUserAgent
                        )
                    }
                }
            }
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (!isExamSessionActive && binding.webView.canGoBack()) {
                    binding.webView.goBack()
                } else {
                    showExitConfirmationDialog()
                }
            }
        })
    }

    private fun showExitConfirmationDialog() {
        isInternalDialogVisible = true
        val message = if (isExamSessionActive) {
            "Sesi ujian sedang berlangsung! Keluar dari CartaExambro sebelum mengumpulkan jawaban dapat tercatat sebagai pelanggaran."
        } else {
            "Apakah Anda yakin ingin keluar dari aplikasi CartaExambro?"
        }

        AlertDialog.Builder(this)
            .setTitle("Keluar dari CartaExambro?")
            .setMessage(message)
            .setPositiveButton("Ya, Keluar") { _, _ ->
                isExitingIntentionally = true
                isInternalDialogVisible = false
                stopScreenPinningAndCapture()
                finish()
            }
            .setNegativeButton("Lanjutkan") { _, _ ->
                isInternalDialogVisible = false
                enableImmersiveMode()
            }
            .setOnDismissListener {
                isInternalDialogVisible = false
            }
            .show()
    }

    private fun tryStartLockTask() {
        try {
            startLockTask()
        } catch (_: Exception) {
            // Abaikan jika perangkat/OEM tidak mengizinkan screen pinning otomatis
        }
    }

    private fun stopScreenPinningAndCapture() {
        try {
            stopLockTask()
        } catch (_: Exception) {
        }
        val stopIntent = Intent(this, ScreenCaptureService::class.java).apply {
            action = ScreenCaptureService.ACTION_STOP
        }
        startService(stopIntent)
    }

    private fun enableImmersiveMode() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowInsetsControllerCompat(window, binding.root)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }

    override fun onDestroy() {
        mainHandler.removeCallbacks(micMonitorRunnable)
        displayManager?.unregisterDisplayListener(displayListener)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            screenRecordingCallback?.let {
                try {
                    windowManager.removeScreenRecordingCallback(it)
                } catch (_: Exception) {
                }
            }
        }
        if (isExitingIntentionally) {
            stopScreenPinningAndCapture()
        }
        binding.webView.destroy()
        super.onDestroy()
    }
}
