// Gem system — socketable into equipment. Drop from battles.
import type { LootStat } from './loot';

export type GemTier = 1 | 2 | 3 | 4 | 5;

export const GEM_TIER_NAME: Record<GemTier, string> = {
  1: 'Chip', 2: 'Stone', 3: 'Gem', 4: 'Crystal', 5: 'Ultimate',
};
export const GEM_TIER_COLOR: Record<GemTier, string> = {
  1: '#9ca3af', 2: '#3b82f6', 3: '#a855f7', 4: '#f59e0b', 5: '#fb7185',
};

export interface GemDef {
  id: string;             // e.g., 'gem_atk_2' or 'gem_ult_luna'
  stat: LootStat;
  tier: GemTier;
  value: number;          // primary stat boost provided
  emoji: string;
  name: string;
  // For tier-5 (Ultimate) gems: secondary stats bundled into the same gem
  // so one socket gives a meaningful hero-specific boost.
  bonusStats?: Partial<Record<LootStat, number>>;
  heroId?: string;        // tier-5 gems are bound to a hero (crafted, not random)
}

// Generate gem definitions for each stat × tier. DEF values doubled vs
// the original scale — with fewer gem slots and ults disabled, def gems
// were strictly worse than atk; bumping them keeps tank builds viable.
const STAT_VALUES: Record<LootStat, [number, number, number, number]> = {
  // [tier 1, 2, 3, 4]
  hp:   [80, 220, 480, 900],
  atk:  [12, 30, 60, 120],
  def:  [16, 40, 85, 180],
  spd:  [4, 9, 16, 30],
  crit: [0.015, 0.03, 0.06, 0.10],
};

const GEM_EMOJI: Record<LootStat, string> = {
  hp: '🔴', atk: '🟠', def: '🟢', spd: '🟣', crit: '🟡',
};

export const GEMS: GemDef[] = [];
(['hp', 'atk', 'def', 'spd', 'crit'] as LootStat[]).forEach(stat => {
  ([1, 2, 3, 4] as GemTier[]).forEach(tier => {
    GEMS.push({
      id: `gem_${stat}_${tier}`,
      stat,
      tier,
      value: STAT_VALUES[stat][tier - 1],
      emoji: GEM_EMOJI[stat],
      name: `${stat === 'hp' ? 'Ruby' : stat === 'atk' ? 'Garnet' : stat === 'def' ? 'Emerald' : stat === 'spd' ? 'Amethyst' : 'Topaz'} ${GEM_TIER_NAME[tier]}`,
    });
  });
});

// ============ TIER 5 — ULTIMATE SOCKET GEMS (one per hero) ============
// Crafted from the same materials as ultimate gear pieces. Bound to a
// hero (cannot drop, cannot be socketed into another hero's gear via
// auto-fill — UI checks heroId). Carries one primary stat + a bonus
// stat bundle tuned to the hero's archetype, so they're meaningfully
// stronger than a tier-4 gem but never push one hero past the rest.
interface UltGemSeed { heroId: string; name: string; emoji: string;
  primary: { stat: LootStat; value: number };
  bonus: Partial<Record<LootStat, number>>;
  cost: { soulshard: number; essence: number; gold: number };
}
const ULT_GEM_COST = { soulshard: 90, essence: 40, gold: 30000 };
const ULT_GEM_SEEDS: UltGemSeed[] = [
  // Mages — ATK primary + crit bundle
  { heroId: 'aelia',  name: 'Frost Heart',      emoji: '💠', primary: { stat: 'atk', value: 180 }, bonus: { crit: 0.06, hp: 500 }, cost: ULT_GEM_COST },
  { heroId: 'pyra',   name: 'Ember Core',       emoji: '🔥', primary: { stat: 'atk', value: 180 }, bonus: { crit: 0.06, hp: 500 }, cost: ULT_GEM_COST },
  { heroId: 'manny',  name: 'Soulbinder Stone', emoji: '☠️', primary: { stat: 'atk', value: 180 }, bonus: { crit: 0.06, hp: 500 }, cost: ULT_GEM_COST },
  // Healer — HP primary + atk bundle
  { heroId: 'luna',   name: 'Dawn Tear',        emoji: '☀️', primary: { stat: 'hp',  value: 1500 }, bonus: { atk: 100, def: 65 }, cost: ULT_GEM_COST },
  // Tank — HP primary + def bundle
  { heroId: 'kaius',  name: 'Aegis Sigil',      emoji: '🛡️', primary: { stat: 'hp',  value: 1800 }, bonus: { def: 140, atk: 65 }, cost: ULT_GEM_COST },
  // Warriors — HP/ATK split
  { heroId: 'kengo',  name: 'Mountain Pearl',   emoji: '🪨', primary: { stat: 'hp',  value: 1400 }, bonus: { atk: 130, def: 80 }, cost: ULT_GEM_COST },
  { heroId: 'korvan', name: 'Black Harvest Gem', emoji: '🩸', primary: { stat: 'atk', value: 200 }, bonus: { crit: 0.06, hp: 750 }, cost: ULT_GEM_COST },
  { heroId: 'george', name: 'Heart of the Wild', emoji: '🌿', primary: { stat: 'hp',  value: 1400 }, bonus: { atk: 130, def: 80 }, cost: ULT_GEM_COST },
  // Assassins — CRIT primary + spd bundle. Primary bumped above tier-4
  // (0.18) so the ult feels strictly stronger, not equivalent.
  { heroId: 'len',    name: 'Eclipse Shard',    emoji: '🌒', primary: { stat: 'crit', value: 0.16 }, bonus: { atk: 140, spd: 30 }, cost: ULT_GEM_COST },
  { heroId: 'elara',  name: 'Worldweave Crystal', emoji: '🍃', primary: { stat: 'crit', value: 0.16 }, bonus: { atk: 140, spd: 30 }, cost: ULT_GEM_COST },
  // Chino: warrior brawler — crit+spd bundle to match his drunken-CRIT identity
  { heroId: 'chino',  name: 'Drunken Pearl',      emoji: '🍶', primary: { stat: 'crit', value: 0.15 }, bonus: { atk: 150, spd: 30 }, cost: ULT_GEM_COST },
  // Reiji: dual-blade samurai — ATK primary above tier-4 (200) with crit bundle
  { heroId: 'reiji',  name: 'Eclipse Tear',       emoji: '☯️', primary: { stat: 'atk', value: 200 }, bonus: { crit: 0.07, spd: 25 }, cost: ULT_GEM_COST },
  // Twins: yin-yang duo — ATK primary with hp bundle (two bodies share)
  { heroId: 'twins',  name: 'Mirror Bond Stone',  emoji: '☯️', primary: { stat: 'atk', value: 190 }, bonus: { crit: 0.07, hp: 750 }, cost: ULT_GEM_COST },
  // Warriors — bump Korvan above tier-4 ATK (200) too
];

export const ULT_GEMS: GemDef[] = ULT_GEM_SEEDS.map(s => ({
  id: `gem_ult_${s.heroId}`,
  stat: s.primary.stat,
  tier: 5,
  value: s.primary.value,
  emoji: s.emoji,
  name: s.name,
  bonusStats: s.bonus,
  heroId: s.heroId,
}));
export const ULT_GEM_BY_HERO: Record<string, GemDef> = Object.fromEntries(ULT_GEMS.map(g => [g.heroId!, g]));
export const ULT_GEM_COST_BY_HERO: Record<string, typeof ULT_GEM_COST> = Object.fromEntries(ULT_GEM_SEEDS.map(s => [s.heroId, s.cost]));

// Merge ult gems into the main gem registry so socket UI, inventory,
// and stat aggregation pick them up automatically.
GEMS.push(...ULT_GEMS);

export const GEM_BY_ID = Object.fromEntries(GEMS.map(g => [g.id, g]));

// Socket count by equipment rarity
export const SOCKETS_BY_RARITY: Record<number, number> = {
  1: 0,    // Common — no sockets
  2: 1,    // Magic — 1 socket
  3: 1,    // Rare — 1 socket
  4: 2,    // Epic — 2 sockets
  5: 3,    // Legendary — 3 sockets
  6: 3,    // Mythic — 3 sockets
};

// Random gem generator — used by drop logic
export function randomGem(itemLevel: number): GemDef {
  const r = Math.random();
  const tier: GemTier = itemLevel >= 40 && r < 0.05 ? 4
    : itemLevel >= 25 && r < 0.20 ? 3
    : itemLevel >= 15 && r < 0.45 ? 2
    : 1;
  const stats: LootStat[] = ['hp', 'atk', 'def', 'spd', 'crit'];
  const stat = stats[Math.floor(Math.random() * stats.length)];
  const id = `gem_${stat}_${tier}`;
  return GEM_BY_ID[id];
}

// Items table key for owned gems (one row per gem type, count tracks how many)
export const GEM_INVENTORY_PREFIX = 'inv_';
export const gemInventoryKey = (gemId: string) => `${GEM_INVENTORY_PREFIX}${gemId}`;
