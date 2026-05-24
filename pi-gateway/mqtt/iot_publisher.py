import json
import logging
import time
import paho.mqtt.client as mqtt
import config

logger = logging.getLogger(__name__)

ALERT_TOPIC      = "alerts/health/{device_id}"
HEARTBEAT_TOPIC  = "heartbeat/{device_id}"
_SHADOW_DELTA    = "$aws/things/{device_id}/shadow/update/delta"
_SHADOW_UPDATE   = "$aws/things/{device_id}/shadow/update"


class IotPublisher:
    """
    Handles all MQTT communication with AWS IoT Core:
    - publishes alerts and heartbeats
    - subscribes to Device Shadow delta to receive live threshold updates
    """

    def __init__(self):
        self._client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
            client_id=config.DEVICE_ID,
            clean_session=False,
        )
        self._client.on_connect    = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message    = self._on_message

    def connect(self):
        self._client.tls_set(
            ca_certs=config.CA_PATH,
            certfile=config.CERT_PATH,
            keyfile=config.KEY_PATH,
        )
        self._client.connect(config.IOT_ENDPOINT, port=8883, keepalive=60)
        self._client.loop_start()

    def disconnect(self):
        self._client.loop_stop()
        self._client.disconnect()

    def publish_alert(self, alert: dict):
        topic = ALERT_TOPIC.format(device_id=alert["device_id"])
        self._client.publish(topic, json.dumps(alert), qos=1)
        logger.info("Alert published topic=%s type=%s", topic, alert.get("type"))

    def publish_heartbeat(self):
        topic = HEARTBEAT_TOPIC.format(device_id=config.DEVICE_ID)
        payload = {
            "device_id": config.DEVICE_ID,
            "timestamp": int(time.time() * 1000),
            "status":    "ALIVE",
        }
        self._client.publish(topic, json.dumps(payload), qos=0)
        logger.debug("Heartbeat published topic=%s", topic)

    # ── Shadow ───────────────────────────────────────────────────────────────

    def _report_thresholds(self):
        """After applying a delta, report current thresholds back to shadow."""
        topic = _SHADOW_UPDATE.format(device_id=config.DEVICE_ID)
        payload = {"state": {"reported": config.thresholds.snapshot()}}
        self._client.publish(topic, json.dumps(payload), qos=1)

    # ── MQTT callbacks ───────────────────────────────────────────────────────

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("Connected to AWS IoT Core")
            delta_topic = _SHADOW_DELTA.format(device_id=config.DEVICE_ID)
            client.subscribe(delta_topic, qos=1)
            logger.info("Subscribed to shadow delta: %s", delta_topic)
            # Report current thresholds so shadow is initialised
            self._report_thresholds()
        else:
            logger.error("IoT Core connection failed rc=%d", rc)

    def _on_disconnect(self, client, userdata, rc):
        if rc != 0:
            logger.warning("IoT Core disconnected rc=%d, auto-reconnecting…", rc)

    def _on_message(self, client, userdata, msg):
        try:
            delta = json.loads(msg.payload)["state"]
            logger.info("Shadow delta received: %s", delta)
            config.thresholds.update(delta)
            self._report_thresholds()
            logger.info("Thresholds applied and reported: %s", config.thresholds.snapshot())
        except Exception as e:
            logger.error("Shadow delta handling failed: %s", e)
