import json
import logging
import os

import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import config

router = APIRouter()
logger = logging.getLogger(__name__)

_THRESHOLD_DEFAULTS = {
    "hr_low_bpm":              45,
    "hr_high_bpm":             120,
    "hr_anomaly_consecutive":  3,
    "temp_low_c":              10.0,
    "temp_high_c":             37.0,
    "humidity_low_pct":        20.0,
    "humidity_high_pct":       80.0,
    "pressure_low_hpa":        980.0,
    "pressure_high_hpa":       1040.0,
    "env_anomaly_consecutive": 3,
}

_TEMPLATE_DEFAULTS = {
    "HEART_RATE_ANOMALY": (
        "[Care360 {severity}] Abnormal heart rate on {device_id}: "
        "{bpm:.1f} BPM. Please check on the resident immediately."
    ),
    "FLAME_DETECTED": (
        "[Care360 {severity}] Flame detected on device {device_id}! "
        "Dispatch emergency services immediately."
    ),
}


# ── Device Shadow helpers ─────────────────────────────────────────────────────

def _iot_data():
    return boto3.client("iot-data", region_name=config.AWS_REGION)


def _shadow_get_thresholds() -> dict:
    try:
        resp = _iot_data().get_thing_shadow(thingName=config.IOT_THING_NAME)
        shadow = json.loads(resp["payload"].read())
        state = shadow.get("state", {})
        # desired is what dashboard set; reported is what Pi applied
        return state.get("desired", state.get("reported", _THRESHOLD_DEFAULTS))
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            return dict(_THRESHOLD_DEFAULTS)
        raise


def _shadow_set_thresholds(data: dict):
    _iot_data().update_thing_shadow(
        thingName=config.IOT_THING_NAME,
        payload=json.dumps({"state": {"desired": data}}),
    )


# ── Template local storage (no Pi-side consumer, stored locally) ──────────────

def _load_local() -> dict:
    if not os.path.exists(config.LOCAL_CONFIG):
        return {"templates": dict(_TEMPLATE_DEFAULTS)}
    with open(config.LOCAL_CONFIG) as f:
        return json.load(f)


def _save_local(data: dict):
    with open(config.LOCAL_CONFIG, "w") as f:
        json.dump(data, f, indent=2)


# ── Thresholds (Device Shadow) ────────────────────────────────────────────────

class ThresholdIn(BaseModel):
    hr_low_bpm:              int
    hr_high_bpm:             int
    hr_anomaly_consecutive:  int
    temp_low_c:              float
    temp_high_c:             float
    humidity_low_pct:        float
    humidity_high_pct:       float
    pressure_low_hpa:        float
    pressure_high_hpa:       float
    env_anomaly_consecutive: int = 3


@router.get("/thresholds")
def get_thresholds():
    try:
        return _shadow_get_thresholds()
    except Exception as e:
        logger.error("Shadow read failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))


@router.put("/thresholds")
def set_thresholds(body: ThresholdIn):
    data = body.model_dump()
    try:
        _shadow_set_thresholds(data)
        return data
    except Exception as e:
        logger.error("Shadow update failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/thresholds/shadow")
def get_shadow_full():
    """Return full shadow (desired + reported) for debug view."""
    try:
        resp = _iot_data().get_thing_shadow(thingName=config.IOT_THING_NAME)
        return json.loads(resp["payload"].read())
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            return {}
        raise HTTPException(status_code=502, detail=str(e))


# ── Templates (local JSON) ────────────────────────────────────────────────────

class TemplateIn(BaseModel):
    HEART_RATE_ANOMALY: str
    FLAME_DETECTED: str


@router.get("/templates")
def get_templates():
    return _load_local().get("templates", _TEMPLATE_DEFAULTS)


@router.put("/templates")
def set_templates(body: TemplateIn):
    cfg = _load_local()
    cfg["templates"] = body.model_dump()
    _save_local(cfg)
    return cfg["templates"]
