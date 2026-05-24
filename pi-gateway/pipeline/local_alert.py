import logging
import config

logger = logging.getLogger(__name__)


class AlertDetector:
    """
    detect alerts based on incoming sensor readings, such as:
- heart rate anomaly: bpm < HR_LOW_BPM or bpm > HR_HIGH_BPM for HR_ANOMALY_CONSECUTIVE consecutive readings
- flame detected: flame_detected=True in ENV reading
    """

    def __init__(self):
        self._hr_anomaly_streak = 0
        self._flame_active = False    # 火焰持续中不重复报警

    def check(self, readings: list[dict]) -> list[dict]:
        alerts = []
        for r in readings:
            if r["sensor"] == "HEART_RATE":
                alert = self._check_hr(r)
                if alert:
                    alerts.append(alert)
            elif r["sensor"] == "ENV":
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
                    self._flame_active = False   # Flame disappeared, reset flag
        return alerts

    # ── 私有 ────────────────────────────────────────────────────────────

    def _check_hr(self, r: dict) -> dict | None:
        bpm = r.get("value", 0)
        is_anomaly = bpm < config.HR_LOW_BPM or bpm > config.HR_HIGH_BPM

        if is_anomaly:
            self._hr_anomaly_streak += 1
            logger.debug("Heart rate anomaly bpm=%.1f consecutive=%d", bpm, self._hr_anomaly_streak)
        else:
            self._hr_anomaly_streak = 0   #恢复正常则重置
            return None

        if self._hr_anomaly_streak == config.HR_ANOMALY_CONSECUTIVE:
            logger.warning("Heart rate alert bpm=%.1f device=%s", bpm, r["device_id"])
            return {
                "type":      "HEART_RATE_ANOMALY",
                "device_id": r["device_id"],
                "timestamp": r["timestamp"],
                "bpm":       bpm,
            }
        return None
