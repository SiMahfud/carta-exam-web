package id.sch.sman1campurdarat.cartaexambro

import android.webkit.JavascriptInterface

/**
 * Bridge JavaScript yang diekspos ke halaman web CartaExam sebagai `window.CartaExambroBridge`.
 */
class ExamWebBridge(
    private val onStateChanged: (sessionId: String, studentId: String, active: Boolean) -> Unit,
    private val onScreenshotConfigUpdated: (configJson: String) -> Unit
) {
    @JavascriptInterface
    fun isExambro(): Boolean = true

    @JavascriptInterface
    fun getAppVersion(): String = BuildConfig.VERSION_NAME

    @JavascriptInterface
    fun onExamStateChanged(sessionId: String?, studentId: String?, active: Boolean) {
        onStateChanged(sessionId.orEmpty(), studentId.orEmpty(), active)
    }

    @JavascriptInterface
    fun setScreenshotConfig(configJson: String?) {
        if (!configJson.isNullOrBlank()) {
            onScreenshotConfigUpdated(configJson)
        }
    }
}
