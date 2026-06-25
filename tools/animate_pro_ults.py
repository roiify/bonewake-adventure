#!/usr/bin/env python3
"""Submit v3 custom ULT animations (east, 8 frames) for every pro hero.

Each description matches the hero's actual ultimate from data/skills.ts.
Same worker pattern as animate_pro_attacks.py.
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

PRO_QUEUE = Path(__file__).parent / "hero_pro_queue.json"
MCP = Path(__file__).parent / "pixellab_mcp.py"
KEY = os.environ.get("PIXELLAB_KEY_KIDBOT", "")
STYLE = ". gritty mature dark fantasy gory survival horror, character stays in place no walking, dramatic ultimate attack, east-facing."

ULTS = {
    "luna":           "priestess raises chalice overhead, radiant golden healing light bursts upward around her",
    "elara":          "plague archer draws bow skyward and looses a volley of arrows arcing east",
    "aelia":          "frost witch slams staff down, giant ice crystals erupt and shatter forward",
    "kengo":          "pit fighter winds up and delivers a devastating iron palm strike east, shockwave burst",
    "len":            "assassin blurs into shadow and unleashes a flurry of dagger slashes, blade streaks east",
    "kaius":          "fallen paladin raises sword to the sky, holy light beams down, massive overhead slash east",
    "pyra":           "pyromancer summons a swirling inferno and unleashes a massive fire blast east",
    "korvan":         "soul reaper spins massive scythe in a full circle harvest arc, dark energy trail",
    "george":         "wild shaman transforms into a massive bear rearing up and slamming both paws down",
    "manny":          "death caller raises both arms, skeletal hands erupt from the ground, dark necrotic explosion",
    "chino":          "drunken brawler staggers back then explodes forward with a reckless glowing palm strike east",
    "reiji":          "samurai draws both katanas and performs a cross slash, white and black blade arcs east",
    "twins":          "twin warriors spin back to back unleashing a yin yang energy burst outward",
    "bone_king":      "bone king raises scepter high and slams an executioner blow, bone shards exploding",
    "lich_sovereign": "lich sovereign unleashes a massive beam of necrotic death magic from staff east",
}


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
    pro = json.loads(PRO_QUEUE.read_text())["submitted"]
    ok, err = [], []
    for h in pro:
        desc = ULTS.get(h["slug"])
        if not desc:
            print(f"  no ult description for {h['slug']}, skipping")
            continue
        args = {
            "character_id": h["char_id"],
            "action_description": desc + STYLE,
            "animation_name": "ult_east",
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
