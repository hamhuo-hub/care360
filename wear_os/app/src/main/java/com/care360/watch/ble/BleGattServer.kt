package com.care360.watch.ble

import android.Manifest
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.content.Context
import android.os.ParcelUuid
import android.util.Log
import androidx.annotation.RequiresPermission

import java.util.UUID
import java.util.concurrent.atomic.AtomicReference

private const val TAG = "Care360BLE"

// fixed UUID
val SERVICE_UUID    : UUID = UUID.fromString("12345678-1234-1234-1234-123456789abc")
val CHAR_UUID       : UUID = UUID.fromString("12345678-1234-1234-1234-123456789def")
private val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

class BleGattServer(private val context: Context) {

    private val btManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val btAdapter = btManager.adapter
    private var gattServer: BluetoothGattServer? = null
    private val connectedDevice = AtomicReference<BluetoothDevice?>(null)

    // ---- lifecycle --------------------------------------------------------

    @RequiresPermission(Manifest.permission.BLUETOOTH_CONNECT)
    fun start() {
        gattServer = btManager.openGattServer(context, serverCallback).also { server ->
            server.addService(buildService())
        }
        startAdvertising()
    }

    @RequiresPermission(allOf = [
        Manifest.permission.BLUETOOTH_ADVERTISE,
        Manifest.permission.BLUETOOTH_CONNECT,
    ])
    fun stop() {
        btAdapter.bluetoothLeAdvertiser?.stopAdvertising(advertiseCallback)
        gattServer?.close()
        gattServer = null
    }

    // ---- adapters --------------------------------------------------------

    /**
     * send Json bytes to connected Pi via BLE notification. 
     * If no Pi connected or GATT server not ready, 
     * drop the data silently.
     */
    @RequiresPermission(Manifest.permission.BLUETOOTH_CONNECT)
    private fun ByteArray.toHex() = joinToString("") { "%02x".format(it) }

    fun notify(jsonBytes: ByteArray) {
        Log.d(TAG, "send ${jsonBytes.size} bytes, connected=${isConnected()}")
        val device = connectedDevice.get() ?: return
        val server = gattServer ?: return
        val char = server.getService(SERVICE_UUID)
            ?.getCharacteristic(CHAR_UUID) ?: return

        char.value = jsonBytes
        server.notifyCharacteristicChanged(device, char, false)
    }

    fun isConnected(): Boolean = connectedDevice.get() != null

    // ---- GATT service --------------------------------------------------

    private fun buildService(): BluetoothGattService {
        val char = BluetoothGattCharacteristic(
            CHAR_UUID,
            BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_READ,
        )
        char.addDescriptor(
            BluetoothGattDescriptor(
                CCCD_UUID,
                BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE,
            )
        )
        return BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
            .also { it.addCharacteristic(char) }
    }

    // ---- GATT call ------------------------------------------------------

    private val serverCallback = object : BluetoothGattServerCallback() {

        @RequiresPermission(Manifest.permission.BLUETOOTH_CONNECT)
        override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                connectedDevice.set(device)
                Log.i(TAG, "Pi connected: ${device.address}")
            } else {
                connectedDevice.compareAndSet(device, null)
                Log.i(TAG, "Pi disconnected: ${device.address} status=$status")
            }
        }

        override fun onMtuChanged(device: BluetoothDevice, mtu: Int) {
            // Pi 请求 MTU 512 后此处会回调，mtu 为实际协商值（通常 512）
            // 不需要做任何操作，系统自动按协商 MTU 分包
        }

        @RequiresPermission(Manifest.permission.BLUETOOTH_CONNECT)
        override fun onDescriptorWriteRequest(
            device: BluetoothDevice, requestId: Int,
            descriptor: BluetoothGattDescriptor,
            preparedWrite: Boolean, responseNeeded: Boolean,
            offset: Int, value: ByteArray,
        ) {
            Log.i(TAG, "CCCD subscription request value=${value.toHex()}")
            if (responseNeeded) {
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 0, null)
            }
        }
    }

    // ---- BLE advertising -------------------------------------------------------

    private fun startAdvertising() {
        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setConnectable(true)
            .setTimeout(0) 
            .build()

        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(false) // 省 payload 空间
            .addServiceUuid(ParcelUuid(SERVICE_UUID))
            .build()

        btAdapter.bluetoothLeAdvertiser?.startAdvertising(settings, data, advertiseCallback)
    }

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartFailure(errorCode: Int) {
            // errorCode 2 = 已在广播中，可忽略
        }
    }
}
