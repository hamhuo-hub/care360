package com.care360.watch

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.os.IBinder
import androidx.core.content.ContextCompat
import com.care360.watch.ble.BleGattServer
import com.care360.watch.data.SensorReading
import com.care360.watch.data.TelemetryBatch
import com.care360.watch.sensor.HealthSensorManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import android.util.Log
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

private const val TAG = "Care360Service"

private const val BATCH_INTERVAL_MS = 5_000L
private const val CHANNEL_ID = "care360_collector"
private const val NOTIFICATION_ID = 1
const val DEVICE_ID = "gw4_hz_01"

class CollectorService : Service() {

    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private lateinit var sensorManager: HealthSensorManager
    private lateinit var bleServer: BleGattServer

    override fun onCreate() {
        super.onCreate()

        sensorManager = HealthSensorManager(this)
        bleServer = BleGattServer(this)

        startForeground(NOTIFICATION_ID, buildNotification())

        if (!hasBluetoothPermissions()) {
            stopSelf()
            return
        }

        sensorManager.start()
        bleServer.start()
        startBatchLoop()
    }

    override fun onDestroy() {
        scope.cancel()
        sensorManager.stop()
        if (hasBluetoothPermissions()) bleServer.stop()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ---- 核心批次循环 ----------------------------------------------------

    private fun startBatchLoop() {
        scope.launch {
            while (isActive) {
                delay(BATCH_INTERVAL_MS)

                // Pi 未连接时跳过序列化，节省 CPU
                if (!bleServer.isConnected()) continue

                val readings = sensorManager.drainReadings()
                if (readings.isEmpty()) continue

                val batch = TelemetryBatch(
                    deviceId     = DEVICE_ID,
                    sysTimestamp = System.currentTimeMillis(),
                    payload      = readings,
                )

                val json = serialize(batch)
                val bytes = json.toByteArray(Charsets.UTF_8)
                Log.i(TAG, "Batch: ${readings.size} readings, ${bytes.size} bytes, Pi connected=${bleServer.isConnected()}")

                // 契约 § 4：单批超 490 字节时在 payload 层拆分
                if (bytes.size <= 490) {
                    bleServer.notify(bytes)
                } else {
                    splitAndNotify(batch)
                }
            }
        }
    }

    // ---- JSON 序列化 -----------------------------------------------------

    private fun serialize(batch: TelemetryBatch): String {
        val payloadArr = JSONArray()
        batch.payload.forEach { r -> payloadArr.put(readingToJson(r)) }

        return JSONObject().apply {
            put("device_id",     batch.deviceId)
            put("sys_timestamp", batch.sysTimestamp)
            put("payload",       payloadArr)
        }.toString()
    }

    private fun readingToJson(r: SensorReading): JSONObject = JSONObject().apply {
        put("sensor",    r.sensor)
        r.value?.let  { put("value",  it) }
        r.values?.let { put("values", JSONArray(it.toTypedArray())) }
        put("accuracy",  r.accuracy)
        put("offset_ms", r.offsetMs)
    }

    // 超限时每次发一半 payload，递归直到全部发完
    private fun splitAndNotify(batch: TelemetryBatch) {
        val half = batch.payload.size / 2
        listOf(
            batch.copy(payload = batch.payload.take(half)),
            batch.copy(payload = batch.payload.drop(half)),
        ).forEach { sub ->
            val bytes = serialize(sub).toByteArray(Charsets.UTF_8)
            if (bytes.size <= 490) bleServer.notify(bytes)
            else splitAndNotify(sub)
        }
    }

    // ---- 权限检查 --------------------------------------------------------

    private fun hasBluetoothPermissions(): Boolean =
        listOf(
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.BLUETOOTH_ADVERTISE,
        ).all { ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED }

    // ---- 前台通知 --------------------------------------------------------

    private fun buildNotification(): Notification {
        val manager = getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Care360 采集", NotificationManager.IMPORTANCE_LOW)
            )
        }
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Care360 运行中")
            .setContentText("生理数据采集中…")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .build()
    }
}
