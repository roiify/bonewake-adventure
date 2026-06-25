#!/usr/bin/env python3
"""Animate the enemy roster: breathing idle + attack + hit flinch, WEST-facing.

Merges every pro-enemy queue for slug -> char_id, skips painted bosses
(different art pipeline), skips animations a character already has, and
submits: breathing-idle template, v3 custom attack ("attack_west"), and
taking-punch template. Quadrupeds that reject a humanoid template fall
back to a v3 custom description.
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

TOOLS = Path(__file__).parent
MCP = TOOLS / "pixellab_mcp.py"
KEY = os.environ.get("PIXELLAB_KEY_KIDBOT", "")

PAINTED = {
    'bonewake_dragon', 'plague_hydra', 'rot_phoenix', 'bone_cerberus',
    'wraith_kraken', 'necro_sphinx', 'crimson_centaur',
    'lich_king', 'bone_titan', 'plague_doctor', 'plague_doctor_undead', 'ash_empress',
    'soul_reaper', 'voidlord', 'worm_god',
}

QUEUES = [
    "pro_enemy_queue.json", "pro_enemy_done_queue.json",
    "pro_enemy_extras_queue.json", "pro_enemy_overlap_queue.json",
]


def merged() -> dict:
    seen: dict[str, str] = {}
    for q in QUEUES:
        try:
            d = json.loads((TOOLS / q).read_text())
        except Exception:
            continue
        for e in d.get("submitted", []):
            seen[e["slug"]] = e["char_id"]
    return {s: c for s, c in seen.items() if s not in PAINTED}


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


def submit(args: dict, slug: str, label: str) -> bool:
    for attempt in range(40):
        out = call("animate_character", args)
        if is_rate_limit(out):
            time.sleep(30)
            continue
        if "error" in out.lower()[:200]:
            print(f"  ERR {slug} {label}: {out.strip()[:160]}", flush=True)
            return False
        print(f"  submitted {slug} {label}", flush=True)
        return True
    print(f"  GAVE UP {slug} {label} (rate limit)", flush=True)
    return False


def main() -> int:
    chars = merged()
    print(f"{len(chars)} enemies to animate", flush=True)
    for slug, cid in sorted(chars.items()):
        info = call("get_character", {"character_id": cid, "include_preview": False})
        have = info  # animation names appear verbatim in the listing
        # 1. idle — breathing template, west; v3 fallback for non-humanoids
        if "breathing-idle (west" not in have and "idle_west (west" not in have:
            ok = submit({"character_id": cid, "template_animation_id": "breathing-idle",
                         "directions": ["west"]}, slug, "idle")
            if not ok:
                submit({"character_id": cid, "action_description":
                        "breathing idly, subtle menacing sway, stays in place",
                        "animation_name": "idle_west", "directions": ["west"],
                        "frame_count": 4}, slug, "idle-v3")
        # 2. attack — v3 custom, west
        if "attack_west (west" not in have:
            submit({"character_id": cid, "action_description":
                    "lunges with a vicious strike toward the west, weapon or claws sweeping, "
                    "stays in place no walking, dark fantasy horror",
                    "animation_name": "attack_west", "directions": ["west"],
                    "frame_count": 8}, slug, "attack")
        # 3. hit flinch — taking-punch template, west; v3 fallback
        if "taking-punch (west" not in have and "hit_west (west" not in have:
            ok = submit({"character_id": cid, "template_animation_id": "taking-punch",
                         "directions": ["west"]}, slug, "hit")
            if not ok:
                submit({"character_id": cid, "action_description":
                        "recoils in pain from a heavy blow, staggers back, stays in place",
                        "animation_name": "hit_west", "directions": ["west"],
                        "frame_count": 4}, slug, "hit-v3")
        time.sleep(2)
    print("done submitting")
    return 0


if __name__ == "__main__":
    sys.exit(main())
