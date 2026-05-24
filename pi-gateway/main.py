import asyncio
import json
import logging

import config
from alerts.notifier import LocalNotifier
from ble.ble_client import WatchBleClient
from mqtt.iot_publisher import IotPublisher
from pipeline.local_alert import AlertDetector
from pipeline.schema_packager import make_env_reading, unpack
from sensors.env_collector import EnvCollector

# CLI logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("care360.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)

# sepreate logger for raw sensor data, 
# only write to file, no console output
data_logger = logging.getLogger("data")
data_logger.setLevel(logging.INFO)
data_logger.addHandler(logging.FileHandler("sensor_data.log", encoding="utf-8"))
data_logger.propagate = False  # disable propagation to avoid duplicate logs in console


def main():
    env      = EnvCollector()
    detector = AlertDetector()
    notifier = LocalNotifier()
    publisher = IotPublisher()

    if config.IOT_ENDPOINT:
        publisher.connect()
    else:
        logger.warning("IOT_ENDPOINT not set, skipping cloud publishing")

    def on_batch(batch: dict):
        # write raw batch data to file 
        # for debugging/analysis,
        # in JSON format
        data_logger.info(json.dumps(batch, ensure_ascii=False))

        # 1. unpack raw batch into standardized readings list
        readings = unpack(batch)

        # 2. add current environment data as a new reading
        env_data = env.read()
        readings.append(make_env_reading(env_data, config.DEVICE_ID))

        # cli log the readings
        for r in readings:
            if r["sensor"] == "HEART_RATE":
                logger.info("[HR]  %.1f bpm  ts=%d", r.get("value", 0), r["timestamp"])
            elif r["sensor"] == "ACCELEROMETER":
                v = r.get("values", [0, 0, 0])
                logger.info("[ACC] x=%.2f y=%.2f z=%.2f  ts=%d", v[0], v[1], v[2], r["timestamp"])
            elif r["sensor"] == "ENV":
                logger.info("[ENV] temp=%.1f°C  humidity=%.1f%%  pressure=%.1fhPa  flame=%s",
                            r.get("temperature_c", 0), r.get("humidity_pct", 0),
                            r.get("pressure_hpa", 0), r.get("flame_detected"))

        # 3. local alert detection
        alerts = detector.check(readings)

        # 4. notify local alerts and publish to cloud if configured
        for alert in alerts:
            notifier.notify(alert)
            if config.IOT_ENDPOINT:
                publisher.publish_alert(alert)

    ble = WatchBleClient(on_batch=on_batch)

    try:
        asyncio.run(ble.run_forever())
    except KeyboardInterrupt:
        logger.info("stop")
    finally:
        env.cleanup()
        if config.IOT_ENDPOINT:
            publisher.disconnect()


if __name__ == "__main__":
    main()
