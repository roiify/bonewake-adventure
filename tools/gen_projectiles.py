#!/usr/bin/env python3
"""Generate caster projectile + impact VFX sprites (64x64, transparent bg)
via Pixflux, matching the existing fireball.png / fire_burst.png pair."""
import base64
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

OUT = Path(__file__).parent.parent / "public/sprites/vfx"
API_URL = "https://api.pixellab.ai/v1/generate-image-pixflux"
KEY = os.environ.get("PIXELLAB_KEY_KIDBOT", "")

STYLE = "16-bit pixel art, dark fantasy, chunky pixels, vivid glow, single object centered, black background removed"

ASSETS = [
    ("ice_shard", "sharp crystalline ice shard projectile flying right, pale blue frost trail"),
    ("ice_burst", "icy explosion burst, shattering frost crystals radiating outward"),
    ("dark_bolt", "necrotic dark magic bolt projectile flying right, purple-black energy with skull hint"),
    ("dark_burst", "dark necrotic explosion burst, purple-black energy radiating outward"),
    ("arrow", "wooden arrow with iron tip flying right, fletched tail, horizontal"),
    ("arrow_hit", "small impact puff with splinters and dust radiating outward"),
    ("blood_arc", "crescent arc of crimson blood projectile flying right, droplets trailing"),
    ("blood_burst", "splash of crimson blood bursting outward, droplets radiating"),
]


def gen(slug: str, prompt: str) -> None:
    payload = {
        "description": f"{prompt}, {STYLE}",
        "negative_description": "blurry, anti-aliased, photorealistic, text, multiple objects, frame, border",
        "image_size": {"width": 64, "height": 64},
        "no_background": True,
        "outline": "selective outline",
        "shading": "detailed shading",
        "detail": "medium detail",
        "text_guidance_scale": 16.0,
    }
    res = None
    for attempt in range(4):
        req = urllib.request.Request(
            API_URL, data=json.dumps(payload).encode(),
            headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=240) as resp:
                res = json.loads(resp.read().decode())
            break
        except urllib.error.HTTPError as e:
            print(f"  [{slug}] HTTP {e.code}: {e.read().decode(errors='replace')[:200]}", flush=True)
            return
        except Exception as e:  # noqa: BLE001 — transient network drop, retry
            print(f"  [{slug}] network error ({e}), retry {attempt+1}", flush=True)
            time.sleep(10)
    if res is None:
        print(f"  [{slug}] gave up", flush=True)
        return
    b64 = (res.get("image") or {}).get("base64")
    if not b64:
        print(f"  [{slug}] no image: {json.dumps(res)[:200]}", flush=True)
        return
    (OUT / f"{slug}.png").write_bytes(base64.b64decode(b64))
    print(f"  [{slug}] saved", flush=True)


for slug, prompt in ASSETS:
    if (OUT / f"{slug}.png").exists():
        print(f"  [{slug}] exists, skip", flush=True)
        continue
    gen(slug, prompt)
    time.sleep(2)
print("done")
