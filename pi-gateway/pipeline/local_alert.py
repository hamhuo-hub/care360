import logging
import config

logger = logging.getLogger(__name__)

_ENV_METRICS = [
    # (reading_field,  thr_low_attr,       thr_high_attr,       alert_type,            unit)
    ("temperature_c", "temp_low_c",        "temp_high_c",        "TEMPERATURE_ANOMALY", "°C"),
    ("humidity_pct",  "humidity_low_pct",  "humidity_high_pct",  "HUMIDITY_ANOMALY",    "%"),
    ("pressure_hpa",  "pressure_low_hpa",  "pressure_high_hpa",  "PRESSURE_ANOMALY",    "hPa"),
]


class AlertDetector:
    def __init__(self):
        self._hr_anomaly_streak = 0
        self._flame_active      = False
        self._env_streaks       = {m[3]: 0 for m in _ENV_METRICS}

    def check(self, readings: list[dict]) -> list[dict]:
        alerts = []
        for r in readings:
            if r["sensor"] == "HEART_RATE":
                alert = self._check_hr(r)
                if alert:
                    alerts.append(alert)
            elif r["sensor"] == "ENV":
                alerts.extend(self._check_env(r))
        return alerts

    # ── private ─────────────────────────────────────────────────────────────────

    def _check_hr(self, r: dict) -> dict | None:
        bpm = r.get("value", 0)
        thr = config.thresholds
        is_anomaly = bpm < thr.hr_low_bpm or bpm > thr.hr_high_bpm
        if is_anomaly:
            self._hr_anomaly_streak += 1
            logger.debug("HR anomaly bpm=%.1f consecutive=%d", bpm, self._hr_anomaly_streak)
        else:
            self._hr_anomaly_streak = 0
            return None
        if self._hr_anomaly_streak == thr.hr_anomaly_consecutive:
            logger.warning("HR alert bpm=%.1f device=%s", bpm, r["device_id"])
            return {
                "type":      "HEART_RATE_ANOMALY",
                "device_id": r["device_id"],
                "timestamp": r["timestamp"],
                "bpm":       bpm,
            }
        return None

    def _check_env(self, r: dict) -> list[dict]:
        alerts = []
        thr = config.thresholds

        flame = r.get("flame_detected", False)
        if flame and not self._flame_active:
            self._flame_active = True
            alerts.append({
                "type":      "FLAME_DETECTED",
                "device_id": r["device_id"],
                "timestamp": r["timestamp"],
            })
            logger.warning("Flame alert! device=%s", r["device_id"])
        elif not flame:
            self._flame_active = False

        consecutive = thr.env_anomaly_consecutive
        for field, low_attr, high_attr, alert_type, unit in _ENV_METRICS:
            val = r.get(field)
            if val is None:
                continue
            low  = getattr(thr, low_attr)
            high = getattr(thr, high_attr)
            if val < low or val > high:
                self._env_streaks[alert_type] += 1
                logger.debug("%s anomaly val=%.1f%s consecutive=%d",
                             alert_type, val, unit, self._env_streaks[alert_type])
                if self._env_streaks[alert_type] == consecutive:
                    logger.warning("%s alert val=%.1f%s device=%s", alert_type, val, unit, r["device_id"])
                    alerts.append({
                        "type":      alert_type,
                        "device_id": r["device_id"],
                        "timestamp": r["timestamp"],
                        "value":     val,
                        "unit":      unit,
                    })
            else:
                self._env_streaks[alert_type] = 0

        return alerts
