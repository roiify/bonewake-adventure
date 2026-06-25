#!/usr/bin/env python3
"""Queue worker for the pro-mode enemy regeneration.

Polls every submitted character. When fewer than 8 are 'processing',
pops the next item from `pending` and submits it via the PixelLab MCP
over HTTP (using `pixellab_mcp.py`). Mutates `pro_enemy_queue.json` in
place so a restart resumes cleanly.

Emits one stdout line per state change:
  PROGRESS done=N/24 active=K pending=P just_completed=<slug>
  SUBMITTED <slug>  (newly submitted)
  ALL_DONE
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

_QUEUE_ARG = sys.argv[1] if len(sys.argv) > 1 else "pro_enemy_queue.json"
QUEUE_PATH = Path(_QUEUE_ARG) if Path(_QUEUE_ARG).is_absolute() else Path(__file__).parent / _QUEUE_ARG
PIXELLAB_MCP = Path(__file__).parent / "pixellab_mcp.py"
# Total = submitted + pending at startup, so PROGRESS lines stay meaningful
# even after the queue grows (e.g. variants appended to pending).
TOTAL = (lambda d=json.loads(QUEUE_PATH.read_text()): len(d["submitted"]) + len(d["pending"]))()


def load():
    return json.loads(QUEUE_PATH.read_text())


def save(data):
    QUEUE_PATH.write_text(json.dumps(data, indent=2))


def mcp(tool: str, args: dict) -> str:
    out = subprocess.run(
        ["python3", str(PIXELLAB_MCP), tool, json.dumps(args)],
        capture_output=True, text=True, env=os.environ, timeout=60,
    )
    return out.stdout


def status_of(char_id: str) -> str:
    try:
        out = mcp("get_character", {"character_id": char_id, "include_preview": False})
    except subprocess.TimeoutExpired:
        # Slow PixelLab call — treat as still in flight; next cycle will retry.
        return "processing"
    except Exception as e:
        print(f"status_of({char_id}) error: {e}", flush=True)
        return "processing"
    for line in out.splitlines():
        if line.startswith("status:"):
            return line.split(":", 1)[1].strip()
    return "unknown"


def submit_next(item: dict) -> str | None:
    out = mcp("create_character", {
        "mode": "pro",
        "body_type": "humanoid",
        "size": 124,
        "view": "side",
        "name": item["name"],
        "description": item["description"],
    })
    for line in out.splitlines():
        if line.startswith("id:"):
            return line.split(":", 1)[1].strip()
        if line.startswith("error:") and "rate limit" in line:
            return None
    return None


def main():
    if not os.environ.get("PIXELLAB_KEY"):
        print("set PIXELLAB_KEY", file=sys.stderr); return 1
    last_done = -1
    while True:
        data = load()
        statuses = {}
        for s in data["submitted"]:
            statuses[s["slug"]] = status_of(s["char_id"])
        done = [s for s, st in statuses.items() if st == "completed"]
        active = [s for s, st in statuses.items() if st == "processing"]
        # If a slot is open and pending has items, submit one.
        while len(active) < 8 and data["pending"]:
            nxt = data["pending"][0]
            cid = submit_next(nxt)
            if not cid:
                break  # still rate-limited, try next loop
            data["submitted"].append({"slug": nxt["slug"], "char_id": cid})
            data["pending"].pop(0)
            save(data)
            statuses[nxt["slug"]] = "processing"
            active.append(nxt["slug"])
            print(f"SUBMITTED {nxt['slug']}", flush=True)
        if len(done) != last_done:
            print(
                f"PROGRESS done={len(done)}/{TOTAL} active={len(active)} pending={len(data['pending'])}",
                flush=True,
            )
            last_done = len(done)
        if len(done) >= TOTAL:
            print("ALL_DONE", flush=True)
            return 0
        time.sleep(30)


if __name__ == "__main__":
    sys.exit(main())
