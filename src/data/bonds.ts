// Hero Bonds: bonuses when specific heroes are in the same squad.
import type { LootStat } from './loot';

export interface BondDef {
  id: string;
  name: string;
  description: string;
  heroIds: string[];          // ALL these heroes must be in squad
  bonus: Partial<Record<LootStat, number>>;  // applied to every member of the bond
  emoji: string;
}

// Bond fairness rule: each unique PAIR triggers exactly one pair bond
// and each unique TRIPLE triggers exactly one triple bond.  No two bonds
// share the same hero set.  Power budgets are roughly equal across all
// pair bonds (~225-275 effective power per hero) and across all triple
// bonds (~400-500 per hero) so no team composition is far ahead.
export const BONDS: BondDef[] = [
  // ============ PAIR BONDS (one per unique pair) ============
  // Light: priestess + paladin
  { id: 'dawn_bond',       name: 'Dawn Bond',       description: 'Priestess and paladin radiate light.',
    heroIds: ['luna', 'kaius'],    bonus: { hp: 500, def: 60 },           emoji: '☀️' },
  // Mage + tank: frost + shield
  { id: 'glacial_order',   name: 'Glacial Order',   description: 'Frost mage paired with paladin shield.',
    heroIds: ['aelia', 'kaius'],   bonus: { def: 60, atk: 40 },           emoji: '🧊' },
  // Assassin duo
  { id: 'shadowblades',    name: 'Shadowblades',    description: 'Two assassins move as one.',
    heroIds: ['len', 'elara'],     bonus: { spd: 30, crit: 0.10 },        emoji: '🗡️' },
  // Forest pair: monk + ranger
  { id: 'mountain_creed',  name: 'Mountain Creed',  description: 'Monk and ranger, forest and stone.',
    heroIds: ['kengo', 'elara'],   bonus: { hp: 500, spd: 20 },           emoji: '🏔️' },
  // Earth warriors: druid + monk
  { id: 'earth_bound',     name: 'Earth Bound',     description: 'Two children of the wild stand firm.',
    heroIds: ['kengo', 'george'],  bonus: { hp: 600, def: 40 },           emoji: '🌿' },
  // Mage element clash: fire + water
  { id: 'elemental_storm', name: 'Elemental Storm', description: 'Frost and flame answer each other.',
    heroIds: ['aelia', 'pyra'],    bonus: { atk: 60, crit: 0.04 },        emoji: '🌩️' },
  // Dark warriors: scythe + soul
  { id: 'reapers_pact',    name: "Reapers' Pact",   description: 'Soul-reaper and necromancer trade lives.',
    heroIds: ['korvan', 'manny'],  bonus: { atk: 70, crit: 0.04 },        emoji: '☠️' },
  // Fire-warrior synergy
  { id: 'burning_harvest', name: 'Burning Harvest', description: 'Flame fuels the scythe.',
    heroIds: ['pyra', 'korvan'],   bonus: { atk: 50, hp: 500 },           emoji: '🔥' },
  // Healer + tank-druid
  { id: 'sacred_grove',    name: 'Sacred Grove',    description: 'Druid and priestess mend the broken.',
    heroIds: ['george', 'luna'],   bonus: { hp: 700, def: 30 },           emoji: '🌳' },
  // Death magic + assassin
  { id: 'silent_blade',    name: 'Silent Blade',    description: 'Necromancer and assassin slip past life.',
    heroIds: ['manny', 'len'],     bonus: { spd: 20, crit: 0.06 },        emoji: '🌑' },
  // Drunken master + samurai — two reckless blades
  { id: 'broken_oath',     name: 'Broken Oath',     description: 'Two warriors who refused to die clean.',
    heroIds: ['chino', 'reiji'],   bonus: { atk: 60, crit: 0.05 },        emoji: '🍶' },
  // Twins + healer — light alliance
  { id: 'paired_dawn',     name: 'Paired Dawn',     description: 'Bound siblings find the priestess of dawn.',
    heroIds: ['twins', 'luna'],    bonus: { hp: 600, atk: 40 },           emoji: '☯️' },
  // Twins + tank — protector and the protected
  { id: 'shield_of_bond',  name: 'Shield of Bond',  description: 'The paladin will not let the twins fall.',
    heroIds: ['twins', 'kaius'],   bonus: { hp: 600, def: 50 },           emoji: '🛡️' },
  // Samurai + monk — fellow disciplinarians
  { id: 'iron_discipline', name: 'Iron Discipline', description: 'Same fire, different blade.',
    heroIds: ['reiji', 'kengo'],   bonus: { atk: 50, hp: 500 },           emoji: '🥋' },
  // Drunken master + assassin — chaotic strikers
  { id: 'gutter_kings',    name: 'Gutter Kings',    description: 'A drunk and an assassin own every alley.',
    heroIds: ['chino', 'len'],     bonus: { spd: 25, crit: 0.06 },        emoji: '🗡️' },

  // ============ TRIPLE BONDS (one per unique triple) ============
  { id: 'frost_court',     name: 'Frost Court',     description: 'Aelia leads a winter retinue.',
    heroIds: ['aelia', 'luna', 'kaius'],   bonus: { atk: 80, def: 70, hp: 600 },     emoji: '❄️' },
  { id: 'twilight_pack',   name: 'Twilight Pack',   description: 'Three predators of the dusk.',
    heroIds: ['len', 'elara', 'kengo'],    bonus: { spd: 30, crit: 0.10, atk: 80 },  emoji: '🌒' },
  { id: 'iron_pact',       name: 'Iron Pact',       description: 'Three warriors swore the same oath.',
    heroIds: ['kengo', 'george', 'korvan'],bonus: { hp: 800, def: 50, atk: 50 },     emoji: '⚒️' },
  { id: 'arcane_triumvirate', name: 'Arcane Triumvirate', description: 'Three mages reshape the war.',
    heroIds: ['aelia', 'pyra', 'manny'],   bonus: { atk: 120, crit: 0.10 },          emoji: '🔮' },
  { id: 'crimson_choir',   name: 'Crimson Choir',   description: 'Death-callers sing the harvest.',
    heroIds: ['korvan', 'manny', 'luna'],  bonus: { atk: 70, hp: 700, crit: 0.05 },  emoji: '🩸' },
  // Three-blade vanguard: chino + reiji + a third blade
  { id: 'broken_vanguard', name: 'Broken Vanguard', description: 'Three blades that should not work together.',
    heroIds: ['chino', 'reiji', 'kengo'],  bonus: { atk: 70, spd: 25, crit: 0.06 },  emoji: '⚔️' },
  // Yin-yang court: twins + two casters
  { id: 'duality_court',   name: 'Duality Court',   description: 'Light, shadow, and the mages who shape both.',
    heroIds: ['twins', 'aelia', 'pyra'],   bonus: { atk: 90, crit: 0.08 },           emoji: '☯️' },
  // Mirror tide: twins + healer + paladin (heavy support comp)
  { id: 'mirror_tide',     name: 'Mirror Tide',     description: 'The twins, the priestess, the paladin — light unbroken.',
    heroIds: ['twins', 'luna', 'kaius'],   bonus: { hp: 800, def: 40, atk: 50 },     emoji: '🌅' },

  // ============ UNIVERSAL BASELINE ============
  // Every full squad gets this. Smaller than pair/triple bonds so the
  // composition-specific bonds matter more.
  { id: 'full_party',      name: 'United Front',    description: 'Any 3 heroes form a true team.',
    heroIds: ['*', '*', '*'],              bonus: { hp: 300, atk: 30 },              emoji: '🤝' },
];

// Compute active bonds for a given squad of hero template IDs
export function activeBonds(squadTemplateIds: string[]): BondDef[] {
  const out: BondDef[] = [];
  const set = new Set(squadTemplateIds);
  for (const b of BONDS) {
    const need = b.heroIds;
    if (need.every(id => id === '*' || set.has(id))) {
      // Wildcard "any" bonds require squad to be at least that many heroes
      const wildcards = need.filter(id => id === '*').length;
      if (squadTemplateIds.length < wildcards) continue;
      out.push(b);
    }
  }
  return out;
}

// Returns aggregated bonus stats for a hero on a given squad — applies bond bonuses
// to EACH member of the bond.
export function bondBonusFor(heroTemplateId: string, squadTemplateIds: string[]): Partial<Record<LootStat, number>> {
  const out: Partial<Record<LootStat, number>> = {};
  for (const b of activeBonds(squadTemplateIds)) {
    // The hero benefits if they're either in heroIds explicitly or in a wildcard bond
    const isWildcard = b.heroIds.some(id => id === '*');
    const isMember = b.heroIds.includes(heroTemplateId);
    if (isWildcard || isMember) {
      for (const [stat, val] of Object.entries(b.bonus)) {
        out[stat as LootStat] = (out[stat as LootStat] ?? 0) + (val as number);
      }
    }
  }
  return out;
}
