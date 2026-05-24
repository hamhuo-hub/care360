import json
import logging
import paho.mqtt.client as mqtt
import config

logger = logging.getLogger(__name__)

ALERT_TOPIC = "alerts/health/{device_id}"


class IotPublisher:
    """
    send alerts to AWS IoT Core for cloud processing/notification.
    """

    def __init__(self):
        self._client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
            client_id=config.DEVICE_ID,
            clean_session=False,
        )
        self._client.on_connect    = self._on_connect
        self._client.on_disconnect = self._on_disconnect

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
        logger.info("Alert published to cloud topic=%s type=%s", topic, alert.get("type"))

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("Connected to AWS IoT Core")
        else:
            logger.error("IoT Core connection failed rc=%d", rc)

    def _on_disconnect(self, client, userdata, rc):
        if rc != 0:
            logger.warning("IoT Core unexpected disconnection rc=%d, attempting auto-reconnect…", rc)
