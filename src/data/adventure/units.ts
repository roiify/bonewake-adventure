// Self-contained unit data + stat math for Bonewake Adventure. Nothing here is
// imported from the old gacha game — only the sprite PNGs are shared (referenced
// by `sprite` keys under public/sprites/...). Tuned for real-time action combat.

export type Element = 'fire' | 'water' | 'earth' | 'light' | 'dark';

export interface BaseStats { hp: number; atk: number; def: number; spd: number; crit: number; }

// Optional animated-spritesheet character (grid sheets per state). Rows = facing
// direction, columns = animation frames. Engine plays frames by movement state.
export interface HeroAnim {
  mode?: 'dir8' | 'side';  // dir8 (per-direction rows, default) | side (one sheet, flip L/R)
  base: string;            // dir8: asset folder (idle/walk/attack.png); side: full sheet path
  cols: number;            // frames per row
  rows: number;
  fps: number;
  h: number;               // billboard height in world units
  frameW?: number;         // default 64 (dir8 square)
  frameH?: number;
  dir?: { north: number; south: number; east: number; west: number }; // dir8 row per facing
  states?: { idle: [number, number]; walk: [number, number]; attack: [number, number] }; // side: [row, frameCount]
}

export interface HeroDef {
  id: string;            // sprite key (public/sprites/pixellab/heroes/pro/<id>_*.png)
  name: string;
  role: string;
  element: Element;
  ranged: boolean;
  base: BaseStats;
  anim?: HeroAnim;       // present = animated spritesheet character
}

export interface EnemyDef {
  id: string;            // sprite key (public/sprites/pixellab/enemies/pro/<id>_*.png)
  name: string;
  element: Element;
  ranged: boolean;
  base: BaseStats;       // stats at level 1
}

// --- ARPG itemization (Diablo / PoE style) ---
export type Slot = 'weapon' | 'armor' | 'helm' | 'boots' | 'amulet' | 'ring';
export const SLOTS: Slot[] = ['weapon', 'armor', 'helm', 'boots', 'amulet', 'ring'];
export type Rarity = 1 | 2 | 3 | 4 | 5; // common / magic / rare / epic / legendary
export const RARITY = [
  { name: '', color: '#888' },
  { name: 'Common', color: '#b8b8b8', affixes: 1 },
  { name: 'Magic', color: '#6ea8ff', affixes: 2 },
  { name: 'Rare', color: '#ffd24a', affixes: 3 },
  { name: 'Epic', color: '#c06bff', affixes: 4 },
  { name: 'Legendary', color: '#ff8a3a', affixes: 5 },
] as const;
export type AffixStat = 'atk' | 'hp' | 'def' | 'crit' | 'spd' | 'atkPct' | 'hpPct' | 'power';
export interface Affix { stat: AffixStat; value: number; }
export interface Item { id: string; slot: Slot; base: string; name: string; rarity: Rarity; itemLevel: number; affixes: Affix[]; }
// Back-compat alias (older code referenced GearPiece)
export type GearPiece = Item;

// Playable heroes (party). Stats are action-tuned (not the gacha bags).
export const HEROES: Record<string, HeroDef> = {
  // animated test character (8-dir spritesheets w/ sword & shield)
  test: { id: 'test', name: 'Test', role: 'Knight', element: 'light', ranged: false, base: { hp: 1300, atk: 175, def: 95, spd: 88, crit: 0.16 },
    anim: { mode: 'dir8', base: 'sprites/test', cols: 15, rows: 8, fps: 12, dir: { north: 6, south: 2, east: 0, west: 4 }, h: 2.8 } },
  // Heroes99 composited characters (side-view, flip L/R; idle row1 / run row3 / attack row6)
  blade: { id: 'blade', name: 'Blade', role: 'Swordsman', element: 'fire', ranged: false, base: { hp: 1250, atk: 185, def: 85, spd: 92, crit: 0.18 }, anim: { mode: 'side', base: 'sprites/h99/blade.png', cols: 8, rows: 17, fps: 10, h: 2.1, frameW: 100, frameH: 40, states: { idle: [0, 6], walk: [2, 8], attack: [5, 6] } } },
  ranger: { id: 'ranger', name: 'Ranger', role: 'Skirmisher', element: 'earth', ranged: false, base: { hp: 1100, atk: 180, def: 70, spd: 100, crit: 0.22 }, anim: { mode: 'side', base: 'sprites/h99/ranger.png', cols: 8, rows: 17, fps: 10, h: 2.1, frameW: 100, frameH: 40, states: { idle: [0, 6], walk: [2, 8], attack: [5, 6] } } },
  warden: { id: 'warden', name: 'Warden', role: 'Guardian', element: 'water', ranged: false, base: { hp: 1500, atk: 150, def: 120, spd: 64, crit: 0.10 }, anim: { mode: 'side', base: 'sprites/h99/warden.png', cols: 8, rows: 17, fps: 10, h: 2.1, frameW: 100, frameH: 40, states: { idle: [0, 6], walk: [2, 8], attack: [5, 6] } } },
  mage: { id: 'mage', name: 'Mage', role: 'Spellblade', element: 'light', ranged: false, base: { hp: 1050, atk: 195, def: 62, spd: 84, crit: 0.16 }, anim: { mode: 'side', base: 'sprites/h99/mage.png', cols: 8, rows: 17, fps: 10, h: 2.1, frameW: 100, frameH: 40, states: { idle: [0, 6], walk: [2, 8], attack: [5, 6] } } },
  brute: { id: 'brute', name: 'Brute', role: 'Berserker', element: 'dark', ranged: false, base: { hp: 1700, atk: 165, def: 100, spd: 58, crit: 0.12 }, anim: { mode: 'side', base: 'sprites/h99/brute.png', cols: 8, rows: 17, fps: 10, h: 2.3, frameW: 100, frameH: 40, states: { idle: [0, 6], walk: [2, 8], attack: [5, 6] } } },
  scout: { id: 'scout', name: 'Scout', role: 'Duelist', element: 'earth', ranged: false, base: { hp: 1150, atk: 178, def: 75, spd: 98, crit: 0.20 }, anim: { mode: 'side', base: 'sprites/h99/scout.png', cols: 8, rows: 17, fps: 10, h: 2.1, frameW: 100, frameH: 40, states: { idle: [0, 6], walk: [2, 8], attack: [5, 6] } } },
  // melee
  reiji: { id: 'reiji', name: 'Reiji', role: 'Ronin', element: 'dark', ranged: false, base: { hp: 1180, atk: 180, def: 82, spd: 92, crit: 0.20 } },
  kengo: { id: 'kengo', name: 'Kengo', role: 'Pit Fighter', element: 'earth', ranged: false, base: { hp: 1300, atk: 160, def: 95, spd: 72, crit: 0.10 } },
  kaius: { id: 'kaius', name: 'Kaius', role: 'Fallen Paladin', element: 'light', ranged: false, base: { hp: 1750, atk: 130, def: 145, spd: 50, crit: 0.08 } },
  george: { id: 'george', name: 'George', role: 'Wild Shaman', element: 'earth', ranged: false, base: { hp: 1500, atk: 150, def: 100, spd: 60, crit: 0.10 } },
  korvan: { id: 'korvan', name: 'Korvan', role: 'Soul-Reaper', element: 'dark', ranged: false, base: { hp: 1350, atk: 170, def: 90, spd: 70, crit: 0.14 } },
  len: { id: 'len', name: 'Arcaveli', role: 'Veteran Assassin', element: 'dark', ranged: false, base: { hp: 950, atk: 185, def: 60, spd: 98, crit: 0.24 } },
  chino: { id: 'chino', name: 'Chino', role: 'Drunken Master', element: 'earth', ranged: false, base: { hp: 1200, atk: 158, def: 88, spd: 80, crit: 0.16 } },
  // ranged
  elara: { id: 'elara', name: 'Elara', role: 'Plague Archer', element: 'earth', ranged: true, base: { hp: 920, atk: 180, def: 58, spd: 96, crit: 0.22 } },
  luna: { id: 'luna', name: 'Luna', role: 'Bloodmage', element: 'light', ranged: true, base: { hp: 1050, atk: 145, def: 70, spd: 82, crit: 0.08 } },
  aelia: { id: 'aelia', name: 'Aelia', role: 'Frost Mage', element: 'water', ranged: true, base: { hp: 980, atk: 175, def: 62, spd: 78, crit: 0.14 } },
  pyra: { id: 'pyra', name: 'Pyra', role: 'Pyromancer', element: 'fire', ranged: true, base: { hp: 980, atk: 185, def: 60, spd: 80, crit: 0.15 } },
  manny: { id: 'manny', name: 'Manny', role: 'Death Caller', element: 'dark', ranged: true, base: { hp: 1000, atk: 170, def: 65, spd: 72, crit: 0.12 } },
  twins: { id: 'twins', name: 'The Twins', role: 'Bound As One', element: 'light', ranged: true, base: { hp: 1100, atk: 178, def: 70, spd: 85, crit: 0.16 } },
};

export const ROSTER: HeroDef[] = Object.values(HEROES);

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

// Hero's effective stats = level scaling + equipped-item affixes (flat + %).
export function heroStats(def: HeroDef, level: number, items: Item[]): BaseStats & { power: number } {
  const s = statsAtLevel(def.base, level);
  let atkPct = 0, hpPct = 0, power = 0;
  for (const it of items) for (const a of it.affixes) {
    if (a.stat === 'atk') s.atk += a.value;
    else if (a.stat === 'hp') s.hp += a.value;
    else if (a.stat === 'def') s.def += a.value;
    else if (a.stat === 'crit') s.crit += a.value;
    else if (a.stat === 'spd') s.spd += a.value;
    else if (a.stat === 'atkPct') atkPct += a.value;
    else if (a.stat === 'hpPct') hpPct += a.value;
    else if (a.stat === 'power') power += a.value;
  }
  s.atk = Math.round(s.atk * (1 + atkPct));
  s.hp = Math.round(s.hp * (1 + hpPct));
  return { ...s, power };
}

export const xpForLevel = (level: number) => Math.round(40 * Math.pow(1.22, level - 1));

const WEAPON_BASES = { melee: ['Bone Cleaver', 'Grave Maul', 'Rusted Katana', 'Marrow Spike', 'Ash Glaive'], ranged: ['Plague Bow', 'Bone Staff', 'Hex Wand', 'Spine Sling', 'Wraith Censer'] };
const BASES: Record<Slot, string[]> = {
  weapon: [],
  armor: ['Tattered Hauberk', 'Plague Mail', 'Bonewrought Vest', 'Rotscale Plate'],
  helm: ['Skull Cowl', 'Cracked Helm', 'Vanguard Visor', 'Mire Hood'],
  boots: ['Ash-Walkers', 'Crypt Treads', 'Worn Greaves', 'Bog Boots'],
  amulet: ['Pale Charm', 'Soul Bead', 'Wake-Ward Sigil', 'Bone Locket'],
  ring: ['Grave Band', 'Cure-Vial Ring', 'Rot Signet', 'Marrow Ring'],
};
const SUFFIX = ['of the Grave', 'of Ash', 'of the Wake', 'of Rot', 'of the Cure', 'of Bone', 'of the Pale', 'of Marrow'];
const rng = () => 0.7 + Math.random() * 0.6;
type AffixDef = { stat: AffixStat; label: (v: number) => string; roll: (il: number) => number };
const AFFIXES: AffixDef[] = [
  { stat: 'atk', label: (v) => `+${v} ATK`, roll: (il) => Math.round(il * 1.7 * rng()) },
  { stat: 'hp', label: (v) => `+${v} HP`, roll: (il) => Math.round(il * 10 * rng()) },
  { stat: 'def', label: (v) => `+${v} DEF`, roll: (il) => Math.round(il * 1.1 * rng()) },
  { stat: 'crit', label: (v) => `+${(v * 100).toFixed(1)}% Crit`, roll: () => +(0.02 + Math.random() * 0.05).toFixed(3) },
  { stat: 'spd', label: (v) => `+${v} Speed`, roll: () => Math.round(2 + Math.random() * 6) },
  { stat: 'atkPct', label: (v) => `+${Math.round(v * 100)}% ATK`, roll: () => +(0.05 + Math.random() * 0.12).toFixed(2) },
  { stat: 'hpPct', label: (v) => `+${Math.round(v * 100)}% HP`, roll: () => +(0.05 + Math.random() * 0.12).toFixed(2) },
  { stat: 'power', label: (v) => `+${Math.round(v * 100)}% Damage`, roll: () => +(0.05 + Math.random() * 0.13).toFixed(2) },
];
const AFFIX_BY_STAT = Object.fromEntries(AFFIXES.map((a) => [a.stat, a])) as Record<AffixStat, AffixDef>;
export function affixLabel(a: Affix): string { return AFFIX_BY_STAT[a.stat].label(a.value); }

let itemCounter = 0;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function rollRarity(luck = 0, minRarity: Rarity = 1): Rarity {
  const r = Math.random();
  const leg = 0.01 + luck * 0.015, epic = 0.05 + luck * 0.04, rare = 0.16 + luck * 0.06, magic = 0.34;
  let rar: Rarity = 1;
  if (r < leg) rar = 5; else if (r < leg + epic) rar = 4; else if (r < leg + epic + rare) rar = 3; else if (r < leg + epic + rare + magic) rar = 2;
  return Math.max(rar, minRarity) as Rarity;
}

// Roll an item biased to the character (weapon by melee/ranged; slot-appropriate
// primary affix; higher rarity = more affixes).
export function rollItem(itemLevel: number, opts: { ranged?: boolean; minRarity?: Rarity; luck?: number; forceRarity?: Rarity } = {}): Item {
  const rarity = opts.forceRarity ?? rollRarity(opts.luck ?? 0, opts.minRarity ?? 1);
  const slot = pick(SLOTS);
  const base = slot === 'weapon' ? pick(opts.ranged ? WEAPON_BASES.ranged : WEAPON_BASES.melee) : pick(BASES[slot]);
  const count = RARITY[rarity].affixes ?? 1;
  const primary: AffixStat = slot === 'weapon' ? (Math.random() < 0.5 ? 'atk' : 'atkPct')
    : (slot === 'armor' || slot === 'helm') ? (Math.random() < 0.5 ? 'hp' : 'def')
      : slot === 'boots' ? 'spd' : pick(['crit', 'power', 'atkPct', 'hpPct'] as AffixStat[]);
  const chosen: AffixStat[] = [primary];
  const remaining = AFFIXES.map((a) => a.stat).filter((s) => s !== primary);
  while (chosen.length < count && remaining.length) chosen.push(remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0]);
  const affixes: Affix[] = chosen.map((stat) => ({ stat, value: AFFIX_BY_STAT[stat].roll(itemLevel) }));
  const name = `${RARITY[rarity].name} ${base}${rarity >= 3 ? ' ' + pick(SUFFIX) : ''}`.trim();
  itemCounter += 1;
  return { id: `it${Date.now().toString(36)}${itemCounter}`, slot, base, name, rarity, itemLevel, affixes };
}

export function itemScore(it: Item): number {
  let s = 0;
  for (const a of it.affixes) {
    if (a.stat === 'atk') s += a.value * 2; else if (a.stat === 'hp') s += a.value * 0.15; else if (a.stat === 'def') s += a.value;
    else if (a.stat === 'crit') s += a.value * 800; else if (a.stat === 'spd') s += a.value * 3;
    else if (a.stat === 'atkPct') s += a.value * 400; else if (a.stat === 'hpPct') s += a.value * 200; else if (a.stat === 'power') s += a.value * 500;
  }
  return Math.round(s);
}

// Gold an item sells / salvages for.
export const itemSellValue = (it: Item) => Math.round(itemScore(it) * 0.4) + it.rarity * 6 + it.itemLevel;
