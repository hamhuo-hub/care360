package com.care360.watch.data

/**
 * sensor payload
 *
 * HEART_RATE    → values = null
 * ACCELEROMETER → values [x,y,z]，value = null
 * offset_ms     ≤ 0
 */
data class SensorReading(
    val sensor: String,
    val value: Float? = null,
    val values: FloatArray? = null,
    val accuracy: Int,
    val offsetMs: Long,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is SensorReading) return false
        return sensor == other.sensor
            && value == other.value
            && (values?.contentEquals(other.values ?: floatArrayOf()) ?: (other.values == null))
            && accuracy == other.accuracy
            && offsetMs == other.offsetMs
    }

    override fun hashCode(): Int {
        var result = sensor.hashCode()
        result = 31 * result + (value?.hashCode() ?: 0)
        result = 31 * result + (values?.contentHashCode() ?: 0)
        result = 31 * result + accuracy
        result = 31 * result + offsetMs.hashCode()
        return result
    }
}
