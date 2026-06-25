// Away earnings — gold/xp accrued while the game is closed, collected from
// a chest on the Home screen. Rate is pegged to the strongest STORY stage
// the player has cleared, at a fraction of active farming income, capped
// at AWAY_CAP_HOURS so the game can't be left to idle forever.
import { db } from './db';
import { STAGE_BY_ID } from '../data/stages';

export const AWAY_CAP_HOURS = 8;
export const AWAY_MIN_MINUTES = 10;
// One active win takes ~1 min; away time pays out like this many wins/hour.
// 8h offline ≈ half an hour of active farming — a welcome-back gift, not a
// replacement for playing.
const WINS_PER_HOUR = 4;

export interface AwayEarnings {
  hours: number;       // capped, fractional
  gold: number;
  exp: number;
  stageName: string;   // which stage the rate is pegged to
}

export async function computeAwayEarnings(lastClosedAt: number): Promise<AwayEarnings | null> {
  if (!lastClosedAt) return null;
  const awayMs = Date.now() - lastClosedAt;
  if (awayMs < AWAY_MIN_MINUTES * 60_000) return null;
  const hours = Math.min(AWAY_CAP_HOURS, awayMs / 3_600_000);

  // Highest-paying STORY stage cleared (tower/dungeon/boss virtual stage ids
  // aren't in STAGE_BY_ID and are skipped naturally).
  const clears = await db.stageClears.toArray();
  let best: (typeof STAGE_BY_ID)[string] | null = null;
  for (const c of clears) {
    const s = STAGE_BY_ID[c.stageId];
    if (s && (!best || s.rewards.gold > best.rewards.gold)) best = s;
  }
  if (!best) return null;

  return {
    hours,
    gold: Math.round(best.rewards.gold * WINS_PER_HOUR * hours),
    exp: Math.round(best.rewards.exp * WINS_PER_HOUR * hours),
    stageName: best.name,
  };
}

export function formatAway(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
