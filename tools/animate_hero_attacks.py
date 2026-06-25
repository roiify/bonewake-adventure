#!/usr/bin/env python3
"""Submit v3 custom attack animations for every hero (east-facing, 16 frames).

Heroes live across two PixelLab accounts, so each entry carries an `account`
flag and the right key is selected per-call.
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

QUEUE = Path(__file__).parent / "hero_anim_queue.json"
MCP = Path(__file__).parent / "pixellab_mcp.py"
ANIMATION_NAME = "attack_east"
KEYS = {
    "kidbot": os.environ.get("PIXELLAB_KEY_KIDBOT", ""),
    "rolfi":  os.environ.get("PIXELLAB_KEY_ROLFI",  os.environ.get("PIXELLAB_API_KEY", "")),
}


def call(tool: str, args: dict, key: str) -> str:
    env = dict(os.environ)
    env["PIXELLAB_KEY"] = key
    return subprocess.run(
        ["python3", str(MCP), tool, json.dumps(args)],
        capture_output=True, text=True, env=env, timeout=60,
    ).stdout


def is_rate_limit(s: str) -> bool:
    s = s.lower()
    return "rate limit" in s or "job slots" in s or "8/8 used" in s


def main() -> int:
    data = json.loads(QUEUE.read_text())
    style = data["style_suffix"]
    direction = data["direction"]
    pending = [h for h in data["heroes"] if not h.get("submitted")]
    print(f"to submit: {len(pending)} / {len(data['heroes'])}")

    for h in pending:
        key = KEYS[h["account"]]
        args = {
            "character_id": h["id"],
            "action_description": h["attack"] + style,
            "animation_name": ANIMATION_NAME,
            "directions": [direction],
            "frame_count": 16,
        }
        for attempt in range(20):
            out = call("animate_character", args, key)
            if is_rate_limit(out):
                print(f"  rate-limited on {h['slug']} (attempt {attempt+1}), waiting 30s")
                time.sleep(30)
                continue
            if "error:" in out.lower():
                print(f"  ERR {h['slug']}: {out.strip()[:200]}")
                break
            h["submitted"] = True
            print(f"  submitted {h['slug']} ({h['account']})")
            break
        QUEUE.write_text(json.dumps(data, indent=2))
        time.sleep(1)

    n = sum(1 for h in data["heroes"] if h.get("submitted"))
    print(f"\ntotal submitted: {n}/{len(data['heroes'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
