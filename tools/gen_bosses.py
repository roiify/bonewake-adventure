#!/usr/bin/env python3
"""Generate 14 boss-tier sprites for Bonewake (World Boss + Shatter rotation).

Each boss is a single 400x400 sprite (max Pixflux canvas) generated via the
Pixflux endpoint with the BoneWake aesthetic baked in. Saves to
public/sprites/bosses/{slug}_idle.png.

Run:
    PIXELLAB_API_KEY=... python3 tools/gen_bosses.py
"""
import base64
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

OUT = Path(__file__).parent.parent / "public" / "sprites" / "bosses"
OUT.mkdir(parents=True, exist_ok=True)

# Hard-coded BoneWake style anchor that EVERY boss prompt inherits.
# Mirrors the kidbot V1 style note from the memory ledger.
STYLE_ANCHOR = (
    "gritty mature dark fantasy gory survival horror, "
    "physically decayed, active blood splatter, weathered armor and gear, "
    "exposed bone, rotting flesh, glowing sickly eyes, "
    "16-bit era pixel art, chunky readable silhouette, "
    "limited 8-12 color palette, big pixel clusters, "
    "single character centered on plain transparent background, "
    "boss-tier scale (much larger and more detailed than rank-and-file enemies), "
    "intricate but readable, kidbot V1 lineup style"
)

# 14 bosses — 7 mythical creatures + 7 humanoids. One is the required zombified
# dragon. The pairs map 1:1 to days of the week for rotation across two modes.
BOSSES = [
    # === Mythical creatures (zombified / corrupted) ===
    ("bonewake_dragon",   "Bonewake Dragon",
     "Massive zombified four-legged dragon, tattered leathery wings full of holes, "
     "exposed ribs through rotting hide, jaw hanging open with blood dripping, "
     "ember-glowing eyes, broken horns, ancient barding rusted onto its body"),
    ("plague_hydra",      "Plague Hydra",
     "Three-headed swamp hydra, each head a rotting serpent skull with hanging flesh, "
     "necks weeping yellow-green pus, scaly body covered in oozing boils, "
     "fanged dripping jaws, sickly green miasma rising from its body"),
    ("rot_phoenix",       "Rot Phoenix",
     "Undead phoenix, feathers half-burned to ash and half-decayed to bone, "
     "skeletal wings spread wide, exposed heart still smoldering, "
     "molten cracks across the body, dead eyes glowing dim red"),
    ("bone_cerberus",     "Bone Cerberus",
     "Massive three-headed hellhound, mostly skeletal with chunks of black rotting flesh, "
     "jaws dripping blood and black ichor, glowing red eyes in every head, "
     "spiked chained collar, scarred ribcage exposed"),
    ("wraith_kraken",     "Wraith Kraken",
     "Tentacled abomination from a drowned tomb, eight rotting tentacles writhing, "
     "barnacled and waterlogged corpse-flesh, central beaked maw full of teeth, "
     "single milky cyclopean eye, ghostly green mist around the body"),
    ("necro_sphinx",      "Necro Sphinx",
     "Winged lion-bodied sphinx with a gaunt humanoid skull face, "
     "feathered wings decayed to bone tips, lion body half-skinned showing muscle and bone, "
     "ornate broken funerary gold band on its head, paws ending in dirty claws"),
    ("crimson_centaur",   "Crimson Centaur",
     "Undead centaur warlord, equine body skeletal with patches of rotting hide, "
     "humanoid torso emaciated and scarred, wielding a massive jagged bone polearm, "
     "skull-face with hollow eye sockets, blood-soaked tabard with faded heraldry"),

    # === Humanoid / boss bosses ===
    ("lich_king",         "The Lich King",
     "Towering crowned lich, gaunt skeletal frame draped in tattered royal robes, "
     "ornate spiked iron crown, glowing blue-violet eyes in a fleshless skull, "
     "raised bony hand summoning death magic, ribcage exposed through frayed robes"),
    ("bone_titan",        "Bone Titan",
     "Colossal armored warrior built from fused bones and skulls, "
     "rusted greataxe dripping fresh blood, glowing red lights inside its hollow chest, "
     "spiked black iron armor cracked and gore-splattered, intimidating war-helm"),
    ("plague_doctor",     "The Plague Doctor",
     "Towering humanoid in a long blood-stained coat, ornate iron crow-beak mask, "
     "wide-brimmed black leather hat, leather-gloved hands carrying rusted surgical tools, "
     "yellow plague miasma seeping from cuffs and collar, robe hem dragging through gore"),
    ("ash_empress",       "Ash Empress",
     "Corrupted undead queen seated on a throne of skulls and bones, "
     "ornate burnt-gold crown, regal gown of ash-grey silk torn and bloodstained, "
     "skeletal hands resting on the throne, beautiful gaunt half-rotten face, "
     "weeping black tears, candles of bone burning beside her"),
    ("soul_reaper",       "The Soul Reaper",
     "Massive hooded grim reaper figure, tattered black robes flowing as if in wind, "
     "wielding a colossal jagged scythe stained with old blood, "
     "skeletal hands gripping the shaft, hollow void where the face should be with two pinpoint white eyes"),
    ("voidlord",          "Voidlord",
     "Tall horned overlord wearing a cosmic mantle stitched from dead skin, "
     "massive curled obsidian horns, four glowing purple eyes, "
     "muscled torso wrapped in chains carrying smaller skulls, "
     "long claws dripping black void energy, regal but predatory"),
    ("worm_god",          "The Worm God",
     "Massive humanoid mass wreathed in writhing fat necrotic worms, "
     "barely visible decayed flesh underneath, multiple gaping screaming mouths across the body, "
     "raised tendril-arms, oozing puddle of bile beneath it, religious robe-tatters"),
]

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


def generate(key: str, slug: str, name: str, prompt: str) -> Path:
    description = f"{prompt}, {STYLE_ANCHOR}"
    negative = (
        "blurry, anti-aliased, low contrast, flat lighting, modern cartoon style, "
        "anime moe, cute, smooth gradients, photorealistic, multiple separate characters, "
        "text, watermark, signature, small enemy, generic minion, clean and pristine"
    )
    payload = {
        "description": description,
        "negative_description": negative,
        "image_size": {"width": 400, "height": 400},
        "no_background": True,
        "outline": "selective outline",
        "shading": "highly detailed shading",
        "detail": "highly detailed",
        "text_guidance_scale": 18.0,
    }
    print(f"  [{slug}] {name}: requesting...", flush=True)
    t0 = time.time()
    res = _post(key, payload)
    # Response: { "image": { "type": "base64", "base64": "..." }, "usage": ... }
    img = res.get("image") or {}
    b64 = img.get("base64")
    if not b64:
        raise SystemExit(f"  [{slug}] no image in response: {json.dumps(res)[:300]}")
    out = OUT / f"{slug}_idle.png"
    out.write_bytes(base64.b64decode(b64))
    dt = time.time() - t0
    usd = res.get("usage", {}).get("usd")
    cost = f" — ${usd:.4f}" if isinstance(usd, (int, float)) else ""
    print(f"  [{slug}] saved {out.name} in {dt:.1f}s{cost}", flush=True)
    return out


def main() -> int:
    key = os.environ.get("PIXELLAB_API_KEY") or os.environ.get("PIXELLAB_KEY")
    if not key:
        print("set PIXELLAB_API_KEY", file=sys.stderr)
        return 1

    print(f"generating {len(BOSSES)} bosses to {OUT}", flush=True)
    total = 0.0
    for slug, name, prompt in BOSSES:
        target = OUT / f"{slug}_idle.png"
        if target.exists():
            print(f"  [{slug}] already exists — skip", flush=True)
            continue
        # Retry on transient errors (rate limit, 5xx, network drops)
        for attempt in range(6):
            try:
                generate(key, slug, name, prompt)
                break
            except (SystemExit, urllib.error.URLError, OSError, ConnectionError, TimeoutError) as e:
                msg = str(e).lower()
                # Hard 4xx (other than 429) — fail loudly
                if "401" in msg or "403" in msg or "400" in msg or "422" in msg:
                    print(f"  [{slug}] FATAL: {msg[:160]}", flush=True)
                    raise
                backoff = 10 * (attempt + 1)
                print(f"  [{slug}] transient err ({msg[:80]}), sleep {backoff}s then retry", flush=True)
                time.sleep(backoff)
        else:
            print(f"  [{slug}] gave up after retries", flush=True)
            continue
        # Small inter-call pause to be polite to the API
        time.sleep(1.5)
    print(f"done — {len(BOSSES)} bosses in {OUT}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
