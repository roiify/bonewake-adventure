#!/usr/bin/env python3
"""One-shot: copy the east.png of each new V1 Enemies folder into the
game's enemy sprite directory as <slug>_idle.png."""
import shutil
from pathlib import Path

SRC = Path("/Users/kiddos/Downloads/Bonewake Toons/V1 Enemies")
DEST = Path("/Users/kiddos/Desktop/bonewake-web/public/sprites/echoes/enemies")
DEST.mkdir(parents=True, exist_ok=True)

MAP = {
    "royal_lich":       "Royal_lich_zombie_noble",
    "bone_executioner": "Bone_executioner_zombie",
    "gilded_revenant":  "Gilded_revenant_zombie_knight",
    "crypt_assassin":   "Crypt_assassin_zombie",
    "plague_priest":    "Plague_priest_zombie_hooded",
    "void_zombie":      "Void-touched_zombie_gaunt",
    "abyssal_warden":   "Abyssal_warden_zombie_towering",
    "shade_caller":     "Shade_caller_zombie_summoner",
    "dread_knight":     "Dread_knight_zombie_elite",
    "corpse_hound":     "Corpse_hound_zombie_humanoid",
    "starfall_lich":    "Starfall_lich_zombie_towering",
    "void_juggernaut":  "Void_juggernaut_zombie_tank",
    "astral_archer":    "Astral_archer_zombie_lean",
    "orb_caster":       "Orb_caster_zombie_robed",
    "soul_devourer":    "Soul_devourer_zombie_emaciated",
    "apocalypse_horror":"Apocalypse_horror_zombie_abomination",
    "world_eater_husk": "World-eater_husk_zombie_titan",
    "blood_titan":      "Blood_titan_zombie_towering",
    "ash_lord":         "Ash_lord_zombie_king",
    "final_revenant":   "Final_revenant_zombie_warlord",
}

ok, fail = [], []
for slug, prefix in MAP.items():
    matches = list(SRC.glob(f"{prefix}*"))
    if not matches:
        fail.append((slug, "no folder"))
        continue
    # Subfolder structure is <folder>/<folder>/rotations/east.png — nested.
    candidates = list(matches[0].rglob("east.png"))
    if not candidates:
        fail.append((slug, "no east.png"))
        continue
    east = candidates[0]
    shutil.copy(east, DEST / f"{slug}_idle.png")
    ok.append(slug)

print(f"copied: {len(ok)}")
for s in ok: print(f"  + {s}")
if fail:
    print(f"\nfailed: {len(fail)}")
    for s, why in fail: print(f"  - {s}: {why}")
