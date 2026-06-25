#!/usr/bin/env python3
"""Download every enemy's attack_west + hit_west animation, stitch each
into a horizontal sprite strip padded to TARGET_COLS, and write to the
game's enemy sprite directory.

Also pads each enemy's idle from a single static frame to TARGET_COLS so
the ENEMY_SPRITES entry can use one uniform cols value.
"""
import io
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path
from PIL import Image

TARGET_COLS = 17  # v3 16-frame attack returns 17 frames. Pad shorter anims with last-frame hold.
QUEUE = Path(__file__).parent / "enemy_anim_queue.json"
MCP = Path(__file__).parent / "pixellab_mcp.py"
GAME_SPRITES = Path("/Users/kiddos/Desktop/bonewake-web/public/sprites/echoes/enemies")


def fetch_url(u: str) -> Image.Image:
    req = urllib.request.Request(u, headers={"User-Agent": "bonewake-stitch/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGBA")


def stitch_to(target_path: Path, frames: list[Image.Image]):
    """Pad/truncate frames to TARGET_COLS and write horizontally."""
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


def pad_static_to(target_path: Path, source_image: Image.Image):
    w, h = source_image.size
    strip = Image.new("RGBA", (w * TARGET_COLS, h), (0, 0, 0, 0))
    for i in range(TARGET_COLS):
        strip.paste(source_image, (i * w, 0))
    strip.save(target_path, "PNG", optimize=True)


def get_char_info(char_id: str) -> str:
    """Returns the full text output of get_character (raw MCP response)."""
    return subprocess.run(
        ["python3", str(MCP), "get_character", json.dumps({"character_id": char_id, "include_preview": False})],
        capture_output=True, text=True, env=os.environ, timeout=30,
    ).stdout


def parse_animations(text: str) -> dict[str, list[str]]:
    """Pull animation name -> list of frame URLs out of the get_character text."""
    out: dict[str, list[str]] = {}
    current = None
    for line in text.splitlines():
        if line.startswith("  ") and " (" in line and not line.strip().startswith("frames:"):
            name = line.split(" (")[0].strip()
            current = name
            out[current] = []
        elif current and line.lstrip().startswith("frames:"):
            urls = [u.strip() for u in line.split("frames:", 1)[1].split(",")]
            out[current] = [u for u in urls if u.startswith("http")]
            current = None
    return out


def main() -> int:
    if not os.environ.get("PIXELLAB_KEY"):
        print("set PIXELLAB_KEY", file=sys.stderr); return 1
    data = json.loads(QUEUE.read_text())
    stitched_attack = 0
    stitched_hit = 0
    missing = []
    for e in data["enemies"]:
        slug, cid = e["slug"], e["id"]
        info = get_char_info(cid)
        anims = parse_animations(info)
        # Find attack_west (v3 custom) and hit_west (taking-punch template alias)
        attack_urls = anims.get("attack_west") or anims.get("attack_punch_west")  # shambler test alias
        hit_urls = anims.get("hit_west") or anims.get("taking-punch")
        if attack_urls:
            frames = [fetch_url(u) for u in attack_urls]
            stitch_to(GAME_SPRITES / f"{slug}_attack.png", frames)
            stitched_attack += 1
            print(f"  attack {slug}: {len(attack_urls)} → {TARGET_COLS}")
        else:
            missing.append((slug, "attack_west"))
            print(f"  MISS attack {slug}")
        if hit_urls:
            frames = [fetch_url(u) for u in hit_urls]
            stitch_to(GAME_SPRITES / f"{slug}_hit.png", frames)
            stitched_hit += 1
            print(f"  hit    {slug}: {len(hit_urls)} → {TARGET_COLS}")
        else:
            missing.append((slug, "hit_west"))
            print(f"  MISS hit {slug}")
        # Pad idle from single existing static frame
        idle_path = GAME_SPRITES / f"{slug}_idle.png"
        if idle_path.exists():
            img = Image.open(idle_path).convert("RGBA")
            # If already padded (width > height by lots), skip
            if img.width <= img.height * 2:
                pad_static_to(idle_path, img)
                print(f"  idle   {slug}: padded to {TARGET_COLS}")
    print(f"\nattacks: {stitched_attack}/44 hits: {stitched_hit}/44 missing: {len(missing)}")
    for s, k in missing[:20]:
        print(f"  - {s} ({k})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
