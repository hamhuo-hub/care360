import logging
import config

logger = logging.getLogger(__name__)


class AlertDetector:
    """
    有状态的异常检测器。
    心率需要连续 HR_ANOMALY_CONSECUTIVE 条读数超阈值才触发，防单点误报。
    火焰检测单次即触发（火情不等人）。
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
                    logger.warning("火焰报警！device=%s", r["device_id"])
                elif not flame:
                    self._flame_active = False   # 火焰消失，重置
        return alerts

    # ── 私有 ────────────────────────────────────────────────────────────

    def _check_hr(self, r: dict) -> dict | None:
        bpm = r.get("value", 0)
        is_anomaly = bpm < config.HR_LOW_BPM or bpm > config.HR_HIGH_BPM

        if is_anomaly:
            self._hr_anomaly_streak += 1
            logger.debug("心率异常 bpm=%.1f 连续=%d", bpm, self._hr_anomaly_streak)
        else:
            self._hr_anomaly_streak = 0   # 恢复正常则重置
            return None

        if self._hr_anomaly_streak == config.HR_ANOMALY_CONSECUTIVE:
            logger.warning("心率报警 bpm=%.1f device=%s", bpm, r["device_id"])
            return {
                "type":      "HEART_RATE_ANOMALY",
                "device_id": r["device_id"],
                "timestamp": r["timestamp"],
                "bpm":       bpm,
            }
        return None
