#!/usr/bin/env python3
"""Build a 3-panel before/after hero gallery.

For each hero in hero_pro_queue.json:
  [OLD shipping idle (first frame of the 17-frame strip)]
  [NEW IN-BATTLE (east rotation — heroes face east)]
  [NEW reference (west rotation)]

Old strips are served from the running Vite dev server at http://localhost:5173/
(must be running). New rotations come from PixelLab via tools/pixellab_mcp.py.
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


def fetch_rotations(item: dict) -> dict:
    out = subprocess.run(
        ['/opt/homebrew/bin/python3.12', str(PIXELLAB_MCP), 'get_character',
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


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    queue_path = Path(sys.argv[1])
    old_map_path = Path(sys.argv[2])
    out_path = Path(sys.argv[3])
    if not queue_path.is_absolute():
        queue_path = ROOT / queue_path

    queue = json.loads(queue_path.read_text())
    chars = queue['submitted']
    old_map = json.loads(old_map_path.read_text())

    print(f"fetching rotations for {len(chars)} heroes...")
    records: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        for rec in ex.map(fetch_rotations, chars):
            records.append(rec)
            mark = '✓' if rec['status'] == 'completed' else f"({rec['status']})"
            print(f"  {rec['slug']:18} {mark}")

    cards = []
    for r in records:
        slug = r['slug']
        rots = r['rotations']
        east = rots.get('east', '')
        west = rots.get('west', '')
        old = old_map.get(slug, {})
        old_path = old.get('idle', '')
        old_cols = old.get('cols', 17)
        old_url = f"{DEV_BASE}{old_path}" if old_path else ''
        cards.append(f"""
    <div class="card">
      <div class="title"><code>{slug}</code></div>
      <div class="panels">
        <div class="panel old">
          <div class="ph">BEFORE (Pixflux v1)</div>
          <div class="oldframe" data-src="{old_url}" data-cols="{old_cols}"></div>
          <div class="sub">first frame of current 17-frame strip</div>
        </div>
        <div class="panel battle">
          <div class="ph">AFTER · IN-BATTLE</div>
          <img src="{east}" alt="{slug} east">
          <div class="sub">→ heroes face EAST in battle</div>
        </div>
        <div class="panel">
          <div class="ph">AFTER · ref (west)</div>
          <img src="{west}" alt="{slug} west">
          <div class="sub">opposite rotation for context</div>
        </div>
      </div>
    </div>""")

    html = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Hero Pro upgrade — before / after</title>
<style>
  body {{ margin:0; background:#0b0f1a; color:#e2e8f0; font:14px ui-sans-serif,system-ui,sans-serif; padding:16px; }}
  h1 {{ font-size:22px; color:#f59e0b; margin:0 0 4px; }}
  .meta {{ color:#94a3b8; margin-bottom:16px; font-size:13px; }}
  .rule {{ background:#1f2937; border-left:3px solid #22c55e; padding:8px 12px; margin-bottom:16px; font-size:13px; }}
  .card {{ margin-bottom:14px; padding:12px; background:#0f172a; border:1px solid #1f2937; border-radius:6px; }}
  .title {{ margin-bottom:8px; }}
  .title code {{ color:#22d3ee; font-size:14px; font-weight:600; }}
  .panels {{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }}
  .panel {{ background:#000; padding:10px; border:1px solid #1f2937; border-radius:4px; text-align:center; }}
  .panel.battle {{ border-color:#f59e0b; }}
  .panel.old {{ border-color:#475569; }}
  .ph {{ font-size:11px; color:#94a3b8; margin-bottom:6px; font-weight:600; letter-spacing:0.5px; }}
  .panel.battle .ph {{ color:#f59e0b; }}
  .panel.old .ph {{ color:#94a3b8; }}
  .panel img, .oldframe {{ image-rendering:pixelated; display:block; margin:0 auto; }}
  .panel img {{ max-width:200px; width:100%; height:auto; }}
  .oldframe {{ height:200px; background-repeat:no-repeat; background-position:0 0; }}
  .sub {{ font-size:10px; color:#64748b; margin-top:6px; }}
  @media (max-width:900px) {{ .panels {{ grid-template-columns:1fr; }} }}
</style></head>
<body>
  <h1>Hero Pro upgrade — before / after</h1>
  <div class="meta">{len(records)} heroes. Compare the current shipping sprite (Pixflux v1) against the new Pro-mode generation.</div>
  <div class="rule"><b>Rule:</b> heroes sit on the LEFT side of the battle screen and must face <b>EAST (right, →)</b>. The orange-bordered "AFTER · IN-BATTLE" panel is what'll be rendered in battle.</div>
  {''.join(cards)}
<script>
  // Each .oldframe is a 17-col strip; show first frame by setting background to
  // the strip URL and sizing the box to natural-height + naturalWidth/cols.
  document.querySelectorAll('.oldframe').forEach(el => {{
    const src = el.dataset.src;
    const cols = parseInt(el.dataset.cols || '17', 10);
    if (!src) return;
    const img = new Image();
    img.onload = () => {{
      const fw = img.naturalWidth / cols;
      const fh = img.naturalHeight;
      const displayH = 200;
      const scale = displayH / fh;
      el.style.width = (fw * scale) + 'px';
      el.style.height = displayH + 'px';
      el.style.backgroundImage = `url(${{src}})`;
      el.style.backgroundSize = `${{img.naturalWidth * scale}}px ${{displayH}}px`;
    }};
    img.onerror = () => {{
      el.textContent = '(failed to load old sprite — is the dev server at localhost:5173 running?)';
      el.style.color = '#fca5a5';
      el.style.fontSize = '11px';
      el.style.padding = '40px 8px';
    }};
    img.src = src;
  }});
</script>
</body></html>"""

    out_path.write_text(html)
    print(f"wrote {out_path}")
    subprocess.run(['open', '-a', 'Google Chrome', str(out_path)], check=False)
    return 0


if __name__ == '__main__':
    sys.exit(main())
