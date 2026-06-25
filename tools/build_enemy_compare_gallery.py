#!/usr/bin/env python3
"""3-panel OLD vs NEW gallery for the pro-enemy overlap.

For each enemy in the queue:
  [OLD shipping idle — first frame of the 17-frame echoes strip]
  [NEW IN-BATTLE (west rotation — enemies face west)]
  [NEW reference (east rotation)]

Old strips are served from the running Vite dev server at http://localhost:5173/.
New rotations come from PixelLab via tools/pixellab_mcp.py.

Usage:
    PIXELLAB_KEY=... python3 tools/build_enemy_compare_gallery.py <queue.json> <out.html>
"""
import concurrent.futures
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
PIXELLAB_MCP = ROOT / "pixellab_mcp.py"
DEV_BASE = "http://localhost:5173/"
# Slugs in the queue may differ from in-game ENEMY_SPRITES keys.
SLUG_MAP = {"plague_doctor_undead": "plague_doctor"}


def fetch_rotations(item: dict) -> dict:
    out = subprocess.run(
        ['python3', str(PIXELLAB_MCP), 'get_character',
         json.dumps({'character_id': item['char_id'], 'include_preview': False})],
        capture_output=True, text=True, env=os.environ, timeout=45,
    ).stdout
    rotations: dict[str, str] = {}
    status = '?'
    for line in out.splitlines():
        s = line.strip()
        if s.startswith('status:'):
            status = s.split(':', 1)[1].strip()
        for d in ('south-east', 'north-east', 'north-west', 'south-west', 'south', 'east', 'north', 'west'):
            if s.startswith(f"{d}: https"):
                rotations[d] = s.split(': ', 1)[1].strip()
                break
    return {'slug': item['slug'], 'rotations': rotations, 'status': status}


def build_html(records: list, title: str) -> str:
    cards = []
    for r in records:
        slug = r['slug']
        game_slug = SLUG_MAP.get(slug, slug)
        rots = r['rotations']
        old = f"{DEV_BASE}sprites/echoes/enemies/{game_slug}_idle.png"
        new_battle = rots.get('west', '')
        new_ref = rots.get('east', '')
        cards.append(f"""
    <div class="card">
      <div class="title"><code>{slug}</code>{' <span class="mapped">→ ' + game_slug + '</span>' if slug != game_slug else ''}</div>
      <div class="panels">
        <div class="panel old">
          <div class="ph">OLD (echoes strip, frame 1)</div>
          <div class="old-clip"><img src="{old}" alt="{slug}-old"></div>
          <div class="sub">currently in-game</div>
        </div>
        <div class="panel battle">
          <div class="ph">NEW IN-BATTLE (west)</div>
          <img src="{new_battle}" alt="{slug}-new">
          <div class="sub">← faces left</div>
        </div>
        <div class="panel">
          <div class="ph">NEW east (ref)</div>
          <img src="{new_ref}" alt="{slug}-ref">
          <div class="sub">opposite rotation</div>
        </div>
      </div>
    </div>""")

    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>{title}</title>
<style>
  body {{ margin:0; background:#0b0f1a; color:#e2e8f0; font:14px ui-sans-serif,system-ui,sans-serif; padding:16px; }}
  h1 {{ font-size:22px; color:#f59e0b; margin:0 0 4px; }}
  .meta {{ color:#94a3b8; margin-bottom:16px; font-size:13px; }}
  .card {{ margin-bottom:14px; padding:12px; background:#0f172a; border:1px solid #1f2937; border-radius:6px; }}
  .title {{ margin-bottom:8px; }}
  .title code {{ color:#22d3ee; font-size:14px; font-weight:600; }}
  .title .mapped {{ color:#64748b; font-size:12px; margin-left:4px; }}
  .panels {{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }}
  .panel {{ background:#000; padding:10px; border:1px solid #1f2937; border-radius:4px; text-align:center; min-height:240px; display:flex; flex-direction:column; }}
  .panel.old {{ border-color:#64748b; }}
  .panel.battle {{ border-color:#f59e0b; }}
  .ph {{ font-size:11px; color:#94a3b8; margin-bottom:6px; font-weight:600; letter-spacing:0.5px; }}
  .panel.old .ph {{ color:#94a3b8; }}
  .panel.battle .ph {{ color:#f59e0b; }}
  .panel img {{ image-rendering:pixelated; max-width:200px; width:100%; height:auto; margin:auto; }}
  /* OLD enemies are wide horizontal 17-frame strips. Clip to leftmost square
     so we display just the idle (frame 0) at the same visual scale as the new. */
  .old-clip {{ width:200px; aspect-ratio:1/1; overflow:hidden; margin:auto; display:flex; align-items:center; justify-content:center; }}
  .old-clip img {{ height:100%; width:auto; max-width:none; object-fit:none; object-position:left center; }}
  .sub {{ font-size:10px; color:#64748b; margin-top:4px; }}
</style></head>
<body>
  <h1>{title}</h1>
  <div class="meta">{len(records)} enemies. Left = what's currently shipping. Middle (orange) = the new pro sprite that'll replace it. Right = opposite rotation for reference.</div>
  {''.join(cards)}
</body></html>"""


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    queue_path, out_path = Path(sys.argv[1]), Path(sys.argv[2])
    if not queue_path.is_absolute():
        queue_path = ROOT / queue_path

    queue = json.loads(queue_path.read_text())
    chars = queue['submitted']
    print(f"fetching {len(chars)} from PixelLab...")

    records: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        for rec in ex.map(fetch_rotations, chars):
            records.append(rec)
            mark = '✓' if rec['status'] == 'completed' else f"({rec['status']})"
            print(f"  {rec['slug']:25} {mark}")

    title = f"{queue_path.stem} — OLD vs NEW (enemies)"
    out_path.write_text(build_html(records, title))
    print(f"wrote {out_path}")
    subprocess.run(['open', '-a', 'Google Chrome', str(out_path)], check=False)
    return 0


if __name__ == '__main__':
    sys.exit(main())
