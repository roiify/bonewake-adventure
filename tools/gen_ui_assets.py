#!/usr/bin/env python3
"""Generate UI asset sprites for Bonewake via PixelLab.

15 assets total split across three groups, all written to public/sprites/ui/:
  * 4 currency icons (gold coin, gem shard, friend talisman, energy bolt)
  * 6 mode icons (story sword, summon star, heroes, tasks, tower, boss skull)
  * 4 corner ornaments (top-left, top-right, bottom-left, bottom-right)
  * 1 button bar texture (engraved metal strip)

Uses the Pixflux endpoint at 320x320 (icons) / 256x128 (button strip).
Already-generated assets are skipped so the script is resumable on retry.
"""
import base64
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

OUT = Path(__file__).parent.parent / "public" / "sprites" / "ui"
OUT.mkdir(parents=True, exist_ok=True)

STYLE_ANCHOR = (
    "dark fantasy gothic icon, gilded ornate art, "
    "16-bit era pixel art with chunky readable silhouette, "
    "limited 8-12 color palette, big pixel clusters, "
    "centered subject on plain transparent background, "
    "highly detailed shading, no text, no watermark"
)

# Square 320x320 sprites for everything except the button strip.
ASSETS = [
    # ===== Currency icons =====
    ("currency_gold",   "Stack of 3 ancient gold coins, ornate bone-skull engraving on each face, "
                        "weathered copper-gold patina, dramatic rim lighting"),
    ("currency_gem",    "Faceted violet-purple soulgem floating, glowing inner light, "
                        "wisps of dark mist around it, ornate gilded prongs"),
    ("currency_friend", "Tied-leather friendship talisman, small carved bone skull pendant, "
                        "frayed twine knot, blood-red ribbon accent"),
    ("currency_energy", "Stylized lightning bolt of crackling necrotic blue-cyan energy, "
                        "split ends, dark fantasy aesthetic, glowing core"),

    # ===== Mode entry icons =====
    ("mode_story",   "Crossed greatsword and ornate dagger with skull-shaped pommels, "
                        "weathered blade with blood drips, gothic style"),
    ("mode_summon",  "Floating ornate amethyst orb with violet starlight, "
                        "small constellation of summoning runes orbiting it"),
    ("mode_heroes",  "Two heroic helms side-by-side, one gold paladin helm and one dark spiked warlord helm, "
                        "noble silhouettes, gothic fantasy"),
    ("mode_tasks",   "Rolled vellum scroll with wax seal stamped with skull crest, "
                        "ribbon tie, dusty corner, parchment texture"),
    ("mode_tower",   "Tall obsidian tower with red glowing eye-window at top, "
                        "broken battlements, lone gothic spire silhouette"),
    ("mode_boss",    "Massive jagged dragon skull with curved horns and glowing red eye sockets, "
                        "dramatic centerpiece, dark fantasy boss emblem"),

    # ===== Corner frame ornaments (4 corners — all face into the card) =====
    ("frame_corner_tl", "Ornate gothic corner filigree decoration pointing down-right, "
                        "gilded gold engraved metal, curling vines and small skull motif, "
                        "L-shaped corner piece"),
    ("frame_corner_tr", "Ornate gothic corner filigree decoration pointing down-left, "
                        "gilded gold engraved metal, curling vines and small skull motif, "
                        "L-shaped corner piece"),
    ("frame_corner_bl", "Ornate gothic corner filigree decoration pointing up-right, "
                        "gilded gold engraved metal, curling vines and small skull motif, "
                        "L-shaped corner piece"),
    ("frame_corner_br", "Ornate gothic corner filigree decoration pointing up-left, "
                        "gilded gold engraved metal, curling vines and small skull motif, "
                        "L-shaped corner piece"),
]

# Wider strip for button texture
BUTTON_TEXTURE = (
    "button_texture_gold",
    "Horizontal repeatable strip of engraved ornamental gold metal, "
    "subtle skull-and-laurel pattern repeating across the surface, "
    "dark fantasy bevel, dragon-scale-like motif edges, no border",
    (400, 100),
)

API_URL = "https://api.pixellab.ai/v1/generate-image-pixflux"


def _post(key: str, payload: dict) -> dict:
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=240) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        raise SystemExit(f"PixelLab HTTP {e.code}: {body[:400]}") from e


def generate(key: str, slug: str, prompt: str, size=(320, 320)) -> Path:
    description = f"{prompt}, {STYLE_ANCHOR}"
    payload = {
        "description": description,
        "negative_description": (
            "blurry, anti-aliased, soft gradients, photorealistic, "
            "modern flat icon style, anime cute, low contrast, text labels, "
            "multiple separate items"
        ),
        "image_size": {"width": size[0], "height": size[1]},
        "no_background": True,
        "outline": "selective outline",
        "shading": "highly detailed shading",
        "detail": "highly detailed",
        "text_guidance_scale": 18.0,
    }
    print(f"  [{slug}] requesting...", flush=True)
    t0 = time.time()
    res = _post(key, payload)
    img = res.get("image") or {}
    b64 = img.get("base64")
    if not b64:
        raise SystemExit(f"  [{slug}] no image in response: {json.dumps(res)[:300]}")
    out = OUT / f"{slug}.png"
    out.write_bytes(base64.b64decode(b64))
    print(f"  [{slug}] saved in {time.time() - t0:.1f}s", flush=True)
    return out


def main() -> int:
    key = os.environ.get("PIXELLAB_API_KEY") or os.environ.get("PIXELLAB_KEY")
    if not key:
        print("set PIXELLAB_API_KEY", file=sys.stderr)
        return 1

    print(f"generating {len(ASSETS) + 1} UI assets to {OUT}", flush=True)
    for slug, prompt in ASSETS:
        target = OUT / f"{slug}.png"
        if target.exists():
            print(f"  [{slug}] already exists — skip", flush=True)
            continue
        for attempt in range(6):
            try:
                generate(key, slug, prompt)
                break
            except (SystemExit, urllib.error.URLError, OSError, ConnectionError, TimeoutError) as e:
                msg = str(e).lower()
                if any(c in msg for c in ("401", "403", "400", "422")):
                    print(f"  [{slug}] FATAL: {msg[:160]}", flush=True)
                    raise
                backoff = 10 * (attempt + 1)
                print(f"  [{slug}] transient err, sleep {backoff}s then retry", flush=True)
                time.sleep(backoff)
        time.sleep(1.5)

    # Button texture (wider, separate handling)
    slug, prompt, size = BUTTON_TEXTURE
    target = OUT / f"{slug}.png"
    if not target.exists():
        for attempt in range(6):
            try:
                generate(key, slug, prompt, size=size)
                break
            except Exception as e:
                msg = str(e).lower()
                if any(c in msg for c in ("401", "403", "400", "422")):
                    raise
                time.sleep(10 * (attempt + 1))
    else:
        print(f"  [{slug}] already exists — skip", flush=True)

    print(f"done — {len(ASSETS) + 1} UI assets in {OUT}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
