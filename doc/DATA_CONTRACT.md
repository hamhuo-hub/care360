# Care360 采集层数据契约

> 手表端（发送方）和树莓派端（接收方）共同遵守。
> 任何一端的修改必须同步更新另一端的解析逻辑。

---

## 0. 数据边界（核心原则）

| 数据类型 | 存储位置 | 上云 |
|----------|----------|------|
| 原始传感器读数（心率、加速度） | Pi 内存，处理后丢弃 | **否** |
| 本地检测到的异常报警 | MQTT → AWS IoT Core | **是** |

> 健康数据不联网。`offset_ms` 的作用是让 Pi 端滑动窗口算法能在批次内正确排序读数（防误报），与上云无关。

---

## 1. MQTT Topic

```
alerts/health/{device_id}        QoS 1  本地告警（Pi 产生，唯一上云数据）
```

---

## 2. 遥测批次 Payload（手表 → Pi → IoT Core）

```json
{
  "device_id":    "gw4_hz_01",
  "sys_timestamp": 1716354162000,
  "battery_level": 82,
  "payload": [
    {
      "sensor":    "HEART_RATE",
      "value":     76.0,
      "accuracy":  3,
      "offset_ms": 0
    },
    {
      "sensor":    "HEART_RATE",
      "value":     78.0,
      "accuracy":  3,
      "offset_ms": -2000
    },
    {
      "sensor":    "ACCELEROMETER",
      "values":    [0.15, 9.81, -0.42],
      "accuracy":  3,
      "offset_ms": -1500
    }
  ]
}
```

### 字段规则

| 字段            | 类型     | 说明 |
|-----------------|----------|------|
| `device_id`     | string   | 设备唯一标识，格式 `gw4_<城市>_<序号>` |
| `sys_timestamp` | int (ms) | 批次打包时刻的 epoch 毫秒 |
| `battery_level` | int 0-100| 手表电量百分比 |
| `payload`       | array    | 本批所有传感器读数，通常 5-10 条 |

### payload 条目规则

| 字段         | 类型         | 说明 |
|--------------|--------------|------|
| `sensor`     | string enum  | `HEART_RATE` \| `ACCELEROMETER` \| `ENV` |
| `value`      | float        | 心率专用：BPM 值，`values` 此时不存在 |
| `values`     | float[3]     | 加速度计专用：`[x, y, z]` m/s²，含重力 9.81 |
| `accuracy`   | int 0-3      | Android SensorManager 精度；**< 2 的读数云端丢弃** |
| `offset_ms`  | int (≥ 0)    | 读数采集时刻距批次基准的毫秒偏移，用于 Pi 端本地时序排序 |

> 还原公式：`真实时间戳 = sys_timestamp + offset_ms`（offset_ms ≥ 0，批次内读数均晚于基准时刻）

---

## 3. 环境传感器读数（Pi 本地追加）

Pi 在收到每批手表数据后，追加一条 ENV 读数一并上传：

```json
{
  "sensor":         "ENV",
  "temperature_c":  24.5,
  "humidity_pct":   60.2,
  "flame_detected": false,
  "accuracy":       3,
    "offset_ms":    0
}
```

---

## 4. BLE 传输细节（手表 ↔ Pi）

| 项目                | 值 |
|---------------------|----|
| Service UUID        | `12345678-1234-1234-1234-123456789abc` |
| Characteristic UUID | `12345678-1234-1234-1234-123456789def` |
| 传输方向            | Watch GATT Server NOTIFY → Pi GATT Client SUBSCRIBE |
| MTU 协商            | 连接建立后立即请求 MTU = 512；一批 JSON 预估 250–400 字节，**一包发完，不分帧** |
| 超限处理            | 若单批 payload 超 490 字节，在 `payload` 数组级别拆成两批分别 Notify，**不在字节层面切割** |
| 批次间隔            | 5 秒 |

> BLE GATT Notify 是逐包投递，不是流。不使用帧边界符；Pi 端收到一次 Notify 即为一个完整批次。

---

## 5. 精度过滤规则（Pi 本地执行）

```
accuracy == 0  → 丢弃（传感器故障/未佩戴）
accuracy == 1  → 丢弃（佩戴不紧）
accuracy >= 2  → 保留并上传
```

---

## 6. 本地告警阈值（Pi 本地执行）

| 传感器       | 告警条件              | 告警类型 |
|--------------|-----------------------|----------|
| HEART_RATE   | BPM < 45 或 BPM > 120 | `HEART_RATE_ANOMALY` |
| ENV          | `flame_detected == true` | `FLAME_DETECTED` |
