#!/usr/bin/env python3
"""Submit v3 custom attack animations for every enemy in enemy_anim_queue.json.

Each enemy gets one west-direction 16-frame animation named `attack_west`.
Retries on rate-limit with 30s backoff. Records submission status back into
the queue file so the script is resumable.
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

QUEUE = Path(__file__).parent / "enemy_anim_queue.json"
MCP = Path(__file__).parent / "pixellab_mcp.py"
ANIMATION_NAME = "attack_west"


def call(tool: str, args: dict) -> str:
    return subprocess.run(
        ["python3", str(MCP), tool, json.dumps(args)],
        capture_output=True, text=True, env=os.environ, timeout=60,
    ).stdout


def main() -> int:
    if not os.environ.get("PIXELLAB_KEY"):
        print("set PIXELLAB_KEY", file=sys.stderr); return 1
    data = json.loads(QUEUE.read_text())
    style = data["style_suffix"]
    pending = [e for e in data["enemies"] if not e.get("submitted")]
    print(f"to submit: {len(pending)} / {len(data['enemies'])}")

    for e in pending:
        desc = e["attack"] + style
        args = {
            "character_id": e["id"],
            "action_description": desc,
            "animation_name": ANIMATION_NAME,
            "directions": ["west"],
            "frame_count": 16,
        }
        # Retry on rate limit. PixelLab returns this in a few formats:
        #   "rate limit exceeded"
        #   "need 1 job slots but only 0 available (8/8 used)"
        # Match any of those before treating as a hard error.
        def is_rate_limit(s: str) -> bool:
            s = s.lower()
            return "rate limit" in s or "job slots" in s or "8/8 used" in s
        for attempt in range(20):
            out = call("animate_character", args)
            if is_rate_limit(out):
                print(f"  rate-limited on {e['slug']} (attempt {attempt+1}), waiting 30s")
                time.sleep(30)
                continue
            if "error:" in out.lower():
                print(f"  ERR {e['slug']}: {out.strip()[:140]}")
                break
            e["submitted"] = True
            print(f"  submitted {e['slug']}")
            break
        # Persist after each
        QUEUE.write_text(json.dumps(data, indent=2))
        time.sleep(1)

    n_done = sum(1 for e in data["enemies"] if e.get("submitted"))
    print(f"\ntotal submitted: {n_done}/{len(data['enemies'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
