import { HERO_TEMPLATES, HIDDEN_HERO_IDS } from '../data/heroes';
import { POOL_BY_ID } from '../data/summonPools';
import type { HeroTemplate, Rarity } from '../types';

// Public pool excludes summons (Bone King, Lich Sovereign) — they only
// enter the squad through Manny.
const POOL = HERO_TEMPLATES.filter(h => !HIDDEN_HERO_IDS.has(h.id));

// Weighted pick over the hero pool. `rareFavored` INVERTS the weighting so the
// rarest heroes (low pullWeight) come up most — used for the SSS jackpot so a
// 5★ pull lands on a desirable hero instead of, statistically, the most common
// unit (the old bug: star tier and hero desirability were decoupled, so an
// "SSS" was most likely your most generic hero).
function pickWeighted(rng: () => number, rareFavored = false): HeroTemplate {
  const w = (h: HeroTemplate) => rareFavored
    ? 1 / Math.max(1, h.pullWeight ?? 10)
    : (h.pullWeight ?? 10);
  const total = POOL.reduce((s, h) => s + w(h), 0);
  let r = rng() * total;
  for (const h of POOL) {
    r -= w(h);
    if (r <= 0) return h;
  }
  return POOL[0];
}

// Roll an outcome star tier for a pool (3/4/5).
function rollStarTier(poolId: string, rng: () => number): number {
  const pool = POOL_BY_ID[poolId];
  const r = rng();
  if (r < pool.rates[5]) return 5;
  if (r < pool.rates[5] + pool.rates[4]) return 4;
  return 3;
}

export function pullOnce(
  poolId: string,
  pityCounter: number,
  rng: () => number = Math.random
): { hero: HeroTemplate; rarity: Rarity; star: number; pityCounterAfter: number } {
  const pool = POOL_BY_ID[poolId];
  if (!pool) throw new Error(`Unknown pool ${poolId}`);

  // Pity: only Stellar Wish guarantees SSS after N pulls without one
  let star: number;
  if (pool.pityFive && pityCounter + 1 >= pool.pityFive) {
    star = 5;
  } else {
    star = rollStarTier(poolId, rng);
  }

  // Pick which hero. SSS (5★): featured wins 30%, otherwise draw from the
  // rare-favored distribution so the jackpot lands on a desirable hero. SS/A
  // tiers use the normal (common-favored) distribution.
  let hero: HeroTemplate;
  if (star === 5 && pool.featuredHeroId && rng() < 0.30) {
    hero = HERO_TEMPLATES.find(h => h.id === pool.featuredHeroId) ?? pickWeighted(rng, true);
  } else {
    hero = pickWeighted(rng, star === 5);
  }

  const pityCounterAfter = star === 5
    ? 0
    : (pool.pityFive ? pityCounter + 1 : pityCounter);

  // rarity is just the hero's template rarity (display, kept for back-compat)
  return { hero, rarity: hero.rarity, star, pityCounterAfter };
}

export function pullTen(
  poolId: string,
  startingPity: number,
  rng: () => number = Math.random
): { results: { hero: HeroTemplate; rarity: Rarity; star: number }[]; pityCounterAfter: number } {
  const pool = POOL_BY_ID[poolId];
  const results: { hero: HeroTemplate; rarity: Rarity; star: number }[] = [];
  let pity = startingPity;
  let hasGuaranteed4Plus = false;
  for (let i = 0; i < 10; i++) {
    if (i === 9 && !hasGuaranteed4Plus && (pool.rates[4] > 0 || pool.rates[5] > 0)) {
      // Force SS or SSS minimum
      const r = rng();
      const star = r < pool.rates[5] ? 5 : 4;
      const hero = star === 5 && pool.featuredHeroId && rng() < 0.5
        ? HERO_TEMPLATES.find(h => h.id === pool.featuredHeroId) ?? pickWeighted(rng, true)
        : pickWeighted(rng, star === 5);
      results.push({ hero, rarity: hero.rarity, star });
      pity = star === 5 ? 0 : (pool.pityFive ? pity + 1 : pity);
    } else {
      const res = pullOnce(poolId, pity, rng);
      pity = res.pityCounterAfter;
      results.push({ hero: res.hero, rarity: res.rarity, star: res.star });
      if (res.star >= 4) hasGuaranteed4Plus = true;
    }
  }
  return { results, pityCounterAfter: pity };
}
