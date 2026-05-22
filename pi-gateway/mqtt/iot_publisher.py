import json
import logging
import ssl
import paho.mqtt.client as mqtt
import config

logger = logging.getLogger(__name__)

ALERT_TOPIC = "alerts/health/{device_id}"


class IotPublisher:
    """
    向 AWS IoT Core 发布报警消息。
    只有报警上云，原始读数本地处理后丢弃。
    """

    def __init__(self):
        self._client = mqtt.Client(
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
            tls_version=ssl.PROTOCOL_TLSv1_2,
        )
        self._client.connect(config.IOT_ENDPOINT, port=8883, keepalive=60)
        self._client.loop_start()

    def disconnect(self):
        self._client.loop_stop()
        self._client.disconnect()

    def publish_alert(self, alert: dict):
        topic = ALERT_TOPIC.format(device_id=alert["device_id"])
        self._client.publish(topic, json.dumps(alert), qos=1)
        logger.info("报警已上云 topic=%s type=%s", topic, alert.get("type"))

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("已连接 AWS IoT Core")
        else:
            logger.error("IoT Core 连接失败 rc=%d", rc)

    def _on_disconnect(self, client, userdata, rc):
        if rc != 0:
            logger.warning("IoT Core 意外断连 rc=%d，自动重连…", rc)
