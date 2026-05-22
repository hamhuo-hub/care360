package com.care360.watch.data

/**
 * micro package
 * serialize JSON 2 pi by BLE Notify
 */
data class TelemetryBatch(
    val deviceId: String,
    val sysTimestamp: Long,     // 打包时刻 epoch ms
    val payload: List<SensorReading>,
)
