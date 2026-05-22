import io
import logging
import math
import struct
import subprocess
import threading
import wave

logger = logging.getLogger(__name__)

# ── 报警音参数 ──────────────────────────────────────────
_FREQ_HZ     = 880     # A5，刺耳但不至于令人崩溃
_DURATION_S  = 2.0
_SAMPLE_RATE = 44100

_ALERT_MESSAGES = {
    "HEART_RATE_ANOMALY": "心率异常",
    "FLAME_DETECTED":     "火焰警报",
}


def _build_wav() -> bytes:
    """在启动时生成一次，之后直接复用。"""
    n = int(_SAMPLE_RATE * _DURATION_S)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(_SAMPLE_RATE)
        for i in range(n):
            v = int(32767 * math.sin(2 * math.pi * _FREQ_HZ * i / _SAMPLE_RATE))
            w.writeframes(struct.pack("<h", v))
    return buf.getvalue()


_WAV_BYTES = _build_wav()


class LocalNotifier:
    """
    本地报警：控制台打印 + 蜂鸣 2 秒。
    播放在独立线程，不阻塞采集主循环。
    同一时间只播一次，不叠加。
    """

    def __init__(self):
        self._playing = threading.Lock()

    def notify(self, alert: dict):
        atype   = alert.get("type", "ALERT")
        label   = _ALERT_MESSAGES.get(atype, atype)
        device  = alert.get("device_id", "?")

        logger.warning("🚨 %s  [%s]  %s", label, device, alert)
        threading.Thread(target=self._beep, daemon=True).start()

    def _beep(self):
        if not self._playing.acquire(blocking=False):
            return   # 已经在响，跳过
        try:
            proc = subprocess.Popen(
                ["aplay", "-q", "-"],
                stdin=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
            )
            proc.communicate(input=_WAV_BYTES, timeout=_DURATION_S + 1)
        except FileNotFoundError:
            logger.warning("aplay 未找到，无法播放报警音（Pi 上请确认 alsa-utils 已安装）")
        except Exception as exc:
            logger.warning("播放报警音失败: %s", exc)
        finally:
            self._playing.release()
