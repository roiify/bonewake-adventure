// 100-floor Tower of Trials. Each floor is generated procedurally from the Echoes enemy roster.
import type { CombatUnit } from '../types';
import { buildEnemyUnit } from '../lib/stats';

export const TOWER_MAX_FLOOR = 100;        // weekly-reset section ends here
export const TOWER_ENDLESS_FLOOR_START = 101; // post-100 = endless mode
export const TOWER_DAILY_ATTEMPTS = 5;
export const TOWER_REFILL_GEM_COST = 50;
export const TOWER_REFILL_MAX_PER_DAY = 10;

export function isEndless(floor: number): boolean {
  return floor > TOWER_MAX_FLOOR;
}

// A floor is identified by its number 1..100.
// Tier boss floors are every 10 (10, 20, ... 100) — they have 4 enemies with boosted stats.
// Mega-boss floors: 25, 50, 75, 100 — 4 boss enemies.
// Regular floors: 3 enemies of varying difficulty.

export function isBossFloor(floor: number): boolean {
  return floor % 10 === 0;
}
export function isMegaBossFloor(floor: number): boolean {
  return floor === 25 || floor === 50 || floor === 75 || floor === 100;
}

export interface TowerFloorDef {
  floor: number;
  enemyTeam: CombatUnit[];
  rewards: { gold: number; gems: number; soulshards: number };
}

// Deterministic enemy team for a floor (so re-attempts are consistent)
function pickEnemyFor(floor: number, slot: number): string {
  // Distribute enemy types by floor — early floors are mostly shamblers, late floors are liches.
  if (isMegaBossFloor(floor)) return 'graveyardlich';
  if (isBossFloor(floor)) return floor < 50 ? 'boneknight' : 'graveyardlich';
  if (floor < 10) return slot === 1 ? 'fastghoul' : 'shambler';
  if (floor < 30) return slot === 1 ? 'boneknight' : (slot === 0 ? 'shambler' : 'fastghoul');
  if (floor < 60) return slot === 0 ? 'fastghoul' : (slot === 1 ? 'boneknight' : 'graveyardlich');
  return slot === 1 ? 'graveyardlich' : 'boneknight';
}

export function generateFloor(floor: number): TowerFloorDef {
  // Endless mode (>100): scaling extends linearly with extra hp/atk multiplier
  const endless = isEndless(floor);
  const baseLevel = endless
    ? Math.max(1, Math.floor(150 + (floor - 100) * 2.5))
    : Math.max(1, Math.floor(floor * 1.5));
  const star = endless ? 5 : (isMegaBossFloor(floor) ? 5 : isBossFloor(floor) ? 4 : 3);
  const slotCount = endless ? 4 : (isBossFloor(floor) ? 4 : 3);
  const team: CombatUnit[] = [];
  for (let i = 0; i < slotCount; i++) {
    const tplId = pickEnemyFor(floor, i);
    const lvl = baseLevel + (i === 1 ? 2 : 0);
    const unit = buildEnemyUnit(tplId, lvl, star, `tower_e${i}`);
    // Endless: stack hp/atk linearly past 100 to make scaling continuous
    if (endless) {
      const bonus = 1 + (floor - 100) * 0.05;
      unit.hp = Math.floor(unit.hp * bonus);
      unit.maxHp = unit.hp;
      unit.atk = Math.floor(unit.atk * bonus);
    }
    team.push(unit);
  }
  // Rewards scale with floor; endless continues climbing
  const baseGold = 50 + floor * 25;
  const gems = endless
    ? 5 + Math.floor((floor - 100) / 5)
    : (isMegaBossFloor(floor) ? 100 : isBossFloor(floor) ? 30 : (floor % 5 === 0 ? 10 : 2));
  const shards = endless
    ? Math.max(1, Math.floor((floor - 100) / 10))
    : (isMegaBossFloor(floor) ? 20 : isBossFloor(floor) ? 5 : 0);
  return {
    floor,
    enemyTeam: team,
    rewards: { gold: baseGold, gems, soulshards: shards },
  };
}

export function isoWeek(date: Date = new Date()): string {
  // Returns "YYYY-Www" string for the current ISO week
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// Local-date key "YYYY-MM-DD". Used by daily-reset modes (World Boss,
// Shatter) so the reset boundary matches the local-midnight day-of-week
// boss rotation rather than the ISO-week boundary.
export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
