import logging
import struct
import threading

from gpiozero import Button
from gpiozero.pins.mock import MockFactory
from gpiozero import Device
from sense_emu import SenseHat
import sense_emu.RTIMU

logger = logging.getLogger(__name__)

# HOTFIX: 64-bit ABI struct alignment bug in sense-emu.
# Native '@' format adds padding bytes on AArch64, shifting all reads by 1+ bytes.
# Force Standard '=' (no padding) so humidity/pressure/IMU maps read correctly.
sense_emu.RTIMU.HUMIDITY_DATA = struct.Struct(sense_emu.RTIMU.HUMIDITY_DATA.format.replace('@', '='))
sense_emu.RTIMU.PRESSURE_DATA = struct.Struct(sense_emu.RTIMU.PRESSURE_DATA.format.replace('@', '='))
sense_emu.RTIMU.IMU_DATA      = struct.Struct(sense_emu.RTIMU.IMU_DATA.format.replace('@', '='))

Device.pin_factory = MockFactory()

FLAME_PIN = 17

_lock = threading.Lock()


class EnvCollector:
    """
    温湿度气压：sense_emu SenseHat 模拟器读取。
    火焰传感器：gpiozero MockFactory 虚拟引脚，摇杆中键切换。
    """

    def __init__(self):
        self._sense = SenseHat()
        self._flame = Button(FLAME_PIN, pull_up=False)
        self._sense.stick.direction_any    = self._on_any_stick
        self._sense.stick.direction_middle = self._on_joystick_middle

    def _on_any_stick(self, event):
        logger.info("[STICK] direction=%s action=%s", event.direction, event.action)

    def _on_joystick_middle(self, event):
        logger.info("[FLAME] middle event action=%s  is_pressed=%s", event.action, self._flame.is_pressed)
        if event.action != "pressed":
            return
        pin = Device.pin_factory.pin(FLAME_PIN)
        if self._flame.is_pressed:
            pin.drive_low()
            logger.warning("[FLAME] OFF")
        else:
            pin.drive_high()
            logger.warning("[FLAME] ON")

    def read(self) -> dict:
        with _lock:
            return {
                "temperature_c": self._sense.get_temperature(),
                "humidity_pct":  self._sense.get_humidity(),
                "pressure_hpa":  self._sense.get_pressure(),
                "flame_detected": self._flame.is_pressed,
            }

    def cleanup(self):
        self._flame.close()
