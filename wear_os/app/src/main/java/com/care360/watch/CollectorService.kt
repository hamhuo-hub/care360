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

    // ---- main loop ----------------------------------------------------

    private fun startBatchLoop() {
        scope.launch {
            // drop initial data 5 seconds to let sensors stabilize, avoid sending a large batch on every start
            sensorManager.drainReadings()
            while (isActive) {
                delay(BATCH_INTERVAL_MS)

                if (!bleServer.isConnected()) continue

                val (windowStart, readings) = sensorManager.drainReadings()
                if (readings.isEmpty()) continue

                val batch = TelemetryBatch(
                    deviceId     = DEVICE_ID,
                    sysTimestamp = windowStart,   
                    payload      = readings,
                )

                val json = serialize(batch)
                val bytes = json.toByteArray(Charsets.UTF_8)
                Log.i(TAG, "Batch: ${readings.size} readings, ${bytes.size} bytes, Pi connected=${bleServer.isConnected()}")

                // BLE characteristic max size is 512 bytes, but to be safe we use 490 as the threshold. If exceeded, split the batch and send in two halves.
                if (bytes.size <= 490) {
                    bleServer.notify(bytes)
                } else {
                    splitAndNotify(batch)
                }
            }
        }
    }

    // ---- JSON serialization -----------------------------------------------------

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

    // send batch in halves if it exceeds BLE size limit, recursively split if still too large (in case of very large batches or many readings with multiple values)
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

    // ---- permission checks --------------------------------------------------------

    private fun hasBluetoothPermissions(): Boolean =
        listOf(
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.BLUETOOTH_ADVERTISE,
        ).all { ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED }

    // ---- foreground notification --------------------------------------------------------

    private fun buildNotification(): Notification {
        val manager = getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Care360 COLLECTOR", NotificationManager.IMPORTANCE_LOW)
            )
        }
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Care360 RUNNING")
            .setContentText("COLLECTING DATA")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .build()
    }
}
