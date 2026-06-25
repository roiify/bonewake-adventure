#!/usr/bin/env python3
"""Wire generated enemy animation strips into ENEMY_SPRITES in heroes.ts.

For each enemy slug in enemy_all_chars.json, if enemies/pro/{slug}_idle.png /
_attack.png / _hit.png exist, point that pose at the strip and set
idleCols/attackCols/hitCols from image dimensions. Painted bosses are not in
the queue file, so they're untouched. Idempotent.
"""
import json
import re
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent.parent
HEROES_TS = ROOT / "src/data/heroes.ts"
PRO_DIR = ROOT / "public/sprites/pixellab/enemies/pro"
QUEUE = Path(__file__).parent / "enemy_all_chars.json"
POSES = [("idle", "idleCols"), ("attack", "attackCols"), ("hit", "hitCols")]


def cols_of(p: Path) -> int:
    im = Image.open(p)
    if im.height == 0 or im.width % im.height:
        print(f"  WARN {p.name}: {im.width}x{im.height} not an even strip")
    return max(1, round(im.width / im.height))


def main() -> int:
    src = HEROES_TS.read_text()
    slugs = [e["slug"] for e in json.loads(QUEUE.read_text())["submitted"]]
    changed = 0
    for slug in slugs:
        m = re.search(rf"^(  {slug}:\s+\{{ idle:.*\}},)$", src, re.M)
        if not m:
            print(f"  MISS entry for {slug}")
            continue
        line = orig = m.group(1)
        for pose, colsKey in POSES:
            strip = PRO_DIR / f"{slug}_{pose}.png"
            if not strip.exists():
                continue
            n = cols_of(strip)
            rel = f"sprites/pixellab/enemies/pro/{slug}_{pose}.png"
            line = re.sub(rf"\b{pose}: A\('[^']*'\)", f"{pose}: A('{rel}')", line)
            if re.search(rf"{colsKey}: \d+", line):
                line = re.sub(rf"{colsKey}: \d+", f"{colsKey}: {n}", line)
            else:
                line = line[: line.rindex(" }")] + f", {colsKey}: {n}" + line[line.rindex(" }"):]
        if line != orig:
            src = src.replace(orig, line)
            changed += 1
            print(f"  wired {slug}")
    HEROES_TS.write_text(src)
    print(f"updated {changed} enemies")
    return 0


if __name__ == "__main__":
    sys.exit(main())
