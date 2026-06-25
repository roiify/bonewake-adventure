// Solo World Boss — DAILY rotation across 7 painted boss-tier sprites
// (the mythical creatures from the PixelLab boss batch). One boss per
// day of week. Best-single-attempt damage decides reward tier.

import { buildEnemyUnit } from '../lib/stats';
import { WORLD_BOSS_BY_DAY } from './heroes';
import type { CombatUnit } from '../types';

// Attempts reset DAILY (the boss rotates daily), so this is a per-day
// budget. Renamed from _PER_WEEK to match the actual reset cadence.
export const WORLD_BOSS_ATTEMPTS_PER_DAY = 3;

export interface WorldBossDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  templateId: string;
  hpMillions: number;
  level: number;
  star: number;
}

// Flavor + HP override per painted boss. HP intentionally varies so
// each day's boss feels distinct (tanks have more, glass cannons less).
const BOSS_FLAVOR: Record<string, { name: string; description: string; emoji: string; hpMillions: number }> = {
  bonewake_dragon:  { name: 'Bonewake Dragon',  description: 'Its first roar still ignites the air it left.',           emoji: '🐉', hpMillions: 8.0 },
  plague_hydra:     { name: 'Plague Hydra',     description: 'Three skulls. Three fangs. Three openings to bleed.',     emoji: '🐍', hpMillions: 6.5 },
  rot_phoenix:      { name: 'Rot Phoenix',      description: 'A dying ember refuses to be quiet.',                       emoji: '🔥', hpMillions: 5.0 },
  bone_cerberus:    { name: 'Bone Cerberus',    description: 'Untouched, it strikes hardest.',                           emoji: '🐺', hpMillions: 5.5 },
  wraith_kraken:    { name: 'Wraith Kraken',    description: 'The mist clings. Strikes pass through.',                   emoji: '🐙', hpMillions: 10.0 },
  necro_sphinx:     { name: 'Necro Sphinx',     description: 'It asks. It already knows.',                               emoji: '🦁', hpMillions: 7.0 },
  crimson_centaur:  { name: 'Crimson Centaur',  description: 'Hoofbeats heard before the dawn line.',                    emoji: '🐎', hpMillions: 7.5 },
};

export const WORLD_BOSSES: WorldBossDef[] = WORLD_BOSS_BY_DAY.map(templateId => {
  const flavor = BOSS_FLAVOR[templateId];
  return {
    id: templateId,
    name: flavor.name,
    description: flavor.description,
    emoji: flavor.emoji,
    templateId,
    hpMillions: flavor.hpMillions,
    level: 200,
    star: 6,
  };
});

// Daily rotation — picks by JS day-of-week (Sun=0..Sat=6) so the boss
// switches at local midnight. (The weekIso argument is kept for API
// compatibility but no longer used; it's a no-op param now.)
export function currentBoss(_weekIso: string): WorldBossDef {
  const day = new Date().getDay();
  return WORLD_BOSSES[day] ?? WORLD_BOSSES[0];
}

export function buildBossTeam(boss: WorldBossDef): CombatUnit[] {
  // Single mega-unit. buildEnemyUnit uses ENEMY_TEMPLATES base stats × star
  // mult × level mult, so the new painted-boss templates (which already
  // have ~50-100k base HP) end up with millions of HP — we still clamp
  // to the boss-def `hpMillions` so the bar reads cleanly.
  const u = buildEnemyUnit(boss.templateId, boss.level, boss.star, 'wb_boss');
  const targetHp = Math.floor(boss.hpMillions * 1_000_000);
  u.hp = targetHp;
  u.maxHp = targetHp;
  return [u];
}

// Reward tiers based on % of boss HP damaged in a single attempt
export interface RewardTier {
  pct: number;       // require at least this fraction of boss HP damaged
  name: string;
  rewards: { gold: number; gems: number; soulshard: number };
}
// Economy alignment: soulshard rewards +50% across all tiers (was the
// tightest source for endgame ult gear). Gems untouched — gacha is
// already balanced for the doubled stellar cost.
export const REWARD_TIERS: RewardTier[] = [
  { pct: 0.01, name: 'Token',   rewards: { gold: 500,  gems: 10,  soulshard: 2 } },
  { pct: 0.05, name: 'Bronze',  rewards: { gold: 1500, gems: 30,  soulshard: 8 } },
  { pct: 0.15, name: 'Silver',  rewards: { gold: 3500, gems: 75,  soulshard: 22 } },
  { pct: 0.30, name: 'Gold',    rewards: { gold: 8000, gems: 150, soulshard: 50 } },
  { pct: 0.60, name: 'Mythic',  rewards: { gold: 15000,gems: 350, soulshard: 110 } },
  { pct: 1.00, name: 'Slayer',  rewards: { gold: 40000,gems: 800, soulshard: 300 } },
];

export function tierFor(damagePct: number): RewardTier {
  let best = REWARD_TIERS[0];
  for (const t of REWARD_TIERS) {
    if (damagePct >= t.pct) best = t;
  }
  return best;
}
