package id.sch.sman1campurdarat.cartaexambro

import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.DisplayMetrics
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import java.io.ByteArrayOutputStream
import kotlin.math.min

/**
 * Foreground Service untuk mengelola MediaProjection agar CartaExambro dapat
 * mengambil tangkapan seluruh layar saat terdeteksi pelanggaran atau overlay.
 */
class ScreenCaptureService : Service() {

    data class OverlayScanResult(
        val hasOverlay: Boolean,
        val ratio: Float,
        val jpegBytes: ByteArray?
    )

    companion object {
        const val ACTION_START = "id.sch.sman1campurdarat.cartaexambro.START_CAPTURE"
        const val ACTION_STOP = "id.sch.sman1campurdarat.cartaexambro.STOP_CAPTURE"
        const val EXTRA_RESULT_CODE = "result_code"
        const val EXTRA_RESULT_DATA = "result_data"

        const val VIRTUAL_DISPLAY_NAME = "CartaExambroCapture"
        private const val CHANNEL_ID = "carta_exambro_security"
        private const val NOTIF_ID = 1001
        private const val MAX_CAPTURE_WIDTH = 720
        private const val SAMPLE_STEP = 8
        private const val BRIGHTNESS_THRESHOLD = 28
        private const val MIN_NON_BLACK_RATIO = 0.0035f
        private const val MIN_NON_BLACK_POINTS = 28

        @Volatile
        private var instance: ScreenCaptureService? = null

        @Volatile
        var isRunning: Boolean = false
            private set

        /**
         * Mengambil frame terbaru dari layar fisik dan mengompresnya ke JPEG ringan (~40-120 KB).
         */
        fun captureScreenshotJpeg(): ByteArray? {
            return instance?.captureLatestFrame()
        }

        /**
         * Memindai frame MediaProjection untuk mendeteksi piksel terang non-hitam di atas
         * jendela FLAG_SECURE (efektif mendeteksi overlay sistem seperti Gemini Live / Assistant).
         */
        fun scanFrameForOverlay(excludeBottomForIme: Boolean): OverlayScanResult? {
            return instance?.scanLatestFrameForOverlay(excludeBottomForIme)
        }
    }

    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private val captureLock = Any()

    private var captureWidth = 720
    private var captureHeight = 1280
    private var lastFrameJpeg: ByteArray? = null
    private var lastFrameTimestampMs: Long = 0L

    private val projectionCallback = object : MediaProjection.Callback() {
        override fun onStop() {
            cleanupProjection()
            stopSelf()
        }
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                cleanupProjection()
                stopForegroundCompat()
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_START -> {
                val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED)
                val resultData: Intent? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableExtra(EXTRA_RESULT_DATA, Intent::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra(EXTRA_RESULT_DATA)
                }

                if (resultCode != Activity.RESULT_OK || resultData == null) {
                    stopSelf()
                    return START_NOT_STICKY
                }

                startForegroundWithType(buildNotification())
                initMediaProjection(resultCode, resultData)
            }
        }
        return START_NOT_STICKY
    }

    private fun startForegroundWithType(notification: Notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIF_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            )
        } else {
            startForeground(NOTIF_ID, notification)
        }
    }

    private fun initMediaProjection(resultCode: Int, resultData: Intent) {
        cleanupProjection()

        val metrics = DisplayMetrics()
        val windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        @Suppress("DEPRECATION")
        windowManager.defaultDisplay.getRealMetrics(metrics)

        val srcWidth = metrics.widthPixels.coerceAtLeast(360)
        val srcHeight = metrics.heightPixels.coerceAtLeast(640)
        val scale = min(1f, MAX_CAPTURE_WIDTH.toFloat() / srcWidth.toFloat())

        captureWidth = (srcWidth * scale).toInt().coerceAtLeast(320)
        captureHeight = (srcHeight * scale).toInt().coerceAtLeast(480)
        val densityDpi = metrics.densityDpi

        val projectionManager =
            getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        val projection = projectionManager.getMediaProjection(resultCode, resultData) ?: run {
            stopSelf()
            return
        }

        projection.registerCallback(projectionCallback, Handler(Looper.getMainLooper()))

        val reader = ImageReader.newInstance(
            captureWidth,
            captureHeight,
            PixelFormat.RGBA_8888,
            2
        )

        val display = projection.createVirtualDisplay(
            VIRTUAL_DISPLAY_NAME,
            captureWidth,
            captureHeight,
            densityDpi,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            reader.surface,
            null,
            null
        )

        synchronized(captureLock) {
            mediaProjection = projection
            imageReader = reader
            virtualDisplay = display
            isRunning = true
        }
    }

    private fun captureLatestFrame(): ByteArray? {
        synchronized(captureLock) {
            val reader = imageReader ?: return lastFrameJpeg
            val image = reader.acquireLatestImage()
            if (image == null) {
                val age = System.currentTimeMillis() - lastFrameTimestampMs
                return if (age <= 6000L) lastFrameJpeg else null
            }
            return try {
                val jpeg = encodeImageToJpeg(image)
                if (jpeg != null) {
                    lastFrameJpeg = jpeg
                    lastFrameTimestampMs = System.currentTimeMillis()
                }
                jpeg
            } finally {
                image.close()
            }
        }
    }

    private fun scanLatestFrameForOverlay(excludeBottomForIme: Boolean): OverlayScanResult? {
        synchronized(captureLock) {
            val reader = imageReader ?: return null
            val image = reader.acquireLatestImage() ?: return null
            return try {
                val plane = image.planes[0]
                val buffer = plane.buffer
                val pixelStride = plane.pixelStride
                val rowStride = plane.rowStride

                val startX = (captureWidth * 0.02f).toInt()
                val endX = (captureWidth * 0.98f).toInt()
                val startY = (captureHeight * 0.08f).toInt()
                val endY = if (excludeBottomForIme) {
                    (captureHeight * 0.50f).toInt()
                } else {
                    (captureHeight * 0.94f).toInt()
                }

                var totalSamples = 0
                var nonBlackSamples = 0

                var y = startY
                while (y < endY) {
                    val rowOffset = y * rowStride
                    var x = startX
                    while (x < endX) {
                        val offset = rowOffset + x * pixelStride
                        val r = buffer.get(offset).toInt() and 0xFF
                        val g = buffer.get(offset + 1).toInt() and 0xFF
                        val b = buffer.get(offset + 2).toInt() and 0xFF
                        totalSamples++
                        if (r > BRIGHTNESS_THRESHOLD || g > BRIGHTNESS_THRESHOLD || b > BRIGHTNESS_THRESHOLD) {
                            nonBlackSamples++
                        }
                        x += SAMPLE_STEP
                    }
                    y += SAMPLE_STEP
                }

                val ratio = if (totalSamples > 0) nonBlackSamples.toFloat() / totalSamples else 0f
                val hasOverlay = nonBlackSamples >= MIN_NON_BLACK_POINTS && ratio >= MIN_NON_BLACK_RATIO

                val jpeg = encodeImageToJpeg(image)
                if (jpeg != null) {
                    lastFrameJpeg = jpeg
                    lastFrameTimestampMs = System.currentTimeMillis()
                }

                OverlayScanResult(hasOverlay, ratio, if (hasOverlay) jpeg else null)
            } catch (_: Exception) {
                null
            } finally {
                image.close()
            }
        }
    }

    private fun encodeImageToJpeg(image: android.media.Image): ByteArray? {
        var bitmap: Bitmap? = null
        var croppedBitmap: Bitmap? = null
        return try {
            val plane = image.planes[0]
            val buffer = plane.buffer
            buffer.rewind()
            val pixelStride = plane.pixelStride
            val rowStride = plane.rowStride
            val rowPadding = rowStride - pixelStride * captureWidth

            bitmap = Bitmap.createBitmap(
                captureWidth + rowPadding / pixelStride,
                captureHeight,
                Bitmap.Config.ARGB_8888
            )
            bitmap.copyPixelsFromBuffer(buffer)

            val finalBitmap = if (rowPadding > 0) {
                croppedBitmap = Bitmap.createBitmap(bitmap, 0, 0, captureWidth, captureHeight)
                croppedBitmap
            } else {
                bitmap
            }

            val stream = ByteArrayOutputStream()
            finalBitmap.compress(Bitmap.CompressFormat.JPEG, 68, stream)
            stream.toByteArray()
        } catch (_: Exception) {
            null
        } finally {
            croppedBitmap?.recycle()
            bitmap?.recycle()
        }
    }

    private fun cleanupProjection() {
        synchronized(captureLock) {
            isRunning = false
            try {
                virtualDisplay?.release()
            } catch (_: Exception) {
            }
            virtualDisplay = null

            try {
                imageReader?.close()
            } catch (_: Exception) {
            }
            imageReader = null

            try {
                mediaProjection?.unregisterCallback(projectionCallback)
                mediaProjection?.stop()
            } catch (_: Exception) {
            }
            mediaProjection = null
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notif_channel_name),
                NotificationManager.IMPORTANCE_LOW
            )
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle(getString(R.string.notif_title))
            .setContentText(getString(R.string.notif_text))
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun stopForegroundCompat() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
    }

    override fun onDestroy() {
        cleanupProjection()
        instance = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
