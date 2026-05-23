def score_alert(alert: dict) -> int:
    """
    Return severity 1-3.
    FLAME_DETECTED is always critical.
    Heart rate severity scales with distance from normal range (45-120 bpm).
    """
    if alert["type"] == "FLAME_DETECTED":
        return 3

    if alert["type"] == "HEART_RATE_ANOMALY":
        bpm = alert.get("bpm", 0)
        if bpm < 30 or bpm > 150:
            return 3
        if bpm < 40 or bpm > 130:
            return 2
        return 1

    return 1
