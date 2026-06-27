// Self-contained unit data + stat math for Bonewake Adventure. Nothing here is
// imported from the old gacha game — only the sprite PNGs are shared (referenced
// by `sprite` keys under public/sprites/...). Tuned for real-time action combat.

export type Element = 'fire' | 'water' | 'earth' | 'light' | 'dark';

export interface BaseStats { hp: number; atk: number; def: number; spd: number; crit: number; }

export interface HeroDef {
  id: string;            // sprite key (public/sprites/pixellab/heroes/pro/<id>_*.png)
  name: string;
  role: string;
  element: Element;
  ranged: boolean;
  base: BaseStats;
}

export interface EnemyDef {
  id: string;            // sprite key (public/sprites/pixellab/enemies/pro/<id>_*.png)
  name: string;
  element: Element;
  ranged: boolean;
  base: BaseStats;       // stats at level 1
}

export interface GearPiece { slot: string; name: string; atk: number; hp: number; def: number; rarity: number; }

// Playable heroes (party). Stats are action-tuned (not the gacha bags).
export const HEROES: Record<string, HeroDef> = {
  reiji: { id: 'reiji', name: 'Reiji', role: 'Ronin', element: 'dark', ranged: false, base: { hp: 1180, atk: 180, def: 82, spd: 92, crit: 0.20 } },
  kengo: { id: 'kengo', name: 'Kengo', role: 'Pit Fighter', element: 'earth', ranged: false, base: { hp: 1300, atk: 160, def: 95, spd: 72, crit: 0.10 } },
  luna: { id: 'luna', name: 'Luna', role: 'Bloodmage', element: 'light', ranged: true, base: { hp: 1050, atk: 145, def: 70, spd: 82, crit: 0.08 } },
  elara: { id: 'elara', name: 'Elara', role: 'Plague Archer', element: 'earth', ranged: true, base: { hp: 920, atk: 180, def: 58, spd: 96, crit: 0.22 } },
  kaius: { id: 'kaius', name: 'Kaius', role: 'Fallen Paladin', element: 'light', ranged: false, base: { hp: 1750, atk: 130, def: 145, spd: 50, crit: 0.08 } },
  george: { id: 'george', name: 'George', role: 'Wild Shaman', element: 'earth', ranged: false, base: { hp: 1500, atk: 150, def: 100, spd: 60, crit: 0.10 } },
};

// Common bestiary. Action-tuned (low HP so fights are snappy).
export const ENEMIES: Record<string, EnemyDef> = {
  shambler: { id: 'shambler', name: 'Shambler', element: 'earth', ranged: false, base: { hp: 240, atk: 50, def: 30, spd: 30, crit: 0.05 } },
  fastghoul: { id: 'fastghoul', name: 'Fast Ghoul', element: 'dark', ranged: false, base: { hp: 150, atk: 70, def: 18, spd: 92, crit: 0.18 } },
  boneknight: { id: 'boneknight', name: 'Bone Knight', element: 'earth', ranged: false, base: { hp: 420, atk: 88, def: 60, spd: 55, crit: 0.10 } },
  graveyardlich: { id: 'graveyardlich', name: 'Graveyard Lich', element: 'dark', ranged: true, base: { hp: 520, atk: 115, def: 45, spd: 66, crit: 0.15 } },
};

export const HERO_MAX_LEVEL = 50;

// +8% per level.
export function statsAtLevel(base: BaseStats, level: number): BaseStats {
  const m = 1 + (level - 1) * 0.08;
  return { hp: Math.round(base.hp * m), atk: Math.round(base.atk * m), def: Math.round(base.def * m), spd: base.spd, crit: base.crit };
}

// Hero's effective stats = level scaling + flat gear bonuses.
export function heroStats(def: HeroDef, level: number, gear: GearPiece[]): BaseStats {
  const s = statsAtLevel(def.base, level);
  for (const g of gear) { s.hp += g.hp; s.atk += g.atk; s.def += g.def; }
  return s;
}

export const xpForLevel = (level: number) => Math.round(40 * Math.pow(1.22, level - 1));

const GEAR_SLOTS = ['weapon', 'armor', 'helm', 'boots', 'trinket'];
const GEAR_NAMES: Record<string, string[]> = {
  weapon: ['Bone Cleaver', 'Rusted Blade', 'Grave Maul', 'Marrow Spike'],
  armor: ['Tattered Hauberk', 'Plague Mail', 'Bonewrought Vest', 'Rotscale Plate'],
  helm: ['Cracked Helm', 'Skull Cowl', 'Vanguard Visor', 'Mire Hood'],
  boots: ['Worn Greaves', 'Ash-Walkers', 'Crypt Treads', 'Bog Boots'],
  trinket: ['Pale Charm', 'Soul Bead', 'Wake-Ward Sigil', 'Cure Vial Shard'],
};
const RARITY_NAME = ['', 'Common', 'Fine', 'Rare', 'Cursed', 'Relic'];

// Self-contained loot roll. itemLevel scales magnitude; bosses roll higher rarity.
export function rollGear(itemLevel: number, isBoss: boolean): GearPiece {
  const slot = GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
  const rarity = Math.min(5, (isBoss ? 3 : 1) + Math.floor(Math.random() * (isBoss ? 3 : 3)));
  const mag = itemLevel * (0.8 + rarity * 0.5);
  const name = `${RARITY_NAME[rarity]} ${GEAR_NAMES[slot][Math.floor(Math.random() * GEAR_NAMES[slot].length)]}`;
  // weapons favor atk, armor/helm favor hp/def, etc.
  const atk = slot === 'weapon' ? Math.round(mag * 2) : Math.round(mag * 0.4);
  const hp = slot === 'armor' || slot === 'helm' ? Math.round(mag * 12) : Math.round(mag * 4);
  const def = slot === 'armor' || slot === 'helm' || slot === 'boots' ? Math.round(mag * 1.2) : Math.round(mag * 0.3);
  return { slot, name, atk, hp, def, rarity };
}

export const gearScore = (g: GearPiece) => g.atk * 2 + g.hp * 0.1 + g.def;
