import {
  BASE_ITEMS,
  BASE_BY_ID,
  PREFIXES,
  SUFFIX_BY_STAT,
  LEGENDARY_NAMES,
  RARITY_WEIGHTS,
  AFFIX_COUNT,
  AFFIX_BONUS_CHANCE,
  AFFIX_RANGE,
  AFFIX_ILVL_SCALE,
  PRIMARY_MULT,
  type LootRarity,
  type LootStat,
} from '../data/loot';
import { uid } from './id';
import type { OwnedEquipment } from './db';
import { pickOwnerFor } from '../data/loot';
import { useHeroes } from '../store/heroes';
import { HIDDEN_HERO_IDS } from '../data/heroes';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rollFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// All stats are valid affix candidates — the slot's own affixPool is
// used as a BIAS, not a hard restriction. About 80% of the time we
// pull from the biased pool (slot-flavored), and 20% from the full
// stat set so an axe can still surprise you with a spd roll.
const ALL_STATS: LootStat[] = ['hp', 'atk', 'def', 'spd', 'crit'];
const CROSS_POOL_CHANCE = 0.20;

// Quality-of-roll curve — input is uniform [0,1], output is a quality
// fraction biased toward the middle but with real tails at both ends.
// This produces a value distribution where most rolls feel "okay" and
// god/dud rolls feel rare but reachable. The triangular distribution
// gives the classic ARPG "rare T1" feel without going so heavy-tailed
// that the median feels useless.
//
// Result: ~5% of rolls land in T1 (top), ~5% in T20 (bottom), the rest
// cluster around T8-T12. Plays nicely with the AFFIX_BONUS_CHANCE
// bonus-affix system above.
function rollQuality(rng: () => number = Math.random): number {
  // Sum of two uniforms → triangular distribution centered at 0.5.
  return Math.max(0, Math.min(1, (rng() + rng()) / 2));
}

// Roll a rarity weighted by the global table, with optional min floor
export function rollRarity(minRarity: LootRarity = 1, luckBoost = 0): LootRarity {
  const entries = (Object.entries(RARITY_WEIGHTS) as [string, number][])
    .map(([k, v]) => [Number(k) as LootRarity, v] as const)
    .filter(([k]) => k >= minRarity);
  const weighted = entries.map(([r, w]) => [r, w * Math.pow(1 + luckBoost, r - 1)] as const);
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [tier, w] of weighted) {
    r -= w;
    if (r <= 0) return tier;
  }
  return 1;
}

// Translate quality (0-1) to a tier 1-20 (1 = best). Used for the T1/T20
// UI badges. Stored q field on each affix.
export function affixTier(q: number | undefined): number {
  if (q === undefined || q === null || isNaN(q)) return 10; // neutral fallback for legacy gear
  const clamped = Math.max(0, Math.min(1, q));
  // tier = 1 + floor((1 - q) * 20). q=1 → T1, q=0 → T20
  return Math.max(1, Math.min(20, 1 + Math.floor((1 - clamped) * 20)));
}

// Color used for a tier badge — gold (T1) → purple → blue → gray.
export function tierColor(tier: number): string {
  if (tier <= 2) return '#fbbf24';   // gold — god roll
  if (tier <= 5) return '#a855f7';   // purple — great
  if (tier <= 10) return '#3b82f6';  // blue — decent
  if (tier <= 15) return '#9ca3af';  // gray — average
  return '#52525b';                  // dim — dud
}

// Roll a stat value given quality. Quality fraction lerps between lo
// and hi for that stat, then scaled by item level and per-rarity
// magnitude. Higher quality = higher value.
function rollAffixValue(stat: LootStat, ilvl: number, q: number, rarityMag: number): number {
  const [lo, hi] = AFFIX_RANGE[stat];
  const lvlMult = 1 + (ilvl - 1) * AFFIX_ILVL_SCALE;
  const raw = (lo + (hi - lo) * q) * lvlMult * rarityMag;
  if (stat === 'crit') return Math.round(raw * 10000) / 10000;
  return Math.round(raw);
}

export function genLoot(opts: {
  itemLevel: number;
  minRarity?: LootRarity;
  luckBoost?: number;
  forcedBaseId?: string;
}): OwnedEquipment {
  const ilvl = Math.max(1, opts.itemLevel);
  const rarity = rollRarity(opts.minRarity ?? 1, opts.luckBoost ?? 0);
  const base = opts.forcedBaseId ? (BASE_BY_ID[opts.forcedBaseId] ?? pick(BASE_ITEMS)) : pick(BASE_ITEMS);

  // Per-rarity magnitude multiplier (still active — scales the whole roll).
  const [magMin, magMax] = PRIMARY_MULT[rarity];
  const rarityMag = rollFloat(magMin, magMax);

  // PRIMARY stat — locked to the base's natural primary, but the value
  // gets a quality roll like an affix. T1 primary on a Legendary feels
  // distinctly better than T20.
  const primaryQ = rollQuality();
  const primaryValue = rollAffixValue(base.primary, ilvl, primaryQ, rarityMag);

  // AFFIX COUNT — minimum from rarity, +1 with AFFIX_BONUS_CHANCE.
  // Common gear (rarity 1) gets nothing; everything else has a real
  // chance for an extra mod, giving the player a small jackpot moment.
  let affixCount = AFFIX_COUNT[rarity];
  if (Math.random() < AFFIX_BONUS_CHANCE[rarity]) affixCount += 1;

  // AFFIX POOL — biased from base.affixPool 80% of the time, full
  // stat set 20%. Same stat can't appear twice, and the primary stat
  // can roll as an affix (doubles up — interesting if a god primary
  // gets a god atk affix on top).
  const usedStats = new Set<LootStat>();
  const affixes: { stat: string; value: number; q: number }[] = [];
  for (let i = 0; i < affixCount; i++) {
    const useCross = Math.random() < CROSS_POOL_CHANCE;
    const pool = (useCross ? ALL_STATS : base.affixPool).filter(s => !usedStats.has(s));
    if (pool.length === 0) {
      // Slot's primary affix pool exhausted — fall back to any unused stat
      const fallback = ALL_STATS.filter(s => !usedStats.has(s));
      if (fallback.length === 0) break;
      pool.push(...fallback);
    }
    const stat = pool[Math.floor(Math.random() * pool.length)];
    usedStats.add(stat);
    // Affix values roll at ~70% of primary magnitude — primary always
    // remains the headline stat, affixes are bonuses.
    const q = rollQuality();
    const value = rollAffixValue(stat, ilvl, q, rarityMag * 0.7);
    affixes.push({ stat, value, q });
  }

  // Name generation — same as before, but pulls suffix from a real
  // rolled affix if one exists.
  let name: string;
  if (rarity === 5) {
    name = pick(LEGENDARY_NAMES[base.slot]);
  } else if (rarity >= 3) {
    const prefix = pick(PREFIXES);
    const suffixStat = affixes[0]?.stat as LootStat ?? base.primary;
    name = `${prefix} ${base.name} of ${pick(SUFFIX_BY_STAT[suffixStat])}`;
  } else if (rarity === 2) {
    const suffixStat = (affixes[0]?.stat as LootStat) ?? base.primary;
    name = `${base.name} of ${pick(SUFFIX_BY_STAT[suffixStat])}`;
  } else {
    name = base.name;
  }

  // Drops are made for a specific hero: pick a random owned hero whose
  // class uses this base type. The piece is theirs from the moment it drops.
  let boundTo: string | undefined;
  try {
    const owned = useHeroes.getState().heroes
      .map(h => h.templateId)
      .filter(t => !HIDDEN_HERO_IDS.has(t));
    boundTo = pickOwnerFor(base.id, [...new Set(owned)]);
  } catch { boundTo = undefined; }

  return {
    id: uid(),
    baseType: base.id,
    rarity,
    itemLevel: ilvl,
    name,
    primary: { stat: base.primary, value: primaryValue, q: primaryQ },
    affixes,
    upgradeLevel: 0,
    equippedTo: null,
    boundTo,
    obtainedAt: Date.now(),
    templateId: undefined,
    level: undefined,
  };
}

// Aggregate stats for a given equipment instance.
// Mythic items use +12% per ascension level; non-Mythic use +10%.
export function equipStats(eq: OwnedEquipment): Partial<Record<LootStat, number>> {
  const out: Partial<Record<LootStat, number>> = {};
  const isMythic = (eq.rarity ?? 0) >= 6 && !!eq.craftedPieceId;
  const upgradeMult = isMythic
    ? 1 + (eq.upgradeLevel ?? 0) * 0.06
    : 1 + (eq.upgradeLevel ?? 0) * 0.05;
  if (eq.primary) {
    const k = eq.primary.stat as LootStat;
    const v = eq.primary.value * upgradeMult;
    out[k] = (out[k] ?? 0) + (k === 'crit' ? Math.round(v * 10000) / 10000 : Math.round(v));
  }
  for (const a of eq.affixes ?? []) {
    const k = a.stat as LootStat;
    const v = a.value * upgradeMult;
    out[k] = (out[k] ?? 0) + (k === 'crit' ? Math.round(v * 10000) / 10000 : Math.round(v));
  }
  return out;
}

// Power rating used for sorting in the bag.
export function equipPower(eq: OwnedEquipment): number {
  const s = equipStats(eq);
  return Math.round((s.hp ?? 0) / 4 + (s.atk ?? 0) * 3 + (s.def ?? 0) * 2 + (s.spd ?? 0) * 5 + (s.crit ?? 0) * 800);
}

// Overall item quality (0-100) — average of all affix + primary qualities.
// Two same-rarity items now have a visible quality delta. Mythic gear
// returns 100 since its values are hand-tuned, not rolled.
export function equipQuality(eq: OwnedEquipment): number {
  if ((eq.rarity ?? 0) >= 6 && !!eq.craftedPieceId) return 100;
  const qs: number[] = [];
  if (eq.primary?.q !== undefined) qs.push(eq.primary.q);
  for (const a of eq.affixes ?? []) {
    if (a.q !== undefined) qs.push(a.q);
  }
  if (qs.length === 0) return 50; // legacy gear without q metadata
  const avg = qs.reduce((s, q) => s + q, 0) / qs.length;
  return Math.round(avg * 100);
}
