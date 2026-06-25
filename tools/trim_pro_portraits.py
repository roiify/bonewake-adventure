#!/usr/bin/env python3
"""Trim transparent margins from pro/*_south.png so portraits scale consistently.

South sprites are portrait-only (battle uses east). Tight crop = the character
fills more of the card via object-contain, so all heroes display at the same
visible scale.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "sprites" / "pixellab" / "heroes" / "pro"

for png in sorted(SRC.glob("*_south.png")):
    img = Image.open(png).convert("RGBA")
    bbox = img.getbbox()
    if not bbox:
        print(f"skip (empty): {png.name}")
        continue
    cropped = img.crop(bbox)
    cropped.save(png)
    print(f"{png.name}: {img.size} -> {cropped.size}")
