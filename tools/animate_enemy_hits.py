#!/usr/bin/env python3
"""Submit `taking-punch` template hit animations for every enemy (west)."""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

QUEUE = Path(__file__).parent / "enemy_anim_queue.json"
MCP = Path(__file__).parent / "pixellab_mcp.py"


def call(tool: str, args: dict) -> str:
    return subprocess.run(
        ["python3", str(MCP), tool, json.dumps(args)],
        capture_output=True, text=True, env=os.environ, timeout=60,
    ).stdout


def main() -> int:
    if not os.environ.get("PIXELLAB_KEY"):
        print("set PIXELLAB_KEY", file=sys.stderr); return 1
    data = json.loads(QUEUE.read_text())
    pending = [e for e in data["enemies"] if not e.get("hit_submitted")]
    print(f"to submit (hit): {len(pending)} / {len(data['enemies'])}")

    def is_rate_limit(s: str) -> bool:
        s = s.lower()
        return "rate limit" in s or "job slots" in s or "8/8 used" in s

    for e in pending:
        args = {
            "character_id": e["id"],
            "template_animation_id": "taking-punch",
            "animation_name": "hit_west",
            "directions": ["west"],
        }
        for attempt in range(20):
            out = call("animate_character", args)
            if is_rate_limit(out):
                print(f"  rate-limited on {e['slug']} (attempt {attempt+1}), waiting 30s")
                time.sleep(30)
                continue
            if "error:" in out.lower():
                print(f"  ERR {e['slug']}: {out.strip()[:140]}")
                break
            e["hit_submitted"] = True
            print(f"  submitted hit {e['slug']}")
            break
        QUEUE.write_text(json.dumps(data, indent=2))
        time.sleep(1)

    n = sum(1 for e in data["enemies"] if e.get("hit_submitted"))
    print(f"\ntotal hit submitted: {n}/{len(data['enemies'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
