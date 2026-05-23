import json
import logging
from datetime import datetime, timezone

from validator import validate_alert
from scorer import score_alert
from db import store_alert
from notifier import dispatch

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    logger.info("Alert received: %s", json.dumps(event))

    try:
        validate_alert(event)
    except ValueError as e:
        logger.error("Validation failed: %s", e)
        return {"statusCode": 400, "body": str(e)}

    severity = score_alert(event)
    event["severity"] = severity
    event["processed_at"] = int(datetime.now(timezone.utc).timestamp() * 1000)

    store_alert(event)
    dispatch(event, severity)

    logger.info("Alert processed: type=%s device=%s severity=%d",
                event["type"], event["device_id"], severity)
    return {"statusCode": 200}
