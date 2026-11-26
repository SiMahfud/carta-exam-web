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
 * Mengunggah bukti screenshot (tunggal maupun beruntun) dan mencatat pelanggaran ke server CartaExam
 * secara berurutan (sequential) agar setiap foto lanjutan selalu menempel pada violationId yang sama.
 */
object ViolationUploader {

    private val executor = Executors.newSingleThreadExecutor()

    fun reportInitialViolation(
        origin: String,
        sessionId: String,
        studentId: String,
        violationId: String,
        type: String,
        details: String,
        jpegBytes: ByteArray?,
        userAgent: String,
        onResult: (responseJson: String?) -> Unit
    ) {
        executor.execute {
            val evidenceUrl = if (jpegBytes != null && jpegBytes.isNotEmpty()) {
                uploadScreenshot(origin, sessionId, studentId, null, jpegBytes, userAgent)
            } else {
                null
            }

            val responseJson = postViolation(
                origin = origin,
                sessionId = sessionId,
                studentId = studentId,
                violationId = violationId,
                type = type,
                details = details,
                evidenceUrl = evidenceUrl,
                userAgent = userAgent
            )
            onResult(responseJson)
        }
    }

    fun uploadFollowUpEvidence(
        origin: String,
        sessionId: String,
        studentId: String,
        violationId: String,
        jpegBytes: ByteArray,
        userAgent: String
    ) {
        if (jpegBytes.isEmpty()) return
        executor.execute {
            uploadScreenshot(origin, sessionId, studentId, violationId, jpegBytes, userAgent)
        }
    }

    private fun postViolation(
        origin: String,
        sessionId: String,
        studentId: String,
        violationId: String,
        type: String,
        details: String,
        evidenceUrl: String?,
        userAgent: String
    ): String? {
        return try {
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
                put("violationId", violationId)
                put("type", type)
                put("details", details)
                if (studentId.isNotBlank()) put("studentId", studentId)
                if (!evidenceUrl.isNullOrBlank()) put("evidenceUrl", evidenceUrl)
            }

            DataOutputStream(conn.outputStream).use { out ->
                out.write(payload.toString().toByteArray(Charsets.UTF_8))
                out.flush()
            }

            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val body = stream?.let {
                BufferedReader(InputStreamReader(it)).use { reader -> reader.readText() }
            }
            conn.disconnect()
            if (code in 200..299) body else null
        } catch (_: Exception) {
            null
        }
    }

    private fun uploadScreenshot(
        origin: String,
        sessionId: String,
        studentId: String,
        violationId: String?,
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
                if (!violationId.isNullOrBlank()) {
                    out.writeBytes("--$boundary\r\n")
                    out.writeBytes("Content-Disposition: form-data; name=\"violationId\"\r\n\r\n")
                    out.writeBytes("$violationId\r\n")
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
