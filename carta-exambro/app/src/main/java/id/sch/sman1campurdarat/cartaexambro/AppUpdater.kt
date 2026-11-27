package id.sch.sman1campurdarat.cartaexambro

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.BufferedReader
import java.io.File
import java.io.FileOutputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

object AppUpdater {

    data class UpdateInfo(
        val origin: String,
        val versionCode: Int,
        val versionName: String,
        val minSupportedVersionCode: Int,
        val forceUpdate: Boolean,
        val changelog: String,
        val downloadUrl: String,
        val fileName: String,
        val fileSize: Long,
        val sha256: String,
        val available: Boolean
    ) {
        val hasUpdate: Boolean
            get() = available && versionCode > BuildConfig.VERSION_CODE

        val isMandatory: Boolean
            get() = hasUpdate && (forceUpdate || BuildConfig.VERSION_CODE < minSupportedVersionCode)
    }

    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    fun extractOrigin(rawUrl: String): String? {
        return try {
            val uri = Uri.parse(rawUrl.trim())
            val scheme = uri.scheme?.lowercase()
            val authority = uri.authority
            if ((scheme == "http" || scheme == "https") && !authority.isNullOrBlank()) {
                "$scheme://$authority"
            } else {
                null
            }
        } catch (_: Exception) {
            null
        }
    }

    fun canRequestPackageInstalls(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else {
            true
        }
    }

    fun buildInstallPermissionIntent(context: Context): Intent {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:${context.packageName}")
            )
        } else {
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
        }
    }

    fun checkForUpdate(
        origin: String,
        timeoutMs: Int = 5000,
        onResult: (Result<UpdateInfo>) -> Unit
    ) {
        val cleanOrigin = origin.trim().trimEnd('/')
        executor.execute {
            var conn: HttpURLConnection? = null
            try {
                val versionUrl = "$cleanOrigin/api/exambro/version"
                conn = openConnectionWithRedirects(versionUrl, timeoutMs, timeoutMs)
                val code = conn.responseCode
                val stream = if (code in 200..299) conn.inputStream else conn.errorStream
                val body = stream?.let {
                    BufferedReader(InputStreamReader(it)).use { reader -> reader.readText() }
                }.orEmpty()

                if (code !in 200..299 || body.isBlank()) {
                    throw IllegalStateException("Server mengembalikan status HTTP $code")
                }

                val root = JSONObject(body)
                if (!root.optBoolean("success", false)) {
                    throw IllegalStateException(root.optString("error", "Gagal membaca info versi"))
                }

                val data = root.optJSONObject("data")
                    ?: throw IllegalStateException("Respons versi tidak valid")

                val versionCode = data.optInt("versionCode", BuildConfig.VERSION_CODE)
                val versionName = data.optString("versionName", BuildConfig.VERSION_NAME)
                val minSupported = data.optInt("minSupportedVersionCode", 1)
                val forceUpdate = data.optBoolean("forceUpdate", false)
                val changelog = data.optString("changelog", "")
                val available = data.optBoolean("available", false)
                val fileName = data.optString("fileName", "CartaExambro-v$versionName.apk")
                val fileSize = data.optLong("fileSize", 0L)
                val sha256 = data.optString("sha256", "").trim().lowercase()

                // Prioritaskan download dari origin yang sama (penting saat memakai server LAN lokal)
                val downloadPath = data.optString("downloadPath", "/api/exambro/download")
                val resolvedDownloadUrl = if (downloadPath.startsWith("/")) {
                    "$cleanOrigin$downloadPath"
                } else {
                    data.optString("downloadUrl", "$cleanOrigin/api/exambro/download")
                }

                val info = UpdateInfo(
                    origin = cleanOrigin,
                    versionCode = versionCode,
                    versionName = versionName,
                    minSupportedVersionCode = minSupported,
                    forceUpdate = forceUpdate,
                    changelog = changelog,
                    downloadUrl = resolvedDownloadUrl,
                    fileName = fileName,
                    fileSize = fileSize,
                    sha256 = sha256,
                    available = available
                )

                mainHandler.post { onResult(Result.success(info)) }
            } catch (e: Exception) {
                mainHandler.post { onResult(Result.failure(e)) }
            } finally {
                conn?.disconnect()
            }
        }
    }

    fun downloadApk(
        context: Context,
        info: UpdateInfo,
        cancelled: AtomicBoolean,
        onProgress: (percent: Int, downloadedBytes: Long, totalBytes: Long) -> Unit,
        onSuccess: (File) -> Unit,
        onError: (String) -> Unit
    ) {
        executor.execute {
            var conn: HttpURLConnection? = null
            var tempFile: File? = null
            try {
                val updatesDir = File(context.cacheDir, "updates").apply {
                    if (exists()) {
                        listFiles()?.forEach { it.delete() }
                    } else {
                        mkdirs()
                    }
                }

                val safeFileName = info.fileName
                    .replace(Regex("[^0-9A-Za-z._-]"), "_")
                    .ifBlank { "CartaExambro-update.apk" }
                    .let { if (it.endsWith(".apk", ignoreCase = true)) it else "$it.apk" }

                tempFile = File(updatesDir, "$safeFileName.tmp")
                val finalFile = File(updatesDir, safeFileName)

                conn = openConnectionWithRedirects(info.downloadUrl, 10000, 30000)
                val code = conn.responseCode
                if (code !in 200..299) {
                    throw IllegalStateException("Gagal mengunduh APK (HTTP $code)")
                }

                val headerLength = conn.contentLengthLong
                val totalBytes = if (headerLength > 0L) headerLength else info.fileSize
                val digest = MessageDigest.getInstance("SHA-256")
                val buffer = ByteArray(8192)
                var downloadedBytes = 0L
                var lastProgressUpdateMs = 0L

                conn.inputStream.use { input ->
                    FileOutputStream(tempFile).use { output ->
                        while (true) {
                            if (cancelled.get()) {
                                tempFile.delete()
                                return@execute
                            }
                            val read = input.read(buffer)
                            if (read == -1) break
                            output.write(buffer, 0, read)
                            digest.update(buffer, 0, read)
                            downloadedBytes += read

                            val now = System.currentTimeMillis()
                            if (now - lastProgressUpdateMs >= 100L) {
                                lastProgressUpdateMs = now
                                val percent = if (totalBytes > 0L) {
                                    ((downloadedBytes * 100L) / totalBytes).toInt().coerceIn(0, 100)
                                } else {
                                    -1
                                }
                                mainHandler.post {
                                    if (!cancelled.get()) {
                                        onProgress(percent, downloadedBytes, totalBytes)
                                    }
                                }
                            }
                        }
                        output.flush()
                    }
                }

                if (cancelled.get()) {
                    tempFile.delete()
                    return@execute
                }

                if (info.sha256.isNotBlank()) {
                    val actualHash = digest.digest().joinToString("") { "%02x".format(it) }
                    if (!actualHash.equals(info.sha256, ignoreCase = true)) {
                        tempFile.delete()
                        throw SecurityException(
                            "Verifikasi SHA-256 APK gagal. Unduhan mungkin terkorupsi atau tidak valid."
                        )
                    }
                }

                if (finalFile.exists()) {
                    finalFile.delete()
                }
                if (!tempFile.renameTo(finalFile)) {
                    tempFile.copyTo(finalFile, overwrite = true)
                    tempFile.delete()
                }

                mainHandler.post {
                    onProgress(100, downloadedBytes, if (totalBytes > 0L) totalBytes else downloadedBytes)
                    onSuccess(finalFile)
                }
            } catch (e: Exception) {
                tempFile?.delete()
                if (!cancelled.get()) {
                    val message = e.message?.takeIf { it.isNotBlank() }
                        ?: "Terjadi kesalahan saat mengunduh pembaruan APK."
                    mainHandler.post { onError(message) }
                }
            } finally {
                conn?.disconnect()
            }
        }
    }

    fun launchApkInstaller(context: Context, apkFile: File): Boolean {
        return try {
            val contentUri = FileProvider.getUriForFile(
                context,
                "${BuildConfig.APPLICATION_ID}.fileprovider",
                apkFile
            )
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (_: Exception) {
            false
        }
    }

    fun formatBytes(bytes: Long): String {
        if (bytes <= 0L) return "-"
        val kb = bytes / 1024.0
        val mb = kb / 1024.0
        return if (mb >= 1.0) {
            String.format("%.2f MB", mb)
        } else {
            String.format("%.0f KB", kb)
        }
    }

    private fun openConnectionWithRedirects(
        urlString: String,
        connectTimeoutMs: Int,
        readTimeoutMs: Int,
        maxRedirects: Int = 5
    ): HttpURLConnection {
        var currentUrl = urlString
        for (hop in 0..maxRedirects) {
            val conn = (URL(currentUrl).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                instanceFollowRedirects = false
                connectTimeout = connectTimeoutMs
                readTimeout = readTimeoutMs
                useCaches = false
                setRequestProperty("User-Agent", "CartaExambro/${BuildConfig.VERSION_NAME}")
                setRequestProperty("X-CartaExambro", BuildConfig.VERSION_NAME)
                setRequestProperty("Cache-Control", "no-cache")
            }

            val code = conn.responseCode
            if (code == HttpURLConnection.HTTP_MOVED_PERM ||
                code == HttpURLConnection.HTTP_MOVED_TEMP ||
                code == HttpURLConnection.HTTP_SEE_OTHER ||
                code == 307 ||
                code == 308
            ) {
                val location = conn.getHeaderField("Location")
                conn.disconnect()
                if (location.isNullOrBlank()) {
                    throw IllegalStateException("Redirect tanpa header Location")
                }
                currentUrl = URL(URL(currentUrl), location).toString()
                continue
            }

            return conn
        }
        throw IllegalStateException("Terlalu banyak pengalihan URL")
    }
}
