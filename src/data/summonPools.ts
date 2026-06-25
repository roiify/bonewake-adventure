import type { SummonPool } from '../types';

// Pool roll outcome is a STAR TIER, not a rarity:
//   3 = S (base, most common)
//   4 = SS
//   5 = SSS
// The pulled hero is added at that star level. Promotion still works via fragments.
//
// Five pools total — two hero pulls + three resource-summon pools that
// replaced Friend Wish (which was strictly worse than the gold-daily
// Standard pool once the player had any equipment).
//
// Order is display priority: Stellar > Standard > Equipment > Socket > Material.
export const SUMMON_POOLS: SummonPool[] = [
  {
    id: 'premium',
    name: 'Stellar Wish',
    kind: 'hero',
    // Single-player pacing pass: SSS 0.6% (was 1%), SS 9% (was 18%) so
    // the roster fills out over weeks, not days. Pity eased to 120 as the
    // counterweight — a guaranteed SSS is never more than 120 pulls away.
    description: 'Best odds. Featured SSS hero · pity SSS at 120.',
    cost: { currency: 'gems', amount: 15 },
    rates: { 3: 0.904, 4: 0.09, 5: 0.006 },
    pityFive: 120,
    featuredHeroId: 'luna',
  },
  {
    id: 'standard',
    name: 'Standard Wish',
    kind: 'hero',
    description: 'Cheap gold pulls. Mostly S, rare SS, almost never SSS.',
    // SSS halved again (0.25% → 0.10%), SS trimmed (7% → 5%) to keep
    // the standard banner as a low-stakes filler, not a real SSS path.
    cost: { currency: 'gold', amount: 500 },
    rates: { 3: 0.9748, 4: 0.025, 5: 0.0002 },
    pityFive: null,
  },
  {
    id: 'equipment',
    name: 'Equipment Wish',
    kind: 'equipment',
    description: 'Random gear roll at high item level. Mostly Rare+, chance for Legendary.',
    cost: { currency: 'gems', amount: 12 },
    rates: { 3: 0, 4: 0, 5: 0 }, // unused for non-hero pools
    pityFive: null,
    equipmentItemLevel: 60,
    equipmentMinRarity: 3,
  },
  {
    id: 'socket',
    name: 'Socket Wish',
    kind: 'socket',
    description: 'Random socketable gem. Stat & tier are RNG up to Radiant (T3).',
    cost: { currency: 'gold', amount: 600 },
    rates: { 3: 0, 4: 0, 5: 0 },
    pityFive: null,
    socketMaxTier: 3,
  },
  {
    id: 'material',
    name: 'Material Wish',
    kind: 'material',
    description: 'Bundle of soulshards. Small chance to also pull a hero essence.',
    cost: { currency: 'gold', amount: 400 },
    rates: { 3: 0, 4: 0, 5: 0 },
    pityFive: null,
    materialSoulshardMin: 6,
    materialSoulshardMax: 14,
    materialEssenceChance: 0.08,
  },
];

export const POOL_BY_ID = Object.fromEntries(SUMMON_POOLS.map(p => [p.id, p]));
