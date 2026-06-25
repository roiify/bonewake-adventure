#!/usr/bin/env python3
"""Generate 1-direction attack-animation atlases for the remaining 13 bosses.

For each boss, the pipeline mirrors the dragon pilot:
  1. Load public/sprites/bosses/{slug}_idle.png (painted Nano Banana reference).
  2. Downscale to 170×170 RGBA, push as style_images base64.
  3. create_1_direction_object(view='sidescroller', description=<boss-specific>)
     — returns a "review" object with 4 candidates.
  4. Poll until status='review', auto-pick frame [0] via select_object_frames
     → promotes that candidate to its own completed 1-dir object.
  5. animate_object(object_id, animation_description=<attack-specific>, frame_count=8)
     — queues the attack loop.
  6. Poll until animation completes, download via the /download endpoint
     (auth required — backblaze direct URLs return 403), extract the
     animations/attack/unknown/frame_*.png files.
  7. Stitch horizontally into public/sprites/bosses/{slug}_attack.png.

Resumable: skips bosses whose {slug}_attack.png already exists. The dragon
is excluded (its atlas was the pilot — done by hand).

Uses the kidbot account key (PIXELLAB_KEY_KIDBOT) — far more generations
left there than on rolfi. Each boss costs ~26 generations
(25 for the 4-candidate create + 1 for animate), so all 13 needs ~338.
"""
import base64
import io
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("pip3 install Pillow", file=sys.stderr); sys.exit(1)

BOSS_DIR = Path(__file__).parent.parent / "public" / "sprites" / "bosses"
MCP_URL = "https://api.pixellab.ai/mcp"

# (slug, description_for_create, description_for_animate)
BOSSES = [
    ("plague_hydra",
     "undead multi-headed plague hydra, three serpent heads on rotting necks, exposed bones piercing through diseased flesh, pustules and dripping bile, weathered scales, gritty mature dark fantasy gory survival horror, single creature on transparent background",
     "all three heads lunge forward simultaneously, jaws snap, necks coil and uncoil, plague mist drips. aggressive coordinated attack"),
    ("rot_phoenix",
     "undead rot phoenix, decayed firebird, feathers half-rotted off exposing ribcage, glowing ember eye sockets, tattered burning wings dripping ash, gritty mature dark fantasy gory survival horror",
     "wings flare wide, beak thrusts forward in screech-attack, embers burst from feathers, body lunges down toward camera"),
    ("bone_cerberus",
     "undead three-headed bone cerberus hound, all three skull-heads exposed, rotting muscle clinging to ribs, glowing eye sockets, blood-matted fur, gritty mature dark fantasy gory survival horror",
     "all three heads snap forward at once with bared teeth, front paws thrust toward camera, ferocious lunging bite"),
    ("wraith_kraken",
     "undead ghostly wraith kraken, translucent decaying tentacles, eldritch single eye, weathered barnacle-encrusted hide with exposed bones, dripping black ichor, gritty mature dark fantasy gory survival horror",
     "tentacles thrust outward toward camera, central maw opens wide showing teeth, body undulates forward in attack"),
    ("necro_sphinx",
     "undead necro sphinx, decayed lion body with exposed ribs, human skull face with crown remnants, tattered wings, dried blood on claws, gritty mature dark fantasy gory survival horror",
     "front paws swipe forward with extended claws, jaw drops open in roar, wings spread aggressively, body crouches into attack pose"),
    ("crimson_centaur",
     "undead crimson centaur warrior, rotting horse body with exposed bones, decayed human torso, gore-soaked weapon, weathered armor caked in dried blood, gritty mature dark fantasy gory survival horror",
     "rears up on hind legs, swings weapon arm in a heavy chopping arc toward camera, blood splatters off the blade"),
    ("lich_king",
     "undead lich king sorcerer, skeletal regal figure in tattered crown and robes, exposed ribcage, glowing eye sockets, gnarled bony hands, gritty mature dark fantasy gory survival horror",
     "arms raise high and slam forward casting dark spell, robes whip outward, eye sockets flare, decay energy bursts from outstretched fingers"),
    ("bone_titan",
     "undead bone titan colossus, massive skeletal warrior, jagged exposed ribcage, hulking weathered shoulders, oversized blunt weapon, dried blood on bone, gritty mature dark fantasy gory survival horror",
     "rears back then swings massive weapon arm in a sweeping overhead smash toward camera, weight crashes forward, ground impact pose"),
    ("plague_doctor",
     "undead plague doctor, rotting humanoid in tattered black robes, cracked beaked mask leaking pus, exposed bone hands clutching gore-stained scythe, gritty mature dark fantasy gory survival horror",
     "scythe arcs in a wide slashing attack toward camera, robes billow, free hand reaches forward with claws, body lunges into the strike"),
    ("ash_empress",
     "undead ash empress, regal decayed female figure in burnt tattered gown, hollow eye sockets, exposed ribs visible through charred flesh, smoldering ash drifts off body, gritty mature dark fantasy gory survival horror",
     "arms thrust outward unleashing burst of ash and embers, gown whips back, head rears, fire-lit eye sockets flare"),
    ("soul_reaper",
     "undead soul reaper grim figure, tattered black hooded robe revealing skeletal face, oversized rusted scythe, weathered bone fingers, gritty mature dark fantasy gory survival horror",
     "scythe swings in a wide horizontal arc toward camera, robes flow with the motion, skeletal grin visible under hood, body twists into the strike"),
    ("voidlord",
     "undead voidlord eldritch being, decayed humanoid torso with too many bony arms, void-tendrils trailing from exposed ribcage, hollow black eye sockets, weathered cosmic robes, gritty mature dark fantasy gory survival horror",
     "all bony arms thrust outward toward camera, void tendrils whip forward, mouth opens revealing inner darkness, body lunges with eldritch aggression"),
    ("worm_god",
     "undead worm god monstrosity, massive segmented worm with circular maw of needle teeth, exposed inner ribs along segments, dripping bile, weathered chitin plates, gritty mature dark fantasy gory survival horror",
     "circular maw opens wide showing rings of teeth, body thrusts forward toward camera, segments compress and extend in feeding lunge"),
]


def _post(key: str, payload: dict) -> dict:
    req = urllib.request.Request(
        MCP_URL, method="POST",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                 "Accept": "application/json, text/event-stream"},
        data=json.dumps(payload).encode(),
    )
    raw = urllib.request.urlopen(req, timeout=120).read().decode()
    for line in raw.splitlines():
        if line.startswith("data: "):
            return json.loads(line[6:])
    return json.loads(raw)


def mcp_call(key: str, tool: str, args: dict) -> dict:
    _post(key, {"jsonrpc": "2.0", "id": 1, "method": "initialize",
                "params": {"protocolVersion": "2025-06-18", "capabilities": {},
                           "clientInfo": {"name": "boss-atk", "version": "1"}}})
    return _post(key, {"jsonrpc": "2.0", "id": 2, "method": "tools/call",
                       "params": {"name": tool, "arguments": args}})


def extract_text(out: dict) -> str:
    r = out.get("result") or {}
    return "\n".join(c.get("text", "") for c in (r.get("content") or [])
                     if isinstance(c, dict) and c.get("type") == "text")


def find_object_id(text: str) -> str:
    import re
    m = re.search(r"id:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", text)
    if m: return m.group(1)
    raise ValueError(f"no object_id in: {text[:200]}")


def load_ref_b64(slug: str) -> str:
    img = Image.open(BOSS_DIR / f"{slug}_idle.png").convert("RGBA").resize((170, 170), Image.LANCZOS)
    buf = io.BytesIO(); img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def submit_create(key: str, slug: str, desc: str) -> str:
    ref = load_ref_b64(slug)
    args = {"description": desc, "view": "sidescroller",
            "style_images": [{"type": "base64", "base64": ref, "format": "png"}]}
    print(f"  [{slug}] submitting create_1_direction_object...", flush=True)
    out = mcp_call(key, "create_1_direction_object", args)
    return find_object_id(extract_text(out))


def poll_review(key: str, slug: str, oid: str, deadline_s: int = 900) -> None:
    """Wait until the object goes from creating → review."""
    t0 = time.time()
    while time.time() - t0 < deadline_s:
        time.sleep(20)
        out = mcp_call(key, "get_object", {"object_id": oid, "include_preview": False})
        text = extract_text(out).lower()
        if "status: review" in text or "status:review" in text:
            print(f"  [{slug}] review ready", flush=True); return
        if "status: completed" in text:
            print(f"  [{slug}] auto-completed (no review pack)", flush=True); return
        if "status: failed" in text:
            raise RuntimeError(f"{slug} create failed")
        print(f"  [{slug}] {text.splitlines()[0] if text else '...'}", flush=True)
    raise TimeoutError(f"{slug} create poll timeout")


def select_first_frame(key: str, slug: str, source_oid: str) -> str:
    """Promote frame [0] to its own 1-dir object, return its new id."""
    out = mcp_call(key, "select_object_frames",
                   {"object_id": source_oid, "indices": [0], "common_tag": slug})
    text = extract_text(out)
    import re
    m = re.search(r"new_ids:\s*([0-9a-f-]{36})", text)
    if not m: raise ValueError(f"no new_ids in: {text[:200]}")
    new_oid = m.group(1)
    print(f"  [{slug}] selected frame 0 → {new_oid}", flush=True)
    return new_oid


def submit_animate(key: str, slug: str, oid: str, anim_desc: str) -> None:
    args = {"object_id": oid, "animation_description": anim_desc,
            "frame_count": 8, "animation_name": "attack"}
    mcp_call(key, "animate_object", args)
    print(f"  [{slug}] animate queued", flush=True)


def poll_animation(key: str, slug: str, oid: str, deadline_s: int = 900) -> None:
    t0 = time.time()
    while time.time() - t0 < deadline_s:
        time.sleep(15)
        out = mcp_call(key, "get_object", {"object_id": oid, "include_preview": False})
        text = extract_text(out)
        low = text.lower()
        if "animations (" in low and "pending jobs" not in low:
            print(f"  [{slug}] animation done", flush=True); return
        if "status: failed" in low:
            raise RuntimeError(f"{slug} animate failed")
        print(f"  [{slug}] anim still processing...", flush=True)
    raise TimeoutError(f"{slug} animate timeout")


def download_and_stitch(key: str, slug: str, oid: str) -> Path:
    req = urllib.request.Request(
        f"https://api.pixellab.ai/mcp/objects/{oid}/download",
        headers={"Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        zip_bytes = resp.read()
    import zipfile, tempfile
    with tempfile.TemporaryDirectory() as td:
        zp = Path(td) / "atk.zip"; zp.write_bytes(zip_bytes)
        with zipfile.ZipFile(zp) as zf: zf.extractall(td)
        # Find frames
        frame_dir = Path(td) / "animations" / "attack" / "unknown"
        if not frame_dir.exists():
            # Some bosses might land under different naming — search
            cands = list(Path(td).rglob("frame_*.png"))
            if not cands: raise RuntimeError(f"{slug}: no frames in zip")
            frame_dir = cands[0].parent
        files = sorted(frame_dir.glob("frame_*.png"))
        if not files: raise RuntimeError(f"{slug}: no frames")
        frames = [Image.open(f).convert("RGBA") for f in files]
        w, h = frames[0].size
        strip = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
        for i, f in enumerate(frames):
            if f.size != (w, h): f = f.resize((w, h), Image.LANCZOS)
            strip.paste(f, (i * w, 0))
        out_path = BOSS_DIR / f"{slug}_attack.png"
        strip.save(out_path)
        print(f"  [{slug}] saved {out_path.name} ({strip.size[0]}x{strip.size[1]}, {len(frames)}f)", flush=True)
        return out_path


def process_one(key: str, slug: str, create_desc: str, anim_desc: str) -> None:
    out_path = BOSS_DIR / f"{slug}_attack.png"
    if out_path.exists():
        print(f"  [{slug}] skip — already exists", flush=True); return
    src_oid = submit_create(key, slug, create_desc)
    poll_review(key, slug, src_oid)
    picked_oid = select_first_frame(key, slug, src_oid)
    submit_animate(key, slug, picked_oid, anim_desc)
    poll_animation(key, slug, picked_oid)
    download_and_stitch(key, slug, picked_oid)


def main() -> int:
    key = os.environ.get("PIXELLAB_KEY_KIDBOT") or os.environ.get("PIXELLAB_API_KEY")
    if not key:
        print("set PIXELLAB_KEY_KIDBOT or PIXELLAB_API_KEY", file=sys.stderr); return 1
    print(f"generating attack atlases for {len(BOSSES)} bosses (kidbot key)")
    for slug, cd, ad in BOSSES:
        for attempt in range(2):
            try:
                process_one(key, slug, cd, ad); break
            except Exception as e:
                msg = str(e)[:160]
                if attempt == 1: print(f"  [{slug}] GIVING UP: {msg}", flush=True)
                else: print(f"  [{slug}] err {msg} — retry", flush=True); time.sleep(20)
        time.sleep(3)
    print("done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
