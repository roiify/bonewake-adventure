#!/usr/bin/env python3
"""Fetch + stitch each hero's attack_east animation (16/17 frames) into
the game's hero sprite directory at uniform TARGET_COLS.
"""
import io
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path
from PIL import Image

TARGET_COLS = 17
QUEUE = Path(__file__).parent / "hero_anim_queue.json"
MCP = Path(__file__).parent / "pixellab_mcp.py"
HERO_DIR = Path("/Users/kiddos/Desktop/bonewake-web/public/sprites/pixellab/heroes")
KEYS = {
    "kidbot": os.environ.get("PIXELLAB_KEY_KIDBOT", ""),
    "rolfi":  os.environ.get("PIXELLAB_KEY_ROLFI",  os.environ.get("PIXELLAB_API_KEY", "")),
}


def fetch_url(u: str) -> Image.Image:
    req = urllib.request.Request(u, headers={"User-Agent": "bonewake-stitch/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGBA")


def stitch_to(target_path: Path, frames):
    if not frames:
        return False
    if len(frames) < TARGET_COLS:
        frames = frames + [frames[-1]] * (TARGET_COLS - len(frames))
    elif len(frames) > TARGET_COLS:
        frames = frames[:TARGET_COLS]
    w = max(f.width for f in frames)
    h = max(f.height for f in frames)
    out = Image.new("RGBA", (w * TARGET_COLS, h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.paste(f, (i * w, 0))
    out.save(target_path, "PNG", optimize=True)
    return True


def get_info(cid: str, key: str) -> str:
    env = dict(os.environ); env["PIXELLAB_KEY"] = key
    return subprocess.run(
        ["python3", str(MCP), "get_character", json.dumps({"character_id": cid, "include_preview": False})],
        capture_output=True, text=True, env=env, timeout=30,
    ).stdout


def parse_animations(text: str):
    out, cur = {}, None
    for line in text.splitlines():
        if line.startswith("  ") and " (" in line and not line.strip().startswith("frames:"):
            cur = line.split(" (")[0].strip()
            out[cur] = []
        elif cur and line.lstrip().startswith("frames:"):
            urls = [u.strip() for u in line.split("frames:", 1)[1].split(",")]
            out[cur] = [u for u in urls if u.startswith("http")]
            cur = None
    return out


def file_slug(slug: str) -> str:
    """Some heroes have versioned files (e.g. reiji_v1_attack.png)."""
    versioned = {"reiji": "reiji_v1", "bone_king": "bone_king_v1"}
    return versioned.get(slug, slug)


def main() -> int:
    data = json.loads(QUEUE.read_text())
    ok, miss = [], []
    for h in data["heroes"]:
        info = get_info(h["id"], KEYS[h["account"]])
        anims = parse_animations(info)
        urls = anims.get("attack_east")
        if not urls:
            miss.append(h["slug"]); print(f"  MISS {h['slug']}"); continue
        frames = [fetch_url(u) for u in urls]
        target = HERO_DIR / f"{file_slug(h['slug'])}_attack.png"
        stitch_to(target, frames)
        ok.append(h["slug"])
        print(f"  ok {h['slug']:18s} {len(urls)} → {TARGET_COLS}f → {target.name}")
    print(f"\nstitched: {len(ok)}/{len(data['heroes'])} missing: {miss}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
