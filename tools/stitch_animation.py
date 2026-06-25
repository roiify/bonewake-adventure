#!/usr/bin/env python3
"""Download frame URLs and stitch them horizontally into one PNG, optionally padding.

Usage:
    stitch_animation.py <out.png> <pad_to_N> <url1> <url2> ...

If pad_to_N > #urls, the last frame is held to fill the strip.
Use pad_to_N=0 to disable padding (write exactly the given frames).
"""
import sys
import urllib.request
from io import BytesIO
from PIL import Image


def main() -> int:
    out_path = sys.argv[1]
    pad_to = int(sys.argv[2])
    urls = sys.argv[3:]
    if not urls:
        print("no urls", file=sys.stderr)
        return 1

    frames = []
    for u in urls:
        req = urllib.request.Request(u, headers={"User-Agent": "bonewake-stitch/1.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            frames.append(Image.open(BytesIO(r.read())).convert("RGBA"))

    if pad_to > len(frames):
        last = frames[-1]
        frames.extend([last] * (pad_to - len(frames)))

    w = max(f.width for f in frames)
    h = max(f.height for f in frames)
    out = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.paste(f, (i * w, 0))
    out.save(out_path, "PNG", optimize=True)
    print(f"wrote {out_path} ({w * len(frames)}x{h}, {len(frames)} frames)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
