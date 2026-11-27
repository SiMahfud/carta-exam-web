package id.sch.sman1campurdarat.cartaexambro

import android.app.Activity
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.hardware.display.DisplayManager
import android.media.AudioManager
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.text.method.PasswordTransformationMethod
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import id.sch.sman1campurdarat.cartaexambro.databinding.ActivityExamBinding
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.function.Consumer

class ExamActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_TARGET_URL = "extra_target_url"
        private const val NATIVE_COOLDOWN_MS = 5000L
        private const val NATIVE_GLOBAL_BURST_MS = 1500L
        private const val BLUR_DEFER_MS = 350L
        private const val MIC_CHECK_INTERVAL_MS = 4000L
        private const val OVERLAY_SCAN_INTERVAL_MS = 2000L
        private const val DEFAULT_PROCTOR_EXIT_PIN = "CARTA2026"

        fun sha256Hex(raw: String): String {
            val digest = MessageDigest.getInstance("SHA-256").digest(raw.toByteArray(Charsets.UTF_8))
            return digest.joinToString("") { "%02X".format(it) }
        }
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
    private var proctorExitPinHash: String = sha256Hex(DEFAULT_PROCTOR_EXIT_PIN)

    @Volatile
    private var isInternalDialogVisible: Boolean = false

    @Volatile
    private var isExitingIntentionally: Boolean = false

    private data class ScreenshotPolicy(
        val enabled: Boolean = true,
        val burstCount: Int = 3,
        val firstDelayMs: Long = 0L,
        val followUpIntervalMs: Long = 2000L,
        val targetTypes: Set<String> = setOf(
            "APP_SWITCH",
            "WINDOW_BLUR",
            "SPLIT_SCREEN",
            "PIP_MODE",
            "OVERLAY_DETECTED"
        ),
        val cooldownMs: Long = NATIVE_COOLDOWN_MS
    )

    private val lastViolationTimes = ConcurrentHashMap<String, Long>()
    private val pendingBurstTasks = ConcurrentHashMap<String, MutableList<Runnable>>()
    private val mainHandler = Handler(Looper.getMainLooper())
    private lateinit var customUserAgent: String

    @Volatile
    private var lastGlobalViolationAtMs: Long = 0L

    private var pendingBlurRunnable: Runnable? = null

    @Volatile
    private var screenshotPolicy = ScreenshotPolicy()

    @Volatile
    private var isActivityResumed: Boolean = true

    @Volatile
    private var hasCurrentWindowFocus: Boolean = true

    @Volatile
    private var isInSplitScreenMode: Boolean = false

    @Volatile
    private var isInPipMode: Boolean = false

    @Volatile
    private var examStartedAtMs: Long = 0L

    @Volatile
    private var lastToastAtMs: Long = 0L

    private var consecutiveOverlayHits: Int = 0

    @Volatile
    private var isRequestingProjection: Boolean = false

    private val reRequestProjectionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        isRequestingProjection = false
        isInternalDialogVisible = false
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val serviceIntent = Intent(this, ScreenCaptureService::class.java).apply {
                action = ScreenCaptureService.ACTION_START
                putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, result.resultCode)
                putExtra(ScreenCaptureService.EXTRA_RESULT_DATA, result.data)
            }
            ContextCompat.startForegroundService(this, serviceIntent)
            updateStatusBadge()
        } else if (isExamSessionActive && !isFinishing) {
            showProjectionRevokedDialog()
        }
    }

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

    private val overlayMonitorRunnable = object : Runnable {
        override fun run() {
            if (isExamSessionActive && !isFinishing && !isInternalDialogVisible) {
                checkVisualOverlayOnProjection()
            } else {
                consecutiveOverlayHits = 0
            }
            mainHandler.postDelayed(this, OVERLAY_SCAN_INTERVAL_MS)
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

        ScreenCaptureService.setOnProjectionRevokedListener { snapshot ->
            mainHandler.post {
                updateStatusBadge()
                if (isExamSessionActive && !isExitingIntentionally && !isFinishing) {
                    triggerViolationWithScreenshot(
                        type = "SCREEN_RECORDING",
                        details = "Proteksi layar CartaExambro dihentikan atau diambil alih aplikasi lain (Share Screen / Gemini Live)",
                        preCapturedJpeg = snapshot
                    )
                    showProjectionRevokedDialog()
                }
            }
        }
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

        val bridge = ExamWebBridge(
            onStateChanged = { sessionId, studentId, active ->
                mainHandler.post {
                    val wasActive = isExamSessionActive
                    activeSessionId = sessionId.takeIf { it.isNotBlank() }
                    activeStudentId = studentId
                    isExamSessionActive = active && activeSessionId != null
                    if (isExamSessionActive && !wasActive) {
                        examStartedAtMs = System.currentTimeMillis()
                        consecutiveOverlayHits = 0
                    }
                    updateStatusBadge()
                    if (isExamSessionActive) {
                        tryStartLockTask()
                        if (!ScreenCaptureService.isRunning) {
                            showProjectionRevokedDialog()
                        }
                    } else {
                        cancelAllBurstTasks()
                    }
                }
            },
            onScreenshotConfigUpdated = { configJson ->
                applyScreenshotConfig(configJson)
            },
            onProctorExitPinHashUpdated = { sha256Hex ->
                if (sha256Hex.isNotBlank()) {
                    proctorExitPinHash = sha256Hex.uppercase()
                }
            }
        )
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
                            showShortToast("Akses ke domain luar ($resolvedHost) diblokir selama ujian.")
                        }
                    } else {
                        showShortToast("Tautan intent SSO tidak dapat diproses.")
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
                    showShortToast("Akses ke domain luar ($host) diblokir selama ujian.")
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

    private fun showShortToast(message: String) {
        lastToastAtMs = System.currentTimeMillis()
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
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
        val scheme = uri.scheme?.lowercase()
        val authority = uri.authority
        val path = uri.path ?: return

        if ((scheme == "http" || scheme == "https") && !authority.isNullOrBlank() && path.startsWith("/student")) {
            initialOrigin = "$scheme://$authority"
        }

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
        mainHandler.postDelayed(overlayMonitorRunnable, OVERLAY_SCAN_INTERVAL_MS)

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

    override fun onResume() {
        super.onResume()
        isActivityResumed = true
        cancelPendingBlur()
        cancelBurstForType("APP_SWITCH")
        cancelBurstForType("WINDOW_BLUR")
        if (isExamSessionActive && !ScreenCaptureService.isRunning && !isRequestingProjection && !isInternalDialogVisible) {
            showProjectionRevokedDialog()
        }
    }

    override fun onPause() {
        isActivityResumed = false
        super.onPause()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        hasCurrentWindowFocus = hasFocus
        if (hasFocus) {
            cancelPendingBlur()
            cancelBurstForType("WINDOW_BLUR")
            enableImmersiveMode()
        } else if (isExamSessionActive && !isInternalDialogVisible && !isExitingIntentionally && !isFinishing) {
            // Tunda 350ms: jika ternyata siswa pindah app (onStop terpanggil), biarkan APP_SWITCH yang mencatat agar tidak double-counting
            cancelPendingBlur()
            val blurTask = Runnable {
                pendingBlurRunnable = null
                if (isExamSessionActive && !hasCurrentWindowFocus && !isInternalDialogVisible && !isExitingIntentionally && !isFinishing) {
                    triggerViolationWithScreenshot(
                        "WINDOW_BLUR",
                        "Jendela ujian kehilangan fokus (kemungkinan Assistant/Gemini/dialog aplikasi lain dibuka)"
                    )
                }
            }
            pendingBlurRunnable = blurTask
            mainHandler.postDelayed(blurTask, BLUR_DEFER_MS)
        }
    }

    override fun onMultiWindowModeChanged(isInMultiWindowMode: Boolean, newConfig: Configuration) {
        super.onMultiWindowModeChanged(isInMultiWindowMode, newConfig)
        isInSplitScreenMode = isInMultiWindowMode
        if (!isInMultiWindowMode) {
            cancelBurstForType("SPLIT_SCREEN")
        } else if (isExamSessionActive) {
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
        isInPipMode = isInPictureInPictureMode
        if (!isInPictureInPictureMode) {
            cancelBurstForType("PIP_MODE")
        } else if (isExamSessionActive) {
            triggerViolationWithScreenshot(
                "PIP_MODE",
                "Mode Picture-in-Picture terdeteksi"
            )
        }
    }

    override fun onStop() {
        super.onStop()
        if (isExamSessionActive && !isExitingIntentionally && !isFinishing) {
            cancelPendingBlur()
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

    private fun checkVisualOverlayOnProjection() {
        val now = System.currentTimeMillis()
        // Beri jeda 6 detik setelah mulai ujian (toast LockTask "To unpin") & 3.5 detik setelah toast app
        if (now - examStartedAtMs < 6000L || now - lastToastAtMs < 3500L) {
            consecutiveOverlayHits = 0
            return
        }

        val imeVisible = ViewCompat.getRootWindowInsets(binding.root)
            ?.isVisible(WindowInsetsCompat.Type.ime()) == true

        val scanResult = ScreenCaptureService.scanFrameForOverlay(excludeBottomForIme = imeVisible)
            ?: return

        if (scanResult.hasOverlay) {
            consecutiveOverlayHits++
            if (consecutiveOverlayHits >= 2 || scanResult.ratio >= 0.008f) {
                consecutiveOverlayHits = 0
                triggerViolationWithScreenshot(
                    type = "OVERLAY_DETECTED",
                    details = "Overlay visual / jendela mengambang (termasuk Assistant/Gemini Live) terdeteksi di atas layar ujian",
                    preCapturedJpeg = scanResult.jpegBytes
                )
            }
        } else {
            consecutiveOverlayHits = 0
        }
    }

    private fun applyScreenshotConfig(configJson: String) {
        try {
            val obj = JSONObject(configJson)
            val enabled = obj.optBoolean("enabled", true)
            val burstCount = obj.optInt("burstCount", 3).coerceIn(1, 3)
            val firstDelayMs = obj.optLong("firstDelayMs", 0L).coerceIn(0L, 5000L)
            val intervalSec = obj.optInt("followUpIntervalSeconds", 2).coerceIn(1, 5)
            val cooldownSec = obj.optInt("cooldownSeconds", 5).coerceIn(1, 60)

            val typesArr: JSONArray? = obj.optJSONArray("targetTypes")
            val targets = mutableSetOf<String>()
            if (typesArr != null) {
                for (i in 0 until typesArr.length()) {
                    val t = typesArr.optString(i)
                    if (t.isNotBlank()) targets.add(t)
                }
            } else {
                targets.addAll(screenshotPolicy.targetTypes)
            }

            screenshotPolicy = ScreenshotPolicy(
                enabled = enabled,
                burstCount = burstCount,
                firstDelayMs = firstDelayMs,
                followUpIntervalMs = intervalSec * 1000L,
                targetTypes = targets,
                cooldownMs = cooldownSec * 1000L
            )
        } catch (_: Exception) {
        }
    }

    private fun cancelPendingBlur() {
        pendingBlurRunnable?.let {
            mainHandler.removeCallbacks(it)
            pendingBlurRunnable = null
        }
    }

    private fun cancelBurstForType(type: String) {
        val list = pendingBurstTasks.remove(type) ?: return
        list.forEach { mainHandler.removeCallbacks(it) }
    }

    private fun cancelAllBurstTasks() {
        pendingBurstTasks.values.forEach { list ->
            list.forEach { mainHandler.removeCallbacks(it) }
        }
        pendingBurstTasks.clear()
    }

    private fun isViolationStillActive(type: String): Boolean {
        if (!isExamSessionActive || isFinishing || isDestroyed || isExitingIntentionally) return false
        return when (type) {
            "WINDOW_BLUR" -> !hasCurrentWindowFocus || !isActivityResumed
            "APP_SWITCH" -> !isActivityResumed
            "SPLIT_SCREEN" -> isInSplitScreenMode
            "PIP_MODE" -> isInPipMode
            "MICROPHONE_IN_USE" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    audioManager?.activeRecordingConfigurations?.isNotEmpty() == true
                } else {
                    false
                }
            }
            "OVERLAY_DETECTED" -> {
                val imeVisible = ViewCompat.getRootWindowInsets(binding.root)
                    ?.isVisible(WindowInsetsCompat.Type.ime()) == true
                ScreenCaptureService.scanFrameForOverlay(excludeBottomForIme = imeVisible)?.hasOverlay == true
            }
            else -> false
        }
    }

    private fun triggerViolationWithScreenshot(
        type: String,
        details: String,
        @Suppress("UNUSED_PARAMETER") preferDirectApi: Boolean = false,
        preCapturedJpeg: ByteArray? = null
    ) {
        val sessionId = activeSessionId ?: return
        val policy = screenshotPolicy
        val now = System.currentTimeMillis()
        val lastTime = lastViolationTimes[type] ?: 0L
        if (now - lastTime < policy.cooldownMs) return
        if (now - lastGlobalViolationAtMs < NATIVE_GLOBAL_BURST_MS) return
        lastViolationTimes[type] = now
        lastGlobalViolationAtMs = now

        val violationId = UUID.randomUUID().toString()
        val totalPhotos = when {
            !policy.enabled -> 0
            type in policy.targetTypes -> policy.burstCount
            else -> 1
        }

        val dispatchInitial = Runnable {
            val initialJpeg = when {
                totalPhotos <= 0 -> null
                preCapturedJpeg != null -> preCapturedJpeg
                else -> ScreenCaptureService.captureScreenshotJpeg()
            }

            ViolationUploader.reportInitialViolation(
                origin = initialOrigin,
                sessionId = sessionId,
                studentId = activeStudentId,
                violationId = violationId,
                type = type,
                details = details,
                jpegBytes = initialJpeg,
                userAgent = customUserAgent
            ) { responseJson ->
                if (!responseJson.isNullOrBlank()) {
                    mainHandler.post {
                        if (isFinishing || isDestroyed) return@post
                        val escapedType = JSONObject.quote(type)
                        val escapedDetails = JSONObject.quote(details)
                        val js = """
                            (function() {
                                if (typeof window.__cartaExambroApplyViolationResult === 'function') {
                                    window.__cartaExambroApplyViolationResult($responseJson, $escapedType, $escapedDetails);
                                    return true;
                                }
                                return false;
                            })();
                        """.trimIndent()
                        binding.webView.evaluateJavascript(js, null)
                    }
                }
            }
        }

        if (policy.firstDelayMs > 0L && preCapturedJpeg == null && totalPhotos > 0) {
            mainHandler.postDelayed(dispatchInitial, policy.firstDelayMs)
        } else {
            dispatchInitial.run()
        }

        // Jadwalkan foto lanjutan (2 & 3) hanya jika tipe pelanggaran termasuk targetTypes & kondisi masih berlangsung
        if (totalPhotos > 1) {
            cancelBurstForType(type)
            val scheduledList = mutableListOf<Runnable>()
            for (step in 1 until totalPhotos) {
                val delayMs = (if (preCapturedJpeg == null) policy.firstDelayMs else 0L) +
                    step * policy.followUpIntervalMs
                lateinit var task: Runnable
                task = Runnable {
                    if (!isViolationStillActive(type)) {
                        // Kondisi pelanggaran sudah berhenti (misal siswa kembali fokus < 1 detik), batalkan sisa burst
                        cancelBurstForType(type)
                        return@Runnable
                    }
                    val followUpJpeg = ScreenCaptureService.captureScreenshotJpeg()
                    if (followUpJpeg != null && followUpJpeg.isNotEmpty()) {
                        ViolationUploader.uploadFollowUpEvidence(
                            origin = initialOrigin,
                            sessionId = sessionId,
                            studentId = activeStudentId,
                            violationId = violationId,
                            jpegBytes = followUpJpeg,
                            userAgent = customUserAgent
                        )
                    }
                    pendingBurstTasks[type]?.remove(task)
                }
                scheduledList.add(task)
                mainHandler.postDelayed(task, delayMs)
            }
            pendingBurstTasks[type] = scheduledList
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

    private fun showExitConfirmationDialog(onCancelled: (() -> Unit)? = null) {
        isInternalDialogVisible = true
        if (!isExamSessionActive) {
            AlertDialog.Builder(this)
                .setTitle("Keluar dari CartaExambro?")
                .setMessage("Apakah Anda yakin ingin keluar dari aplikasi CartaExambro?")
                .setPositiveButton("Ya, Keluar") { _, _ ->
                    isExitingIntentionally = true
                    isInternalDialogVisible = false
                    stopScreenPinningAndCapture()
                    finish()
                }
                .setNegativeButton("Batal") { _, _ ->
                    isInternalDialogVisible = false
                    enableImmersiveMode()
                    onCancelled?.invoke()
                }
                .setOnCancelListener {
                    isInternalDialogVisible = false
                    enableImmersiveMode()
                    onCancelled?.invoke()
                }
                .show()
            return
        }

        val paddingPx = (20 * resources.displayMetrics.density).toInt()
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(paddingPx, paddingPx / 2, paddingPx, 0)
        }
        val pinInput = EditText(this).apply {
            hint = "Masukkan PIN / Password Pengawas"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            transformationMethod = PasswordTransformationMethod.getInstance()
            maxLines = 1
        }
        container.addView(pinInput)

        val dialog = AlertDialog.Builder(this)
            .setTitle("Keluar Darurat (Khusus Pengawas)")
            .setMessage(
                "Ujian sedang berlangsung. Siswa tidak dapat keluar sendiri.\nPanggil pengawas untuk memasukkan PIN / Password Darurat."
            )
            .setView(container)
            .setCancelable(false)
            .setPositiveButton("Verifikasi & Keluar", null)
            .setNegativeButton("Kembali ke Ujian") { _, _ ->
                isInternalDialogVisible = false
                enableImmersiveMode()
                onCancelled?.invoke()
            }
            .create()

        dialog.setOnShowListener {
            val verifyButton = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
            verifyButton.setOnClickListener {
                val entered = pinInput.text?.toString()?.trim().orEmpty()
                if (entered.isEmpty()) {
                    pinInput.error = "Masukkan PIN/Password pengawas"
                    return@setOnClickListener
                }
                val expectedHash = proctorExitPinHash.ifBlank { sha256Hex(DEFAULT_PROCTOR_EXIT_PIN) }
                if (sha256Hex(entered) == expectedHash.uppercase()) {
                    isExitingIntentionally = true
                    isInternalDialogVisible = false
                    stopScreenPinningAndCapture()
                    dialog.dismiss()
                    finish()
                } else {
                    pinInput.error = "PIN / Password pengawas salah"
                    pinInput.text?.clear()
                    showShortToast("PIN pengawas tidak cocok.")
                }
            }
        }
        dialog.show()
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

    private fun showProjectionRevokedDialog() {
        if (isFinishing || isDestroyed || isRequestingProjection || isInternalDialogVisible) return
        isInternalDialogVisible = true
        AlertDialog.Builder(this)
            .setTitle("Proteksi Layar Terhenti")
            .setMessage(
                "Berbagi layar/proteksi layar CartaExambro terhenti atau diambil alih oleh aplikasi lain. Aktifkan kembali \"Entire screen / Seluruh layar\" untuk melanjutkan ujian."
            )
            .setCancelable(false)
            .setPositiveButton("Aktifkan Kembali") { _, _ ->
                isRequestingProjection = true
                isInternalDialogVisible = false
                val pm = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
                reRequestProjectionLauncher.launch(pm.createScreenCaptureIntent())
            }
            .setNegativeButton("Keluar Ujian") { _, _ ->
                isInternalDialogVisible = false
                if (isExamSessionActive) {
                    showExitConfirmationDialog {
                        if (isExamSessionActive && !ScreenCaptureService.isRunning && !isFinishing && !isDestroyed) {
                            showProjectionRevokedDialog()
                        }
                    }
                } else {
                    isExitingIntentionally = true
                    stopScreenPinningAndCapture()
                    finish()
                }
            }
            .show()
    }

    override fun onDestroy() {
        ScreenCaptureService.setOnProjectionRevokedListener(null)
        cancelPendingBlur()
        cancelAllBurstTasks()
        mainHandler.removeCallbacks(micMonitorRunnable)
        mainHandler.removeCallbacks(overlayMonitorRunnable)
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
