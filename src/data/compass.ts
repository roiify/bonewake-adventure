// Soul Compass — weekly treasure hunt. Each week, 5 stages are secretly tagged
// as "hot" — clearing those stages this week gives a bonus chest. The compass
// gives the player hints (chapter range) but not the exact stages.
import { STAGES } from './stages';

export interface CompassClue {
  weekIso: string;
  hotStageIds: string[];   // 5 of the available cleared stages
}

// Deterministic for a given week — same iso week always picks the same stages
export function pickHotStages(weekIso: string): string[] {
  const allIds = STAGES.map(s => s.id);
  // Simple LCG seeded by hash of the iso week string
  let hash = 0;
  for (let i = 0; i < weekIso.length; i++) hash = (hash * 31 + weekIso.charCodeAt(i)) | 0;
  const seed = Math.abs(hash);
  let state = seed;
  const next = () => { state = (state * 1664525 + 1013904223) >>> 0; return state; };
  // Fisher-Yates-ish pick 5
  const pool = [...allIds];
  const picked: string[] = [];
  while (picked.length < 5 && pool.length > 0) {
    const idx = next() % pool.length;
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

// Find which chapters contain hot stages this week (gives the player a hint
// without revealing exact stages).
export function compassHints(weekIso: string): { chapter: number; count: number }[] {
  const hot = pickHotStages(weekIso);
  const map = new Map<number, number>();
  for (const id of hot) {
    const s = STAGES.find(s => s.id === id);
    if (!s) continue;
    map.set(s.chapter, (map.get(s.chapter) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([chapter, count]) => ({ chapter, count })).sort((a, b) => a.chapter - b.chapter);
}

export interface CompassReward {
  gold: number;
  gems: number;
  soulshard: number;
}
export const COMPASS_REWARD: CompassReward = { gold: 2000, gems: 60, soulshard: 8 };
