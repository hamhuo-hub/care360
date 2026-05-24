import asyncio
import json
import logging
from collections.abc import Callable

from bleak import BleakClient, BleakScanner

import config

logger = logging.getLogger(__name__)


class WatchBleClient:
    """
    BLE Central: scan → connect → subscribe to telemetry Notify → callback upper layer.
    """

    def __init__(self, on_batch: Callable[[dict], None]):
        self._on_batch = on_batch

    async def run_forever(self):
        while True:
            try:
                await self._connect_and_listen()
            except Exception as exc:
                logger.warning("BLE disconnected (%s), retrying in 5s…", exc)
                await asyncio.sleep(5)

    # ── core ──────────────────────────────────────────────────────────────

    async def _connect_and_listen(self):
        logger.info("Scanning for Care360 watch (UUID=%s)…", config.BLE_SERVICE_UUID)

        device = await BleakScanner.find_device_by_filter(
            lambda d, adv: config.BLE_SERVICE_UUID.lower() in [
                str(u).lower() for u in (adv.service_uuids or [])
            ],
            timeout=config.BLE_SCAN_TIMEOUT,
        )

        if device is None:
            raise RuntimeError("Timeout: Watch broadcast not found")

        logger.info("Found device %s, connecting…", device.address)

        async with BleakClient(device, disconnected_callback=self._on_disconnect) as client:
            logger.info("Connected, subscribing to telemetry characteristic…")

            await client.start_notify(config.BLE_CHAR_UUID, self._on_notify)
            logger.info("Client is listening for notifications…")

            
            await asyncio.Future()

    def _on_notify(self, _characteristic, data: bytearray):
        try:
            batch = json.loads(data.decode("utf-8"))
            self._on_batch(batch)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            logger.warning("JSON parsing failed: %s", exc)

    def _on_disconnect(self, _client):
        logger.warning("Watch disconnected")
