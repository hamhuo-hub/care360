import os

DEVICE_ID        = os.getenv("DEVICE_ID", "gw4_hz_01")

BLE_SERVICE_UUID = "12345678-1234-1234-1234-123456789abc"
BLE_CHAR_UUID    = "12345678-1234-1234-1234-123456789def"
BLE_SCAN_TIMEOUT = 30.0

HR_LOW_BPM             = 45
HR_HIGH_BPM            = 120
HR_ANOMALY_CONSECUTIVE = 3    # 连续 N 条超阈值才报警

IOT_ENDPOINT = os.getenv("IOT_ENDPOINT", "")
CERT_PATH    = os.getenv("CERT_PATH", "certs/device.pem.crt")
KEY_PATH     = os.getenv("KEY_PATH",  "certs/private.pem.key")
CA_PATH      = os.getenv("CA_PATH",   "certs/AmazonRootCA1.pem")
