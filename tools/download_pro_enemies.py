#!/usr/bin/env python3
"""Download south/east/west rotations for selected pro enemies into
public/sprites/pixellab/enemies/pro/<slug>_<dir>.png.

Usage:
    PIXELLAB_KEY=... python3 tools/download_pro_enemies.py <queue.json>
"""
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "sprites" / "pixellab" / "enemies" / "pro"
PIXELLAB_MCP = Path(__file__).resolve().parent / "pixellab_mcp.py"


def fetch_rotations(char_id: str, account: str | None = None) -> dict[str, str]:
    env = os.environ.copy()
    if account and env.get(account):
        env["PIXELLAB_KEY"] = env[account]
    out = subprocess.run(
        [sys.executable, str(PIXELLAB_MCP), "get_character",
         json.dumps({"character_id": char_id, "include_preview": False})],
        capture_output=True, text=True, env=env, timeout=45,
    ).stdout
    rotations: dict[str, str] = {}
    for line in out.splitlines():
        s = line.strip()
        for d in ("south", "east", "west", "north"):
            if s.startswith(f"{d}: https"):
                rotations[d] = s.split(": ", 1)[1].strip()
                break
    return rotations


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__); return 2
    q = json.loads(Path(sys.argv[1]).read_text() if Path(sys.argv[1]).is_absolute()
                   else (Path(__file__).parent / sys.argv[1]).read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    for s in q["submitted"]:
        slug, cid = s["slug"], s["char_id"]
        rots = fetch_rotations(cid, s.get("account"))
        for d in ("south", "east", "west"):
            url = rots.get(d)
            if not url:
                print(f"  {slug}: missing {d}")
                continue
            dst = OUT / f"{slug}_{d}.png"
            req = urllib.request.Request(url, headers={"User-Agent": "curl/8.0"})
            with urllib.request.urlopen(req) as r, open(dst, "wb") as f:
                f.write(r.read())
            print(f"  {slug}_{d}.png  ({dst.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
