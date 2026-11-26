package id.sch.sman1campurdarat.cartaexambro

import android.webkit.CookieManager
import org.json.JSONObject
import java.io.BufferedReader
import java.io.DataOutputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.util.concurrent.Executors

/**
 * Mengunggah bukti screenshot pelanggaran ke server CartaExam menggunakan sesi cookie WebView.
 */
object ViolationUploader {

    private val executor = Executors.newSingleThreadExecutor()

    fun uploadEvidenceAndDispatch(
        origin: String,
        sessionId: String,
        studentId: String,
        type: String,
        details: String,
        jpegBytes: ByteArray?,
        userAgent: String,
        onEvidenceReady: (evidenceUrl: String?) -> Unit
    ) {
        executor.execute {
            var evidenceUrl: String? = null
            if (jpegBytes != null && jpegBytes.isNotEmpty()) {
                evidenceUrl = uploadScreenshot(origin, sessionId, studentId, jpegBytes, userAgent)
            }
            onEvidenceReady(evidenceUrl)
        }
    }

    fun sendFallbackViolation(
        origin: String,
        sessionId: String,
        studentId: String,
        type: String,
        details: String,
        evidenceUrl: String?,
        userAgent: String
    ) {
        executor.execute {
            try {
                val targetUrl = "$origin/api/student/exams/$sessionId/violation"
                val conn = (URL(targetUrl).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 8000
                    readTimeout = 8000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("User-Agent", userAgent)
                    setRequestProperty("X-CartaExambro", BuildConfig.VERSION_NAME)
                    setRequestProperty("X-Exambro-App", "CartaExambro")
                    CookieManager.getInstance().getCookie(origin)?.let { cookie ->
                        setRequestProperty("Cookie", cookie)
                    }
                }

                val payload = JSONObject().apply {
                    put("type", type)
                    put("details", details)
                    if (studentId.isNotBlank()) put("studentId", studentId)
                    if (!evidenceUrl.isNullOrBlank()) put("evidenceUrl", evidenceUrl)
                }

                DataOutputStream(conn.outputStream).use { out ->
                    out.write(payload.toString().toByteArray(Charsets.UTF_8))
                    out.flush()
                }
                conn.responseCode
                conn.disconnect()
            } catch (_: Exception) {
            }
        }
    }

    private fun uploadScreenshot(
        origin: String,
        sessionId: String,
        studentId: String,
        jpegBytes: ByteArray,
        userAgent: String
    ): String? {
        val boundary = "----CartaExambroBoundary${UUID.randomUUID().toString().replace("-", "")}"
        val targetUrl = "$origin/api/student/exams/$sessionId/violation-evidence"

        return try {
            val conn = (URL(targetUrl).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10000
                readTimeout = 12000
                doOutput = true
                doInput = true
                useCaches = false
                setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
                setRequestProperty("User-Agent", userAgent)
                setRequestProperty("X-CartaExambro", BuildConfig.VERSION_NAME)
                setRequestProperty("X-Exambro-App", "CartaExambro")
                CookieManager.getInstance().getCookie(origin)?.let { cookie ->
                    setRequestProperty("Cookie", cookie)
                }
            }

            DataOutputStream(conn.outputStream).use { out ->
                if (studentId.isNotBlank()) {
                    out.writeBytes("--$boundary\r\n")
                    out.writeBytes("Content-Disposition: form-data; name=\"studentId\"\r\n\r\n")
                    out.writeBytes("$studentId\r\n")
                }

                out.writeBytes("--$boundary\r\n")
                out.writeBytes(
                    "Content-Disposition: form-data; name=\"file\"; filename=\"evidence.jpg\"\r\n"
                )
                out.writeBytes("Content-Type: image/jpeg\r\n\r\n")
                out.write(jpegBytes)
                out.writeBytes("\r\n--$boundary--\r\n")
                out.flush()
            }

            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val body = stream?.let {
                BufferedReader(InputStreamReader(it)).use { reader -> reader.readText() }
            }.orEmpty()
            conn.disconnect()

            if (code in 200..299 && body.isNotBlank()) {
                val json = JSONObject(body)
                json.optString("evidenceUrl").takeIf { it.isNotBlank() }
            } else {
                null
            }
        } catch (_: Exception) {
            null
        }
    }
}
