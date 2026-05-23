from fastapi import APIRouter
from datetime import datetime, timezone
from decimal import Decimal
from boto3.dynamodb.conditions import Key
import boto3
import config

router = APIRouter()


def _safe(fn):
    try:
        return fn()
    except Exception as e:
        return {"status": "ERROR", "error": str(e)[:120]}


# ── AWS component health ──────────────────────────────────────────────────────

@router.get("/status/aws")
def aws_status():
    def check_iot():
        c = boto3.client("iot", region_name=config.AWS_REGION)
        rule = c.get_topic_rule(ruleName="care360AlertRule")["rule"]
        return {
            "status": "DISABLED" if rule["ruleDisabled"] else "OK",
            "sql": rule["sql"],
        }

    def check_lambda():
        c = boto3.client("lambda", region_name=config.AWS_REGION)
        f = c.get_function(FunctionName="care360-alert-handler")["Configuration"]
        return {"status": f["State"], "last_modified": f["LastModified"]}

    def check_ddb():
        c = boto3.client("dynamodb", region_name=config.AWS_REGION)
        t = c.describe_table(TableName=config.DYNAMODB_TABLE)["Table"]
        return {"status": t["TableStatus"], "item_count": t.get("ItemCount", 0)}

    def check_sns():
        c = boto3.client("sns", region_name=config.AWS_REGION)
        topics = c.list_topics()["Topics"]
        hit = next((x for x in topics if "care360" in x["TopicArn"]), None)
        return {
            "status": "OK" if hit else "NOT_FOUND",
            "topic_arn": hit["TopicArn"] if hit else None,
        }

    return {
        "iot_core": _safe(check_iot),
        "lambda":   _safe(check_lambda),
        "dynamodb": _safe(check_ddb),
        "sns":      _safe(check_sns),
    }


# ── Device activity ───────────────────────────────────────────────────────────

@router.get("/status/devices")
def device_status():
    pi = _safe(_pi_status)
    return {
        "pi": pi,
        "watch": {
            "status": "ACTIVE" if pi.get("status") == "ACTIVE" else "UNKNOWN",
            "note": "BLE-only — 通过 Pi 最近数据推断连接状态",
        },
    }


def _pi_status() -> dict:
    table = boto3.resource("dynamodb", region_name=config.AWS_REGION).Table(config.DYNAMODB_TABLE)
    resp = table.query(
        KeyConditionExpression=Key("device_id").eq(config.IOT_THING_NAME),
        ScanIndexForward=False,
        Limit=1,
    )
    items = resp.get("Items", [])
    if not items:
        return {"status": "UNKNOWN", "device_id": config.IOT_THING_NAME}

    ts_ms = int(items[0]["timestamp"])
    last_seen = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
    ago = int((datetime.now(timezone.utc) - last_seen).total_seconds())
    return {
        "status": "ACTIVE" if ago < 300 else "INACTIVE",
        "device_id": config.IOT_THING_NAME,
        "last_seen_seconds_ago": ago,
    }
