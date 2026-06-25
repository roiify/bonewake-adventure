#!/usr/bin/env python3
"""Build the standard Bonewake direction-check gallery for a set of PixelLab
characters, then open it in Chrome.

Usage:
    PIXELLAB_KEY=... python3 tools/build_gallery.py <queue.json> <out.html> [--facing heroes|enemies]

The queue file must have a top-level "submitted" list of {slug, char_id}.
--facing heroes  → in-battle panel = EAST rotation (heroes face east in battle)
--facing enemies → in-battle panel = WEST rotation (default; enemies face west)
"""
import concurrent.futures
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
PIXELLAB_MCP = ROOT / "pixellab_mcp.py"


def fetch(item: dict) -> dict:
    # Per-entry "account" overrides PIXELLAB_KEY (chars may live on different
    # PixelLab accounts — e.g. when one runs out of credits and we resubmit
    # on a different one). Falls back to the ambient PIXELLAB_KEY.
    env = os.environ.copy()
    if item.get('account') and env.get(item['account']):
        env['PIXELLAB_KEY'] = env[item['account']]
    out = subprocess.run(
        ['/opt/homebrew/bin/python3.12', str(PIXELLAB_MCP), 'get_character',
         json.dumps({'character_id': item['char_id'], 'include_preview': False})],
        capture_output=True, text=True, env=env, timeout=45,
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
    return {'slug': item['slug'], 'cid': item['char_id'], 'rotations': rotations, 'status': status}


def build_html(records: list, facing: str, title: str) -> str:
    in_battle_key = 'east' if facing == 'heroes' else 'west'
    ref_key = 'west' if facing == 'heroes' else 'east'
    in_battle_label = 'IN-BATTLE (east rotation)' if facing == 'heroes' else 'IN-BATTLE (west rotation)'
    ref_label = 'west rotation (ref)' if facing == 'heroes' else 'east rotation (ref)'
    arrow = '→ should face RIGHT' if facing == 'heroes' else '← should face LEFT'

    cards = []
    for r in records:
        slug = r['slug']
        rots = r['rotations']
        battle = rots.get(in_battle_key, '')
        ref = rots.get(ref_key, '')
        cards.append(f"""
    <div class="card">
      <div class="title"><code>{slug}</code></div>
      <div class="panels">
        <div class="panel battle">
          <div class="ph">{in_battle_label}</div>
          <img src="{battle}" alt="{slug}">
          <div class="sub">{arrow}</div>
        </div>
        <div class="panel">
          <div class="ph">{ref_label}</div>
          <img src="{ref}" alt="{slug}">
          <div class="sub">as PixelLab drew it</div>
        </div>
      </div>
    </div>""")

    rule_face = 'EAST (right, →)' if facing == 'heroes' else 'WEST (left, ←)'
    side = 'left' if facing == 'heroes' else 'right'

    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>{title}</title>
<style>
  body {{ margin:0; background:#0b0f1a; color:#e2e8f0; font:14px ui-sans-serif,system-ui,sans-serif; padding:16px; }}
  h1 {{ font-size:22px; color:#f59e0b; margin:0 0 4px; }}
  .meta {{ color:#94a3b8; margin-bottom:16px; font-size:13px; }}
  .rule {{ background:#1f2937; border-left:3px solid #22c55e; padding:8px 12px; margin-bottom:16px; font-size:13px; }}
  .card {{ margin-bottom:14px; padding:12px; background:#0f172a; border:1px solid #1f2937; border-radius:6px; }}
  .title {{ margin-bottom:8px; }}
  .title code {{ color:#22d3ee; font-size:14px; font-weight:600; }}
  .panels {{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }}
  .panel {{ background:#000; padding:10px; border:1px solid #1f2937; border-radius:4px; text-align:center; }}
  .panel.battle {{ border-color:#f59e0b; }}
  .ph {{ font-size:11px; color:#94a3b8; margin-bottom:6px; font-weight:600; letter-spacing:0.5px; }}
  .panel.battle .ph {{ color:#f59e0b; }}
  .panel img {{ image-rendering:pixelated; max-width:200px; width:100%; height:auto; }}
  .sub {{ font-size:10px; color:#64748b; margin-top:4px; }}
</style></head>
<body>
  <h1>{title}</h1>
  <div class="meta">{len(records)} characters. Orange-bordered panel = what'll be rendered in battle. Reference panel = the opposite rotation for context.</div>
  <div class="rule"><b>Rule:</b> {facing} sit on the <b>{side}</b> side of the battle screen and must face <b>{rule_face}</b>.</div>
  {''.join(cards)}
</body></html>"""


def main() -> int:
    args = sys.argv[1:]
    facing = 'enemies'
    if '--facing' in args:
        i = args.index('--facing')
        facing = args[i + 1]
        del args[i:i + 2]
    if len(args) < 2:
        print(__doc__)
        return 2
    queue_path, out_path = Path(args[0]), Path(args[1])
    if not queue_path.is_absolute():
        queue_path = ROOT / queue_path

    queue = json.loads(queue_path.read_text())
    chars = queue['submitted']
    print(f"fetching {len(chars)} from PixelLab...")

    records: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        for rec in ex.map(fetch, chars):
            records.append(rec)
            mark = '✓' if rec['status'] == 'completed' else f"({rec['status']})"
            print(f"  {rec['slug']:25} {mark}")

    title = f"{queue_path.stem} — direction check"
    out_path.write_text(build_html(records, facing, title))
    print(f"wrote {out_path}")
    subprocess.run(['open', '-a', 'Google Chrome', str(out_path)], check=False)
    return 0


if __name__ == '__main__':
    sys.exit(main())
