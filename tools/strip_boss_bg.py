#!/usr/bin/env python3
"""Strip the near-white backgrounds from the 14 painted boss PNGs in
public/sprites/bosses/. PixelLab returned them with off-white backdrops
even though we requested no_background=true; chroma-key them locally so
they composite cleanly onto the dark battlefield.

Algorithm:
  - For every pixel: if it's brighter than THRESHOLD and low-saturation
    (i.e. gray-white range), set alpha = 0.
  - Edge antialias: pixels close to threshold get partial alpha.
  - Preserves saturated colors (red blood, green pus, etc.) untouched.

In-place edit; keeps a .bak copy of each original so it's reversible.
"""
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Install Pillow first:  pip3 install Pillow", file=sys.stderr)
    sys.exit(1)

BOSS_DIR = Path(__file__).parent.parent / "public" / "sprites" / "bosses"

# Pixel is considered "background" when:
#   * brightness >= BRIGHTNESS_FULL  → fully transparent
#   * brightness in (BRIGHTNESS_SOFT, BRIGHTNESS_FULL) → partial alpha
#   * saturation < SAT_MAX (otherwise it's a real bright color we keep)
# Tighter pass — many bosses came back with mid-gray backdrops around
# brightness ~150. Walking the threshold down to 130 catches them but
# could nibble at dark armor highlights, so SAT_MAX stays low to keep
# real colors (red blood, green pus, brown leather) untouched.
BRIGHTNESS_FULL = 200
BRIGHTNESS_SOFT = 130
SAT_MAX = 28


def strip_one(path: Path) -> None:
    img = Image.open(path).convert("RGBA")
    px = img.load()
    w, h = img.size
    stripped = 0
    feathered = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            brightness = (r + g + b) / 3
            saturation = max(r, g, b) - min(r, g, b)
            if saturation < SAT_MAX:
                if brightness >= BRIGHTNESS_FULL:
                    px[x, y] = (r, g, b, 0)
                    stripped += 1
                elif brightness >= BRIGHTNESS_SOFT:
                    # Linear feather between soft and full
                    span = BRIGHTNESS_FULL - BRIGHTNESS_SOFT
                    t = (brightness - BRIGHTNESS_SOFT) / span
                    new_alpha = int(a * (1 - t))
                    if new_alpha < a:
                        px[x, y] = (r, g, b, new_alpha)
                        feathered += 1
    img.save(path)
    print(f"  {path.name}: stripped {stripped} px, feathered {feathered}", flush=True)


def main() -> int:
    if not BOSS_DIR.exists():
        print(f"missing {BOSS_DIR}", file=sys.stderr)
        return 1
    pngs = sorted(BOSS_DIR.glob("*_idle.png"))
    if not pngs:
        print(f"no *_idle.png in {BOSS_DIR}", file=sys.stderr)
        return 1
    print(f"processing {len(pngs)} bosses in {BOSS_DIR}")
    for p in pngs:
        # Skip if a .bak already exists AND original was already processed
        bak = p.with_suffix(".png.bak")
        if not bak.exists():
            # Take a backup once
            bak.write_bytes(p.read_bytes())
        strip_one(p)
    print("done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
