import type { EquipSlot } from '../types';

export type LootRarity = 1 | 2 | 3 | 4 | 5;

export const LOOT_RARITY_NAME: Record<LootRarity, string> = {
  1: 'Common',
  2: 'Magic',
  3: 'Rare',
  4: 'Epic',
  5: 'Legendary',
};

export const LOOT_RARITY_COLOR: Record<LootRarity, string> = {
  1: '#9ca3af', // gray
  2: '#3b82f6', // blue
  3: '#facc15', // yellow
  4: '#a855f7', // purple
  5: '#f97316', // orange
};

export type LootStat = 'hp' | 'atk' | 'def' | 'spd' | 'crit';

export interface BaseItem {
  id: string;
  name: string;
  slot: EquipSlot;
  emoji: string;
  primary: LootStat;
  // Roll range at item level 1. Scales with item level (×(1 + (ilvl-1)*0.06))
  baseMin: number;
  baseMax: number;
  // Possible affix stats (excluding primary)
  affixPool: LootStat[];
}

export const BASE_ITEMS: BaseItem[] = [
  // Weapons
  { id: 'sword',  name: 'Sword',  slot: 'weapon', emoji: '⚔️', primary: 'atk',
    baseMin: 25, baseMax: 50, affixPool: ['atk', 'crit', 'spd', 'hp'] },
  { id: 'staff',  name: 'Staff',  slot: 'weapon', emoji: '🪄', primary: 'atk',
    baseMin: 30, baseMax: 60, affixPool: ['atk', 'crit', 'hp'] },
  { id: 'bow',    name: 'Bow',    slot: 'weapon', emoji: '🏹', primary: 'atk',
    baseMin: 22, baseMax: 45, affixPool: ['atk', 'spd', 'crit', 'def'] },
  { id: 'axe',    name: 'Axe',    slot: 'weapon', emoji: '🪓', primary: 'atk',
    baseMin: 30, baseMax: 55, affixPool: ['atk', 'hp', 'crit'] },

  // Armor
  { id: 'plate',  name: 'Plate Armor', slot: 'armor', emoji: '🛡️', primary: 'def',
    baseMin: 14, baseMax: 35, affixPool: ['hp', 'def', 'atk'] },
  { id: 'robe',   name: 'Robe',        slot: 'armor', emoji: '🧥', primary: 'def',
    baseMin: 6, baseMax: 18, affixPool: ['hp', 'atk', 'crit', 'spd'] },
  { id: 'leather',name: 'Leather Vest',slot: 'armor', emoji: '🦺', primary: 'def',
    baseMin: 10, baseMax: 24, affixPool: ['hp', 'spd', 'def'] },

  // Helms
  { id: 'helm',   name: 'Helm',  slot: 'helm', emoji: '⛑️', primary: 'hp',
    baseMin: 80, baseMax: 180, affixPool: ['hp', 'def', 'atk'] },
  { id: 'hood',   name: 'Hood',  slot: 'helm', emoji: '🧥', primary: 'hp',
    baseMin: 60, baseMax: 140, affixPool: ['spd', 'crit', 'hp'] },
  { id: 'crown',  name: 'Crown', slot: 'helm', emoji: '👑', primary: 'hp',
    baseMin: 100, baseMax: 220, affixPool: ['hp', 'crit', 'atk'] },

  // Boots
  { id: 'boots',  name: 'Boots', slot: 'boots', emoji: '🥾', primary: 'spd',
    baseMin: 6, baseMax: 18, affixPool: ['spd', 'def', 'hp'] },
  { id: 'sandals',name: 'Sandals', slot: 'boots', emoji: '🥾', primary: 'spd',
    baseMin: 8, baseMax: 22, affixPool: ['spd', 'crit', 'def'] },

  // Accessories
  { id: 'amulet', name: 'Amulet', slot: 'accessory', emoji: '🔮', primary: 'crit',
    baseMin: 0.03, baseMax: 0.08, affixPool: ['atk', 'crit', 'spd', 'hp'] },
  { id: 'ring',   name: 'Ring',   slot: 'accessory', emoji: '💍', primary: 'atk',
    baseMin: 15, baseMax: 35, affixPool: ['atk', 'crit', 'hp'] },
  { id: 'talisman', name: 'Talisman', slot: 'accessory', emoji: '🧿', primary: 'hp',
    baseMin: 60, baseMax: 140, affixPool: ['hp', 'def', 'crit'] },
];

export const BASE_BY_ID = Object.fromEntries(BASE_ITEMS.map(b => [b.id, b]));

// Which heroes can use each base type. Loot is assigned to a specific hero
// at DROP time: roll the base, then pick a random owned hero from its class
// list (a bow is always an archer's; if two archers exist someday, drops
// randomize between them). Bases not listed here (accessories) fit anyone.
export const BASE_CLASS_USERS: Record<string, string[]> = {
  // Weapons — matched to each hero's actual armament
  bow:    ['elara'],
  staff:  ['luna', 'aelia', 'pyra', 'manny'],
  sword:  ['kaius', 'reiji', 'twins', 'len'],
  axe:    ['korvan', 'george', 'kengo', 'chino'],
  // Armor
  plate:   ['kaius', 'kengo', 'george', 'korvan'],
  robe:    ['luna', 'aelia', 'pyra', 'manny'],
  leather: ['elara', 'len', 'chino', 'reiji', 'twins'],
  // Helms
  helm:  ['kaius', 'kengo', 'george', 'korvan'],
  hood:  ['elara', 'len', 'chino', 'reiji', 'twins'],
  crown: ['luna', 'aelia', 'pyra', 'manny'],
  // Boots
  boots:   ['kaius', 'kengo', 'george', 'korvan', 'reiji', 'twins', 'chino'],
  sandals: ['elara', 'len', 'luna', 'aelia', 'pyra', 'manny'],
};

// Pick the owner for a fresh drop: random eligible owned hero, falling back
// to any owned hero when the player owns nobody of that class yet.
export function pickOwnerFor(baseId: string, ownedTemplateIds: string[]): string | undefined {
  if (ownedTemplateIds.length === 0) return undefined;
  const users = BASE_CLASS_USERS[baseId];
  const eligible = users ? ownedTemplateIds.filter(t => users.includes(t)) : ownedTemplateIds;
  const pool = eligible.length > 0 ? eligible : ownedTemplateIds;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Naming pools
export const PREFIXES = [
  'Iron', 'Steel', 'Bone', 'Shadow', 'Frost', 'Flame', 'Storm', 'Ancient',
  'Ruined', 'Sacred', 'Cursed', 'Royal', 'Dread', 'Glowing', 'Pale', 'Eldritch',
  'Grim', 'Sunlit', 'Lunar', 'Silver',
];

export const SUFFIX_BY_STAT: Record<LootStat, string[]> = {
  hp:   ['the Bear', 'the Mountain', 'Vigor', 'the Whale', 'the Boar', 'Stoneskin'],
  atk:  ['Slaying', 'the Bear', 'Ruin', 'the Storm', 'Doom', 'Carnage'],
  def:  ['Warding', 'the Turtle', 'the Wall', 'Iron', 'Aegis', 'Bulwark'],
  spd:  ['the Wind', 'the Fox', 'Haste', 'Swiftness', 'the Hare', 'Zephyr'],
  crit: ['Precision', 'the Hawk', 'the Eye', 'the Adept', 'Striking', 'Mastery'],
};

// Unique legendary names (rolled randomly for rarity 5)
export const LEGENDARY_NAMES: Record<EquipSlot, string[]> = {
  weapon:    ['Soulreaver', 'Worldender', 'Dawnbringer', 'Bonehowl', 'Voidpiercer'],
  armor:     ['Aegis of the Fallen', 'Carapace of Stars', 'Worldweave', 'Lichgrip Plate'],
  helm:      ['Crown of Embers', 'Witness Crown', 'Diadem of Silence', 'Skullveil'],
  boots:     ['Stridercaps', 'Wandering Hoof', 'Shadowstride', 'Moonwalker'],
  accessory: ['Heart of Yore', 'Lifestone', 'Souldrop', 'Eye of the Abyss', 'Astral Talisman'],
};

// Drop rate weights — sum doesn't have to be 100, the function normalizes.
export const RARITY_WEIGHTS: Record<LootRarity, number> = {
  1: 60,  // Common
  2: 28,  // Magic
  3: 9,   // Rare
  4: 1.5, // Epic
  5: 0.2, // Legendary
};

// Minimum affix count per rarity. Actual count = min + chance of +1
// (see AFFIX_BONUS_CHANCE) so the player sometimes gets a "lucky"
// extra mod — classic ARPG-looter excitement. Common rolls 0 affixes;
// Legendary always rolls 4, with 60% chance to add a 5th.
export const AFFIX_COUNT: Record<LootRarity, number> = {
  1: 0, 2: 1, 3: 2, 4: 3, 5: 4,
};

// Chance to roll an extra affix on top of the rarity's minimum. Tunes
// the "did I get a god drop" frequency without changing the base curve.
export const AFFIX_BONUS_CHANCE: Record<LootRarity, number> = {
  1: 0.00,
  2: 0.40,
  3: 0.50,
  4: 0.55,
  5: 0.60,
};

// Primary stat magnitude multiplier per rarity (above the baseMin/Max range)
export const PRIMARY_MULT: Record<LootRarity, [number, number]> = {
  1: [0.5, 0.8],
  2: [0.7, 1.0],
  3: [0.9, 1.2],
  4: [1.1, 1.4],
  5: [1.3, 1.7],
};

// Per-affix-stat value ranges at item level 1. Wide ranges by design —
// a tier-1 god-roll atk affix lands near the top, a tier-20 dud near
// the bottom. Same stat can appear on different slots; the spread is
// what creates "hunt for the perfect roll" tension.
//
// Compared to the original tight bands (atk 8-24, hp 40-120), these are
// 3-4x wider. Most rolls cluster around the mid range due to the
// quality-roll bias curve in lib/loot.ts; god rolls genuinely matter.
export const AFFIX_RANGE: Record<LootStat, [number, number]> = {
  hp:   [15,   260],
  atk:  [3,     62],
  def:  [2,     48],
  spd:  [1,     22],
  crit: [0.005, 0.18],
};

// Item-level scaling for affix values. At iLvl N, the rolled value is
// multiplied by (1 + (N-1) * AFFIX_ILVL_SCALE). Steeper than the
// original 0.08 because the wider base ranges already handle most of
// the variance — ilvl now mainly bumps the floor.
export const AFFIX_ILVL_SCALE = 0.05;
