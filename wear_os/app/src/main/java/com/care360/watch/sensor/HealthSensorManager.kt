package com.care360.watch.sensor

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import com.care360.watch.data.SensorReading
import java.util.concurrent.CopyOnWriteArrayList

private const val TAG = "Care360Sensor"

class HealthSensorManager(context: Context) : SensorEventListener {

    private val sensorManager =
        context.getSystemService(Context.SENSOR_SERVICE) as SensorManager

    private val heartRateSensor  = sensorManager.getDefaultSensor(Sensor.TYPE_HEART_RATE)
    private val accelerometerSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

    // 线程安全列表：SensorEvent 回调在系统线程，drain 在协程线程
    private val buffer = CopyOnWriteArrayList<SensorReading>()

    // 每批次的基准时间，用于计算 offset_ms
    @Volatile private var batchBaseMs = System.currentTimeMillis()

    fun start() {
        batchBaseMs = System.currentTimeMillis()
        val hrOk  = sensorManager.registerListener(this, heartRateSensor,  SensorManager.SENSOR_DELAY_NORMAL)
        val accOk = sensorManager.registerListener(this, accelerometerSensor, SensorManager.SENSOR_DELAY_NORMAL)
        Log.i(TAG, "Sensors registered — HR=$hrOk ACC=$accOk")
    }

    fun stop() {
        sensorManager.unregisterListener(this)
        buffer.clear()
    }

    /**
     * 取走缓冲区内所有读数并重置基准时间，供 CollectorService 每 5 秒调用一次。
     * 返回的列表按时序排列（offset_ms 从小到大），供 Pi 端滑动窗口使用。
     */
    fun drainReadings(): List<SensorReading> {
        val snapshot = buffer.toList().sortedBy { it.offsetMs }
        buffer.clear()
        batchBaseMs = System.currentTimeMillis()
        return snapshot
    }

    override fun onSensorChanged(event: SensorEvent) {
        val offsetMs = System.currentTimeMillis() - batchBaseMs

        val reading = when (event.sensor.type) {
            Sensor.TYPE_HEART_RATE -> {
                Log.d(TAG, "HR=${event.values[0]} bpm  accuracy=${event.accuracy}")
                SensorReading(
                    sensor   = "HEART_RATE",
                    value    = event.values[0],
                    accuracy = event.accuracy,
                    offsetMs = offsetMs,
                )
            }
            Sensor.TYPE_ACCELEROMETER -> SensorReading(
                sensor   = "ACCELEROMETER",
                values   = event.values.copyOf(),
                accuracy = event.accuracy,
                offsetMs = offsetMs,
            )
            else -> return
        }

        buffer.add(reading)
    }

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) = Unit
}
