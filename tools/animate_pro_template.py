#!/usr/bin/env python3
"""Submit a template animation (east only) for every pro hero character.

Usage: python3 animate_pro_template.py <template_animation_id> [skip_slug ...]

Pro hero char ids come from hero_pro_queue.json (all on kidbot account).
Rate limits (8 job slots) are retried with a 30s backoff, matching the
existing animate_hero_attacks.py worker pattern.
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

QUEUE = Path(__file__).parent / "hero_pro_queue.json"
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
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    template = sys.argv[1]
    skip = set(sys.argv[2:])
    data = json.loads(QUEUE.read_text())
    heroes = [h for h in data["submitted"] if h["slug"] not in skip]
    print(f"submitting {template} (east) for {len(heroes)} heroes")

    ok, err = [], []
    for h in heroes:
        args = {
            "character_id": h["char_id"],
            "template_animation_id": template,
            "directions": ["east"],
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
