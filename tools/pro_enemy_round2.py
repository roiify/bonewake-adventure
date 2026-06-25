#!/usr/bin/env python3
"""Append round-2 pro enemy descriptions to pro_enemy_queue.json's pending list.

40 in-game ENEMY_SPRITES slugs that don't yet have a pro counterpart.
Descriptions follow the same gritty mature-fantasy gory horror tone the
worker has been using and pick visual cues from each enemy's archetype/element
in stages.ts.
"""
import json
from pathlib import Path

ROUND2 = [
    # === Chapter 1-3 grunts ===
    ("shambler",            "Shambler — pro",            "Shuffling rotting zombie corpse, exposed ribs, dragging foot, tattered burial cloth, dripping black ichor, gritty mature dark fantasy gory survival horror"),
    ("fastghoul",           "Fast Ghoul — pro",          "Lean feral ghoul mid-lunge, hunched on all fours, blackened claws, snarling jaw with elongated teeth, sinewy emaciated body, gritty mature dark fantasy gory survival horror"),
    ("boneknight",          "Bone Knight — pro",         "Skeletal undead knight in pitted rusted plate armor, eyeless skull helm, longsword scraping the dirt, chains and rags hanging from breastplate, gritty mature dark fantasy gory survival horror"),
    ("graveyardlich",       "Graveyard Lich — pro",      "Withered desiccated lich wrapped in moldering shroud, clutching a bent grave-iron staff, glowing socket eyes, lichdust trailing from its sleeves, gritty mature dark fantasy gory survival horror"),
    ("undead_archer",       "Undead Archer — pro",       "Skeletal archer in rotted leather brigandine, drawing a warped longbow, quiver of splintered bone arrows, jawless skull grinning under hood, gritty mature dark fantasy gory survival horror"),
    ("plague_caster",       "Plague Caster — pro",       "Hunched plague caster in stained green robes, beaked mask leaking pus, gnarled staff topped with diseased rat skull, smoke of contagion at hands, gritty mature dark fantasy gory survival horror"),
    ("fallen_captain",      "Fallen Captain — pro",      "Undead knight-captain in dented officer plate, torn purple tabard, broken sword and battered kite shield, helmet visor cracked open showing skull, gritty mature dark fantasy gory survival horror"),
    # === Chapter 4-6 mid-tier ===
    ("royal_lich",          "Royal Lich — pro",          "Crowned royal lich draped in moth-eaten coronation robes, skeletal hand raised to cast, scepter tipped with a screaming soul, sunken crown of black iron, gritty mature dark fantasy gory survival horror"),
    ("bone_executioner",    "Bone Executioner — pro",    "Massive hooded skeletal executioner, bare skull behind black leather hood, two-handed cleaver-axe dripping gore, scarred bare bone torso, gritty mature dark fantasy gory survival horror"),
    ("gilded_revenant",     "Gilded Revenant — pro",     "Revenant warrior encased in tarnished gilded armor, gold leaf flaking from a corroded helm, ornate longsword pitted with rust, regal cape in rags, gritty mature dark fantasy gory survival horror"),
    ("crypt_assassin",      "Crypt Assassin — pro",      "Lean undead assassin in black wrappings, twin curved daggers, half-skull face under a tomb veil, sinewy arms covered in burial runes, gritty mature dark fantasy gory survival horror"),
    ("plague_priest",       "Plague Priest — pro",       "Gaunt plague priest in tattered ceremonial robes, censer of bone billowing toxic green smoke, leather mask sutured to face, holy symbol upside down, gritty mature dark fantasy gory survival horror"),
    ("void_zombie",         "Void Zombie — pro",         "Zombie warrior bleeding inky void from chest cavity, hollow blackened eyes, cracked starlight veins under grey skin, dragging a chipped voidsteel cleaver, gritty mature dark fantasy gory survival horror"),
    # === Chapter 7-9 elite ===
    ("abyssal_warden",      "Abyssal Warden — pro",      "Hulking abyss-touched tank in barnacled plate, anchor-chain mace, gaping waterlogged maw under helm, dripping black brine, gritty mature dark fantasy gory survival horror"),
    ("shade_caller",        "Shade Caller — pro",        "Tall robed shade-summoner, hood empty save for two cold pinpoints, wisps of shadowy figures clinging to outstretched arms, staff of twisted soulglass, gritty mature dark fantasy gory survival horror"),
    ("dread_knight",        "Dread Knight — pro",        "Towering dread knight in spiked obsidian plate, horned skull-helm leaking smoke, cursed greatsword wreathed in dark mist, mantle of shredded hides, gritty mature dark fantasy gory survival horror"),
    ("corpse_hound",        "Corpse Hound — pro",        "Bipedal corpse-hound abomination, dog skull on humanoid frame, exposed sinew, claws curled, drooling tar, gritty mature dark fantasy gory survival horror"),
    ("starfall_lich",       "Starfall Lich — pro",       "Lich draped in star-pierced robes of midnight blue, scepter of falling meteor, constellation tattoos burned into ribs, comet-trail aura, gritty mature dark fantasy gory survival horror"),
    ("void_juggernaut",     "Void Juggernaut — pro",     "Massive juggernaut in jagged void-iron armor, fists wrapped in chains, helm with a vertical seam leaking dark light, hunched shoulders, gritty mature dark fantasy gory survival horror"),
    ("astral_archer",       "Astral Archer — pro",       "Undead astral archer in star-cloak and bleached bone armor, drawing a sliver-of-starlight bow, quiver of arrows trailing comet dust, hollow socket eyes, gritty mature dark fantasy gory survival horror"),
    ("orb_caster",          "Orb Caster — pro",          "Hovering orb-caster sorcerer, tattered violet robes, levitating glass orbs around hands, sunken corpse-face under hood, runes glowing on chest, gritty mature dark fantasy gory survival horror"),
    ("soul_devourer",       "Soul Devourer — pro",       "Gaunt soul-eating wraith with elongated jaw distended unnaturally, ribcage swallowing wisps of stolen souls, claw fingers, ragged shroud, gritty mature dark fantasy gory survival horror"),
    # === Chapter 10+ apocalypse tier ===
    ("apocalypse_horror",   "Apocalypse Horror — pro",   "Towering apocalypse-tier abomination, fused corpses forming a single warrior, multiple skull faces on a hulking torso, jagged cleaver in mutated arm, gritty mature dark fantasy gory survival horror"),
    ("world_eater_husk",    "World-Eater Husk — pro",    "Enormous gaunt husk of a god-eater, ribcage gaping wide as a maw lined with teeth, withered limbs ending in talons, shroud of shredded continents, gritty mature dark fantasy gory survival horror"),
    ("blood_titan",         "Blood Titan — pro",         "Massive crimson-skinned titan warrior, raw musculature exposed, blood-iron greatsword, bull-horned helm of dried gore, blood-soaked loincloth and chains, gritty mature dark fantasy gory survival horror"),
    ("ash_lord",            "Ash Lord — pro",            "Lord of cinders in cracked obsidian plate, fissures glowing molten orange under skin, scepter of burning bone, crown of black smoke, gritty mature dark fantasy gory survival horror"),
    ("final_revenant",      "Final Revenant — pro",      "Apocalypse-tier revenant in war-torn obsidian regalia, two-handed runic greatsword, half-skull face under a battered fielded helm, ragged battle banner cape, gritty mature dark fantasy gory survival horror"),
    # === Mythic bosses (kept humanoid for the pipeline) ===
    ("bonewake_dragon",     "Bonewake Dragon — pro",     "Humanoid draconic warrior, skull of a wyrm fused to a hulking knight body, tattered wings as a cape, blackened scales and fire-cracked horns, jagged claymore, gritty mature dark fantasy gory survival horror"),
    ("plague_hydra",        "Plague Hydra — pro",        "Multi-headed hydra warrior, three serpent skulls grafted to a humanoid plague-knight torso, venom dripping from each maw, robe of slime, gritty mature dark fantasy gory survival horror"),
    ("rot_phoenix",         "Rot Phoenix — pro",         "Decayed phoenix-warrior, charred feathered cloak, burning skull beak, smoldering rotten plumage on shoulders, embers and rot dripping from clawed hands, gritty mature dark fantasy gory survival horror"),
    ("bone_cerberus",       "Bone Cerberus — pro",       "Three-skulled cerberus warrior, three canine skulls fused atop a hulking humanoid torso, chained collars, exposed ribs, claws of bone, gritty mature dark fantasy gory survival horror"),
    ("wraith_kraken",       "Wraith Kraken — pro",       "Wraithlike kraken-priest, humanoid sorcerer with octopus skull face, writhing ghostly tentacles from sleeves and back, drowned mariner robes, gritty mature dark fantasy gory survival horror"),
    ("necro_sphinx",        "Necro Sphinx — pro",        "Sphinx-warrior, lion-skull faced mummified humanoid, gold death mask cracked, withered linen wrappings, claws sheathed in dust, gritty mature dark fantasy gory survival horror"),
    ("crimson_centaur",     "Crimson Centaur — pro",     "Humanoid centaur-knight, horse-skull helm, blood-red barding strapped to muscled torso, broken lance and gore-streaked round shield, gritty mature dark fantasy gory survival horror"),
    ("lich_king",           "The Lich King — pro",       "Ancient lich king in iron-spiked crown and frost-rimed black plate, frozen heart visible through chestplate, runed two-handed sword, mantle of frost and bone, gritty mature dark fantasy gory survival horror"),
    ("bone_titan",          "Bone Titan — pro",          "Colossal bone-stitched titan, fused-skull head with mismatched horns, ribcage helm, mountainous shoulders of ossified plates, club of femurs, gritty mature dark fantasy gory survival horror"),
    ("ash_empress",         "Ash Empress — pro",         "Imperious ash-empress lich, gown of soot-grey lace and embers, crown of burned bone, scepter of cinder, ash drifting from sunken eye sockets, gritty mature dark fantasy gory survival horror"),
    ("soul_reaper",         "Soul Reaper — pro",         "Tall reaper in tattered grey robes, scythe forged from a spine, hood empty save for two cold green flames, skeletal hands wrapping the haft, gritty mature dark fantasy gory survival horror"),
    ("voidlord",            "Voidlord — pro",            "Voidlord overlord in fractured starless plate, helm crowned with broken horns leaking dark fog, two-handed obsidian axe, cloak swallowing surrounding light, gritty mature dark fantasy gory survival horror"),
    ("worm_god",            "The Worm God — pro",        "Worm-god humanoid avatar, segmented annelid lower body coiled like legs, ringed teeth in a circular mouth on a pale humanoid torso, dripping mucus, gritty mature dark fantasy gory survival horror"),
]


def main() -> int:
    path = Path(__file__).parent / "pro_enemy_queue.json"
    data = json.loads(path.read_text())
    done = {s["slug"] for s in data["submitted"]}
    pending = {p.get("slug") for p in data.get("pending", [])}
    added = []
    for slug, name, desc in ROUND2:
        if slug in done or slug in pending:
            continue
        data["pending"].append({"slug": slug, "name": name, "description": desc})
        added.append(slug)
    path.write_text(json.dumps(data, indent=2))
    print(f"appended {len(added)} pending entries")
    for s in added:
        print(f"  + {s}")
    print(f"submitted: {len(data['submitted'])}  pending: {len(data['pending'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
