#!/usr/bin/env python3
"""Wire generated pro animation strips into HERO_SPRITES in heroes.ts.

For each hero slug, if pro/{slug}_idle.png / {slug}_death.png /
{slug}_attack.png exist, point that pose at the strip and set
idleCols/deathCols/attackCols from the image dimensions (cols = width/height).
Poses without a strip keep the single-frame base. Idempotent.
"""
import json
import re
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent.parent
HEROES_TS = ROOT / "src/data/heroes.ts"
PRO_DIR = ROOT / "public/sprites/pixellab/heroes/pro"
QUEUE = Path(__file__).parent / "hero_pro_queue.json"
POSES = [("idle", "idleCols"), ("attack", "attackCols"), ("ult", "ultCols"), ("hit", "hitCols")]


def cols_of(p: Path) -> int:
    im = Image.open(p)
    if im.height == 0 or im.width % im.height:
        print(f"  WARN {p.name}: {im.width}x{im.height} not an even strip")
    return max(1, round(im.width / im.height))


def main() -> int:
    src = HEROES_TS.read_text()
    slugs = [h["slug"] for h in json.loads(QUEUE.read_text())["submitted"]]
    changed = 0
    for slug in slugs:
        # Match this hero's one-line HERO_SPRITES entry.
        m = re.search(rf"^(  {slug}:\s+\{{.*\}},)$", src, re.M)
        if not m:
            print(f"  MISS entry for {slug}")
            continue
        line = orig = m.group(1)
        for pose, colsKey in POSES:
            strip = PRO_DIR / f"{slug}_{pose}.png"
            if not strip.exists():
                continue
            n = cols_of(strip)
            rel = f"sprites/pixellab/heroes/pro/{slug}_{pose}.png"
            # Point the pose at the strip.
            line = re.sub(rf"{pose}: A\('[^']*'\)", f"{pose}: A('{rel}')", line)
            # Set or update the cols override.
            if re.search(rf"{colsKey}: \d+", line):
                line = re.sub(rf"{colsKey}: \d+", f"{colsKey}: {n}", line)
            else:
                line = line[: line.rindex(" }")] + f", {colsKey}: {n}" + line[line.rindex(" }"):]
        if line != orig:
            src = src.replace(orig, line)
            changed += 1
            print(f"  wired {slug}")
    HEROES_TS.write_text(src)
    print(f"updated {changed} heroes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
