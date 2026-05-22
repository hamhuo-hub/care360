import asyncio
import json
import logging
from collections.abc import Callable

from bleak import BleakClient, BleakScanner

import config

logger = logging.getLogger(__name__)


class WatchBleClient:
    """
    BLE Central：扫描手表广播 → 连接 → 订阅遥测 Notify → 回调上层。
    断连后自动重试，上层无需关心重连逻辑。
    """

    def __init__(self, on_batch: Callable[[dict], None]):
        self._on_batch = on_batch

    async def run_forever(self):
        while True:
            try:
                await self._connect_and_listen()
            except Exception as exc:
                logger.warning("BLE 断连（%s），5s 后重试…", exc)
                await asyncio.sleep(5)

    # ── 内部 ──────────────────────────────────────────────────────────────

    async def _connect_and_listen(self):
        logger.info("扫描 Care360 手表（UUID=%s）…", config.BLE_SERVICE_UUID)

        device = await BleakScanner.find_device_by_filter(
            lambda d, adv: config.BLE_SERVICE_UUID.lower() in [
                str(u).lower() for u in (adv.service_uuids or [])
            ],
            timeout=config.BLE_SCAN_TIMEOUT,
        )

        if device is None:
            raise RuntimeError("超时未发现手表广播")

        logger.info("发现设备 %s，连接中…", device.address)

        async with BleakClient(device, disconnected_callback=self._on_disconnect) as client:
            logger.info("已连接，订阅遥测特征…")

            await client.start_notify(config.BLE_CHAR_UUID, self._on_notify)
            logger.info("已连接，等待数据…")

            # 挂起直到连接断开
            await asyncio.Future()

    def _on_notify(self, _characteristic, data: bytearray):
        try:
            batch = json.loads(data.decode("utf-8"))
            self._on_batch(batch)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            logger.warning("JSON 解析失败：%s", exc)

    def _on_disconnect(self, _client):
        logger.warning("手表已断开连接")
