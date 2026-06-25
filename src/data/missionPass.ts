// 30-tier Mission Pass — a season of progression rewards.
// Earn pass-XP from any battle (+10 per win, +30 per 3-star, +50 per boss).
// Tiers unlock at XP thresholds. Tap to claim.
export const PASS_SEASON_DAYS = 30;
export const PASS_XP_PER_WIN = 10;
export const PASS_XP_PER_3STAR = 30;
export const PASS_XP_PER_BOSS = 50;
export const PASS_XP_PER_TOWER = 25;

export interface PassReward {
  gold?: number;
  gems?: number;
  friendPoints?: number;
  soulshard?: number;
  energy?: number;
  equipmentMinRarity?: 2 | 3 | 4 | 5;
}

export interface PassTier {
  tier: number;
  xpRequired: number;
  reward: PassReward;
  feature?: boolean;
}

function tierXp(t: number): number {
  // ramps: tier 1 = 100, doubles roughly every 5 tiers
  return Math.round(100 * t * (1 + (t - 1) * 0.08));
}

const r = (gold?: number, gems?: number, soulshard?: number, energy?: number, friendPoints?: number, equipmentMinRarity?: 2|3|4|5): PassReward =>
  ({ gold, gems, soulshard, energy, friendPoints, equipmentMinRarity });

export const PASS_TIERS: PassTier[] = [
  { tier: 1,  xpRequired: tierXp(1),  reward: r(500) },
  { tier: 2,  xpRequired: tierXp(2),  reward: r(undefined, 20) },
  { tier: 3,  xpRequired: tierXp(3),  reward: r(1000) },
  { tier: 4,  xpRequired: tierXp(4),  reward: r(undefined, undefined, 5) },
  { tier: 5,  xpRequired: tierXp(5),  reward: r(undefined, 50), feature: true },
  { tier: 6,  xpRequired: tierXp(6),  reward: r(1500) },
  { tier: 7,  xpRequired: tierXp(7),  reward: r(undefined, undefined, undefined, 60) },
  { tier: 8,  xpRequired: tierXp(8),  reward: r(undefined, 40) },
  { tier: 9,  xpRequired: tierXp(9),  reward: r(2000, undefined, 10) },
  { tier: 10, xpRequired: tierXp(10), reward: r(undefined, 100, undefined, undefined, undefined, 3), feature: true },
  { tier: 11, xpRequired: tierXp(11), reward: r(3000) },
  { tier: 12, xpRequired: tierXp(12), reward: r(undefined, 60) },
  { tier: 13, xpRequired: tierXp(13), reward: r(undefined, undefined, 15) },
  { tier: 14, xpRequired: tierXp(14), reward: r(undefined, undefined, undefined, 100) },
  { tier: 15, xpRequired: tierXp(15), reward: r(undefined, 150, undefined, undefined, undefined, 4), feature: true },
  { tier: 16, xpRequired: tierXp(16), reward: r(4000, undefined, 20) },
  { tier: 17, xpRequired: tierXp(17), reward: r(undefined, 80) },
  { tier: 18, xpRequired: tierXp(18), reward: r(5000) },
  { tier: 19, xpRequired: tierXp(19), reward: r(undefined, undefined, 25) },
  { tier: 20, xpRequired: tierXp(20), reward: r(undefined, 250, 30, undefined, undefined, 4), feature: true },
  { tier: 21, xpRequired: tierXp(21), reward: r(6000) },
  { tier: 22, xpRequired: tierXp(22), reward: r(undefined, 100) },
  { tier: 23, xpRequired: tierXp(23), reward: r(undefined, undefined, 35) },
  { tier: 24, xpRequired: tierXp(24), reward: r(undefined, 120, undefined, 150) },
  { tier: 25, xpRequired: tierXp(25), reward: r(undefined, 350, 50, undefined, undefined, 5), feature: true },
  { tier: 26, xpRequired: tierXp(26), reward: r(8000) },
  { tier: 27, xpRequired: tierXp(27), reward: r(undefined, 150) },
  { tier: 28, xpRequired: tierXp(28), reward: r(undefined, undefined, 60) },
  { tier: 29, xpRequired: tierXp(29), reward: r(undefined, 200, undefined, 200) },
  { tier: 30, xpRequired: tierXp(30), reward: r(20000, 600, 100, undefined, undefined, 5), feature: true },
];

// Convert date to "days since season start"
export function dayOfSeason(seasonStart: string): number {
  if (!seasonStart) return 0;
  const start = new Date(seasonStart).getTime();
  return Math.floor((Date.now() - start) / (24 * 60 * 60 * 1000));
}

export function seasonEnded(seasonStart: string): boolean {
  return dayOfSeason(seasonStart) >= PASS_SEASON_DAYS;
}

export function currentTier(xp: number): number {
  let i = 0;
  for (const t of PASS_TIERS) {
    if (xp >= t.xpRequired) i = t.tier;
    else break;
  }
  return i;
}
