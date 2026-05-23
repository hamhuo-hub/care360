from fastapi import APIRouter, Query
from typing import Optional
from decimal import Decimal
from boto3.dynamodb.conditions import Key
import boto3
import json
import config

router = APIRouter()


def _to_json(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


@router.get("/alerts")
def list_alerts(
    device_id: Optional[str] = None,
    alert_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
):
    table = boto3.resource("dynamodb", region_name=config.AWS_REGION).Table(config.DYNAMODB_TABLE)

    if device_id:
        resp = table.query(
            KeyConditionExpression=Key("device_id").eq(device_id),
            ScanIndexForward=False,
            Limit=limit,
        )
        items = resp.get("Items", [])
    else:
        resp = table.scan()
        items = sorted(
            resp.get("Items", []),
            key=lambda x: int(x.get("timestamp", 0)),
            reverse=True,
        )[:limit]

    if alert_type:
        items = [i for i in items if i.get("type") == alert_type]

    return json.loads(json.dumps(items, default=_to_json))
