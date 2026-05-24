import re

VALID_TYPES = {
    "HEART_RATE_ANOMALY",
    "FLAME_DETECTED",
    "TEMPERATURE_ANOMALY",
    "HUMIDITY_ANOMALY",
    "PRESSURE_ANOMALY",
}
_ENV_ANOMALY_TYPES = {"TEMPERATURE_ANOMALY", "HUMIDITY_ANOMALY", "PRESSURE_ANOMALY"}
_DEVICE_ID_RE = re.compile(r"^gw4_[a-z]+_\d+$")


def validate_alert(alert: dict):
    missing = {"type", "device_id", "timestamp"} - alert.keys()
    if missing:
        raise ValueError(f"Missing required fields: {missing}")

    if alert["type"] not in VALID_TYPES:
        raise ValueError(f"Unknown alert type: {alert['type']}")

    if not _DEVICE_ID_RE.match(str(alert["device_id"])):
        raise ValueError(f"Invalid device_id format: {alert['device_id']}")

    ts = alert["timestamp"]
    if not isinstance(ts, (int, float)) or ts <= 0:
        raise ValueError(f"Invalid timestamp: {ts}")

    if alert["type"] == "HEART_RATE_ANOMALY":
        bpm = alert.get("bpm")
        if bpm is None or not isinstance(bpm, (int, float)):
            raise ValueError("HEART_RATE_ANOMALY requires a numeric bpm field")

    if alert["type"] in _ENV_ANOMALY_TYPES:
        val = alert.get("value")
        if val is None or not isinstance(val, (int, float)):
            raise ValueError(f"{alert['type']} requires a numeric value field")
