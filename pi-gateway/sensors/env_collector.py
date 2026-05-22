from gpiozero import Button
from gpiozero.pins.mock import MockFactory
from gpiozero import Device
from sense_emu import SenseHat

# 全局启用 Mock 引脚工厂——换真实硬件时删除这两行即可
Device.pin_factory = MockFactory()

FLAME_PIN = 17


class EnvCollector:
    """
    温湿度：Sense HAT Emulator（拖滑块即可调值）
    火焰传感器：gpiozero MockFactory 虚拟引脚
    摇杆中键：切换火焰引脚高低电平，用于测试报警链路
    """

    def __init__(self):
        self._sense = SenseHat()
        self._flame = Button(FLAME_PIN, pull_up=False)
        self._sense.stick.direction_middle = self._on_joystick

    def read(self) -> dict:
        return {
            "temperature_c": round(self._sense.get_temperature(), 1),
            "humidity_pct":  round(self._sense.get_humidity(), 1),
            "flame_detected": self._flame.is_pressed,
        }

    def cleanup(self):
        self._sense.clear()
        self._flame.close()

    def _on_joystick(self, event):
        if event.action != "pressed":
            return
        if self._flame.is_pressed:
            self._flame.pin.drive_low()   # 熄火
        else:
            self._flame.pin.drive_high()  # 点火
