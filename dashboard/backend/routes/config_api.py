from fastapi import APIRouter
from pydantic import BaseModel
import json
import os
import config

router = APIRouter()

_DEFAULTS = {
    "thresholds": {
        "hr_low_bpm": 45,
        "hr_high_bpm": 120,
        "hr_anomaly_consecutive": 3,
    },
    "templates": {
        "HEART_RATE_ANOMALY": (
            "[Care360 {severity}] Abnormal heart rate on {device_id}: "
            "{bpm:.1f} BPM. Please check on the resident immediately."
        ),
        "FLAME_DETECTED": (
            "[Care360 {severity}] Flame detected on device {device_id}! "
            "Dispatch emergency services immediately."
        ),
    },
}


def _load() -> dict:
    if not os.path.exists(config.LOCAL_CONFIG):
        return dict(_DEFAULTS)
    with open(config.LOCAL_CONFIG) as f:
        return json.load(f)


def _save(data: dict):
    with open(config.LOCAL_CONFIG, "w") as f:
        json.dump(data, f, indent=2)


# ── Thresholds ────────────────────────────────────────────────────────────────

class ThresholdIn(BaseModel):
    hr_low_bpm: int
    hr_high_bpm: int
    hr_anomaly_consecutive: int


@router.get("/thresholds")
def get_thresholds():
    return _load()["thresholds"]


@router.put("/thresholds")
def set_thresholds(body: ThresholdIn):
    cfg = _load()
    cfg["thresholds"] = body.model_dump()
    _save(cfg)
    return cfg["thresholds"]


# ── Templates ─────────────────────────────────────────────────────────────────

class TemplateIn(BaseModel):
    HEART_RATE_ANOMALY: str
    FLAME_DETECTED: str


@router.get("/templates")
def get_templates():
    return _load()["templates"]


@router.put("/templates")
def set_templates(body: TemplateIn):
    cfg = _load()
    cfg["templates"] = body.model_dump()
    _save(cfg)
    return cfg["templates"]
