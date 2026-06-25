#!/usr/bin/env python3
"""Replace every enemy's <slug>_idle.png with the WEST.png from its V1
Enemies folder, padded to 17 cols. Use after dropping the enemy mirror
so idle/attack/hit are all natively west-facing."""
import json
import shutil
from pathlib import Path
from PIL import Image

TARGET_COLS = 17
SRC_ROOT = Path("/Users/kiddos/Downloads/Bonewake Toons/V1 Enemies")
DEST = Path("/Users/kiddos/Desktop/bonewake-web/public/sprites/echoes/enemies")
QUEUE = Path(__file__).parent / "enemy_anim_queue.json"

# Map slug -> folder prefix (same as before)
MAP = {
    "shambler":          "Late-stage_hollow_zombie_shambler",
    "fastghoul":         "Fast_Ghoul_Lean_feral_ghoul",
    "boneknight":        "Bone_Knight_Skeletal_knight_in_dented",
    "graveyardlich":     "Graveyard_Lich_Graveyard_lich_in_tattered",
    "worldboss_1":       "Crimson_Apostate_World_Boss_1_Crimson",
    "undead_archer":     "Undead_Archer_Undead_zombie_archer",
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
    "royal_lich":        "Royal_lich_zombie_noble",
    "bone_executioner":  "Bone_executioner_zombie",
    "gilded_revenant":   "Gilded_revenant_zombie_knight",
    "crypt_assassin":    "Crypt_assassin_zombie",
    "plague_priest":     "Plague_priest_zombie_hooded",
    "void_zombie":       "Void-touched_zombie_gaunt",
    "abyssal_warden":    "Abyssal_warden_zombie_towering",
    "shade_caller":      "Shade_caller_zombie_summoner",
    "dread_knight":      "Dread_knight_zombie_elite",
    "corpse_hound":      "Corpse_hound_zombie_humanoid",
    "starfall_lich":     "Starfall_lich_zombie_towering",
    "void_juggernaut":   "Void_juggernaut_zombie_tank",
    "astral_archer":     "Astral_archer_zombie_lean",
    "orb_caster":        "Orb_caster_zombie_robed",
    "soul_devourer":     "Soul_devourer_zombie_emaciated",
    "apocalypse_horror": "Apocalypse_horror_zombie_abomination",
    "world_eater_husk":  "World-eater_husk_zombie_titan",
    "blood_titan":       "Blood_titan_zombie_towering",
    "ash_lord":          "Ash_lord_zombie_king",
    "final_revenant":    "Final_revenant_zombie_warlord",
}

ok, fail = [], []
for slug, prefix in MAP.items():
    folders = list(SRC_ROOT.glob(f"{prefix}*"))
    if not folders:
        fail.append((slug, "no folder")); continue
    candidates = list(folders[0].rglob("west.png"))
    if not candidates:
        fail.append((slug, "no west.png")); continue
    img = Image.open(candidates[0]).convert("RGBA")
    w, h = img.size
    strip = Image.new("RGBA", (w * TARGET_COLS, h), (0, 0, 0, 0))
    for i in range(TARGET_COLS):
        strip.paste(img, (i * w, 0))
    strip.save(DEST / f"{slug}_idle.png", "PNG", optimize=True)
    ok.append(slug)
print(f"idle re-sourced from west.png: {len(ok)}/{len(MAP)}")
for s, why in fail: print(f"  - {s}: {why}")
