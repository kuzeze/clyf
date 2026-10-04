# CLYF sleeve: receives FSR + sEMG samples from the sketch and streams them to the
# browser. Raw ADC counts are forwarded untouched; calibration and contact detection
# happen in the page so the raw stream stays inspectable and exportable as recorded.

import threading
import time
from collections import deque

from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI

logger = Logger("clyf-sleeve")
web_ui = WebUI()

lock = threading.Lock()
pending = []  # [seq, ms, fsr, emg] not yet sent to the browser
# Last 60 s of raw samples, readable over HTTP without a browser tab staying awake.
history = deque(maxlen=6000)
stats = {"received": 0, "missing": 0, "last_seq": None, "started": time.time(), "recent": []}


def on_sample(seq: int, ms: int, fsr: int, emg: int):
    now = time.time()
    with lock:
        last = stats["last_seq"]
        # A lower sequence number means the sketch restarted, not that samples were lost.
        if last is not None and seq > last + 1:
            stats["missing"] += seq - last - 1
        stats["last_seq"] = seq
        stats["received"] += 1
        stats["recent"].append(now)
        pending.append([seq, ms, fsr, emg])
        history.append([seq, ms, fsr, emg])


def status():
    now = time.time()
    with lock:
        stats["recent"] = [t for t in stats["recent"] if now - t <= 2.0]
        return {
            "received": stats["received"],
            "missing": stats["missing"],
            "rate_hz": len(stats["recent"]) / 2.0,
            "uptime_s": round(now - stats["started"], 1),
        }


Bridge.provide("sample", on_sample)
web_ui.expose_api("GET", "/status", status)


def recent():
    with lock:
        return {"columns": ["seq", "mcu_ms", "fsr_raw", "emg_raw"], "rows": list(history)}


web_ui.expose_api("GET", "/recent", recent)


def loop():
    # One websocket message per 50 ms rather than one per sample.
    time.sleep(0.05)
    with lock:
        batch = pending[:]
        pending.clear()
    if not batch:
        return
    try:
        web_ui.send_message("samples", {"s": batch, **status()})
    except Exception as error:
        logger.debug(f"send failed: {error}")


logger.info("CLYF sleeve streaming: FSR on A1, EMG envelope on A0")
App.run(user_loop=loop)
