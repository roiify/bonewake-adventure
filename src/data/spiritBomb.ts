// Shatter event — DAILY rotation across 7 painted humanoid bosses
// (PixelLab batch). Cumulative damage carries between attempts and
// across the day. Boss "shatters" at 100%.

import { buildEnemyUnit } from '../lib/stats';
import { ENEMY_TEMPLATES } from './stages';
import { SHATTER_BOSS_BY_DAY } from './heroes';
import type { CombatUnit } from '../types';

// Attempts reset DAILY (the boss rotates daily and the damage pool is
// per-boss). Renamed from _PER_WEEK to match the actual reset cadence.
export const SPIRIT_BOMB_ATTEMPTS_PER_DAY = 5;

export interface SpiritBossDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  templateId: string;
  hp: number;
  level: number;
  star: number;
}

const BOSS_FLAVOR: Record<string, { name: string; description: string; emoji: string; hp: number }> = {
  lich_king:     { name: 'The Lich King',  description: 'The crown decides who lasts.',                                  emoji: '👑', hp: 8_000_000 },
  bone_titan:    { name: 'Bone Titan',     description: 'Built from those who walked too far.',                          emoji: '💀', hp: 12_000_000 },
  plague_doctor: { name: 'The Plague Doctor', description: 'It treats the strong first.',                                emoji: '⚕️', hp: 6_500_000 },
  ash_empress:   { name: 'Ash Empress',    description: 'Said with her last breath. Heard for a thousand years.',        emoji: '👸', hp: 7_500_000 },
  soul_reaper:   { name: 'The Soul Reaper', description: 'It does not take. It receives.',                               emoji: '🗡', hp: 6_000_000 },
  voidlord:      { name: 'Voidlord',       description: 'Where the blade lands, nothing was.',                            emoji: '🌑', hp: 9_500_000 },
  worm_god:      { name: 'The Worm God',   description: 'It already knew the ending.',                                    emoji: '🪱', hp: 14_000_000 },
};

export const SPIRIT_BOSSES: SpiritBossDef[] = SHATTER_BOSS_BY_DAY.map(templateId => {
  const f = BOSS_FLAVOR[templateId];
  return {
    id: templateId,
    name: f.name,
    description: f.description,
    emoji: f.emoji,
    templateId,
    hp: f.hp,
    level: 200,
    star: 6,
  };
});

// Daily rotation by day-of-week (Sun=0..Sat=6). weekIso kept for API compat.
export function currentSpiritBoss(_weekIso: string): SpiritBossDef {
  const day = new Date().getDay();
  return SPIRIT_BOSSES[day] ?? SPIRIT_BOSSES[0];
}

export function buildSpiritBossUnit(boss: SpiritBossDef, remainingHp: number): CombatUnit {
  const u = buildEnemyUnit(boss.templateId, boss.level, boss.star, 'spirit_boss');
  u.hp = Math.max(1, remainingHp);
  u.maxHp = boss.hp;
  return u;
}

// Reward tiers based on cumulative damage as % of max HP
// Economy alignment: soulshard rewards +50% (matches World Boss bump).
export interface SpiritTier {
  pct: number;
  name: string;
  rewards: { gold: number; gems: number; soulshard: number };
}

export const SPIRIT_TIERS: SpiritTier[] = [
  { pct: 0.10, name: 'Spark',   rewards: { gold: 1000, gems: 20,  soulshard: 5 } },
  { pct: 0.25, name: 'Surge',   rewards: { gold: 2500, gems: 60,  soulshard: 15 } },
  { pct: 0.50, name: 'Burst',   rewards: { gold: 6000, gems: 120, soulshard: 38 } },
  { pct: 0.75, name: 'Wave',    rewards: { gold: 10000,gems: 250, soulshard: 75 } },
  { pct: 1.00, name: 'Annihilation', rewards: { gold: 25000, gems: 600, soulshard: 225 } },
];

export function spiritTierFor(pct: number): SpiritTier | null {
  let best: SpiritTier | null = null;
  for (const t of SPIRIT_TIERS) {
    if (pct >= t.pct) best = t;
  }
  return best;
}

void ENEMY_TEMPLATES;
