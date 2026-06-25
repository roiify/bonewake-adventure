#!/usr/bin/env python3
"""Pad every hero's idle/hit/death/skill (when still a 43-frame template)
to a 17-frame strip of frame 0 (east-facing static). This matches the
cols=17 declared in HERO_SPRITES so SpriteAnimator renders correctly."""
import re
from pathlib import Path
from PIL import Image

TARGET_COLS = 17
ROOT = Path("/Users/kiddos/Desktop/bonewake-web/public/sprites/pixellab/heroes")
SRC = (Path(__file__).parent.parent / "src/data/heroes.ts").read_text()

# Pull unique file paths from HERO_SPRITES slot mappings.
start = SRC.index("export const HERO_SPRITES")
end = SRC.index("export const ENEMY_SPRITES", start)
block = SRC[start:end]
paths = set(re.findall(r"A\('sprites/pixellab/heroes/([^']+)'\)", block))

fixed = 0
skipped = 0
for rel in sorted(paths):
    p = ROOT.parent.parent / "sprites/pixellab/heroes" / rel
    # absolute path
    p = Path("/Users/kiddos/Desktop/bonewake-web/public/sprites/pixellab/heroes") / rel
    if not p.exists():
        print(f"  MISS {rel}"); continue
    im = Image.open(p).convert("RGBA")
    w, h = im.size
    # Skip if already a TARGET_COLS strip (per-frame ≈ h)
    per_now = w / TARGET_COLS
    if abs(per_now - h) < h * 0.25:  # within 25% of square
        skipped += 1
        continue
    # Crop frame 0 = first hxh square
    frame_w = h  # assume per-frame width equals height
    f0 = im.crop((0, 0, frame_w, h))
    strip = Image.new("RGBA", (frame_w * TARGET_COLS, h), (0, 0, 0, 0))
    for i in range(TARGET_COLS):
        strip.paste(f0, (i * frame_w, 0))
    strip.save(p, "PNG", optimize=True)
    fixed += 1
    print(f"  fixed {rel}: {w}x{h} → {strip.size}")

print(f"\nfixed: {fixed} skipped (already 17-col): {skipped}")
