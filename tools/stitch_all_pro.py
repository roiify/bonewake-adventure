#!/usr/bin/env python3
"""Poll PixelLab for every pro hero's template animations and stitch each
completed one into a horizontal strip. Loops until all expected strips exist
(or MAX_MINUTES elapses). Skips strips that already exist on disk.

Expected per hero: breathing-idle -> {slug}_idle.png,
                   falling-back-death -> {slug}_death.png
"""
import io
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from PIL import Image

QUEUE = Path(__file__).parent / os.environ.get("STITCH_QUEUE", "hero_pro_queue.json")
MCP = Path(__file__).parent / "pixellab_mcp.py"
PRO_DIR = Path(__file__).parent.parent / os.environ.get("STITCH_OUT", "public/sprites/pixellab/heroes/pro")
KEY = os.environ.get("PIXELLAB_KEY_KIDBOT", "")
ANIMS = json.loads(os.environ.get(
    "STITCH_ANIMS",
    '{"breathing-idle": "idle", "falling-back-death": "death"}',
))
MAX_MINUTES = int(os.environ.get("MAX_MINUTES", "45"))


def fetch_url(u: str) -> Image.Image:
    req = urllib.request.Request(u, headers={"User-Agent": "bonewake-stitch/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGBA")


def get_info(cid: str) -> str:
    env = dict(os.environ)
    env["PIXELLAB_KEY"] = KEY
    return subprocess.run(
        ["python3", str(MCP), "get_character", json.dumps({"character_id": cid, "include_preview": False})],
        capture_output=True, text=True, env=env, timeout=30,
    ).stdout


DIRECTION = os.environ.get("STITCH_DIRECTION", "east")


def parse_animation_frames(text: str, anim_name: str, direction: str = DIRECTION):
    lines = text.splitlines()
    for i, line in enumerate(lines):
        s = line.strip()
        if s.startswith(f"{anim_name} ({direction},") and i + 1 < len(lines):
            nxt = lines[i + 1].strip()
            if nxt.startswith("frames:"):
                urls = [u.strip() for u in nxt.split("frames:", 1)[1].split(",")]
                return [u for u in urls if u.startswith("http")]
    return None


def stitch(slug: str, urls, pose: str) -> str:
    frames = [fetch_url(u) for u in urls]
    w = max(f.width for f in frames)
    h = max(f.height for f in frames)
    out = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.paste(f, (i * w, 0))
    target = PRO_DIR / f"{slug}_{pose}.png"
    out.save(target, "PNG", optimize=True)
    return f"{slug}_{pose}.png {len(frames)}f @{w}x{h}"


def main() -> int:
    data = json.loads(QUEUE.read_text())
    heroes = data["submitted"]
    want = {(h["slug"], pose) for h in heroes for pose in ANIMS.values()}
    deadline = time.time() + MAX_MINUTES * 60

    while time.time() < deadline:
        missing = [(s, p) for (s, p) in want if not (PRO_DIR / f"{s}_{p}.png").exists()]
        if not missing:
            print("ALL STRIPS DONE")
            return 0
        by_slug = {}
        for s, p in missing:
            by_slug.setdefault(s, []).append(p)
        for slug, poses in by_slug.items():
            h = next(x for x in heroes if x["slug"] == slug)
            try:
                info = get_info(h["char_id"])
            except Exception as e:  # noqa: BLE001 — transient network failure, retry next pass
                print(f"info fail {slug}: {e}", flush=True)
                continue
            for anim, pose in ANIMS.items():
                if pose not in poses:
                    continue
                urls = parse_animation_frames(info, anim)
                if urls:
                    try:
                        print("stitched " + stitch(slug, urls, pose), flush=True)
                    except Exception as e:  # noqa: BLE001 — log and retry next pass
                        print(f"stitch fail {slug}_{pose}: {e}", flush=True)
            time.sleep(1)
        time.sleep(45)

    left = [(s, p) for (s, p) in want if not (PRO_DIR / f"{s}_{p}.png").exists()]
    print(f"TIMEOUT, still missing: {left}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
