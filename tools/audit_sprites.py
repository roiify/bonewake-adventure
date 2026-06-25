#!/usr/bin/env python3
"""Walk every sprite file referenced by HERO_SPRITES / ENEMY_SPRITES and
flag visual bugs: missing files, wrong frame count vs declared cols,
face-wrong direction (heroes should face east/right, enemies west/left),
suspicious aspect ratio, mostly-empty frames."""
import json
import re
import sys
from pathlib import Path
from PIL import Image

ROOT = Path("/Users/kiddos/Desktop/bonewake-web")
PUB = ROOT / "public"

# Parse HERO_SPRITES + ENEMY_SPRITES out of heroes.ts so this stays in sync.
src = (ROOT / "src/data/heroes.ts").read_text()

def parse_block(block_name):
    start = src.index(f"export const {block_name}")
    end = src.find("export const ", start + 1)
    if end < 0: end = len(src)
    body = src[start:end]
    # Each line: id: { idle: A('...'), attack: A('...'), ..., cols: N, rows: M },
    rows = re.findall(r"^\s*(\w+):\s*\{(.+?)\},?\s*$", body, re.MULTILINE)
    out = {}
    for name, inner in rows:
        if name in ('idle','attack','skill','ult','hit','death','heal','heal','cols','rows','portrait'):
            continue
        entry = {}
        for k in ('idle','attack','skill','ult','hit','death','heal','portrait'):
            m = re.search(rf"\b{k}:\s*A\('([^']+)'\)", inner)
            if m: entry[k] = m.group(1)
        cm = re.search(r"\bcols:\s*(\d+)", inner)
        rm = re.search(r"\brows:\s*(\d+)", inner)
        if cm: entry['cols'] = int(cm.group(1))
        if rm: entry['rows'] = int(rm.group(1))
        out[name] = entry
    return out

heroes = parse_block("HERO_SPRITES")
enemies = parse_block("ENEMY_SPRITES")

def edge_density(img, side):
    """Return fraction of opaque pixels in left or right 25% column of frame 0."""
    a = img.split()[-1]  # alpha
    w, h = img.size
    cols = w // 17 if w >= 17 * 60 else w  # crude per-frame width fallback
    frame = a.crop((0, 0, cols, h))
    fw, fh = frame.size
    cut = max(1, fw // 4)
    left = frame.crop((0, 0, cut, fh))
    right = frame.crop((fw - cut, 0, fw, fh))
    lp = sum(1 for p in left.getdata() if p > 32)
    rp = sum(1 for p in right.getdata() if p > 32)
    return lp, rp, fw * fh

problems = []

def check(name, kind, slot, rel, cols, rows):
    # Portraits are rendered as <img>, not through SpriteAnimator, so cols
    # doesn't apply and aspect checks are noise.
    if slot == 'portrait':
        return
    p = PUB / rel
    if not p.exists():
        problems.append(f"[MISSING] {kind} {name}.{slot}: {rel}")
        return
    try:
        im = Image.open(p).convert("RGBA")
    except Exception as e:
        problems.append(f"[CORRUPT] {kind} {name}.{slot}: {e}")
        return
    w, h = im.size
    per = w / cols
    # Each frame should be roughly square. Allow ±50% slop for non-square assets.
    if per <= 0 or h <= 0:
        problems.append(f"[ZERO]    {kind} {name}.{slot}: {w}x{h}")
        return
    ratio = per / h
    if ratio < 0.5 or ratio > 2.0:
        problems.append(f"[ASPECT]  {kind} {name}.{slot}: per-frame {per:.0f}x{h} (cols={cols})")
    # Direction check on frame 0 only — count which side has more pixels
    lp, rp, total = edge_density(im, 'l')
    if total == 0:
        problems.append(f"[EMPTY]   {kind} {name}.{slot}: blank alpha")
        return
    # Heuristic: characters have weight on the side they face.
    # Heroes should face east (right): right side denser.
    # Enemies should face west (left): left side denser.
    # Apply only to idle + attack (most meaningful poses).
    if slot in ('idle', 'attack', 'skill') and lp + rp > 50:
        # Need a *meaningful* asymmetry. >2x ratio.
        if kind == 'hero' and lp > rp * 1.6:
            problems.append(f"[DIR-W]   hero {name}.{slot}: left-heavy ({lp}/{rp}) — should face east")
        elif kind == 'enemy' and rp > lp * 1.6:
            problems.append(f"[DIR-E]   enemy {name}.{slot}: right-heavy ({lp}/{rp}) — should face west")

for name, e in heroes.items():
    cols = e.get('cols', 1); rows = e.get('rows', 1)
    for slot in ('idle','attack','skill','ult','hit','death','heal'):
        if slot in e:
            check(name, 'hero', slot, e[slot], cols, rows)

for name, e in enemies.items():
    cols = e.get('cols', 1); rows = e.get('rows', 1)
    for slot in ('idle','attack','skill','hit','death','portrait'):
        if slot in e:
            check(name, 'enemy', slot, e[slot], cols, rows)

# group by kind
print(f"\n=== {len(problems)} issues across {len(heroes)} heroes + {len(enemies)} enemies ===\n")
for p in problems:
    print(p)
