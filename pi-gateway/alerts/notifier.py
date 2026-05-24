import io
import logging
import math
import os
import struct
import subprocess
import tempfile
import threading
import wave

logger = logging.getLogger(__name__)

# ── parameters ──────────────────────────────────────────
_FREQ_HZ     = 880     
_DURATION_S  = 2.0
_SAMPLE_RATE = 44100

_ALERT_MESSAGES = {
    "HEART_RATE_ANOMALY": "Heart rate anomaly",
    "FLAME_DETECTED":     "Flame detected",
}


def _build_wav() -> bytes:
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
            return
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                f.write(_WAV_BYTES)
                tmp = f.name
            try:
                subprocess.run(["aplay", "-q", tmp],
                               timeout=_DURATION_S + 2, stderr=subprocess.DEVNULL)
            except FileNotFoundError:
                logger.warning("aplay not found, cannot play alert sound")
            except subprocess.TimeoutExpired:
                logger.warning("Playback timeout, killing aplay process")
            finally:
                os.unlink(tmp)
        except Exception as exc:
            logger.warning("Failed to play alert sound: %s", exc)
        finally:
            self._playing.release()
