package id.sch.sman1campurdarat.cartaexambro

import android.webkit.JavascriptInterface

class ExamWebBridge(
    private val onStateChanged: (sessionId: String, studentId: String, active: Boolean) -> Unit,
    private val onScreenshotConfigUpdated: (configJson: String) -> Unit,
    private val onProctorExitPinHashUpdated: (sha256Hex: String) -> Unit = {}
) {
    @JavascriptInterface
    fun isExambro(): Boolean = true

    @JavascriptInterface
    fun getAppVersion(): String = BuildConfig.VERSION_NAME

    @JavascriptInterface
    fun onExamStateChanged(sessionId: String?, studentId: String?, isActive: Boolean) {
        onStateChanged(sessionId ?: "", studentId ?: "", isActive)
    }

    @JavascriptInterface
    fun setScreenshotConfig(configJson: String?) {
        val raw = configJson?.trim().orEmpty()
        if (raw.isNotEmpty()) {
            onScreenshotConfigUpdated(raw)
        }
    }

    @JavascriptInterface
    fun setProctorExitPinHash(sha256Hex: String?) {
        val normalized = sha256Hex?.trim().orEmpty()
        if (normalized.isNotEmpty()) {
            onProctorExitPinHashUpdated(normalized)
        }
    }
}
