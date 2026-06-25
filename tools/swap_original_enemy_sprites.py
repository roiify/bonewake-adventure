#!/usr/bin/env python3
"""Replace the existing 23 static enemy sprites in the game with the new
v3-style east.png from the V1 Enemies folder. worldboss_1 is skipped
because it's animated (cols=43); replacing would regress it."""
import shutil
from pathlib import Path

SRC = Path("/Users/kiddos/Downloads/Bonewake Toons/V1 Enemies")
DEST = Path("/Users/kiddos/Desktop/bonewake-web/public/sprites/echoes/enemies")

# slug -> V1 Enemies folder prefix (new zombie-anchored versions where present)
MAP = {
    "shambler":          "Late-stage_hollow_zombie_shambler",
    "fastghoul":         "Fast_Ghoul_Lean_feral_ghoul",
    "boneknight":        "Bone_Knight_Skeletal_knight_in_dented",
    "graveyardlich":     "Graveyard_Lich_Graveyard_lich_in_tattered",
    "undead_archer":     "Undead_Archer_Undead_zombie_archer",   # new zombie version, not the skeletal one
    "plague_caster":     "Plague_Caster_Plague-zombie_caster",
    "fallen_captain":    "Fallen_Captain_Fallen_Captain_crowned_zombie",
    "skeletal_warhorse": "Skeletal_Warhorse_Zombie_warhorse_humanoid",
    "carrion_spider":    "Carrion_Spider_Zombified_carrion_spider",
    "phantom_knight":    "Phantom_Knight_Phantom-zombie_knight",
    "wailing_wraith":    "Wailing_Wraith_Wailing_wraith-zombie",
    "zombie_knight":     "Zombie_Knight_Corrupted_zombie_legionnaire",
    "zombie_berserker":  "Zombie_Berserker_Zombie_berserker_raging",
    "shield_bearer":     "Shield_Bearer_undying_zombie_defender",
    "zombie_mage":       "Zombie_Mage_Rotting_zombie_mage",
    "grave_channeler":   "Grave_Channeler_Grave_channeler_zombie",
    "soul_leech":        "Soul_leech_zombie_emaciated",
    "rotwolf":           "Zombified_rotwolf_humanoid",
    "bone_bear":         "Bone_bear_zombie_hulking",
    "possessed_corpse":  "Possessed_zombie_corpse_vessel",
    "grave_digger":      "Grave_digger_zombie_husk",
    "plague_monk":       "Plague_monk_zombie_ritual",
    "necromancer":       "Zombie_necromancer_corpse_animator",
}

ok, fail = [], []
for slug, prefix in MAP.items():
    matches = list(SRC.glob(f"{prefix}*"))
    if not matches:
        fail.append((slug, f"no folder matching {prefix}*"))
        continue
    east_candidates = list(matches[0].rglob("east.png"))
    if not east_candidates:
        fail.append((slug, "no east.png"))
        continue
    east = east_candidates[0]
    # Overwrite the existing _idle slot. Other slots (_attack etc.) point
    # to per-slot pngs that already exist — we won't touch them.
    target = DEST / f"{slug}_idle.png"
    shutil.copy(east, target)
    ok.append(slug)

print(f"swapped: {len(ok)}/23")
for s in ok: print(f"  + {s}")
if fail:
    print(f"\nfailed: {len(fail)}")
    for s, why in fail: print(f"  - {s}: {why}")
