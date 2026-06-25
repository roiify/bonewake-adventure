#!/usr/bin/env python3
"""Fetch a pro hero character's animation frames from PixelLab and stitch
them into a horizontal strip in public/sprites/pixellab/heroes/pro/.

Usage:
    python3 stitch_pro_anims.py <slug> <animation_name> <pose_suffix> [direction]

e.g.  python3 stitch_pro_anims.py kengo breathing-idle idle east
writes  pro/kengo_idle.png  (N frames wide, frame size = character canvas)

Pro hero char ids come from hero_pro_queue.json (all on the kidbot account).
"""
import io
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path
from PIL import Image

QUEUE = Path(__file__).parent / "hero_pro_queue.json"
MCP = Path(__file__).parent / "pixellab_mcp.py"
PRO_DIR = Path(__file__).parent.parent / "public/sprites/pixellab/heroes/pro"
KEY = os.environ.get("PIXELLAB_KEY_KIDBOT", os.environ.get("PIXELLAB_KEY", ""))


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


def parse_animation_frames(text: str, anim_name: str, direction: str):
    """Find `  <anim_name> (<direction>, Nf) ...` followed by a frames: line."""
    lines = text.splitlines()
    for i, line in enumerate(lines):
        s = line.strip()
        if s.startswith(f"{anim_name} ({direction},") and i + 1 < len(lines):
            nxt = lines[i + 1].strip()
            if nxt.startswith("frames:"):
                urls = [u.strip() for u in nxt.split("frames:", 1)[1].split(",")]
                return [u for u in urls if u.startswith("http")]
    return None


def main() -> int:
    if len(sys.argv) < 4:
        print(__doc__)
        return 1
    slug, anim_name, pose = sys.argv[1], sys.argv[2], sys.argv[3]
    direction = sys.argv[4] if len(sys.argv) > 4 else "east"

    data = json.loads(QUEUE.read_text())
    entry = next((h for h in data["submitted"] if h["slug"] == slug), None)
    if not entry:
        print(f"no pro char for slug {slug}")
        return 1

    info = get_info(entry["char_id"])
    urls = parse_animation_frames(info, anim_name, direction)
    if not urls:
        print(f"MISS {slug} {anim_name} {direction} — not (yet) on character")
        return 2

    frames = [fetch_url(u) for u in urls]
    w = max(f.width for f in frames)
    h = max(f.height for f in frames)
    out = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.paste(f, (i * w, 0))
    target = PRO_DIR / f"{slug}_{pose}.png"
    out.save(target, "PNG", optimize=True)
    print(f"ok {slug} {anim_name}({direction}) {len(frames)}f @{w}x{h} -> {target.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
