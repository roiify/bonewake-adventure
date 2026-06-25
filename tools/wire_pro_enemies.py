#!/usr/bin/env python3
"""Repoint ENEMY_SPRITES entries in src/data/heroes.ts to pro pixel art.

For each slug we have a generated pro sprite, replace its entire line in
ENEMY_SPRITES with a single-frame static (cols:1 rows:1) pointing at
sprites/pixellab/enemies/pro/<slug>_west.png (in-battle, enemies face west)
and <slug>_south.png (portrait).
"""
import re
from pathlib import Path

# Slugs to repoint = every slug with a *_west.png in pro/.
ROOT = Path(__file__).resolve().parent.parent
PRO_DIR = ROOT / "public" / "sprites" / "pixellab" / "enemies" / "pro"
slugs = sorted({p.stem.rsplit("_west", 1)[0] for p in PRO_DIR.glob("*_west.png")})

heroes_ts = ROOT / "src" / "data" / "heroes.ts"
text = heroes_ts.read_text()

# Find the ENEMY_SPRITES block to constrain edits.
m = re.search(r"(export const ENEMY_SPRITES.*?)\n^};", text, re.S | re.M)
assert m, "could not find ENEMY_SPRITES block"
block_start, block_end = m.start(1), m.end(1)
block = text[block_start:block_end]

def pro_line(slug: str) -> str:
    base = f"sprites/pixellab/enemies/pro/{slug}"
    west = f"A('{base}_west.png')"
    south = f"A('{base}_south.png')"
    return (
        f"  {slug}: {{ idle: {west}, attack: {west}, skill: {west}, "
        f"hit: {west}, death: {west}, portrait: {south}, cols: 1, rows: 1 }},"
    )

repointed, skipped, missing = [], [], []
for slug in slugs:
    # Net-new enemies are already wired to pro paths — skip them.
    already_re = rf"^  {re.escape(slug)}:\s*\{{[^\n]*sprites/pixellab/enemies/pro/"
    if re.search(already_re, block, re.M):
        skipped.append(slug)
        continue
    line_re = rf"^  {re.escape(slug)}:\s*\{{[^\n]*\}}\s*,?\s*$"
    if not re.search(line_re, block, re.M):
        missing.append(slug)
        continue
    block = re.sub(line_re, pro_line(slug), block, count=1, flags=re.M)
    repointed.append(slug)

text = text[:block_start] + block + text[block_end:]
heroes_ts.write_text(text)
print(f"repointed: {len(repointed)}")
for s in repointed: print(f"  ~ {s}")
print(f"already pro (skipped): {len(skipped)}")
print(f"not found in ENEMY_SPRITES: {len(missing)}")
for s in missing: print(f"  ! {s}")
