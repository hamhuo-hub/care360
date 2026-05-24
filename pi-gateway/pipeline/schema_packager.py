import logging
import time

logger = logging.getLogger(__name__)


def unpack(batch: dict) -> list[dict]:
    """
    repackage raw batch data into a list of standardized readings,
filtering out low-accuracy items.
    """
    base_ts  = batch.get("sys_timestamp", int(time.time() * 1000))
    device   = batch.get("device_id", "unknown")
    readings = []

    for item in batch.get("payload", []):
        if item.get("accuracy", 0) < 2:
            logger.debug("Discarding low-accuracy reading accuracy=%d sensor=%s",
                         item.get("accuracy"), item.get("sensor"))
            continue

        reading = {
            "device_id": device,
            "timestamp": base_ts + item.get("offset_ms", 0),
            "sensor":    item["sensor"],
        }
        if "value"  in item: reading["value"]  = item["value"]
        if "values" in item: reading["values"] = item["values"]

        readings.append(reading)

    return readings


def make_env_reading(env: dict, device_id: str) -> dict:
    return {
        "device_id": device_id,
        "timestamp": int(time.time() * 1000),
        "sensor":    "ENV",
        **env,
    }
