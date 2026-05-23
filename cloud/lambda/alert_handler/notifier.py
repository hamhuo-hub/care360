import logging
import os

import boto3

logger = logging.getLogger()

_sns = None

_SEVERITY_LABEL = {1: "LOW", 2: "MEDIUM", 3: "CRITICAL"}


def _get_sns():
    global _sns
    if _sns is None:
        _sns = boto3.client("sns")
    return _sns


def dispatch(alert: dict, severity: int):
    topic_arn = os.environ.get("SNS_TOPIC_ARN")
    if not topic_arn:
        logger.warning("SNS_TOPIC_ARN not set — skipping notification")
        return

    label = _SEVERITY_LABEL.get(severity, "UNKNOWN")
    device = alert["device_id"]

    if alert["type"] == "HEART_RATE_ANOMALY":
        bpm = alert.get("bpm", 0)
        body = (
            f"[Care360 {label}] Abnormal heart rate on {device}: {bpm:.1f} BPM. "
            "Please check on the resident immediately."
        )
    elif alert["type"] == "FLAME_DETECTED":
        body = (
            f"[Care360 {label}] Flame detected on device {device}! "
            "Dispatch emergency services immediately."
        )
    else:
        body = f"[Care360 {label}] Alert '{alert['type']}' from {device}."

    _get_sns().publish(
        TopicArn=topic_arn,
        Subject=f"Care360 Alert — {label}",
        Message=body,
    )
    logger.info("Notification sent: severity=%d type=%s device=%s",
                severity, alert["type"], device)
