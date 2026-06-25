#!/usr/bin/env python3
"""Submit v3 custom attack animations (east, 8 frames) for every pro hero.

Reuses the per-hero attack action descriptions from hero_anim_queue.json
(written for the old 124px cast) against the pro character ids from
hero_pro_queue.json. 8 frames keeps the largest canvases (240px) inside
the v3 frame budget.
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

OLD_QUEUE = Path(__file__).parent / "hero_anim_queue.json"
PRO_QUEUE = Path(__file__).parent / "hero_pro_queue.json"
MCP = Path(__file__).parent / "pixellab_mcp.py"
KEY = os.environ.get("PIXELLAB_KEY_KIDBOT", "")


def call(tool: str, args: dict) -> str:
    env = dict(os.environ)
    env["PIXELLAB_KEY"] = KEY
    return subprocess.run(
        ["python3", str(MCP), tool, json.dumps(args)],
        capture_output=True, text=True, env=env, timeout=90,
    ).stdout


def is_rate_limit(s: str) -> bool:
    s = s.lower()
    return "rate limit" in s or "job slots" in s or "8/8 used" in s


def main() -> int:
    old = json.loads(OLD_QUEUE.read_text())
    style = old["style_suffix"]
    desc_by_slug = {h["slug"]: h["attack"] for h in old["heroes"]}
    pro = json.loads(PRO_QUEUE.read_text())["submitted"]

    ok, err = [], []
    for h in pro:
        desc = desc_by_slug.get(h["slug"])
        if not desc:
            print(f"  no attack description for {h['slug']}, skipping")
            continue
        args = {
            "character_id": h["char_id"],
            "action_description": desc + style,
            "animation_name": "attack_east",
            "directions": ["east"],
            "frame_count": 8,
        }
        for attempt in range(30):
            out = call("animate_character", args)
            if is_rate_limit(out):
                print(f"  rate-limited on {h['slug']} (attempt {attempt+1}), waiting 30s", flush=True)
                time.sleep(30)
                continue
            if "error" in out.lower()[:200]:
                print(f"  ERR {h['slug']}: {out.strip()[:200]}", flush=True)
                err.append(h["slug"])
            else:
                print(f"  submitted {h['slug']}", flush=True)
                ok.append(h["slug"])
            break
        time.sleep(2)

    print(f"\ndone: {len(ok)} submitted, {len(err)} errors: {err}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
