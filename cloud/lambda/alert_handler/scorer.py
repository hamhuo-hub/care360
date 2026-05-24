def score_alert(alert: dict) -> int:
    """Return severity 1–3 (1=LOW, 2=MEDIUM, 3=CRITICAL)."""
    t = alert["type"]

    if t == "FLAME_DETECTED":
        return 3

    if t == "HEART_RATE_ANOMALY":
        bpm = alert.get("bpm", 0)
        if bpm < 30 or bpm > 150:
            return 3
        if bpm < 40 or bpm > 130:
            return 2
        return 1

    if t == "TEMPERATURE_ANOMALY":
        val = alert.get("value", 20)
        if val > 40 or val < 0:
            return 3
        if val > 37 or val < 5:
            return 2
        return 1

    if t == "HUMIDITY_ANOMALY":
        val = alert.get("value", 50)
        if val > 95 or val < 5:
            return 2
        return 1

    if t == "PRESSURE_ANOMALY":
        val = alert.get("value", 1013)
        if val < 960 or val > 1060:
            return 2
        return 1

    return 1
