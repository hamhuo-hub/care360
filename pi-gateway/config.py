import os
import threading

DEVICE_ID        = os.getenv("DEVICE_ID", "gw4_hz_01")

BLE_SERVICE_UUID = "12345678-1234-1234-1234-123456789abc"
BLE_CHAR_UUID    = "12345678-1234-1234-1234-123456789def"
BLE_SCAN_TIMEOUT = 30.0

HR_LOW_BPM             = 45
HR_HIGH_BPM            = 75
HR_ANOMALY_CONSECUTIVE = 3

IOT_ENDPOINT = os.getenv("IOT_ENDPOINT", "")
CERT_PATH    = os.getenv("CERT_PATH", "certs/device.pem.crt")
KEY_PATH     = os.getenv("KEY_PATH",  "certs/private.pem.key")
CA_PATH      = os.getenv("CA_PATH",   "certs/AmazonRootCA1.pem")


class ThresholdConfig:
    """Runtime thresholds — updated live when IoT Device Shadow delta arrives."""

    def __init__(self):
        self._lock                   = threading.Lock()
        self.hr_low_bpm              = HR_LOW_BPM
        self.hr_high_bpm             = HR_HIGH_BPM
        self.hr_anomaly_consecutive  = HR_ANOMALY_CONSECUTIVE
        self.temp_low_c              = 10.0
        self.temp_high_c             = 37.0
        self.humidity_low_pct        = 20.0
        self.humidity_high_pct       = 80.0
        self.pressure_low_hpa        = 980.0
        self.pressure_high_hpa       = 1040.0
        self.env_anomaly_consecutive = 3

    _INT_FIELDS   = {"hr_low_bpm", "hr_high_bpm", "hr_anomaly_consecutive", "env_anomaly_consecutive"}
    _FLOAT_FIELDS = {"temp_low_c", "temp_high_c", "humidity_low_pct", "humidity_high_pct",
                     "pressure_low_hpa", "pressure_high_hpa"}

    def update(self, delta: dict):
        with self._lock:
            for key, val in delta.items():
                if key in self._INT_FIELDS:
                    setattr(self, key, int(val))
                elif key in self._FLOAT_FIELDS:
                    setattr(self, key, float(val))

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "hr_low_bpm":              self.hr_low_bpm,
                "hr_high_bpm":             self.hr_high_bpm,
                "hr_anomaly_consecutive":  self.hr_anomaly_consecutive,
                "temp_low_c":              self.temp_low_c,
                "temp_high_c":             self.temp_high_c,
                "humidity_low_pct":        self.humidity_low_pct,
                "humidity_high_pct":       self.humidity_high_pct,
                "pressure_low_hpa":        self.pressure_low_hpa,
                "pressure_high_hpa":       self.pressure_high_hpa,
                "env_anomaly_consecutive": self.env_anomaly_consecutive,
            }


thresholds = ThresholdConfig()
