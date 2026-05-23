import json
import os
from decimal import Decimal

import boto3

_table = None


def _get_table():
    global _table
    if _table is None:
        _table = boto3.resource("dynamodb").Table(os.environ["DYNAMODB_TABLE"])
    return _table


def store_alert(alert: dict):
    item = json.loads(json.dumps(alert), parse_float=Decimal)

    # TTL: retain records for 90 days
    ts_sec = int(alert["timestamp"]) // 1000
    item["ttl"] = ts_sec + 90 * 24 * 3600

    _get_table().put_item(Item=item)
